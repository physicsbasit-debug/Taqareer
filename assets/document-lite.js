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
    return { headers, rows, headerRow: bestIndex + 1, matrix: compact, score: bestScore };
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

  function mergeCompatiblePdfTables(datasets) {
    const groups = new Map();
    const other = [];
    for (const dataset of datasets) {
      const key = dataset.headers.map(normalize).join("|");
      if (!key || dataset.headers.length < 2) { other.push(dataset); continue; }
      if (!groups.has(key)) groups.set(key, { ...dataset, name: dataset.name.replace(/ · صفحة \d+$/, ""), rows: [], pages: [] });
      const group = groups.get(key);
      group.rows.push(...dataset.rows);
      if (dataset.meta?.page) group.pages.push(dataset.meta.page);
    }
    return [...groups.values()].map(dataset => ({
      ...dataset,
      name: dataset.pages.length > 1 ? `${dataset.name} · الصفحات ${dataset.pages.join("، ")}` : dataset.name,
      meta: { ...dataset.meta, pages: dataset.pages, pageCount: dataset.pages.length }
    })).concat(other);
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
    let totalItems = 0;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: false });
      totalItems += content.items.length;
      const lines = groupPdfItemsIntoLines(content.items);
      allLines.push(...lines.map(line => ({ ...line, page: pageNumber })));
      const matrix = lines.map(line => line.cells.length >= 2 ? line.cells : [line.text]);
      const table = matrixToTable(matrix);
      if (table.headers.length >= 2 && table.rows.length >= 1 && table.score > 8) {
        pageDatasets.push({
          id: `pdf-page-${pageNumber}-table`,
          name: `جدول PDF · صفحة ${pageNumber}`,
          headers: table.headers,
          rows: table.rows,
          meta: { sourceType: "pdf", mode: "table", page: pageNumber, headerRow: table.headerRow }
        });
      }
    }

    if (totalItems < 4 || !allLines.length) {
      const error = new Error("لا يحتوي PDF على طبقة نصية كافية. يبدو أنه ممسوح ضوئيًا أو أن النص مشفر بطريقة لا تسمح بالاستخراج المحلي.");
      error.code = "PDF_TEXT_LAYER_WEAK";
      throw error;
    }

    const datasets = mergeCompatiblePdfTables(pageDatasets);
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
      meta: { sourceType: "pdf", mode: "narrative", pageCount: pdf.numPages, textItemCount: totalItems }
    });

    return {
      name: file.name,
      kind: "pdf",
      datasets,
      warnings: totalItems < 20 ? ["طبقة النص محدودة؛ راجع المعاينة قبل اعتماد التحليل."] : []
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
    _test: { matrixToTable, groupPdfItemsIntoLines, paragraphRows, parseWordBody, parseWordMetadata, parseWordMetadataTokens, storyTextTokens }
  };
})();
