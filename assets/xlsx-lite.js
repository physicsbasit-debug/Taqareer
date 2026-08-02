(() => {
  "use strict";

  const UTF8 = new TextDecoder("utf-8");
  const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

  function u16(view, offset) { return view.getUint16(offset, true); }
  function u32(view, offset) { return view.getUint32(offset, true); }

  function decodeXml(value) {
    return String(value ?? "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&amp;/g, "&");
  }

  function attr(source, name) {
    const match = String(source).match(new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
    return decodeXml(match ? (match[1] ?? match[2] ?? "") : "");
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("المتصفح لا يدعم فك ضغط Excel محليًا. استخدم متصفحًا حديثًا أو صدّر الملف إلى CSV.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function locateEndOfCentralDirectory(bytes) {
    const start = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= start; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
    }
    return -1;
  }

  function createZipReader(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const eocd = locateEndOfCentralDirectory(bytes);
    if (eocd < 0) throw new Error("الملف لا يبدو مصنف Excel صالحًا أو أنه تالف.");

    const entryCount = u16(view, eocd + 10);
    const centralOffset = u32(view, eocd + 16);
    const entries = new Map();
    let cursor = centralOffset;

    for (let i = 0; i < entryCount; i++) {
      if (u32(view, cursor) !== 0x02014b50) throw new Error("تعذر قراءة بنية ملف Excel المضغوطة.");
      const method = u16(view, cursor + 10);
      const compressedSize = u32(view, cursor + 20);
      const uncompressedSize = u32(view, cursor + 24);
      const nameLength = u16(view, cursor + 28);
      const extraLength = u16(view, cursor + 30);
      const commentLength = u16(view, cursor + 32);
      const localOffset = u32(view, cursor + 42);
      const name = UTF8.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
      entries.set(name.replace(/\\/g, "/"), { method, compressedSize, uncompressedSize, localOffset });
      cursor += 46 + nameLength + extraLength + commentLength;
    }

    return {
      names: [...entries.keys()],
      async read(name) {
        const normalized = name.replace(/^\/+/, "");
        const entry = entries.get(normalized);
        if (!entry) return null;
        const local = entry.localOffset;
        if (u32(view, local) !== 0x04034b50) throw new Error(`تعذر قراءة الملف الداخلي: ${normalized}`);
        const nameLength = u16(view, local + 26);
        const extraLength = u16(view, local + 28);
        const dataStart = local + 30 + nameLength + extraLength;
        const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
        if (entry.method === 0) return compressed;
        if (entry.method === 8) return inflateRaw(compressed);
        throw new Error(`طريقة ضغط غير مدعومة داخل Excel: ${entry.method}`);
      },
      async readText(name) {
        const value = await this.read(name);
        return value ? UTF8.decode(value) : null;
      }
    };
  }

  function normalizeTarget(target) {
    let value = String(target || "").replace(/\\/g, "/");
    if (value.startsWith("/")) return value.slice(1);
    if (value.startsWith("xl/")) return value;
    return `xl/${value.replace(/^\.\//, "")}`;
  }

  function parseRelationships(xml) {
    const result = new Map();
    if (!xml) return result;
    const regex = /<Relationship\b([^>]*?)(?:\/>|>[\s\S]*?<\/Relationship>)/gi;
    let match;
    while ((match = regex.exec(xml))) {
      const id = attr(match[1], "Id");
      const target = attr(match[1], "Target");
      if (id && target) result.set(id, normalizeTarget(target));
    }
    return result;
  }

  function parseWorkbookSheets(xml, relationships) {
    const sheets = [];
    if (!xml) return sheets;
    const regex = /<sheet\b([^>]*?)(?:\/>|>[\s\S]*?<\/sheet>)/gi;
    let match;
    while ((match = regex.exec(xml))) {
      const name = attr(match[1], "name") || `ورقة ${sheets.length + 1}`;
      const relId = attr(match[1], "r:id") || attr(match[1], "id");
      const path = relationships.get(relId);
      if (path) sheets.push({ name, path, relId });
    }
    return sheets;
  }

  function extractTextTags(xml) {
    const parts = [];
    const regex = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
    let match;
    while ((match = regex.exec(xml || ""))) parts.push(decodeXml(match[1]));
    return parts.join("");
  }

  function parseSharedStrings(xml) {
    const strings = [];
    if (!xml) return strings;
    const regex = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
    let match;
    while ((match = regex.exec(xml))) strings.push(extractTextTags(match[1]));
    return strings;
  }

  function parseStyles(xml) {
    const custom = new Map();
    const dateStyleIndexes = new Set();
    if (!xml) return dateStyleIndexes;

    const numFmtRegex = /<numFmt\b([^>]*?)(?:\/>|>[\s\S]*?<\/numFmt>)/gi;
    let match;
    while ((match = numFmtRegex.exec(xml))) {
      const id = Number(attr(match[1], "numFmtId"));
      const code = attr(match[1], "formatCode");
      if (Number.isFinite(id)) custom.set(id, code);
    }

    const xfsBlock = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/i)?.[1] || "";
    const xfRegex = /<xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/xf>)/gi;
    let index = 0;
    while ((match = xfRegex.exec(xfsBlock))) {
      const id = Number(attr(match[1], "numFmtId"));
      const code = custom.get(id) || "";
      const normalized = code.toLowerCase().replace(/\[[^\]]+\]/g, "").replace(/"[^"]*"/g, "");
      if (BUILTIN_DATE_FORMATS.has(id) || /(^|[^a-z])[ymdhis]+([^a-z]|$)/i.test(normalized)) dateStyleIndexes.add(index);
      index++;
    }
    return dateStyleIndexes;
  }

  function excelSerialToText(serial) {
    if (!Number.isFinite(serial)) return serial;
    if (serial >= 0 && serial < 1) {
      const totalMinutes = Math.round(serial * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    const ms = Math.round((serial - 25569) * 86400000);
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return serial;
    const iso = date.toISOString();
    const hasTime = Math.abs(serial - Math.trunc(serial)) > 1e-9;
    return hasTime ? iso.slice(0, 16).replace("T", " ") : iso.slice(0, 10);
  }

  function columnIndex(reference) {
    const letters = String(reference || "").match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "";
    let value = 0;
    for (const ch of letters) value = value * 26 + ch.charCodeAt(0) - 64;
    return Math.max(0, value - 1);
  }

  function cellValue(attrs, body, sharedStrings, dateStyles) {
    const type = attr(attrs, "t");
    const styleIndex = Number(attr(attrs, "s"));
    if (type === "inlineStr") return extractTextTags(body);
    const raw = decodeXml(body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1] ?? "");
    if (type === "s") return sharedStrings[Number(raw)] ?? "";
    if (type === "str") return raw;
    if (type === "b") return raw === "1" ? "نعم" : "لا";
    if (type === "e") return raw ? `خطأ: ${raw}` : "خطأ";
    if (raw === "") return "";
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return dateStyles.has(styleIndex) ? excelSerialToText(numeric) : numeric;
    return raw;
  }

  function parseRangeReference(reference) {
    const match = String(reference || "").match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!match) return null;
    return {
      startCol: columnIndex(match[1]),
      startRow: Math.max(0, Number(match[2]) - 1),
      endCol: columnIndex(match[3]),
      endRow: Math.max(0, Number(match[4]) - 1)
    };
  }

  function parseWorksheet(xml, sharedStrings, dateStyles) {
    const matrix = [];
    const rowHeights = new Map();
    const hiddenRows = new Set();
    const columnWidths = new Map();
    const hiddenColumns = new Set();
    if (!xml) return { matrix, merges: [], rowHeights, hiddenRows, columnWidths, hiddenColumns, rightToLeft: false, dimension: null };

    const colRegex = /<col\b([^>]*?)(?:\/>|>[\s\S]*?<\/col>)/gi;
    let colMatch;
    while ((colMatch = colRegex.exec(xml))) {
      const min = Math.max(1, Number(attr(colMatch[1], "min")) || 1);
      const max = Math.max(min, Number(attr(colMatch[1], "max")) || min);
      const width = Number(attr(colMatch[1], "width"));
      const hidden = ["1", "true"].includes(attr(colMatch[1], "hidden").toLowerCase());
      for (let oneBased = min; oneBased <= Math.min(max, 512); oneBased++) {
        if (Number.isFinite(width)) columnWidths.set(oneBased - 1, width);
        if (hidden) hiddenColumns.add(oneBased - 1);
      }
    }

    const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(xml))) {
      const declaredRow = Number(attr(rowMatch[1], "r"));
      const rowIndex = Number.isFinite(declaredRow) && declaredRow > 0 ? declaredRow - 1 : matrix.length;
      const height = Number(attr(rowMatch[1], "ht"));
      if (Number.isFinite(height)) rowHeights.set(rowIndex, height);
      if (["1", "true"].includes(attr(rowMatch[1], "hidden").toLowerCase())) hiddenRows.add(rowIndex);
      const row = matrix[rowIndex] || [];
      const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[2]))) {
        const ref = attr(cellMatch[1], "r");
        const col = ref ? columnIndex(ref) : row.length;
        row[col] = cellValue(cellMatch[1], cellMatch[2] || "", sharedStrings, dateStyles);
      }
      matrix[rowIndex] = row;
    }

    const merges = [];
    const mergeRegex = /<mergeCell\b([^>]*?)(?:\/>|>[\s\S]*?<\/mergeCell>)/gi;
    let mergeMatch;
    while ((mergeMatch = mergeRegex.exec(xml))) {
      const parsed = parseRangeReference(attr(mergeMatch[1], "ref"));
      if (parsed) merges.push(parsed);
    }

    const mergeMap = new Map();
    for (const merge of merges) {
      const anchor = matrix[merge.startRow]?.[merge.startCol] ?? "";
      for (let row = merge.startRow; row <= merge.endRow; row++) {
        for (let col = merge.startCol; col <= merge.endCol; col++) {
          mergeMap.set(`${row}:${col}`, { ...merge, anchor });
        }
      }
    }

    const viewAttrs = xml.match(/<sheetView\b([^>]*)>/i)?.[1] || "";
    const rightToLeft = ["1", "true"].includes(attr(viewAttrs, "rightToLeft").toLowerCase());
    const dimensionAttrs = xml.match(/<dimension\b([^>]*)\/?\s*>/i)?.[1] || "";
    const dimension = attr(dimensionAttrs, "ref") || null;
    return { matrix: Array.from({ length: matrix.length }, (_, index) => matrix[index] || []), merges, mergeMap, rowHeights, hiddenRows, columnWidths, hiddenColumns, rightToLeft, dimension };
  }

  function valueAt(layout, row, col) {
    const direct = layout.matrix[row]?.[col];
    if (String(direct ?? "").trim() !== "") return direct;
    const merged = layout.mergeMap.get(`${row}:${col}`);
    return merged ? merged.anchor : "";
  }

  function cleanText(value) {
    return String(value ?? "").replace(/[\u200e\u200f\u202a-\u202e]/g, " ").replace(/\s+/g, " ").trim();
  }

  function normalizedText(value) {
    return cleanText(value).replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
  }

  function arabicRatio(text) {
    const chars = cleanText(text).replace(/\s/g, "");
    if (!chars.length) return 0;
    return (chars.match(/[\u0600-\u06ff]/g) || []).length / chars.length;
  }

  function maxUsedColumns(layout) {
    return Math.max(0, ...layout.matrix.map(row => row.length));
  }

  function headerPath(layout, startRow, height, col) {
    const parts = [];
    const seen = new Set();
    for (let row = startRow; row < Math.min(layout.matrix.length, startRow + height); row++) {
      const text = cleanText(valueAt(layout, row, col));
      const key = normalizedText(text);
      if (!text || seen.has(key)) continue;
      seen.add(key);
      parts.push(text);
    }
    return parts.join(" - ");
  }

  function buildHeaderGroups(layout, startRow, height) {
    const maxColumns = maxUsedColumns(layout);
    const physical = [];
    for (let col = 0; col < maxColumns; col++) {
      if (layout.hiddenColumns.has(col)) continue;
      physical.push({ col, header: headerPath(layout, startRow, height, col) });
    }

    const groups = [];
    for (const item of physical) {
      const key = normalizedText(item.header);
      if (!key) continue;
      const previous = groups.at(-1);
      if (previous && previous.endCol + 1 === item.col && previous.key === key) {
        previous.endCol = item.col;
      } else {
        groups.push({ startCol: item.col, endCol: item.col, header: item.header, key });
      }
    }
    return groups;
  }

  function groupValue(layout, rowIndex, group) {
    const values = [];
    const seen = new Set();
    for (let col = group.startCol; col <= group.endCol; col++) {
      const text = cleanText(layout.matrix[rowIndex]?.[col] ?? "");
      const key = normalizedText(text);
      if (!text || seen.has(key)) continue;
      seen.add(key);
      values.push(text);
    }
    return values.join(" | ");
  }

  function isRepeatedHeader(values, groups) {
    const matches = values.filter((value, index) => normalizedText(value) === normalizedText(groups[index]?.header)).length;
    return matches >= Math.max(2, Math.ceil(groups.length * 0.6));
  }

  function dataRowStrength(values) {
    const usable = values.filter(value => cleanText(value) !== "");
    if (!usable.length) return 0;
    const numeric = usable.filter(value => /^-?\d+(?:[.,]\d+)?$/.test(cleanText(value))).length;
    const meaningfulText = usable.filter(value => cleanText(value).length >= 2 && cleanText(value) !== ":").length;
    return usable.length * 2 + numeric + meaningfulText;
  }

  function headerBandScore(layout, startRow, height, groups) {
    if (groups.length < 2 || groups.length > 40) return -Infinity;
    const headers = groups.map(group => group.header);
    const headerText = normalizedText(headers.join(" "));
    const keywords = [
      "اسم الطالب", "اسم المعلم", "الدرجه", "درجة عنصر", "عنصر الماده", "المستوى", "الملاحظات", "حالة القيد",
      "الجنسية", "الصف", "الشعبه", "المجموع", "النسبه", "بنود التقويم", "المتوسط", "البيان", "الماده", "م"
    ];
    const keywordHits = keywords.filter(keyword => {
      const normalized = normalizedText(keyword);
      return normalized.length === 1
        ? groups.some(group => group.key === normalized)
        : headerText.includes(normalized);
    }).length;
    const textHeaders = headers.filter(value => cleanText(value) && !/^[-+]?\d+(?:[.,]\d+)?$/.test(cleanText(value))).length;
    const generic = headers.filter(value => /^عمود\s*\d+$/i.test(cleanText(value)) || cleanText(value) === ":").length;
    let populatedRows = 0;
    let rowStrength = 0;
    const sampleEnd = Math.min(layout.matrix.length, startRow + height + 18);
    for (let row = startRow + height; row < sampleEnd; row++) {
      if (layout.hiddenRows.has(row)) continue;
      const values = groups.map(group => groupValue(layout, row, group));
      const nonEmpty = values.filter(value => cleanText(value)).length;
      if (nonEmpty >= Math.max(2, Math.ceil(groups.length * 0.35)) && !isRepeatedHeader(values, groups)) {
        populatedRows += 1;
        rowStrength += dataRowStrength(values);
      }
    }
    const giantSpans = groups.filter(group => group.endCol - group.startCol >= 10).length;
    return groups.length * 5 + keywordHits * 11 + textHeaders * 2 + populatedRows * 5 + Math.min(30, rowStrength / 4) - generic * 8 - giantSpans * 10 - (height - 1) * 2;
  }

  function rowLooksLikeData(layout, rowIndex) {
    const values = (layout.matrix[rowIndex] || []).map(cleanText).filter(Boolean);
    if (values.length < 2) return false;
    const numeric = values.filter(value => /^-?\d+(?:[.,]\d+)?$/.test(value)).length;
    const longText = values.filter(value => value.length >= 18).length;
    const dataTerms = values.filter(value => ["اختبار", "التقويم المستمر", "منقول", "باق", "عماني"].includes(normalizedText(value))).length;
    return (numeric >= 1 && longText >= 1) || numeric >= 3 || (dataTerms >= 1 && values.length >= 3);
  }

  function chooseHeaderBand(layout) {
    const searchRows = Math.min(layout.matrix.length, 90);
    let best = null;
    for (let startRow = 0; startRow < searchRows; startRow++) {
      if (layout.hiddenRows.has(startRow)) continue;
      for (let height = 1; height <= 3 && startRow + height <= searchRows; height++) {
        if (height > 1 && Array.from({ length: height - 1 }, (_, offset) => startRow + offset + 1).some(row => rowLooksLikeData(layout, row))) continue;
        const groups = buildHeaderGroups(layout, startRow, height);
        const score = headerBandScore(layout, startRow, height, groups) - (height - 1) * 12;
        if (!best || score > best.score) best = { startRow, height, groups, score };
      }
    }
    return best;
  }

  function shouldReverseGroups(layout, groups) {
    if (layout.rightToLeft) return true;
    if (!groups.length) return false;
    const text = groups.map(group => group.header).join(" ");
    if (arabicRatio(text) < 0.35) return false;
    const left = normalizedText(groups[0].header);
    const right = normalizedText(groups.at(-1).header);
    const rightAnchors = new Set(["م", "البيان", "اسم الطالب", "اسم المعلم", "الصف", "الماده"]);
    return rightAnchors.has(right) || left.includes("ملاحظ") || left.includes("المجموع");
  }

  function makeUniqueHeaders(values) {
    const counts = new Map();
    return values.map((value, index) => {
      const base = cleanText(value) || `عمود ${index + 1}`;
      const count = (counts.get(base) || 0) + 1;
      counts.set(base, count);
      return count === 1 ? base : `${base} (${count})`;
    });
  }

  function collectPreamble(layout, endRow) {
    const values = [];
    const seen = new Set();
    for (let row = 0; row < Math.max(0, endRow); row++) {
      for (const value of layout.matrix[row] || []) {
        const text = cleanText(value);
        const key = normalizedText(text);
        if (!text || text === ":" || seen.has(key)) continue;
        seen.add(key);
        values.push(text);
      }
    }
    const titlePatterns = [/كشف/i, /تقرير/i, /احصائي/i, /إحصائي/i, /استماره/i, /استمارة/i, /نتائج/i, /زيارة/i];
    const titleCandidates = values.filter(value => titlePatterns.some(pattern => pattern.test(value)));
    const title = [...titleCandidates].sort((a, b) => b.length - a.length)[0] || [...values].sort((a, b) => b.length - a.length)[0] || "";
    return { values: values.slice(0, 40), title };
  }

  function semanticHeaderOrder(groups) {
    const priority = [
      /^م$/i, /اسم الطالب|اسم المعلم|الاسم/i, /الجنس/i, /حاله القيد|حالة القيد/i, /الصف|الشعبه|الشعبة/i,
      /عنصر الماده|عنصر المادة/i, /درجة عنصر|الدرجه|الدرجة/i, /المستوى/i, /دور ثاني/i, /الملاحظ/i
    ];
    const rank = (header, originalIndex) => {
      const index = priority.findIndex(pattern => pattern.test(cleanText(header)));
      return index < 0 ? 100 + originalIndex : index;
    };
    const recognized = groups.filter(group => priority.some(pattern => pattern.test(cleanText(group.header)))).length;
    if (recognized < Math.min(3, groups.length)) return groups;
    return groups.map((group, index) => ({ ...group, originalIndex: index }))
      .sort((a, b) => rank(a.header, a.originalIndex) - rank(b.header, b.originalIndex));
  }

  function matrixToTable(layout) {
    const selected = chooseHeaderBand(layout);
    if (!selected || !Number.isFinite(selected.score)) {
      return { headers: [], rows: [], headerRow: -1, matrix: layout.matrix, score: -Infinity, metadata: {}, normalization: {} };
    }

    let groups = selected.groups;
    const rtlReordered = shouldReverseGroups(layout, groups);
    if (rtlReordered) groups = [...groups].reverse();
    groups = semanticHeaderOrder(groups);
    const headers = makeUniqueHeaders(groups.map(group => group.header));
    const rows = [];
    let skippedRows = 0;
    let repeatedHeaderRows = 0;
    let footerRows = 0;

    const serialIndex = headers.findIndex(header => normalizedText(header) === "م");
    for (let rowIndex = selected.startRow + selected.height; rowIndex < layout.matrix.length; rowIndex++) {
      if (layout.hiddenRows.has(rowIndex)) { skippedRows += 1; continue; }
      const physicalValues = groups.map(group => groupValue(layout, rowIndex, group));
      const nonEmpty = physicalValues.filter(value => cleanText(value)).length;
      if (!nonEmpty) { skippedRows += 1; continue; }
      if (isRepeatedHeader(physicalValues, groups)) { repeatedHeaderRows += 1; continue; }
      const combined = normalizedText(physicalValues.join(" "));
      if ((combined.includes("طبع بواسطه") || combined.includes("رقم الصفحه")) && nonEmpty <= Math.max(2, Math.ceil(groups.length * 0.4))) {
        footerRows += 1;
        continue;
      }
      if (nonEmpty < Math.max(2, Math.ceil(groups.length * 0.35))) { skippedRows += 1; continue; }
      if (serialIndex >= 0) {
        const serial = cleanText(physicalValues[serialIndex]);
        if (!/^\d+$/.test(serial) && nonEmpty < Math.ceil(groups.length * 0.8)) { skippedRows += 1; continue; }
      }
      rows.push(Object.fromEntries(headers.map((header, index) => [header, physicalValues[index] ?? ""])));
    }

    const preamble = collectPreamble(layout, selected.startRow);
    const originalColumns = maxUsedColumns(layout);
    const coveredColumns = new Set();
    for (const group of groups) for (let col = group.startCol; col <= group.endCol; col++) coveredColumns.add(col);
    const narrowColumns = [...layout.columnWidths.entries()].filter(([, width]) => width > 0 && width <= 2.5).length;
    const veryShortRows = [...layout.rowHeights.values()].filter(height => height > 0 && height <= 1.5).length;
    const isMinistryStyle = layout.merges.length >= 5 || narrowColumns >= 2 || veryShortRows >= 2 || selected.startRow >= 3;

    return {
      headers,
      rows,
      headerRow: selected.startRow + 1,
      headerEndRow: selected.startRow + selected.height,
      matrix: layout.matrix,
      score: selected.score,
      metadata: { title: preamble.title, preamble: preamble.values },
      normalization: {
        engine: "ministry-excel-normalizer-v1",
        applied: isMinistryStyle,
        originalRows: layout.matrix.length,
        originalColumns,
        logicalColumns: headers.length,
        retainedRows: rows.length,
        removedSpacerRows: skippedRows,
        removedPhysicalColumns: Math.max(0, originalColumns - coveredColumns.size),
        repeatedHeaderRows,
        footerRows,
        mergeCount: layout.merges.length,
        narrowColumns,
        veryShortRows,
        rtlReordered,
        headerBand: `${selected.startRow + 1}-${selected.startRow + selected.height}`,
        reportTitle: preamble.title
      }
    };
  }

  async function readWorkbook(file) {
    const zip = createZipReader(await file.arrayBuffer());
    const workbookXml = await zip.readText("xl/workbook.xml");
    const relsXml = await zip.readText("xl/_rels/workbook.xml.rels");
    if (!workbookXml || !relsXml) throw new Error("لم يُعثر على بنية مصنف Excel المتوقعة.");

    const relationships = parseRelationships(relsXml);
    const sheets = parseWorkbookSheets(workbookXml, relationships);
    if (!sheets.length) throw new Error("المصنف لا يحتوي أوراق عمل قابلة للقراءة.");

    const sharedStrings = parseSharedStrings(await zip.readText("xl/sharedStrings.xml"));
    const dateStyles = parseStyles(await zip.readText("xl/styles.xml"));
    const parsedSheets = [];

    for (const sheet of sheets) {
      const xml = await zip.readText(sheet.path);
      if (!xml) continue;
      const layout = parseWorksheet(xml, sharedStrings, dateStyles);
      const table = matrixToTable(layout);
      parsedSheets.push({ ...sheet, ...table });
    }

    const usableSheets = parsedSheets.filter(sheet => sheet.headers.length >= 2 && sheet.rows.length >= 1);
    if (!usableSheets.length) throw new Error("لم يُعثر على جدول واضح داخل أوراق المصنف.");
    usableSheets.sort((a, b) => (b.rows.length * Math.max(1, b.headers.length)) - (a.rows.length * Math.max(1, a.headers.length)));
    return { name: file.name, sheets: usableSheets };
  }

  window.TaqareerXlsx = { readWorkbook };
})();
