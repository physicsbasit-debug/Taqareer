(() => {
  "use strict";

  const VERSION = "2.4.0";
  const HIGH_CONFIDENCE = 0.85;
  const REVIEW_CONFIDENCE = 0.60;

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[\u200e\u200f\u202a-\u202e]/g, " ")
      .replace(/ـ/g, "")
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeDigits(value) {
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    return String(value ?? "").replace(/[٠-٩٫٬]/g, char => map[char]);
  }

  function clean(value) {
    return String(value ?? "")
      .replace(/[|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function lineText(line) { return clean(line?.text || ""); }
  function lineCells(line) {
    const cells = Array.isArray(line?.cells) ? line.cells : [];
    return cells.map(clean).filter(Boolean);
  }
  function lineCellEntries(line) {
    const cells = Array.isArray(line?.cells) ? line.cells : [];
    const boxes = Array.isArray(line?.cellBoxes) ? line.cellBoxes : [];
    return cells.map((value, index) => {
      const box = boxes[index] || null;
      return {
        text: clean(value),
        x0: Number.isFinite(Number(box?.x0)) ? Number(box.x0) : NaN,
        x1: Number.isFinite(Number(box?.x1)) ? Number(box.x1) : NaN,
        center: Number.isFinite(Number(box?.center)) ? Number(box.center) : NaN,
      };
    }).filter(entry => entry.text);
  }

  function provenance(pageNumber, line, confidence = 1) {
    return {
      page: Number(pageNumber || 1),
      line: Number(line?.lineIndex || 0) || null,
      sourceText: lineText(line),
      confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    };
  }

  const METADATA_LABELS = Object.freeze([
    { key: "region", pattern: /^(?:المنطقه|المنطقة)(?:\s|:|$)|محافظه\s|محافظة\s/ },
    { key: "school", pattern: /^(?:المدرسه|المدرسة)(?:\s|:|$)|\bالصفوف\b.*(?:للبنين|للبنات)|(?:للبنين|للبنات).*\bالصفوف\b/ },
    { key: "schoolCode", pattern: /رمز\s*المدرس[هة]/ },
    { key: "academicYear", pattern: /العام\s*الدراس[يى]/ },
    { key: "reportDate", pattern: /^(?:التاريخ)(?:\s|:|$)/ },
    { key: "time", pattern: /^(?:الساعه|الساعة)(?:\s|:|$)/ },
    { key: "pageNumber", pattern: /رقم\s*الصفح[هة]/ },
    { key: "wilaya", pattern: /^(?:الولايه|الولاية|الوليه)(?:\s|:|$)/ },
    { key: "educationSystem", pattern: /نظام\s*التعليم/ },
    { key: "term", pattern: /^(?:الدور|الفصل\s*الدراس[يى])(?:\s|:|$)/ },
  ]);

  const TABLE_HEADER_TERMS = Object.freeze([
    { key: "serial", canonical: "م", pattern: /^(?:م|الرقم|رقم\s*(?:الطالب|السجل|التسلسل))$/ },
    { key: "item", canonical: "بنود التقويم", pattern: /بنود?\s*التقويم|عنصر\s*التقويم|المؤشر|^البند$/ },
    { key: "mean", canonical: "المتوسط", pattern: /^المتوسط$|المتوسط\s|متوسط\s/ },
    { key: "mode", canonical: "الأكثر تكرارا", pattern: /الاكثر\s*تكرار|الأكثر\s*تكرار|المنوال/ },
    { key: "student", canonical: "اسم الطالب", pattern: /اسم\s*الطالب|^الطالب$|^الاسم$/ },
    { key: "nationality", canonical: "الجنسية", pattern: /^الجنسي[هة]$/ },
    { key: "enrollment", canonical: "حالة القيد", pattern: /حاله\s*القيد|حالة\s*القيد|^القيد$/ },
    { key: "score", canonical: "الدرجة", pattern: /^الدرج[هة]$|^المجموع$|الدرجه\s|الدرجة\s/ },
    { key: "level", canonical: "المستوى", pattern: /^المستو[يى]$|المستوى\s|المستوي\s/ },
    { key: "second_round", canonical: "دور ثانٍ", pattern: /دور\s*ثان/ },
    { key: "category", canonical: "الفئة", pattern: /^الفئ[هة]$|التصنيف/ },
    { key: "value", canonical: "القيمة", pattern: /^القيم[هة]$|النسب[هة]|النسبة/ },
    { key: "date", canonical: "التاريخ", pattern: /^التاريخ$/ },
    { key: "subject", canonical: "المادة", pattern: /^الماد[هة]$/ },
    { key: "grade", canonical: "الصف", pattern: /^الصف$/ },
    { key: "class", canonical: "الفصل", pattern: /^الفصل$/ },
    { key: "notes", canonical: "الملاحظات", pattern: /الملاحظات|^ملاحظات$/ },
  ]);

  const SECTION_HEADINGS = Object.freeze([
    { id: "strengths", label: "جوانب الإجادة", pattern: /جوانب.*(?:الاجاده|الجاده|الايجابيه).*ادلتها|مواطن\s*القوه/ },
    { id: "development", label: "جوانب التطوير", pattern: /الجوانب.*تحتاج.*تطوير|اولويات\s*التطوير|فرص\s*التحسين/ },
    { id: "support", label: "الدعم المقدم", pattern: /^الدعم\s*المقدم$/ },
    { id: "discussion", label: "المداولة الإشرافية", pattern: /مداوله\s*اشرافيه|مداولة\s*إشرافية/ },
    { id: "recommendations", label: "التوصيات", pattern: /^التوصيات$/ },
    { id: "findings", label: "النتائج", pattern: /^النتائج$|^الخلاصه$|^الخلاصة$/ },
    { id: "notes", label: "الملاحظات", pattern: /^الملاحظات$/ },
  ]);

  const TITLE_SIGNALS = /تقرير|استماره|استمارة|زياره\s*اشرافيه|زيارة\s*إشرافية|فحص\s*اعمال|فحص\s*أعمال|كشف|احصائيه|إحصائية|مواطن\s*القوه|مواطن\s*القوة/;
  const PRINTED_BY = /(?:طبع|بع)\s*بواسطه/;
  const TIME_ONLY = /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*[صم]?\s*$/;
  const PAGE_ONLY = /^(?:\d+\s*:\s*)?(?:رقم\s*الصفح[هة])|(?:رقم\s*الصفح[هة])\s*:?\s*\d+$/;

  function metadataLabel(text) {
    const value = normalize(text);
    return METADATA_LABELS.find(item => item.pattern.test(value)) || null;
  }

  function sectionHeading(text) {
    const value = normalize(text);
    return SECTION_HEADINGS.find(item => item.pattern.test(value)) || null;
  }

  function tableHeaderMatches(text) {
    const value = normalize(text);
    return TABLE_HEADER_TERMS.filter(term => term.pattern.test(value));
  }

  function isNoiseText(text) {
    const raw = clean(text);
    const n = normalize(raw);
    if (!raw) return true;
    if (PRINTED_BY.test(n)) return true;
    if (TIME_ONLY.test(normalizeDigits(raw))) return true;
    if (PAGE_ONLY.test(n)) return true;
    if (/^[\s:：|\-–—/]+$/.test(raw)) return true;
    return false;
  }

  function uniqueHeaderNames(values) {
    const counts = new Map();
    return values.map((value, index) => {
      const base = clean(value) || `حقل ${index + 1}`;
      const key = normalize(base);
      const count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return count === 1 ? base : `${base} (${count})`;
    });
  }

  function inferHeaderSpec(line) {
    const rawEntries = lineCellEntries(line).filter(entry => !/^[\s:：|\-–—/]+$/.test(entry.text));
    const rawCells = rawEntries.map(entry => entry.text);
    const columns = rawEntries.map((entry, sourceIndex) => {
      const cell = entry.text;
      const matches = tableHeaderMatches(cell);
      const match = matches[0] || null;
      return {
        sourceIndex,
        sourceText: cell,
        role: match?.key || "unknown",
        header: match?.canonical || cell,
        matched: Boolean(match),
        x0: entry.x0,
        x1: entry.x1,
        center: entry.center,
      };
    });
    const knownRoles = [...new Set(columns.filter(column => column.matched).map(column => column.role))];

    if (knownRoles.length < 2) {
      const collapsed = [];
      for (const match of tableHeaderMatches(lineText(line))) {
        if (!collapsed.some(existing => existing.key === match.key)) collapsed.push(match);
      }
      if (collapsed.length < 2) return null;
      const preferredOrder = ["item", "student", "subject", "grade", "class", "date", "score", "mean", "mode", "level", "value", "category", "notes"];
      collapsed.sort((a, b) => preferredOrder.indexOf(a.key) - preferredOrder.indexOf(b.key));
      return {
        headers: collapsed.map(item => item.canonical),
        roles: collapsed.map(item => item.key),
        columns: collapsed.map((item, sourceIndex) => ({ sourceIndex, sourceText: item.canonical, role: item.key, header: item.canonical, matched: true })),
        sourceCellCount: collapsed.length,
        alignmentMode: "collapsed-header",
        confidence: Math.min(0.92, 0.68 + collapsed.length * 0.07),
      };
    }

    const dimensionMeasureOnly = columns.every(column => column.matched)
      && columns.some(column => column.role === "item")
      && columns.some(column => ["mean", "value", "mode"].includes(column.role))
      && !columns.some(column => ["student", "serial", "nationality", "enrollment"].includes(column.role));
    let orderedColumns = columns;
    if (dimensionMeasureOnly) {
      const preferredOrder = ["item", "mean", "mode", "value", "category", "notes"];
      orderedColumns = [...columns].sort((a, b) => preferredOrder.indexOf(a.role) - preferredOrder.indexOf(b.role));
    }
    const headers = uniqueHeaderNames(orderedColumns.map(column => column.header));
    orderedColumns = orderedColumns.map((column, index) => ({ ...column, header: headers[index] }));
    const coverage = columns.length ? columns.filter(column => column.matched).length / columns.length : 0;
    return {
      headers,
      roles: orderedColumns.map(column => column.role),
      columns: orderedColumns,
      sourceCellCount: rawCells.length,
      alignmentMode: dimensionMeasureOnly ? "dimension-measure" : "semantic-column-order",
      confidence: Math.min(0.99, 0.72 + knownRoles.length * 0.035 + coverage * 0.12),
    };
  }

  function numericValue(value) {
    const text = normalizeDigits(clean(value)).replace(/%/g, "").replace(/,/g, "");
    if (!/^[-+]?\d+(?:\.\d+)?$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function splitCollapsedMeasureRow(text) {
    const raw = clean(text);
    const match = raw.match(/^(.*?)(?:\s+)([-+]?\d+(?:[.,]\d+)?%?)\s*$/);
    if (!match) return null;
    const label = clean(match[1]);
    const value = clean(match[2]);
    return label && Number.isFinite(numericValue(value)) ? { label, value } : null;
  }

  function rowFromDimensionMeasure(line, headerSpec) {
    const roles = headerSpec.roles || [];
    const headers = headerSpec.headers || [];
    const itemIndex = roles.indexOf("item");
    const measureIndex = roles.findIndex(role => ["mean", "score", "value"].includes(role));
    if (itemIndex < 0 || measureIndex < 0) return null;

    const cells = lineCells(line);
    const textCells = cells.filter(value => /[\u0600-\u06FFA-Za-z]/.test(value) && !tableHeaderMatches(value).length);
    const numericCells = cells
      .map(value => ({ raw: value, value: numericValue(value) }))
      .filter(item => Number.isFinite(item.value));

    let item = textCells.sort((a, b) => b.length - a.length)[0] || "";
    let measure = numericCells
      .filter(candidate => candidate.value >= -100000 && candidate.value <= 100000)
      .sort((a, b) => {
        const aPlausibleOrdinal = a.value >= 0 && a.value <= 10 ? 1 : 0;
        const bPlausibleOrdinal = b.value >= 0 && b.value <= 10 ? 1 : 0;
        return bPlausibleOrdinal - aPlausibleOrdinal;
      })[0]?.raw || "";

    if (!item || !measure) {
      const collapsed = splitCollapsedMeasureRow(lineText(line));
      if (collapsed) {
        item ||= collapsed.label;
        measure ||= collapsed.value;
      }
    }
    if (!item || !Number.isFinite(numericValue(measure))) return null;

    const row = Object.fromEntries(headers.map(header => [header, ""]));
    row[headers[itemIndex]] = item;
    row[headers[measureIndex]] = measure;

    const modeIndex = roles.indexOf("mode");
    if (modeIndex >= 0) {
      const candidates = cells.filter(value => value !== item && value !== measure && /\d/.test(normalizeDigits(value)));
      if (candidates.length) row[headers[modeIndex]] = candidates[0];
    }
    return row;
  }

  function geometryAlignedValues(line, headerSpec) {
    const columns = Array.isArray(headerSpec?.columns) ? headerSpec.columns : [];
    const items = Array.isArray(line?.items) ? line.items.filter(item => clean(item?.str)) : [];
    if (!columns.length || !items.length || columns.some(column => !Number.isFinite(Number(column?.center)))) return null;

    const aligner = window.TaqareerPdfColumnAlignment;
    const roles = columns.map(column => String(column?.role || "unknown"));
    const centers = columns.map(column => Number(column.center));
    const sortedCenters = [...centers].sort((a, b) => a - b);
    const gaps = sortedCenters.slice(1).map((value, index) => Math.abs(value - sortedCenters[index])).filter(value => value > 0);
    const typicalGap = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 70;
    const buckets = columns.map(() => []);

    function columnScore(fragment, item, column, index) {
      if (fragment.forcedRole) return fragment.forcedRole === roles[index] ? 10 : -10;
      const x = Number(item?.x);
      const width = Math.abs(Number(item?.width) || 0);
      const center = Number.isFinite(x) ? x + width / 2 : NaN;
      const distance = Number.isFinite(center) ? Math.abs(center - centers[index]) : typicalGap * 2;
      const spatial = Math.max(0, 1 - distance / Math.max(24, typicalGap * 1.8));
      const semantic = aligner?.valueRoleScore ? Number(aligner.valueRoleScore(roles[index], fragment.text) || 0) : 0;
      const semanticWeight = roles[index] === "unknown" ? 0.35 : 0.72;
      return semantic * semanticWeight + spatial * (1 - semanticWeight);
    }

    for (const item of items) {
      const x = Number(item?.x);
      const width = Math.abs(Number(item?.width) || 0);
      if (!Number.isFinite(x)) continue;
      const fragments = aligner?.splitCompositeValue
        ? aligner.splitCompositeValue(item.str, roles)
        : [{ text: clean(item.str), forcedRole: "" }];
      for (const fragment of fragments) {
        if (!clean(fragment?.text)) continue;
        let bestIndex = 0;
        let bestScore = -Infinity;
        columns.forEach((column, index) => {
          const score = columnScore(fragment, item, column, index);
          if (score > bestScore) { bestScore = score; bestIndex = index; }
        });
        buckets[bestIndex].push({ ...item, str: fragment.text, x, width, semanticScore: bestScore });
      }
    }

    const rtl = Boolean(line?.rtl);
    return buckets.map(bucket => {
      if (!bucket.length) return "";
      const ordered = [...bucket].sort((a, b) => rtl ? b.x - a.x : a.x - b.x);
      const seen = new Set();
      const values = [];
      for (const item of ordered) {
        const value = clean(item.str);
        const key = normalize(value);
        if (!value || seen.has(key)) continue;
        seen.add(key);
        values.push(value);
      }
      return clean(values.join(" "));
    });
  }

  function continuationCandidate(row, headerSpec) {
    const roles = headerSpec?.roles || [];
    const serialIndex = roles.indexOf("serial");
    if (serialIndex < 0 || !row) return false;
    const serial = clean(row[headerSpec.headers[serialIndex]]);
    if (/^\d+$/.test(normalizeDigits(serial))) return false;
    const nonEmpty = headerSpec.headers
      .map((header, index) => ({ role: roles[index] || "unknown", value: clean(row[header]) }))
      .filter(item => item.value);
    return nonEmpty.length > 0 && nonEmpty.every(item => ["student", "nationality", "notes", "second_round", "unknown"].includes(item.role));
  }

  function mergeContinuationRow(previous, continuation, headerSpec) {
    if (!previous || !continuation) return previous;
    const roles = headerSpec?.roles || [];
    headerSpec.headers.forEach((header, index) => {
      const role = roles[index] || "unknown";
      const value = clean(continuation[header]);
      if (!value || !["student", "nationality", "notes", "second_round", "unknown"].includes(role)) return;
      const current = clean(previous[header]);
      previous[header] = current ? `${current} ${value}` : value;
    });
    return previous;
  }

  function rowFromCells(line, headerSpec) {
    const headers = headerSpec.headers || [];
    const cells = lineCells(line);
    if (!headers.length || (!cells.length && !(line?.items || []).length)) return null;

    if (headerSpec.roles?.includes("item") && headerSpec.roles.some(role => ["mean", "score", "value"].includes(role))) {
      const specialized = rowFromDimensionMeasure(line, headerSpec);
      if (specialized) return specialized;
    }

    const aligner = window.TaqareerPdfColumnAlignment;
    let best = null;
    if (cells.length === headers.length) {
      const aligned = aligner?.alignCells
        ? aligner.alignCells(cells, headerSpec.columns || [])
        : { values: cells, orientation: "source", score: 0.75, alternateScore: 0 };
      if ((aligned.values || []).length === headers.length) best = aligned;
    }

    const geometryValues = geometryAlignedValues(line, headerSpec);
    if (geometryValues && geometryValues.length === headers.length) {
      const geometryScore = aligner?.scoreValues
        ? aligner.scoreValues(geometryValues, headerSpec.columns || [])
        : geometryValues.filter(Boolean).length / Math.max(1, headers.length);
      if (!best || geometryScore > Number(best.score || 0) + 0.03 || cells.length !== headers.length) {
        best = { values: geometryValues, orientation: "geometry", score: geometryScore, alternateScore: Number(best?.score || 0) };
      }
    }

    if (!best || (best.values || []).length !== headers.length) return null;
    const row = Object.fromEntries(headers.map((header, index) => [header, best.values[index] ?? ""]));
    Object.defineProperty(row, "__alignment", { value: best, enumerable: false, configurable: true });
    return row;
  }

  function rowIsPlausible(row, headerSpec) {
    if (!row) return false;
    const values = Object.values(row).map(clean).filter(Boolean);
    if (values.length < 2) return false;
    const roles = headerSpec.roles || [];
    const itemIndex = roles.indexOf("item");
    const measureIndex = roles.findIndex(role => ["mean", "score", "value"].includes(role));
    if (itemIndex >= 0 && measureIndex >= 0) {
      const item = row[headerSpec.headers[itemIndex]];
      const measure = row[headerSpec.headers[measureIndex]];
      return String(item || "").trim().length >= 3 && Number.isFinite(numericValue(measure));
    }
    const alignment = row.__alignment;
    if (alignment && alignment.score < 0.48) return false;
    return values.length >= Math.max(2, Math.ceil(headerSpec.headers.length * 0.5));
  }

  function discoverTables(pageRecords, blockIndex) {
    const tables = [];
    let serial = 0;
    for (const page of pageRecords || []) {
      const lines = page.lines || [];
      for (let index = 0; index < lines.length; index += 1) {
        const headerSpec = inferHeaderSpec(lines[index]);
        if (!headerSpec) continue;
        const rows = [];
        const serialIndex = (headerSpec.roles || []).indexOf("serial");
        let misses = 0;
        let endIndex = index;
        for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
          const line = lines[cursor];
          const text = lineText(line);
          if (!text) continue;
          if (sectionHeading(text) || PRINTED_BY.test(normalize(text))) break;
          const nextHeader = inferHeaderSpec(line);
          if (nextHeader && rows.length) break;
          const block = blockIndex.get(`${page.pageNumber}:${line.lineIndex}`);
          if (block?.type === "metadata" || block?.type === "title" || block?.type === "footer") {
            if (rows.length) break;
            continue;
          }
          const row = rowFromCells(line, headerSpec);
          if (serialIndex >= 0 && continuationCandidate(row, headerSpec) && rows.length) {
            mergeContinuationRow(rows.at(-1), row, headerSpec);
            misses = 0;
            endIndex = cursor;
            continue;
          }
          const serialValue = serialIndex >= 0 && row ? normalizeDigits(clean(row[headerSpec.headers[serialIndex]])) : "";
          const serialValid = serialIndex < 0 || /^\d+$/.test(serialValue);
          if (serialValid && rowIsPlausible(row, headerSpec)) {
            rows.push(row);
            misses = 0;
            endIndex = cursor;
          } else {
            misses += 1;
            if (rows.length && misses >= 2) break;
          }
        }
        if (rows.length < 3) continue;
        const validation = window.TaqareerPdfColumnAlignment?.validateRows
          ? window.TaqareerPdfColumnAlignment.validateRows(rows, headerSpec.columns || [])
          : { score: 0.75, hardFailure: false, roles: {}, issues: [] };
        const baseConfidence = Math.min(0.99, headerSpec.confidence + Math.min(0.18, rows.length * 0.012));
        const confidence = Math.max(0, Math.min(0.99, baseConfidence * (0.82 + 0.18 * Math.max(0, Number(validation.score || 0)))));
        const status = validation.hardFailure
          ? "unresolved"
          : confidence >= HIGH_CONFIDENCE ? "accepted" : confidence >= REVIEW_CONFIDENCE ? "review" : "unresolved";
        tables.push({
          id: `table-${++serial}`,
          headers: headerSpec.headers,
          roles: headerSpec.roles,
          rows,
          confidence,
          status,
          pages: [page.pageNumber],
          provenance: {
            header: provenance(page.pageNumber, lines[index], headerSpec.confidence),
            startLine: lines[index]?.lineIndex || index + 1,
            endLine: lines[endIndex]?.lineIndex || endIndex + 1,
          },
          sourceText: lines.slice(index, endIndex + 1).map(lineText).filter(Boolean).join("\n"),
          structure: {
            kind: "flat-table",
            alignmentMode: headerSpec.alignmentMode || "legacy",
            columnAlignmentVersion: window.TaqareerPdfColumnAlignment?.VERSION || "",
            validationScore: Number(validation.score || 0),
            validationIssues: Array.isArray(validation.issues) ? validation.issues : [],
            columnRoles: (headerSpec.columns || []).map(column => ({ header: column.header, role: column.role, sourceText: column.sourceText })),
          },
        });
        index = Math.max(index, endIndex);
      }
    }
    return tables;
  }

  function academicYearFromText(text) {
    const candidates = [...normalizeDigits(text).matchAll(/(20\d{2})\s*[\/-]\s*(20\d{2})/g)];
    for (const match of candidates) {
      const first = Number(match[1]);
      const second = Number(match[2]);
      if (Math.abs(first - second) !== 1) continue;
      return first > second ? `${second}/${first}` : `${first}/${second}`;
    }
    return "";
  }

  function dateFromText(text) {
    const candidates = [...normalizeDigits(text).matchAll(/20\d{2}\s*[\/-]\s*\d{1,2}\s*[\/-]\s*\d{1,2}/g)];
    for (const match of candidates) {
      const value = match[0].replace(/\s+/g, "");
      const parts = value.split(/[\/-]/).map(Number);
      if (parts[1] >= 1 && parts[1] <= 12 && parts[2] >= 1 && parts[2] <= 31) return value;
    }
    return "";
  }

  function gradeRangeFromText(text) {
    const normalized = normalizeDigits(text);
    const match = normalized.match(/[()（）]?\s*(\d{1,2})\s*[-–—/]\s*(\d{1,2})\s*[()（）]?/);
    if (!match) return "";
    const values = [Number(match[1]), Number(match[2])].filter(value => value >= 1 && value <= 12).sort((a, b) => a - b);
    return values.length === 2 ? `${values[0]}-${values[1]}` : "";
  }

  function schoolFromText(text) {
    const raw = clean(text);
    const n = normalize(raw);
    if (!/(?:للبنين|للبنات)/.test(n)) return "";
    return raw.replace(/الصفوف/g, " ")
      .replace(/[()（）]?\s*\d{1,2}\s*[-–—/]\s*\d{1,2}\s*[()（）]?/g, " ")
      .replace(/^.*?(?:المدرس[هة]\s*[:：]?)/, " ")
      .replace(/[:：|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function subjectFromTitle(title) {
    const raw = clean(title);
    const match = raw.match(/لماد[هة]\s+([^|،؛]+?)\s*$/) || raw.match(/الماد[هة]\s*[:：-]?\s*([^|،؛]+)/);
    return clean(match?.[1] || "").replace(/^ماد[هة]\s+/, "");
  }

  function subjectFromPageRecords(pageRecords, title = "") {
    const direct = subjectFromTitle(title);
    if (direct && direct.length <= 48 && !/التاريخ|الساعه|الساعة|العام\s*الدراس/.test(normalize(direct))) return direct;
    for (const page of pageRecords || []) {
      for (const line of page.lines || []) {
        const cells = lineCells(line);
        const titleIndex = cells.findIndex(cell => TITLE_SIGNALS.test(normalize(cell)) && /ماد[هة]/.test(normalize(cell)));
        if (titleIndex < 0) continue;
        const candidates = cells.filter((cell, index) => {
          if (index === titleIndex) return false;
          const n = normalize(cell);
          if (!/[\u0600-\u06ffA-Za-z]/.test(cell) || cell.length > 48) return false;
          if (metadataLabel(cell) || TITLE_SIGNALS.test(n) || /التاريخ|الساعه|الساعة|وزار[هة]|مديري[هة]|محافظ[هة]|العام\s*الدراس/.test(n)) return false;
          if (dateFromText(cell) || academicYearFromText(cell)) return false;
          return true;
        });
        if (candidates.length) return clean(candidates.sort((a, b) => a.length - b.length)[0]).replace(/^ماد[هة]\s+/, "");
      }
    }
    return "";
  }

  function metadataValueAfterLabel(pageRecords, labelPattern) {
    for (const page of pageRecords || []) {
      for (const line of page.lines || []) {
        const entries = lineCellEntries(line);
        for (let index = 0; index < entries.length; index += 1) {
          const raw = entries[index].text;
          const n = normalize(raw);
          const inline = raw.match(/^[^:：]{1,30}[:：]\s*(.+)$/);
          if (labelPattern.test(n) && inline?.[1]) {
            const value = clean(inline[1]);
            if (value && !metadataLabel(value)) return { value, item: { pageNumber: page.pageNumber, line } };
          }
          if (!labelPattern.test(n)) continue;
          for (let offset = 1; offset <= 2; offset += 1) {
            const candidate = clean(entries[index + offset]?.text || "").replace(/^[:：]\s*/, "");
            if (!candidate || /^[\s:：|\-–—/]+$/.test(candidate) || metadataLabel(candidate)) continue;
            return { value: candidate, item: { pageNumber: page.pageNumber, line } };
          }
        }
      }
    }
    return null;
  }

  function sameHeaderSignature(table, line) {
    const spec = inferHeaderSpec(line);
    if (!spec) return false;
    return (spec.headers || []).map(normalize).join("|") === (table.headers || []).map(normalize).join("|");
  }

  function withPaginationContract(table, pageRecords) {
    const expectedPages = (pageRecords || [])
      .filter(page => (page.lines || []).some(line => sameHeaderSignature(table, line)))
      .map(page => Number(page.pageNumber))
      .filter(Number.isFinite);
    const parsedPages = [...new Set((table.pages || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    const missingPages = expectedPages.filter(page => !parsedPages.includes(page));
    const roles = table.roles || table.structure?.columnRoles?.map(item => item.role) || [];
    const serialIndex = roles.indexOf("serial");
    let serial = null;
    if (serialIndex >= 0) {
      const header = table.headers?.[serialIndex];
      const values = (table.rows || []).map(row => Number(normalizeDigits(clean(row?.[header])))).filter(Number.isInteger);
      const unique = [...new Set(values)];
      const sorted = [...unique].sort((a, b) => a - b);
      const gaps = [];
      for (let index = 1; index < sorted.length; index += 1) {
        if (sorted[index] > sorted[index - 1] + 1) gaps.push([sorted[index - 1] + 1, sorted[index] - 1]);
      }
      serial = {
        first: sorted[0] ?? null,
        last: sorted.at(-1) ?? null,
        observedCount: values.length,
        uniqueCount: unique.length,
        duplicateCount: Math.max(0, values.length - unique.length),
        gaps,
      };
    }
    const coverageRatio = expectedPages.length ? parsedPages.filter(page => expectedPages.includes(page)).length / expectedPages.length : 1;
    const pagination = { expectedPages, parsedPages, missingPages, coverageRatio, serial };
    const incompleteRepeatedTable = expectedPages.length >= 2 && missingPages.length > 0;
    return {
      ...table,
      status: incompleteRepeatedTable ? "unresolved" : table.status,
      confidence: incompleteRepeatedTable ? Math.min(Number(table.confidence || 0), 0.59) : table.confidence,
      structure: { ...(table.structure || {}), pagination },
    };
  }

  function findMetadata(pageRecords) {
    const entries = [];
    const lines = (pageRecords || []).flatMap(page => (page.lines || []).map(line => ({ pageNumber: page.pageNumber, line })));
    const text = lines.map(item => lineText(item.line)).filter(Boolean).join("\n");

    function add(key, value, item, confidence = 0.9) {
      const cleanValue = clean(value);
      if (!cleanValue || entries.some(entry => entry.key === key && normalize(entry.value) === normalize(cleanValue))) return;
      entries.push({ key, value: cleanValue, provenance: provenance(item?.pageNumber || 1, item?.line || null, confidence), confidence });
    }

    const titleItem = lines.find(item => TITLE_SIGNALS.test(normalize(lineText(item.line))) && lineText(item.line).length >= 12);
    if (titleItem) {
      const titleCell = lineCells(titleItem.line).find(cell => TITLE_SIGNALS.test(normalize(cell)) && cell.length >= 12) || lineText(titleItem.line);
      add("title", titleCell, titleItem, 0.94);
    }

    const schoolItem = lines.find(item => /(?:للبنين|للبنات)/.test(normalize(lineText(item.line))) && (/الصفوف/.test(normalize(lineText(item.line))) || gradeRangeFromText(lineText(item.line))));
    let schoolGradeRange = "";
    if (schoolItem) {
      const school = schoolFromText(lineText(schoolItem.line));
      schoolGradeRange = gradeRangeFromText(lineText(schoolItem.line));
      if (school) add("school", schoolGradeRange ? `${school} (${schoolGradeRange})` : school, schoolItem, 0.97);
      if (schoolGradeRange) add("schoolGradeRange", schoolGradeRange, schoolItem, 0.98);
    }

    const explicitGrade = metadataValueAfterLabel(pageRecords, /^الصف$/);
    if (explicitGrade?.value) {
      add("analyzedGrade", explicitGrade.value, explicitGrade.item, 0.98);
      add("grade", explicitGrade.value, explicitGrade.item, 0.98);
    } else if (schoolGradeRange) {
      add("grade", schoolGradeRange, schoolItem, 0.96);
    }

    const academic = academicYearFromText(text);
    if (academic) {
      const item = lines.find(candidate => academicYearFromText(lineText(candidate.line)));
      add("academicYear", academic, item, 0.98);
    }

    const reportDate = dateFromText(text);
    if (reportDate) {
      const item = lines.find(candidate => dateFromText(lineText(candidate.line)) === reportDate);
      add("reportDate", reportDate, item, 0.96);
    }

    const schoolCodeItem = lines.find(item => /رمز\s*المدرس[هة]/.test(normalize(lineText(item.line))));
    if (schoolCodeItem) {
      const match = normalizeDigits(lineText(schoolCodeItem.line)).match(/\b\d{3,8}\b/);
      if (match) add("schoolCode", match[0], schoolCodeItem, 0.99);
    }

    const regionItem = lines.find(item => /محافظ[هة]\s+/.test(normalize(lineText(item.line))));
    if (regionItem) {
      const match = lineText(regionItem.line).match(/محافظ[هة]\s+[^:：|]+/);
      add("region", match?.[0] || lineText(regionItem.line), regionItem, 0.92);
    }

    const ministryItem = lines.find(item => /وزار[هة]\s*التعليم/.test(normalize(lineText(item.line))));
    if (ministryItem) add("ministry", lineText(ministryItem.line), ministryItem, 0.99);
    const directorateItem = lines.find(item => /المديري[هة].*التعليم/.test(normalize(lineText(item.line))));
    if (directorateItem) add("directorate", lineText(directorateItem.line), directorateItem, 0.95);

    let title = entries.find(entry => entry.key === "title")?.value || "";
    const explicitSubject = metadataValueAfterLabel(pageRecords, /^الماد[هة]$/);
    const subject = clean(explicitSubject?.value || subjectFromPageRecords(pageRecords, title));
    if (subject) {
      add("subject", subject, explicitSubject?.item || titleItem || lines[0], explicitSubject ? 0.98 : 0.93);
      if (title && !normalize(title).includes(normalize(subject))) {
        const titleEntry = entries.find(entry => entry.key === "title");
        if (titleEntry) titleEntry.value = clean(`${title} ${subject}`);
        title = titleEntry?.value || title;
      }
    }

    const extraMetadata = [
      ["wilaya", /^(?:الولايه|الولاية|الوليه)(?:\s|:|$)/],
      ["educationSystem", /نظام\s*التعليم/],
      ["term", /^(?:الدور|الفصل\s*الدراس[يى])(?:\s|:|$)/],
    ];
    for (const [key, pattern] of extraMetadata) {
      const item = lines.find(candidate => pattern.test(normalize(lineText(candidate.line))));
      if (!item) continue;
      const raw = lineText(item.line);
      const value = clean(raw.replace(pattern, "").replace(/^\s*[:：]+\s*/, ""));
      if (value) add(key, value, item, 0.88);
    }

    const values = Object.fromEntries(entries.map(entry => [entry.key, entry.value]));
    return { values, entries };
  }

  function classifyBlocks(pageRecords) {
    const counts = new Map();
    const pagesByText = new Map();
    for (const page of pageRecords || []) {
      const seen = new Set();
      for (const line of page.lines || []) {
        const key = normalize(lineText(line));
        if (!key || key.length < 4 || seen.has(key)) continue;
        seen.add(key);
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!pagesByText.has(key)) pagesByText.set(key, []);
        pagesByText.get(key).push(page.pageNumber);
      }
    }

    const blocks = [];
    const blockIndex = new Map();
    const pageCount = Math.max(1, (pageRecords || []).length);
    for (const page of pageRecords || []) {
      for (const line of page.lines || []) {
        const text = lineText(line);
        const n = normalize(text);
        const repeated = pageCount > 1 && (counts.get(n) || 0) >= 2;
        const section = sectionHeading(text);
        const header = inferHeaderSpec(line);
        const meta = metadataLabel(text);
        let type = "unknown";
        let confidence = 0.45;
        if (PRINTED_BY.test(n) || TIME_ONLY.test(normalizeDigits(text)) || PAGE_ONLY.test(n)) { type = "footer"; confidence = 0.99; }
        else if (/^(?:سلطنه عمان|سلطنة عمان|وزار[هة] التعليم|المديري[هة].*التعليم)$/.test(n)) { type = "document_header"; confidence = 0.98; }
        else if (academicYearFromText(text) || dateFromText(text)) { type = "metadata_value"; confidence = 0.92; }
        else if (section) { type = "section_heading"; confidence = 0.97; }
        else if (header) { type = "table_header"; confidence = header.confidence; }
        else if (meta) { type = "metadata"; confidence = 0.90; }
        else if (TITLE_SIGNALS.test(n) && text.length >= 12) { type = "title"; confidence = 0.92; }
        else if (repeated && (/سلطنه\s*عمان|وزار[هة]\s*التعليم|المديري[هة].*التعليم/.test(n))) { type = "repeated_header"; confidence = 0.95; }
        else if (isNoiseText(text)) { type = "noise"; confidence = 0.9; }
        else if (text.length >= 10) { type = "paragraph"; confidence = 0.70; }

        const block = {
          id: `p${page.pageNumber}-l${line.lineIndex || blocks.length + 1}`,
          page: page.pageNumber,
          line: line.lineIndex || null,
          text,
          type,
          confidence,
          repeated,
          repeatedOnPages: pagesByText.get(n) || [page.pageNumber],
          sectionId: section?.id || "",
          sectionLabel: section?.label || "",
        };
        blocks.push(block);
        blockIndex.set(`${page.pageNumber}:${line.lineIndex}`, block);
      }
    }
    return { blocks, blockIndex };
  }

  function buildSections(pageRecords, blockIndex, tables = []) {
    const sections = [];
    let active = null;
    const tableCoverage = new Set();
    for (const table of tables || []) {
      const segments = Array.isArray(table.provenance?.segments) && table.provenance.segments.length
        ? table.provenance.segments
        : [table.provenance];
      for (const segment of segments) {
        const page = Number(segment?.header?.page || table.pages?.[0] || 0);
        const start = Number(segment?.startLine || 0);
        const end = Number(segment?.endLine || 0);
        if (!page || !start || !end) continue;
        for (let line = start; line <= end; line += 1) tableCoverage.add(`${page}:${line}`);
      }
    }
    for (const page of pageRecords || []) {
      for (const line of page.lines || []) {
        const key = `${page.pageNumber}:${line.lineIndex}`;
        const block = blockIndex.get(key);
        if (!block) continue;
        if (tableCoverage.has(key)) {
          if (block.type === "table_header") active = null;
          continue;
        }
        if (block.type === "section_heading") {
          active = {
            id: block.sectionId || `section-${sections.length + 1}`,
            label: block.sectionLabel || block.text,
            entries: [],
            pages: new Set([page.pageNumber]),
            confidence: block.confidence,
            provenance: provenance(page.pageNumber, line, block.confidence),
          };
          sections.push(active);
          continue;
        }
        if (!active) continue;
        if (["footer", "noise", "repeated_header", "document_header", "metadata", "metadata_value", "title", "table_header"].includes(block.type)) continue;
        if (block.type === "paragraph" || block.type === "unknown") {
          const text = lineText(line);
          if (text.length >= 3) {
            active.entries.push({ text, provenance: provenance(page.pageNumber, line, block.confidence) });
            active.pages.add(page.pageNumber);
          }
        }
      }
    }
    return sections
      .filter(section => section.entries.length)
      .map(section => ({ ...section, pages: [...section.pages] }));
  }

  function mergeCompatibleTables(tables = []) {
    const groups = new Map();
    for (const table of tables || []) {
      const key = (table.headers || []).map(normalize).join("|");
      if (!key) continue;
      if (!groups.has(key)) {
        groups.set(key, {
          ...table,
          rows: [],
          rowMeta: [],
          pages: [],
          sourceTexts: [],
          segments: [],
          confidenceValues: [],
          statusValues: [],
        });
      }
      const group = groups.get(key);
      group.rows.push(...(table.rows || []));
      group.rowMeta.push(...(Array.isArray(table.rowMeta) ? table.rowMeta : (table.rows || []).map(() => ({ role: "detail" }))));
      group.pages.push(...(table.pages || []));
      if (table.sourceText) group.sourceTexts.push(table.sourceText);
      group.segments.push(table.provenance);
      group.confidenceValues.push(Number(table.confidence || 0));
      group.statusValues.push(String(table.status || "review"));
    }
    return [...groups.values()].map((group, index) => {
      const confidence = group.confidenceValues.length ? Math.min(...group.confidenceValues) : 0;
      const { sourceTexts, segments, confidenceValues, statusValues, ...cleanGroup } = group;
      const status = statusValues.includes("unresolved")
        ? "unresolved"
        : confidence >= HIGH_CONFIDENCE ? "accepted" : confidence >= REVIEW_CONFIDENCE ? "review" : "unresolved";
      return {
        ...cleanGroup,
        id: `table-${index + 1}`,
        pages: [...new Set(group.pages)].sort((a, b) => a - b),
        confidence,
        status,
        sourceText: sourceTexts.join("\n"),
        provenance: { ...group.provenance, segments },
      };
    });
  }

  function tablesOverlap(a, b) {
    const aSegments = Array.isArray(a?.provenance?.segments) && a.provenance.segments.length ? a.provenance.segments : [a?.provenance];
    const bSegments = Array.isArray(b?.provenance?.segments) && b.provenance.segments.length ? b.provenance.segments : [b?.provenance];
    return aSegments.some(left => bSegments.some(right => {
      const leftPage = Number(left?.header?.page || a?.pages?.[0] || 0);
      const rightPage = Number(right?.header?.page || b?.pages?.[0] || 0);
      if (!leftPage || leftPage !== rightPage) return false;
      const leftStart = Number(left?.startLine || 0);
      const leftEnd = Number(left?.endLine || 0);
      const rightStart = Number(right?.startLine || 0);
      const rightEnd = Number(right?.endLine || 0);
      if (!leftStart || !leftEnd || !rightStart || !rightEnd) return false;
      return leftStart <= rightEnd && rightStart <= leftEnd;
    }));
  }

  function normalizePdfPages(pageRecords = []) {
    const safePages = (pageRecords || []).map((page, pageIndex) => ({
      pageNumber: Number(page?.pageNumber || pageIndex + 1),
      lines: Array.isArray(page?.lines) ? page.lines : [],
    }));
    const { blocks, blockIndex } = classifyBlocks(safePages);
    const metadata = findMetadata(safePages);
    const hierarchicalTables = window.TaqareerPdfTableStructure?.discoverHierarchicalTables
      ? window.TaqareerPdfTableStructure.discoverHierarchicalTables(safePages)
      : [];
    const flatTables = discoverTables(safePages, blockIndex)
      .filter(table => !hierarchicalTables.some(structured => tablesOverlap(structured, table)));
    const tables = mergeCompatibleTables([...hierarchicalTables, ...flatTables])
      .map(table => withPaginationContract(table, safePages));
    const sections = buildSections(safePages, blockIndex, tables);
    const unresolved = blocks.filter(block => block.type === "unknown" && block.confidence < REVIEW_CONFIDENCE);
    const noise = blocks.filter(block => ["footer", "noise", "repeated_header"].includes(block.type));
    const acceptedTables = tables.filter(table => table.status === "accepted");
    const reviewTables = tables.filter(table => table.status === "review");
    const confidenceCandidates = [
      ...metadata.entries.map(entry => entry.confidence),
      ...acceptedTables.map(table => table.confidence),
      ...sections.map(section => section.confidence),
    ].filter(Number.isFinite);
    const overallConfidence = confidenceCandidates.length ? Math.min(...confidenceCandidates) : 0;

    return {
      canonicalDocumentVersion: VERSION,
      sourceType: "pdf",
      pageCount: safePages.length,
      metadata: metadata.values,
      metadataProvenance: metadata.entries,
      tables,
      sections,
      blocks,
      unresolved,
      noise,
      diagnostics: {
        overallConfidence,
        acceptedTableCount: acceptedTables.length,
        reviewTableCount: reviewTables.length,
        sectionCount: sections.length,
        unresolvedCount: unresolved.length,
        noiseCount: noise.length,
      },
    };
  }

  function tableDataset(table, canonical, index) {
    const pageLabel = table.pages.length > 1 ? `الصفحات ${table.pages.join("، ")}` : `صفحة ${table.pages[0]}`;
    return {
      id: `pdf-structure-table-${index + 1}`,
      name: `جدول PDF منظم · ${pageLabel}`,
      headers: table.headers,
      rows: table.rows,
      rawText: table.sourceText,
      meta: {
        sourceType: "pdf",
        mode: "table",
        extractionMode: "canonical-pdf-intake-v2",
        canonicalDocumentVersion: VERSION,
        structuralConfidence: table.confidence,
        tableStatus: table.status,
        pages: table.pages,
        metadata: { ...canonical.metadata },
        reportTitle: canonical.metadata?.title || "",
        tableStructure: table.structure ? structuredClone(table.structure) : null,
        rowRoles: Array.isArray(table.rowMeta) ? table.rowMeta.map(item => item?.role || "detail") : [],
        intake: {
          version: VERSION,
          acceptedTableCount: canonical.diagnostics.acceptedTableCount,
          reviewTableCount: canonical.diagnostics.reviewTableCount,
          sectionCount: canonical.diagnostics.sectionCount,
          unresolvedCount: canonical.diagnostics.unresolvedCount,
        },
      },
    };
  }

  function datasetsFromCanonical(canonical) {
    return (canonical?.tables || [])
      .filter(table => table.status !== "unresolved")
      .map((table, index) => tableDataset(table, canonical, index));
  }

  window.TaqareerPdfIntakeV2 = {
    VERSION,
    HIGH_CONFIDENCE,
    REVIEW_CONFIDENCE,
    normalizePdfPages,
    datasetsFromCanonical,
    _test: {
      normalize,
      normalizeDigits,
      inferHeaderSpec,
      rowFromCells,
      discoverTables,
      mergeCompatibleTables,
      findMetadata,
      classifyBlocks,
      buildSections,
      academicYearFromText,
      dateFromText,
      gradeRangeFromText,
      schoolFromText,
      subjectFromTitle,
      subjectFromPageRecords,
      metadataValueAfterLabel,
      geometryAlignedValues,
      continuationCandidate,
      mergeContinuationRow,
      withPaginationContract,
      tablesOverlap,
      isNoiseText,
    },
  };
})();
