(() => {
  "use strict";

  const UTF8 = new TextDecoder("utf-8");
  const PDF_MODULE_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/pdf.min.mjs";
  const PDF_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/pdf.worker.min.mjs";
  const PDF_CMAP_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/cmaps/";
  const PDF_STANDARD_FONTS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/standard_fonts/";

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function u16(view, offset) { return view.getUint16(offset, true); }
  function u32(view, offset) { return view.getUint32(offset, true); }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("المتصفح لا يدعم فك ضغط Word محليًا. استخدم متصفحًا حديثًا أو صدّر الملف إلى PDF/CSV.");
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

  function createZipReader(arrayBuffer, fileLabel = "المستند") {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const eocd = locateEndOfCentralDirectory(bytes);
    if (eocd < 0) throw new Error(`${fileLabel} لا يبدو ملفًا صالحًا أو أنه تالف.`);

    const entryCount = u16(view, eocd + 10);
    const centralOffset = u32(view, eocd + 16);
    const entries = new Map();
    let cursor = centralOffset;

    for (let i = 0; i < entryCount; i++) {
      if (u32(view, cursor) !== 0x02014b50) throw new Error(`تعذر قراءة البنية المضغوطة داخل ${fileLabel}.`);
      const method = u16(view, cursor + 10);
      const compressedSize = u32(view, cursor + 20);
      const nameLength = u16(view, cursor + 28);
      const extraLength = u16(view, cursor + 30);
      const commentLength = u16(view, cursor + 32);
      const localOffset = u32(view, cursor + 42);
      const name = UTF8.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
      entries.set(name.replace(/\\/g, "/"), { method, compressedSize, localOffset });
      cursor += 46 + nameLength + extraLength + commentLength;
    }

    return {
      names: [...entries.keys()],
      async read(name) {
        const normalizedName = String(name).replace(/^\/+/, "");
        const entry = entries.get(normalizedName);
        if (!entry) return null;
        const local = entry.localOffset;
        if (u32(view, local) !== 0x04034b50) throw new Error(`تعذر قراءة الملف الداخلي: ${normalizedName}`);
        const nameLength = u16(view, local + 26);
        const extraLength = u16(view, local + 28);
        const dataStart = local + 30 + nameLength + extraLength;
        const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
        if (entry.method === 0) return compressed;
        if (entry.method === 8) return inflateRaw(compressed);
        throw new Error(`طريقة ضغط غير مدعومة داخل ${fileLabel}: ${entry.method}`);
      },
      async readText(name) {
        const value = await this.read(name);
        return value ? UTF8.decode(value) : null;
      }
    };
  }

  function childElements(node) {
    return Array.from(node?.childNodes || []).filter(child => child.nodeType === 1);
  }

  function elementsByLocalName(node, name) {
    return Array.from(node?.getElementsByTagNameNS?.("*", name) || []);
  }

  function elementText(node) {
    const pieces = [];
    const walk = current => {
      for (const child of Array.from(current?.childNodes || [])) {
        if (child.nodeType !== 1) continue;
        const local = child.localName;
        if (local === "t" || local === "instrText") pieces.push(child.textContent || "");
        else if (local === "tab") pieces.push("\t");
        else if (local === "br" || local === "cr") pieces.push("\n");
        else walk(child);
      }
    };
    walk(node);
    return pieces.join("").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  }

  function parseXmlDocument(xml, label = "مستند Word") {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error(`تعذر فهم بنية ${label}.`);
    return doc;
  }

  function storyTextTokens(xml) {
    if (!xml) return [];
    const doc = parseXmlDocument(xml, "ترويسة Word");
    return elementsByLocalName(doc, "t")
      .map(node => String(node.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  function cleanMetadataValue(value) {
    return String(value || "")
      .replace(/[|]+/g, " ")
      .replace(/\s*[:：]\s*$/g, "")
      .replace(/\(\s*(\d{1,2})\s+([\d]{1,2})\s*\)/g, "($1-$2)")
      .replace(/\(\s*(\d{1,2})\s*[|\-–—/]\s*(\d{1,2})\s*[|]?\s*\)/g, "($1-$2)")
      .replace(/\s+/g, " ")
      .trim();
  }

  function previousMetadataToken(tokens, labelIndex, predicate = null, maxLookback = 10) {
    const labelWords = /^(?:رقم الصفحة|التاريخ|الساعة|المنطقة|المدرسة|رمز المدرسة|العام الدراسي|العام الدراسى|طبع بواسطة)$/;
    for (let index = labelIndex - 1; index >= 0 && labelIndex - index <= maxLookback; index -= 1) {
      const value = cleanMetadataValue(tokens[index]);
      const normalized = normalize(value);
      if (!value || /^[:：|]+$/.test(value) || labelWords.test(normalized)) continue;
      if (!predicate || predicate(value, normalized)) return value;
    }
    return "";
  }

  function valueBeforeLabel(tokens, labelPattern, predicate = null) {
    const index = tokens.findIndex(token => labelPattern.test(normalize(cleanMetadataValue(token))));
    return index >= 0 ? previousMetadataToken(tokens, index, predicate) : "";
  }

  function phraseBeforeLabel(tokens, labelPattern, anchorPattern, maxLookback = 7) {
    const labelIndex = tokens.findIndex(token => labelPattern.test(normalize(cleanMetadataValue(token))));
    if (labelIndex < 0) return "";
    const parts = [];
    for (let index = labelIndex - 1; index >= 0 && labelIndex - index <= maxLookback; index -= 1) {
      const raw = String(tokens[index] || "").trim();
      const cleaned = cleanMetadataValue(raw);
      if (!cleaned || /^[:：|]+$/.test(cleaned)) continue;
      parts.unshift(cleaned);
      if (anchorPattern.test(normalize(cleaned))) break;
    }
    return cleanMetadataValue(parts.join(" "));
  }

  function normalizeAcademicYear(value) {
    const raw = cleanMetadataValue(value);
    const match = raw.match(/(20\d{2})\s*[\/\-]\s*(20\d{2})/);
    if (!match) return { value: raw, raw, normalized: false };
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (Math.abs(first - second) === 1 && first > second) {
      return { value: `${second}/${first}`, raw, normalized: true };
    }
    return { value: `${first}/${second}`, raw, normalized: false };
  }

  function extractSubjectFromTitle(title) {
    const clean = cleanMetadataValue(title);
    const matches = [...clean.matchAll(/لمادة\s+([^|،؛]+?)(?=$|\s{2,})/g)];
    const candidate = matches.at(-1)?.[1] || clean.match(/المادة\s*[:：-]?\s*([^|،؛]+)/)?.[1] || "";
    return cleanMetadataValue(candidate).replace(/^مادة\s+/, "");
  }

  function extractGradeFromSchool(school) {
    const match = cleanMetadataValue(school).match(/\((\d{1,2})\s*[\-–—/]\s*(\d{1,2})\)/);
    return match ? `${match[1]}-${match[2]}` : "";
  }

  function parseWordMetadataTokens(headerTokens = [], footerTokens = []) {
    const title = cleanMetadataValue(headerTokens.find(token => /التقرير التجميعي|الزيارة الإشرافية|الزياره الاشرافيه/.test(normalize(token))) || "");
    const school = phraseBeforeLabel(headerTokens, /^المدرسه$/, /الصفوف|مدرسه|للبنين|للبنات|الباسط/);
    const academic = normalizeAcademicYear(valueBeforeLabel(headerTokens, /^العام الدراس[يى]$/, value => /20\d{2}\s*[\/\-]\s*20\d{2}/.test(value)));
    const reportDate = valueBeforeLabel(headerTokens, /^التاريخ$/, value => /20\d{2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{1,2}/.test(value));
    const metadata = {
      title,
      school,
      subject: extractSubjectFromTitle(title),
      grade: extractGradeFromSchool(school),
      academicYear: academic.value,
      academicYearRaw: academic.raw,
      reportDate,
      region: valueBeforeLabel(headerTokens, /^المنطقه$/, value => !/^\d+$/.test(value)),
      schoolCode: valueBeforeLabel(headerTokens, /^رمز المدرسه/, value => /^\d{3,8}$/.test(value)),
      directorate: cleanMetadataValue(headerTokens.find(token => /المديريه العامه للتعليم/.test(normalize(token))) || ""),
      ministry: cleanMetadataValue(headerTokens.find(token => /وزاره التعليم/.test(normalize(token))) || ""),
      printedBy: valueBeforeLabel(footerTokens, /^طبع بواسطه$/, value => !/^\d+$/.test(value)),
      aggregatedReport: /التقرير التجميعي/.test(normalize(title))
    };
    const warnings = [];
    if (academic.normalized) warnings.push(`تم توحيد اتجاه العام الدراسي من ${academic.raw} إلى ${academic.value} للعرض، مع الاحتفاظ بالقيمة الأصلية في بيانات المصدر.`);
    return { metadata, warnings, headerTokens, footerTokens };
  }

  function parseWordMetadata(headerXmls = [], footerXmls = []) {
    return parseWordMetadataTokens(headerXmls.flatMap(storyTextTokens), footerXmls.flatMap(storyTextTokens));
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

  function headerScore(row, nextRows) {
    const nonEmpty = row.filter(value => String(value ?? "").trim() !== "");
    if (nonEmpty.length < 2) return -Infinity;
    const textCount = nonEmpty.filter(value => !Number.isFinite(Number(value))).length;
    const unique = new Set(nonEmpty.map(value => normalize(value))).size;
    const keywords = ["اسم", "الطالب", "الدرجه", "المستوى", "المتوسط", "الصف", "الماده", "البند", "التقويم", "المجموع", "النسبه", "الملاحظات", "القيد"];
    const keywordHits = nonEmpty.filter(value => keywords.some(key => normalize(value).includes(key))).length;
    const populatedBelow = nextRows.reduce((sum, candidate) => sum + Math.min(nonEmpty.length, candidate.filter(value => String(value ?? "").trim() !== "").length), 0);
    return nonEmpty.length * 3 + textCount * 2 + unique + keywordHits * 6 + Math.min(18, populatedBelow / 2);
  }

  function compactMatrix(matrix) {
    let rows = (matrix || []).map(row => (row || []).map(value => value ?? ""));
    while (rows.length && rows.at(-1).every(value => String(value).trim() === "")) rows.pop();
    const maxColumns = Math.max(0, ...rows.map(row => row.length));
    let lastUsed = -1;
    for (let col = 0; col < maxColumns; col++) {
      if (rows.some(row => String(row[col] ?? "").trim() !== "")) lastUsed = col;
    }
    return rows.map(row => Array.from({ length: lastUsed + 1 }, (_, col) => row[col] ?? ""));
  }

  function pruneGeneratedEmptyColumns(headers, rows) {
    const keep = headers.filter(header => {
      const generated = /^عمود\s+\d+(?:\s*\(\d+\))?$/i.test(String(header || "").trim());
      if (!generated) return true;
      return rows.some(row => String(row?.[header] ?? "").trim() !== "");
    });
    if (keep.length === headers.length) return { headers, rows };
    return {
      headers: keep,
      rows: rows.map(row => Object.fromEntries(keep.map(header => [header, row?.[header] ?? ""])))
    };
  }

  function matrixToTable(matrix) {
    const compact = compactMatrix(matrix);
    if (!compact.length) return { headers: [], rows: [], headerRow: -1, matrix: compact, score: -Infinity };
    const candidates = compact.slice(0, 30);
    let bestIndex = 0;
    let bestScore = -Infinity;
    candidates.forEach((row, index) => {
      const score = headerScore(row, compact.slice(index + 1, index + 6));
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    const headers = makeUniqueHeaders(compact[bestIndex] || []);
    const rows = compact.slice(bestIndex + 1)
      .filter(row => row.some(value => String(value ?? "").trim() !== ""))
      .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
    const pruned = pruneGeneratedEmptyColumns(headers, rows);
    return { headers: pruned.headers, rows: pruned.rows, headerRow: bestIndex + 1, matrix: compact, score: bestScore };
  }

  function paragraphRows(lines) {
    const headingPatterns = [
      /جوانب.*الاجاده|جوانب.*الايجابيه|مواطن القوه/i,
      /الجوانب.*تحتاج.*تطوير|اولويات التطوير|فرص التحسين/i,
      /الدعم المقدم/i,
      /مداوله اشرافيه|مداولة إشرافية/i,
      /التوصيات/i,
      /الملاحظات/i,
      /النتائج|الخلاصه/i
    ];
    let currentSection = "النص العام";
    return lines.map((line, index) => {
      const clean = String(line).trim();
      if (headingPatterns.some(pattern => pattern.test(normalize(clean))) && clean.length <= 140) currentSection = clean;
      return { "م": index + 1, "القسم": currentSection, "النص": clean };
    });
  }

  function parseWordBody(xml) {
    const doc = parseXmlDocument(xml, "مستند Word");
    const body = elementsByLocalName(doc, "body")[0];
    if (!body) throw new Error("لم يُعثر على محتوى مستند Word.");

    const paragraphs = [];
    const tables = [];
    let tableIndex = 0;

    for (const child of childElements(body)) {
      if (child.localName === "p") {
        const text = elementText(child);
        if (text) paragraphs.push(text);
      } else if (child.localName === "tbl") {
        tableIndex += 1;
        const matrix = [];
        for (const tr of elementsByLocalName(child, "tr")) {
          const row = [];
          for (const tc of childElements(tr).filter(node => node.localName === "tc")) {
            row.push(elementText(tc));
          }
          if (row.some(value => String(value).trim() !== "")) matrix.push(row);
        }
        const table = matrixToTable(matrix);
        if (table.headers.length >= 2 && table.rows.length >= 1) tables.push({ ...table, tableIndex });
      }
    }
    return { paragraphs, tables };
  }

  async function readDocx(file) {
    const zip = createZipReader(await file.arrayBuffer(), "ملف Word");
    const xml = await zip.readText("word/document.xml");
    if (!xml) throw new Error("لم يُعثر على المحتوى الداخلي المتوقع في ملف Word.");
    const headerNames = zip.names.filter(name => /^word\/header\d+\.xml$/i.test(name)).sort();
    const footerNames = zip.names.filter(name => /^word\/footer\d+\.xml$/i.test(name)).sort();
    const headerXmls = (await Promise.all(headerNames.map(name => zip.readText(name)))).filter(Boolean);
    const footerXmls = (await Promise.all(footerNames.map(name => zip.readText(name)))).filter(Boolean);
    const metadataResult = parseWordMetadata(headerXmls, footerXmls);
    const { paragraphs, tables } = parseWordBody(xml);
    const bodyTitle = paragraphs.find(text => /التقرير التجميعي|الزيارة الإشرافية|الزياره الاشرافيه/i.test(text)) || paragraphs.find(text => /تقرير|استماره|استمارة/i.test(text)) || "";
    const reportTitle = metadataResult.metadata.title || bodyTitle;
    const commonMeta = {
      sourceType: "docx",
      reportTitle,
      metadata: { ...metadataResult.metadata, title: reportTitle },
      documentContext: {
        aggregatedReport: Boolean(metadataResult.metadata.aggregatedReport),
        entityScope: metadataResult.metadata.aggregatedReport ? "aggregated-multiple-visits-or-teachers" : "single-or-unspecified",
        contradictionPolicy: metadataResult.metadata.aggregatedReport ? "treat-opposing-statements-as-contextual-variation-unless-same-entity-and-visit" : "standard"
      }
    };
    const datasets = tables.map(table => ({
      id: `docx-table-${table.tableIndex}`,
      name: `جدول Word ${table.tableIndex}`,
      headers: table.headers,
      rows: table.rows,
      meta: { ...commonMeta, mode: "table", tableIndex: table.tableIndex, headerRow: table.headerRow }
    }));

    if (paragraphs.length) {
      const narrativeRows = paragraphRows(paragraphs);
      const sectionCounts = narrativeRows.reduce((output, row) => {
        const section = row["القسم"] || "النص العام";
        output[section] = (output[section] || 0) + 1;
        return output;
      }, {});
      datasets.push({
        id: "docx-narrative",
        name: "النص السردي الكامل",
        headers: ["م", "القسم", "النص"],
        rows: narrativeRows,
        rawText: paragraphs.join("\n"),
        meta: { ...commonMeta, mode: "narrative", paragraphCount: paragraphs.length, sectionCounts }
      });
    }
    if (!datasets.length) throw new Error("ملف Word لا يحتوي نصًا أو جدولًا واضحًا قابلًا للتحليل.");
    return { name: file.name, kind: "docx", datasets, warnings: metadataResult.warnings };
  }

  function arabicRatio(text) {
    const chars = String(text || "").replace(/\s/g, "");
    if (!chars.length) return 0;
    const arabic = (chars.match(/[\u0600-\u06FF]/g) || []).length;
    return arabic / chars.length;
  }

  function groupPdfItemsIntoLines(items) {
    const textItems = (items || []).filter(item => item?.str && item?.transform);
    const groups = [];
    for (const item of textItems) {
      const x = Number(item.transform[4]) || 0;
      const y = Number(item.transform[5]) || 0;
      const height = Math.abs(Number(item.height) || Number(item.transform[3]) || 10);
      let line = groups.find(group => Math.abs(group.y - y) <= Math.max(2.2, height * 0.28));
      if (!line) { line = { y, items: [] }; groups.push(line); }
      line.items.push({ str: item.str.trim(), x, y, width: Math.abs(Number(item.width) || 0), height, dir: item.dir || "" });
    }
    return groups.sort((a, b) => b.y - a.y).map((group, lineIndex) => {
      const usable = group.items.filter(item => item.str);
      const rtl = arabicRatio(usable.map(item => item.str).join(" ")) >= 0.25 || usable.some(item => item.dir === "rtl");
      const asc = [...usable].sort((a, b) => a.x - b.x);
      const typicalHeight = asc.length ? asc.reduce((sum, item) => sum + item.height, 0) / asc.length : 10;
      const cells = [];
      let current = [];
      asc.forEach((item, index) => {
        if (!current.length) current.push(item);
        else {
          const previous = current.at(-1);
          const gap = item.x - (previous.x + previous.width);
          const threshold = Math.max(7, typicalHeight * 0.9);
          if (gap > threshold) { cells.push(current); current = [item]; }
          else current.push(item);
        }
        if (index === asc.length - 1 && current.length) cells.push(current);
      });
      let cellTexts = cells.map(cell => {
        const ordered = rtl ? [...cell].sort((a, b) => b.x - a.x) : cell;
        return ordered.map(item => item.str).join(" ").replace(/\s+/g, " ").trim();
      }).filter(Boolean);
      if (rtl) cellTexts = cellTexts.reverse();
      const lineText = (rtl ? [...usable].sort((a, b) => b.x - a.x) : asc)
        .map(item => item.str).join(" ").replace(/\s+/g, " ").trim();
      return { lineIndex: lineIndex + 1, y: group.y, rtl, text: lineText, cells: cellTexts, items: usable };
    }).filter(line => line.text);
  }



  const SUPERVISION_VISIT_INDICATORS = [
    { id: "student-achievement", label: "تحصيل الطلبة في الأعمال الصفية وغير الصفية", patterns: [/تحصيل الطلبه.*(?:الاعمال|العمال).*الصفي/] },
    { id: "student-progress", label: "التقدم الدراسي للطلبة بما فيهم ذوو الإعاقة أو الاحتياجات التعليمية", patterns: [/التقدم الدراسي للطلبه.*(?:الاعاقه|العاقه).*(?:الاحتياجات|الحتياجات).*التعليميه/] },
    { id: "learning-skills", label: "تطبيق مهارات التعلم وربطها بالواقع", patterns: [/تطبيق مهارات التعلم.*ربطها بالواقع/] },
    { id: "values-identity", label: "الهوية العمانية والقيم الإنسانية", patterns: [/تمسك الطلبه.*الهويه العمانيه.*القيم.*(?:الانسانيه|النسانيه)/] },
    { id: "safety-cleanliness", label: "الأمن والسلامة والنظافة في بيئة التعلم", patterns: [/متابعه جوانب.*(?:الامن|المن).*(?:السلامه|السلمه).*النظافه.*بيئه التعلم/] },
    { id: "curriculum-planning", label: "تخطيط المنهاج لتحقيق نواتج التعلم", patterns: [/تخطيط المنهاج الدراسي.*نواتج التعلم/] },
    { id: "classroom-management", label: "فاعلية الإدارة الصفية", patterns: [/فاعليه.*(?:الاداره|الدارة|الداره).*(?:الصفيه|لصفيه)/] },
    { id: "teaching-strategies", label: "استراتيجيات التدريس الفعالة", patterns: [/توظيف استراتيجيات التدريس الفعاله/] },
    { id: "resources", label: "المصادر والموارد التعليمية", patterns: [/تفعيل المصادر والموارد التعليميه/] },
    { id: "assessment", label: "أساليب تقويم متنوعة", patterns: [/توظيف اساليب تقويم متنوعه/] },
    { id: "professional-growth", label: "التقويم الذاتي والتطوير المهني", patterns: [/توظيف التقويم الذاتي.*التطوير المهني/] },
    { id: "policies", label: "السياسات والأنظمة واللوائح", patterns: [/تطبيق السياسات.*(?:الانظمه|النظمه).*اللوائح/] },
    { id: "initiatives", label: "المبادرات والأنشطة التربوية", patterns: [/تنفيذ مبادرات.*انشطه تربويه/] },
  ];

  const SUPERVISION_SCALE = Object.freeze({
    1: "متميز",
    2: "جيد",
    3: "ملائم",
    4: "غير ملائم",
    5: "يحتاج إلى تدخل",
  });

  function normalizeDigits(value) {
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    return String(value ?? "").replace(/[٠-٩٫٬]/g, char => map[char]);
  }

  function lineTextValue(line) {
    return cleanMetadataValue(line?.text || "");
  }

  function lineCellValues(line) {
    return (Array.isArray(line?.cells) ? line.cells : [])
      .map(cleanMetadataValue)
      .filter(value => value && !/^[:：|]+$/.test(value));
  }

  function pageText(lines) {
    return (lines || []).map(lineTextValue).filter(Boolean).join("\n");
  }

  function findLine(lines, pattern) {
    return (lines || []).find(line => pattern.test(normalize(lineTextValue(line)))) || null;
  }

  function valueFromLabeledLine(lines, pattern, predicate = null) {
    const line = findLine(lines, pattern);
    if (!line) return "";
    const candidates = lineCellValues(line).filter(value => !pattern.test(normalize(value)) && !/^(?:الاسم|السم|رقم الملف|رقم الزياره|تاريخ الزياره|المجال|الماده|الحصه|عنوان الدرس|الصف|الفصل|المرحله)$/.test(normalize(value)));
    const filtered = predicate ? candidates.filter(value => predicate(value, normalize(value))) : candidates;
    if (filtered.length) return filtered.sort((a, b) => b.length - a.length)[0];
    const raw = lineTextValue(line).replace(/[:：|]+/g, " ");
    const stripped = cleanMetadataValue(raw.replace(pattern, " "));
    return !predicate || predicate(stripped, normalize(stripped)) ? stripped : "";
  }

  function nearbyLines(lines, target, radius = 2) {
    const index = (lines || []).indexOf(target);
    if (index < 0) return target ? [target] : [];
    const output = [];
    for (let offset = 0; offset <= radius; offset += 1) {
      if (offset === 0) output.push(lines[index]);
      else {
        if (lines[index - offset]) output.push(lines[index - offset]);
        if (lines[index + offset]) output.push(lines[index + offset]);
      }
    }
    return output;
  }

  function valueAfterCellLabel(line, pattern, predicate = null) {
    const cells = lineCellValues(line);
    const index = cells.findIndex(value => pattern.test(normalize(value)));
    if (index < 0) return "";
    for (let cursor = index + 1; cursor < cells.length; cursor += 1) {
      const value = cells[cursor];
      if (!value || /^[:：|]+$/.test(value)) continue;
      if (predicate && !predicate(value, normalize(value))) continue;
      return value;
    }
    return "";
  }

  function extractDateFromLine(lines, pattern) {
    const line = findLine(lines, pattern);
    for (const candidate of nearbyLines(lines, line, 2)) {
      const match = normalizeDigits(lineTextValue(candidate)).match(/20\d{2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{1,2}/);
      if (match) return match[0].replace(/\s+/g, "");
    }
    return "";
  }

  function extractNumberFromLine(lines, pattern, minimumDigits = 1) {
    const line = findLine(lines, pattern);
    if (!line) return "";
    const matcher = new RegExp(`^\\d{${minimumDigits},}$`);
    for (const candidate of nearbyLines(lines, line, 2)) {
      const values = lineCellValues(candidate).map(normalizeDigits).filter(value => matcher.test(value));
      if (values.length) return values.sort((a, b) => a.length - b.length)[0];
    }
    return "";
  }

  function extractArabicName(lines) {
    const line = findLine(lines, /^(?:الاسم|السم)$|(?:الاسم|السم)\s/);
    if (!line) return "";
    const blocked = /(?:الاسم|السم|رقم|تاريخ|الزياره|المرحله|الصف|الفصل|الحصه|المجال|الماده)/;
    const values = lineCellValues(line).filter(value => /[\u0600-\u06FF]/.test(value) && !blocked.test(normalize(value)) && value.length >= 8);
    if (values.length) return values.sort((a, b) => b.length - a.length)[0];
    return "";
  }

  function extractSchoolFromPdfPages(pages) {
    for (const page of pages) {
      const line = findLine(page.lines, /مدرسه/);
      if (!line) continue;
      const text = lineTextValue(line);
      const match = text.match(/(?:مدرسة|مدرسه)\s*[:：]?\s*(.+)/);
      if (match) return cleanMetadataValue(match[1])
        .replace(/(\d{1,2})\s*\(\s*[-–—/]\s*\)\s*(\d{1,2})/g, "($1-$2)")
        .replace(/(\d{1,2})\s*\(\s*[-–—/]\s*(\d{1,2})\s*\)/g, "($1-$2)");
      const values = lineCellValues(line).filter(value => /الباسط|للبنين|للبنات|الصفوف/.test(normalize(value)));
      if (values.length) return cleanMetadataValue(values.join(" "));
    }
    return "";
  }

  function extractPdfCommonMetadata(pages) {
    const all = pages.flatMap(page => page.lines || []);
    const academicRaw = normalizeDigits(valueFromLabeledLine(all, /العام الدراس[يى]/, value => /20\d{2}\s*[\/\-]\s*20\d{2}/.test(normalizeDigits(value))) || (pageText(all).match(/20\d{2}\s*[\/\-]\s*20\d{2}/)?.[0] || ""));
    const academic = normalizeAcademicYear(academicRaw);
    const school = extractSchoolFromPdfPages(pages);
    const regionLine = findLine(all, /محافظه|المنطقه/);
    const region = regionLine ? lineTextValue(regionLine).match(/محافظة\s+[^\n:：]+|محافظه\s+[^\n:：]+/)?.[0] || lineTextValue(regionLine) : "";
    return {
      title: "استمارات زيارات إشرافية متعددة",
      school,
      grade: extractGradeFromSchool(school),
      academicYear: academic.value,
      academicYearRaw: academic.raw,
      reportDate: extractDateFromLine(all, /^التاريخ$|التاريخ\s/),
      region: cleanMetadataValue(region).replace(/\s+العام الدراس[يى].*$/i, ""),
      aggregatedReport: true,
      multiVisitReport: true,
    };
  }

  function matchSupervisionIndicator(text) {
    const normalized = normalize(text);
    return SUPERVISION_VISIT_INDICATORS.find(item => item.patterns.some(pattern => pattern.test(normalized))) || null;
  }

  function extractRatingFromIndicatorLine(line, indicator) {
    const cells = lineCellValues(line);
    const labelIndex = cells.findIndex(value => indicator.patterns.some(pattern => pattern.test(normalize(value))));
    const numericCells = cells.map((value, index) => ({ value: normalizeDigits(value), index })).filter(item => /^[1-5]$/.test(item.value));
    if (labelIndex >= 0) {
      const after = numericCells.find(item => item.index > labelIndex);
      if (after) return Number(after.value);
      const before = [...numericCells].reverse().find(item => item.index < labelIndex);
      if (before) return Number(before.value);
    }
    const numbers = normalizeDigits(lineTextValue(line)).match(/\b[1-5]\b/g) || [];
    return numbers.length ? Number(numbers.at(-1)) : NaN;
  }

  function parseSupervisionRatings(lines) {
    const ratings = {};
    const sourceRows = {};
    for (let index = 0; index < (lines || []).length; index += 1) {
      const line = lines[index];
      const indicator = matchSupervisionIndicator(lineTextValue(line));
      if (!indicator || ratings[indicator.id] !== undefined) continue;
      let level = NaN;
      const nextCells = lineCellValues(lines[index + 1]).map(normalizeDigits);
      const nextStandalone = nextCells.length === 1 && /^[1-5]$/.test(nextCells[0]) ? nextCells[0] : "";
      if (nextStandalone) level = Number(nextStandalone);
      else level = extractRatingFromIndicatorLine(line, indicator);
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        for (const candidate of [lines[index - 1]]) {
          const cells = lineCellValues(candidate).map(normalizeDigits);
          const standalone = cells.find(value => /^[1-5]$/.test(value));
          if (standalone) { level = Number(standalone); break; }
        }
      }
      if (!Number.isInteger(level) || level < 1 || level > 5) continue;
      ratings[indicator.id] = level;
      sourceRows[indicator.id] = line.lineIndex || null;
    }
    return { ratings, sourceRows };
  }

  function sectionIdForHeading(text) {
    const n = normalize(text);
    if (/جوانب.*(?:الاجاده|الجاده).*ادلتها/.test(n)) return "strengths";
    if (/الجوانب.*تحتاج.*تطوير/.test(n)) return "development";
    if (/الدعم المقدم/.test(n)) return "support";
    if (/^التوصيات$/.test(n)) return "recommendations";
    return "";
  }

  function parseSupervisionNarrative(lines) {
    const output = { strengths: [], development: [], support: [], recommendations: [] };
    let current = "";
    for (const line of lines || []) {
      const text = lineTextValue(line);
      if (!text) continue;
      const heading = sectionIdForHeading(text);
      if (heading) { current = heading; continue; }
      if (!current) continue;
      const n = normalize(text);
      if (/اسم الزائر|الوظيفه|توقيع المعلم|توقيع مدير المدرسه/.test(n)) continue;
      if (/^(?:لا|ل) يوجد$|^لا توجد$/.test(n)) {
        output[current].push(text);
        continue;
      }
      if (text.length >= 8) output[current].push(text);
    }
    return Object.fromEntries(Object.entries(output).map(([key, values]) => [key, values.join("\n")]));
  }

  function isSupervisionVisitPage(lines) {
    const text = normalize(pageText(lines));
    const ratingHits = SUPERVISION_VISIT_INDICATORS.filter(item => item.patterns.some(pattern => pattern.test(text))).length;
    return /استماره الزياره.*(?:الاشرافيه|الشرافيه)/.test(text) && ratingHits >= 8;
  }

  function parseVisitPage(page) {
    const lines = page.lines || [];
    const { ratings, sourceRows } = parseSupervisionRatings(lines);
    if (Object.keys(ratings).length < 8) return null;
    const subjectLine = findLine(lines, /المجال.*الماده/);
    const lessonLine = findLine(lines, /عنوان الدرس/);
    const gradeLine = findLine(lines, /^الصف$|الصف\s/);
    const periodLine = findLine(lines, /^الحصه$|الحصه\s/);
    const classLine = findLine(lines, /^الفصل$|الفصل\s/);
    const subjectFromLabel = valueAfterCellLabel(subjectLine, /المجال.*الماده/, value => /الفيزياء|الكيمياء|الاحياء|الحياء|العلوم|اللغه العربيه|الرياضيات|الدراسات/.test(normalize(value)));
    const subjectCandidates = lineCellValues(subjectLine).filter(value => /الفيزياء|الكيمياء|الاحياء|الحياء|العلوم|اللغه العربيه|الرياضيات|الدراسات/.test(normalize(value)));
    const gradeFromLabel = valueAfterCellLabel(gradeLine, /^الصف$|الصف\s/, value => /الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|^\d{1,2}$/.test(normalizeDigits(normalize(value))));
    const gradeCandidates = lineCellValues(gradeLine).filter(value => /الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|^\d{1,2}$/.test(normalizeDigits(normalize(value))));
    const lessonFromLabel = valueAfterCellLabel(lessonLine, /عنوان الدرس/, value => !/المجال|الماده|الحصه/.test(normalize(value)) && value.length >= 2);
    const lessonCandidates = lineCellValues(lessonLine).filter(value => !/عنوان الدرس|المجال|الماده|الحصه/.test(normalize(value)) && value.length >= 2);
    const periodFromLabel = normalizeDigits(valueAfterCellLabel(periodLine, /^الحصه$|الحصه\s/, value => /^\d{1,2}$/.test(normalizeDigits(value))));
    const periodCandidates = nearbyLines(lines, periodLine, 1).flatMap(lineCellValues).map(normalizeDigits).filter(value => /^\d{1,2}$/.test(value));
    const classFromLabel = normalizeDigits(valueAfterCellLabel(classLine, /^الفصل$|الفصل\s/, value => /^\d{1,2}$/.test(normalizeDigits(value))));
    const classCandidates = nearbyLines(lines, classLine, 1).flatMap(lineCellValues).map(normalizeDigits).filter(value => /^\d{1,2}$/.test(value));
    return {
      page: page.pageNumber,
      visitId: `visit-${page.pageNumber}`,
      visitNumber: extractNumberFromLine(lines, /رقم الزياره/, 1),
      visitDate: extractDateFromLine(lines, /تاريخ الزياره/),
      teacher: extractArabicName(lines),
      fileNumber: extractNumberFromLine(lines, /رقم الملف/, 5),
      subject: subjectFromLabel || subjectCandidates[0] || "",
      grade: gradeFromLabel || gradeCandidates[0] || "",
      classSection: classFromLabel || classCandidates[0] || "",
      period: periodFromLabel || periodCandidates[0] || "",
      lessonTitle: lessonFromLabel || lessonCandidates.sort((a, b) => b.length - a.length)[0] || "",
      ratings,
      ratingSourceRows: sourceRows,
      narrative: { strengths: "", development: "", support: "", recommendations: "" },
    };
  }

  const SUPERVISION_GRADE_NUMBERS = Object.freeze({
    "الاول": 1, "الثاني": 2, "الثالث": 3, "الرابع": 4, "الخامس": 5, "السادس": 6,
    "السابع": 7, "الثامن": 8, "التاسع": 9, "العاشر": 10, "الحادي عشر": 11, "الثاني عشر": 12,
  });

  function supervisionGradeNumber(value) {
    const text = normalizeDigits(normalize(value));
    if (/^\d{1,2}$/.test(text)) {
      const numeric = Number(text);
      return numeric >= 1 && numeric <= 12 ? numeric : null;
    }
    for (const [label, number] of Object.entries(SUPERVISION_GRADE_NUMBERS)) {
      if (text.includes(label)) return number;
    }
    return null;
  }

  function summarizeSupervisionGrades(visits) {
    const raw = [...new Set(visits.map(visit => cleanMetadataValue(visit.grade)).filter(Boolean))];
    if (!raw.length) return "";
    const numbers = [...new Set(raw.map(supervisionGradeNumber).filter(Number.isInteger))].sort((a, b) => a - b);
    if (numbers.length === raw.length) {
      if (numbers.length === 1) return String(numbers[0]);
      const contiguous = numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1);
      return contiguous ? `${numbers[0]}-${numbers[numbers.length - 1]}` : `متعدد: ${numbers.join("، ")}`;
    }
    return raw.length === 1 ? raw[0] : `متعدد: ${raw.join("، ")}`;
  }

  function supervisionVisitRows(visits) {
    return visits.map((visit, index) => {
      const row = {
        "معرف الزيارة": `زيارة ${index + 1}`,
        "رقم الزيارة": visit.visitNumber,
        "تاريخ الزيارة": visit.visitDate,
        "المعلم": visit.teacher,
        "رقم الملف": visit.fileNumber,
        "المادة": visit.subject,
        "الصف": visit.grade,
        "الفصل": visit.classSection,
        "الحصة": visit.period,
        "عنوان الدرس": visit.lessonTitle,
      };
      SUPERVISION_VISIT_INDICATORS.forEach(indicator => { row[indicator.label] = visit.ratings[indicator.id] ?? ""; });
      row["جوانب الإجادة"] = visit.narrative.strengths;
      row["جوانب التطوير"] = visit.narrative.development;
      row["الدعم المقدم"] = visit.narrative.support;
      row["التوصيات"] = visit.narrative.recommendations;
      return row;
    });
  }

  function detectMultiVisitSupervisionPdf(pages) {
    const visits = [];
    let activeVisit = null;
    for (const page of pages) {
      if (isSupervisionVisitPage(page.lines)) {
        const parsed = parseVisitPage(page);
        if (parsed) { visits.push(parsed); activeVisit = parsed; }
        continue;
      }
      if (activeVisit) {
        const narrative = parseSupervisionNarrative(page.lines);
        if (Object.values(narrative).some(Boolean)) activeVisit.narrative = narrative;
      }
    }
    if (visits.length < 2) return null;
    const ratingCount = visits.reduce((sum, visit) => sum + Object.keys(visit.ratings).length, 0);
    if (ratingCount < visits.length * 8) return null;
    const metadata = extractPdfCommonMetadata(pages);
    const subjects = [...new Set(visits.map(visit => cleanMetadataValue(visit.subject)).filter(Boolean))];
    metadata.subject = subjects.length === 1 ? subjects[0] : subjects.length ? `مواد متعددة: ${subjects.join("، ")}` : "";
    metadata.grade = summarizeSupervisionGrades(visits);
    metadata.visitCount = visits.length;
    const warnings = [];
    const expectedRatings = visits.length * SUPERVISION_VISIT_INDICATORS.length;
    if (ratingCount < expectedRatings) warnings.push(`استُخرج ${ratingCount} تقديرًا من أصل ${expectedRatings} متوقعًا؛ راجع الزيارات ذات البنود الناقصة.`);
    if (metadata.academicYearRaw && metadata.academicYearRaw !== metadata.academicYear) warnings.push(`تم توحيد اتجاه العام الدراسي من ${metadata.academicYearRaw} إلى ${metadata.academicYear} للعرض.`);
    const rows = supervisionVisitRows(visits);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return {
      dataset: {
        id: "pdf-supervision-multi-visit",
        name: `زيارات إشرافية متعددة · ${visits.length} زيارات`,
        headers,
        rows,
        rawText: pages.flatMap(page => page.lines.map(lineTextValue)).join("\n"),
        meta: {
          sourceType: "pdf",
          mode: "mixed",
          specializedType: "supervision_multi_visit",
          reportTitle: "استمارات زيارات إشرافية متعددة",
          metadata,
          visitCount: visits.length,
          ratingCount,
          expectedRatingCount: expectedRatings,
          indicatorCount: SUPERVISION_VISIT_INDICATORS.length,
          indicatorCatalog: SUPERVISION_VISIT_INDICATORS.map(item => ({ id: item.id, label: item.label })),
          scale: SUPERVISION_SCALE,
          scaleDirection: "lower-is-better",
          visits: visits.map((visit, index) => ({
            ref: `row:${index + 1}`,
            visitNumber: visit.visitNumber,
            visitDate: visit.visitDate,
            subject: visit.subject,
            grade: visit.grade,
            lessonTitle: visit.lessonTitle,
            ratingCount: Object.keys(visit.ratings).length,
          })),
          documentContext: {
            aggregatedReport: true,
            multiVisitReport: true,
            entityScope: "explicit-multiple-visits-and-teachers",
            contradictionPolicy: "compare-numeric-and-narrative-evidence-within-each-visit-only",
          },
        },
      },
      warnings,
      visits,
    };
  }

  function canonicalPdfSubject(value) {
    const raw = cleanMetadataValue(value);
    const normalized = normalize(raw);
    const known = [
      [/(?:الاحياء|الحياء)/, "الأحياء"],
      [/الكيمياء/, "الكيمياء"],
      [/الفيزياء/, "الفيزياء"],
      [/العلوم/, "العلوم"],
      [/الرياضيات/, "الرياضيات"],
      [/(?:اللغه العربيه|اللغة العربية)/, "اللغة العربية"],
      [/(?:اللغه الانجليزيه|اللغة الإنجليزية)/, "اللغة الإنجليزية"],
      [/الدراسات/, "الدراسات الاجتماعية"],
      [/(?:التربيه الاسلاميه|التربية الإسلامية)/, "التربية الإسلامية"],
    ];
    const hit = known.find(([pattern]) => pattern.test(normalized));
    return hit ? hit[1] : raw;
  }

  function extractAggregatedNarrativeSchool(lines) {
    for (const line of lines || []) {
      const text = normalizeDigits(lineTextValue(line));
      if (!/(?:للبنين|للبنات)/.test(normalize(text)) || !/الصفوف/.test(normalize(text))) continue;
      const range = text.match(/[()（）]?\s*(\d{1,2})\s*[-–—/]\s*(\d{1,2})\s*[()（）]?/);
      let school = cleanMetadataValue(text
        .replace(/الصفوف/g, "")
        .replace(/[()（）]?\s*\d{1,2}\s*[-–—/]\s*\d{1,2}\s*[()（）]?/g, "")
        .replace(/^[:：|\s]+|[:：|\s]+$/g, ""));
      const grade = range ? [Number(range[1]), Number(range[2])].sort((a, b) => a - b).join("-") : "";
      if (grade && school) school = `${school} (${grade})`;
      return { school, grade };
    }
    const school = extractSchoolFromPdfPages([{ lines }]);
    return { school, grade: extractGradeFromSchool(school) };
  }

  function extractAggregatedNarrativeMetadata(pageRecords) {
    const lines = (pageRecords || []).flatMap(page => page.lines || []);
    const textLines = lines.map(lineTextValue).filter(Boolean);
    const title = cleanMetadataValue(textLines.find(text => /التقرير التجميعي.*(?:الزياره|الزيارة).*(?:الاشرافيه|الإشرافية|الشرافيه)/.test(normalize(text))) || "");
    const schoolInfo = extractAggregatedNarrativeSchool(lines);
    const yearCandidates = textLines.flatMap(text => [...normalizeDigits(text).matchAll(/20\d{2}\s*[\/-]\s*20\d{2}/g)].map(match => match[0]));
    const academicRaw = yearCandidates.find(value => {
      const match = value.match(/(20\d{2})\s*[\/-]\s*(20\d{2})/);
      return match && Math.abs(Number(match[1]) - Number(match[2])) === 1;
    }) || "";
    const academic = normalizeAcademicYear(academicRaw);
    const dateCandidates = textLines.flatMap(text => [...normalizeDigits(text).matchAll(/20\d{2}\s*[\/-]\s*\d{1,2}\s*[\/-]\s*\d{1,2}/g)].map(match => match[0]));
    const reportDate = dateCandidates.find(value => {
      const match = value.match(/20\d{2}\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})/);
      return match && Number(match[1]) >= 1 && Number(match[1]) <= 12 && Number(match[2]) >= 1 && Number(match[2]) <= 31;
    })?.replace(/\s+/g, "") || "";
    const subject = canonicalPdfSubject(extractSubjectFromTitle(title));
    const region = cleanMetadataValue(textLines.find(text => /محافظه\s+جنوب\s+الباطنه|محافظة\s+جنوب\s+الباطنة/.test(normalize(text))) || "");
    const schoolCode = normalizeDigits(valueFromLabeledLine(lines, /رمز المدرسه/, value => /^\d{3,8}$/.test(normalizeDigits(value))) || (pageText(lines).match(/رمز\s*المدرس[ةه]\s*[:：]?\s*(\d{3,8})/i)?.[1] || ""));
    return {
      title,
      school: schoolInfo.school,
      subject,
      grade: schoolInfo.grade,
      academicYear: academic.value,
      academicYearRaw: academic.raw,
      reportDate,
      region,
      schoolCode,
      directorate: cleanMetadataValue(textLines.find(text => /المديريه.*للتعليم|المديرية.*للتعليم/.test(normalize(text))) || ""),
      ministry: cleanMetadataValue(textLines.find(text => /وزاره التعليم|وزارة التعليم/.test(normalize(text))) || ""),
      aggregatedReport: true,
    };
  }

  const AGGREGATED_NARRATIVE_SECTIONS = Object.freeze([
    { id: "strengths", label: "جوانب الإجادة", pattern: /جوانب.*(?:الاجاده|الجاده).*ادلتها/ },
    { id: "development", label: "جوانب التطوير", pattern: /الجوانب.*تحتاج.*تطوير/ },
    { id: "support", label: "الدعم المقدم", pattern: /^الدعم المقدم$/ },
    { id: "discussion", label: "المداولة الإشرافية", pattern: /مداوله اشرافيه|مداولة إشرافية/ },
    { id: "recommendations", label: "التوصيات", pattern: /^التوصيات$/ },
  ]);

  function aggregatedNarrativeSection(text) {
    const value = normalize(text);
    return AGGREGATED_NARRATIVE_SECTIONS.find(section => section.pattern.test(value)) || null;
  }

  function buildAggregatedNarrativeRows(pageRecords) {
    const rows = [];
    let current = null;
    let serial = 0;
    for (const page of pageRecords || []) {
      for (const line of page.lines || []) {
        const text = lineTextValue(line);
        if (!text) continue;
        const section = aggregatedNarrativeSection(text);
        if (section) { current = section; continue; }
        if (!current) continue;
        const normalized = normalize(text);
        if (/^(?:سلطنه عمان|وزاره التعليم|المديريه.*للتعليم|المنطقه|المدرسه|رمز المدرسه|العام الدراس|الساعه|التاريخ|رقم الصفحه)/.test(normalized)) continue;
        if (/التقرير التجميعي.*(?:الزياره|الزيارة)/.test(normalized)) continue;
        if (/(?:طبع|بع) بواسطه/.test(normalized)) {
          const previous = rows.at(-1);
          if (previous && previous["الصفحة"] === page.pageNumber && /^[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){1,5}$/.test(String(previous["النص"] || "").trim()) && String(previous["النص"] || "").trim().length <= 80) {
            rows.pop();
            serial -= 1;
          }
          current = null;
          continue;
        }
        if (/^[\d:：\s\/\-صم]+$/.test(normalizeDigits(text))) continue;
        if (text.length < 4) continue;
        rows.push({ "م": ++serial, "القسم": current.label, "النص": text, "الصفحة": page.pageNumber });
      }
    }
    return rows;
  }

  function detectAggregatedSupervisionNarrativePdf(pageRecords) {
    const allText = normalize((pageRecords || []).map(page => pageText(page.lines || [])).join("\n"));
    const sectionHits = AGGREGATED_NARRATIVE_SECTIONS.filter(section => section.pattern.test(allText)).length;
    if (!/التقرير التجميعي/.test(allText) || !/(?:الزياره|الزيارة).*(?:الاشرافيه|الإشرافية|الشرافيه)/.test(allText) || sectionHits < 3) return null;
    const rows = buildAggregatedNarrativeRows(pageRecords);
    if (rows.length < 3) return null;
    const metadata = extractAggregatedNarrativeMetadata(pageRecords);
    const sourceWarnings = [];
    if (metadata.academicYearRaw && metadata.academicYearRaw !== metadata.academicYear) {
      sourceWarnings.push(`تم توحيد اتجاه العام الدراسي من ${metadata.academicYearRaw} إلى ${metadata.academicYear} للعرض.`);
    }
    const rawText = (pageRecords || []).map(page => pageText(page.lines || [])).filter(Boolean).join("\n");
    return {
      dataset: {
        id: "pdf-supervision-narrative",
        name: "تقرير إشرافي سردي منظم",
        headers: ["م", "القسم", "النص", "الصفحة"],
        rows,
        rawText,
        meta: {
          sourceType: "pdf",
          mode: "narrative",
          specializedType: "supervision_narrative",
          reportTitle: metadata.title,
          metadata: { ...metadata, title: metadata.title },
          sourceWarnings,
          documentContext: {
            aggregatedReport: true,
            entityScope: "aggregated-multiple-visits-or-teachers",
            contradictionPolicy: "contextual-variation-until-record-identity-is-proven",
          },
          narrativeSections: [...new Set(rows.map(row => row["القسم"]))],
          pageCount: pageRecords.length,
        },
      },
      warnings: sourceWarnings,
    };
  }

  function detectPdfPageReportTitle(lines, headerRow = 1) {
    const beforeHeader = (lines || []).slice(0, Math.max(0, Number(headerRow || 1) - 1))
      .map(line => String(line?.text || "").trim())
      .filter(Boolean);
    if (!beforeHeader.length) return "";
    const signals = /فحص\s+أعمال\s+الطلبة|ملخص\s+الأداء|استبانة|استمارة|زيارة\s+إشرافية|تقرير|كشف|إحصائية/;
    const signaled = beforeHeader.filter(text => signals.test(text));
    return String(signaled.at(-1) || beforeHeader.at(-1) || "").trim();
  }

  function mergeCompatiblePdfTables(datasets) {
    const groups = new Map();
    const other = [];
    for (const dataset of datasets) {
      const key = dataset.headers.map(normalize).join("|");
      if (!key || dataset.headers.length < 2) { other.push(dataset); continue; }
      if (!groups.has(key)) groups.set(key, { ...dataset, name: dataset.name.replace(/ · صفحة \d+$/, ""), rows: [], pages: [], rawTexts: [], reportTitles: [] });
      const group = groups.get(key);
      group.rows.push(...dataset.rows);
      if (dataset.meta?.page) group.pages.push(dataset.meta.page);
      if (dataset.rawText) group.rawTexts.push(dataset.rawText);
      if (dataset.meta?.reportTitle) group.reportTitles.push(dataset.meta.reportTitle);
    }
    return [...groups.values()].map(dataset => {
      const { rawTexts = [], reportTitles = [], ...clean } = dataset;
      const reportTitle = reportTitles.find(Boolean) || clean.meta?.reportTitle || "";
      return {
        ...clean,
        rawText: [...new Set(rawTexts.filter(Boolean))].join("\n"),
        name: clean.pages.length > 1 ? `${clean.name} · الصفحات ${clean.pages.join("، ")}` : clean.name,
        meta: { ...clean.meta, reportTitle, metadata: { ...(clean.meta?.metadata || {}), title: reportTitle }, pages: clean.pages, pageCount: clean.pages.length }
      };
    }).concat(other);
  }

  async function loadPdfModule() {
    if (window.__TAQAREER_PDFJS__) return window.__TAQAREER_PDFJS__;
    try {
      return await import(PDF_MODULE_URL);
    } catch (error) {
      throw new Error("تعذر تحميل وحدة قراءة PDF. تحقق من الاتصال بالإنترنت ثم أعد المحاولة، أو استخدم الاستخراج اليدوي المؤقت.");
    }
  }

  async function readPdf(file) {
    const pdfjs = await loadPdfModule();
    if (!pdfjs?.getDocument) throw new Error("وحدة PDF المحمّلة لا توفر واجهة القراءة المتوقعة.");
    if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: PDF_CMAP_URL,
      cMapPacked: true,
      standardFontDataUrl: PDF_STANDARD_FONTS_URL,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    const pageDatasets = [];
    const allLines = [];
    const pageRecords = [];
    let totalItems = 0;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: false });
      totalItems += content.items.length;
      const lines = groupPdfItemsIntoLines(content.items);
      pageRecords.push({ pageNumber, lines });
      allLines.push(...lines.map(line => ({ ...line, page: pageNumber })));
      const matrix = lines.map(line => line.cells.length >= 2 ? line.cells : [line.text]);
      const table = matrixToTable(matrix);
      if (table.headers.length >= 2 && table.rows.length >= 1 && table.score > 8) {
        const pageText = lines.map(line => String(line?.text || "").trim()).filter(Boolean).join("\n");
        const reportTitle = detectPdfPageReportTitle(lines, table.headerRow);
        pageDatasets.push({
          id: `pdf-page-${pageNumber}-table`,
          name: `جدول PDF · صفحة ${pageNumber}`,
          headers: table.headers,
          rows: table.rows,
          rawText: pageText,
          meta: {
            sourceType: "pdf", mode: "table", page: pageNumber, headerRow: table.headerRow,
            reportTitle, metadata: { title: reportTitle },
            documentPreamble: lines.slice(0, Math.max(0, table.headerRow - 1)).map(line => String(line?.text || "").trim()).filter(Boolean)
          }
        });
      }
    }

    if (totalItems < 4 || !allLines.length) {
      const error = new Error("لا يحتوي PDF على طبقة نصية كافية. يبدو أنه ممسوح ضوئيًا أو أن النص مشفر بطريقة لا تسمح بالاستخراج المحلي.");
      error.code = "PDF_TEXT_LAYER_WEAK";
      throw error;
    }

    const specialized = detectMultiVisitSupervisionPdf(pageRecords);
    const narrativeSpecialized = specialized ? null : detectAggregatedSupervisionNarrativePdf(pageRecords);
    const datasets = specialized
      ? [specialized.dataset, ...mergeCompatiblePdfTables(pageDatasets)]
      : narrativeSpecialized
        ? [narrativeSpecialized.dataset, ...mergeCompatiblePdfTables(pageDatasets)]
        : mergeCompatiblePdfTables(pageDatasets);
    const narrativeRows = allLines.map((line, index) => ({
      "م": index + 1,
      "الصفحة": line.page,
      "النص": line.text
    }));
    datasets.push({
      id: "pdf-narrative",
      name: `النص الكامل · ${pdf.numPages} صفحة`,
      headers: ["م", "الصفحة", "النص"],
      rows: narrativeRows,
      rawText: allLines.map(line => line.text).join("\n"),
      meta: { sourceType: "pdf", mode: "narrative", pageCount: pdf.numPages, textItemCount: totalItems, metadata: narrativeSpecialized?.dataset?.meta?.metadata || {} }
    });

    return {
      name: file.name,
      kind: "pdf",
      datasets,
      preferredDatasetId: specialized?.dataset?.id || narrativeSpecialized?.dataset?.id || "",
      warnings: [
        ...(totalItems < 20 ? ["طبقة النص محدودة؛ راجع المعاينة قبل اعتماد التحليل."] : []),
        ...(specialized?.warnings || []),
      ]
    };
  }


  async function renderPdfPages(file, maxPages = 3) {
    const pdfjs = await loadPdfModule();
    if (!pdfjs?.getDocument) throw new Error("وحدة PDF المحمّلة لا توفر واجهة العرض المتوقعة.");
    if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: PDF_CMAP_URL,
      cMapPacked: true,
      standardFontDataUrl: PDF_STANDARD_FONTS_URL,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    const pageLimit = Math.min(pdf.numPages, Math.max(1, Number(maxPages) || 3));
    const images = [];

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const targetWidth = Math.min(1800, Math.max(1100, baseViewport.width * 1.8));
      const scale = targetWidth / Math.max(1, baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      images.push({
        page: pageNumber,
        label: `${file.name} · صفحة ${pageNumber}`,
        dataUrl: canvas.toDataURL("image/jpeg", 0.86),
        width: canvas.width,
        height: canvas.height
      });
      canvas.width = 1;
      canvas.height = 1;
    }

    return { name: file.name, pageCount: pdf.numPages, renderedPages: images.length, images };
  }

  function imagePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, kind: "image", dataUrl: reader.result, size: file.size, type: file.type });
      reader.onerror = () => reject(new Error("تعذر فتح الصورة محليًا."));
      reader.readAsDataURL(file);
    });
  }

  window.TaqareerDocuments = {
    readDocx,
    readPdf,
    renderPdfPages,
    imagePreview,
    constants: { PDF_MODULE_URL, PDF_WORKER_URL },
    _test: {
      matrixToTable, pruneGeneratedEmptyColumns, groupPdfItemsIntoLines, detectPdfPageReportTitle, paragraphRows, parseWordBody, parseWordMetadata, parseWordMetadataTokens, storyTextTokens,
      detectMultiVisitSupervisionPdf, detectAggregatedSupervisionNarrativePdf, extractAggregatedNarrativeMetadata, buildAggregatedNarrativeRows, parseSupervisionRatings, parseSupervisionNarrative, parseVisitPage,
      supervisionVisitRows, indicators: SUPERVISION_VISIT_INDICATORS, scale: SUPERVISION_SCALE,
    }
  };
})();
