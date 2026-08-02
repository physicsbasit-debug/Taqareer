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

  function parseWorksheet(xml, sharedStrings, dateStyles) {
    const matrix = [];
    if (!xml) return matrix;
    const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(xml))) {
      const declaredRow = Number(attr(rowMatch[1], "r"));
      const rowIndex = Number.isFinite(declaredRow) && declaredRow > 0 ? declaredRow - 1 : matrix.length;
      const row = matrix[rowIndex] || [];
      const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[2]))) {
        const ref = attr(cellMatch[1], "r");
        const col = ref ? columnIndex(ref) : row.length;
        row[col] = cellValue(cellMatch[1], cellMatch[2], sharedStrings, dateStyles);
      }
      matrix[rowIndex] = row;
    }
    return matrix.map(row => row || []);
  }

  function compactMatrix(matrix) {
    let rows = Array.from({ length: matrix.length }, (_, index) => (matrix[index] || []).map(value => value ?? ""));
    while (rows.length && rows.at(-1).every(value => String(value).trim() === "")) rows.pop();
    const maxColumns = Math.max(0, ...rows.map(row => row.length));
    let lastUsed = -1;
    for (let col = 0; col < maxColumns; col++) {
      if (rows.some(row => String(row[col] ?? "").trim() !== "")) lastUsed = col;
    }
    return rows.map(row => Array.from({ length: lastUsed + 1 }, (_, col) => row[col] ?? ""));
  }

  function headerScore(row, nextRows) {
    const nonEmpty = row.filter(value => String(value).trim() !== "");
    if (nonEmpty.length < 2) return -Infinity;
    const textCount = nonEmpty.filter(value => !Number.isFinite(Number(value)) || String(value).trim() === "").length;
    const unique = new Set(nonEmpty.map(value => String(value).trim().toLowerCase())).size;
    const keywords = ["اسم", "الطالب", "الدرجه", "الدرجة", "المستوى", "المتوسط", "الصف", "الماده", "المادة", "البند", "التقويم", "المجموع", "النسبه", "النسبة"];
    const keywordHits = nonEmpty.filter(value => keywords.some(key => String(value).includes(key))).length;
    const populatedBelow = nextRows.reduce((sum, candidate) => sum + Math.min(nonEmpty.length, candidate.filter(value => String(value).trim() !== "").length), 0);
    return nonEmpty.length * 3 + textCount * 2 + unique + keywordHits * 5 + Math.min(15, populatedBelow / 2);
  }

  function makeUniqueHeaders(values) {
    const counts = new Map();
    return values.map((value, index) => {
      const base = String(value ?? "").trim() || `عمود ${index + 1}`;
      const count = (counts.get(base) || 0) + 1;
      counts.set(base, count);
      return count === 1 ? base : `${base} (${count})`;
    });
  }

  function matrixToTable(matrix) {
    const compact = compactMatrix(matrix);
    if (!compact.length) return { headers: [], rows: [], headerRow: -1, matrix: compact, score: -Infinity };
    const candidates = compact.slice(0, 25);
    let bestIndex = 0;
    let bestScore = -Infinity;
    candidates.forEach((row, index) => {
      const score = headerScore(row, compact.slice(index + 1, index + 5));
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    const headers = makeUniqueHeaders(compact[bestIndex] || []);
    const rows = compact.slice(bestIndex + 1)
      .filter(row => row.some(value => String(value).trim() !== ""))
      .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
    return { headers, rows, headerRow: bestIndex + 1, matrix: compact, score: bestScore };
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
      const table = matrixToTable(parseWorksheet(xml, sharedStrings, dateStyles));
      parsedSheets.push({ ...sheet, ...table });
    }

    const usableSheets = parsedSheets.filter(sheet => sheet.headers.length >= 2 && sheet.rows.length >= 1);
    if (!usableSheets.length) throw new Error("لم يُعثر على جدول واضح داخل أوراق المصنف.");
    usableSheets.sort((a, b) => (b.rows.length * Math.max(1, b.headers.length)) - (a.rows.length * Math.max(1, a.headers.length)));
    return { name: file.name, sheets: usableSheets };
  }

  window.TaqareerXlsx = { readWorkbook };
})();
