const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function load() {
  const sandbox = {
    window: {}, console, Map, Set, Array, Object, String, Number, RegExp, JSON, Math, Intl, Date, structuredClone,
    TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
  };
  vm.createContext(sandbox);
  for (const rel of [
    'assets/pdf-table-structure.js', 'assets/pdf-column-alignment.js', 'assets/pdf-intake-v2.js', 'assets/document-lite.js',
    'assets/analysis-profile.js', 'assets/mastery-metrics.js', 'assets/visualization-policy.js', 'assets/deep-analysis.js',
  ]) vm.runInContext(read(rel), sandbox, { filename: rel });
  return sandbox;
}

function item(str, center, y, width = 18) {
  return { str, transform: [1, 0, 0, 12, center - width / 2, y], width, height: 12, dir: /[\u0600-\u06FF]/.test(str) ? 'rtl' : 'ltr' };
}

const subjects = [
  ['التربية الإسلامية', 700], ['اللغة العربية', 650], ['اللغة الإنجليزية', 600], ['الرياضيات', 550], ['العلوم', 500],
  ['الدراسات الاجتماعية', 450], ['المهارات الحياتية', 400], ['تقنية المعلومات', 350], ['الرياضة المدرسية', 300],
  ['الفنون التشكيلية', 250], ['المهارات الموسيقية', 200],
];

function headerItems(expected, pageNumber) {
  const items = [
    item('كشــــف نتــــائج الطــــلب', 500, 790, 160),
    item('الباسط للبنين الصفوف (10-8)', 860, 760, 170),
    item('الصف : الثامن', 850, 735, 90),
    item('العام الدراسي : 2025/2026', 700, 710, 150),
    item('الشعبة : الكل', 500, 710, 90),
    item('إجمالي الطلبة', 760, 680, 90),
    item(String(expected), 760, 660, 25),
    item(`رقم الصفحة ${pageNumber}`, 930, 680, 90),
  ];
  for (const [name, center] of subjects) items.push(item(name, center, 575, 42));
  items.push(item('الدرجة', 720, 540, 32), item('المستوى', 680, 540, 38));
  items.push(item('م', 1010, 540, 12), item('اسم الطالب', 920, 540, 70), item('الجنسية', 815, 540, 50), item('القيد', 765, 540, 35));
  return items;
}

function studentItems(serial, y, special = false) {
  const items = [
    item(String(serial), 1010, y, 16),
    item(`طالب تجريبي ${serial}`, 910, y, 90),
    item('عماني', 815, y, 38),
    item(special ? 'باق' : 'منقول', 765, y, 42),
  ];
  subjects.forEach(([, center], index) => {
    const score = special ? 'م' : String(55 + ((serial * 7 + index * 5) % 45));
    const numeric = Number(score);
    const level = special ? 'م' : numeric >= 90 ? 'أ' : numeric >= 80 ? 'ب' : numeric >= 65 ? 'ج' : numeric >= 50 ? 'د' : 'هـ';
    items.push(item(score, center + 8, y, 14), item(level, center - 8, y, 12));
  });
  return items;
}

function pageItems(pageNumber, expected, serials) {
  const items = headerItems(expected, pageNumber);
  serials.forEach((serial, index) => items.push(...studentItems(serial, 500 - index * 25, serial === 3)));
  return items;
}

function notesItems() {
  return [
    item('سلطنة عمان', 900, 780, 60),
    item('م - محروم من الاختبار بقرار لجنة الانتظام والانضباط الطلابي', 550, 620, 340),
    item('غ - غياب عن الاختبارات', 550, 590, 160),
  ];
}

function installPdfMock(sandbox, pageItemSets) {
  sandbox.window.__TAQAREER_PDFJS__ = {
    GlobalWorkerOptions: {},
    getDocument() {
      return { promise: Promise.resolve({
        numPages: pageItemSets.length,
        getPage: async pageNumber => ({ getTextContent: async () => ({ items: pageItemSets[pageNumber - 1] }) }),
      }) };
    },
  };
}

const fakeFile = { name: 'نتائج-متعددة-المواد.pdf', arrayBuffer: async () => new ArrayBuffer(8) };

test('multi-subject PDF passes the real readPdf gate only after recovering all serials and ignores a legend page', async () => {
  const sandbox = load();
  installPdfMock(sandbox, [pageItems(1, 6, [1, 2, 3]), pageItems(2, 6, [4, 5, 6]), notesItems()]);
  const source = await sandbox.window.TaqareerDocuments.readPdf(fakeFile);
  assert.equal(source.preferredDatasetId, 'pdf-multi-subject-results');
  const dataset = source.datasets.find(item => item.id === source.preferredDatasetId);
  assert.ok(dataset);
  assert.equal(dataset.meta.specializedType, 'multi_subject_results');
  assert.equal(dataset.rows.length, 6);
  assert.equal(dataset.meta.normalization.expectedStudentCount, 6);
  assert.equal(dataset.meta.normalization.subjectCount, 11);
  assert.equal(dataset.meta.normalization.scoreCount, 55);
  assert.equal(dataset.meta.normalization.specialValueCount, 11);
  assert.equal(dataset.meta.normalization.specialStudentCount, 1);
  assert.deepEqual(Array.from(dataset.meta.dataPages), [1, 2]);
  assert.deepEqual(Array.from(dataset.meta.ignoredPages), [3]);
  assert.equal(dataset.meta.metadata.analyzedGrade, 'الثامن');
  assert.equal(dataset.rows[2]['حالة القيد'], 'باق');
  assert.equal(dataset.rows[2]['العلوم - الدرجة'], 'م');
  assert.match(source.warnings.join(' '), /استبعاد 1 صفحة/);
});

test('multi-subject PDF preserves the incomplete-table guard when one student serial is missing', async () => {
  const sandbox = load();
  installPdfMock(sandbox, [pageItems(1, 6, [1, 2, 3]), pageItems(2, 6, [4, 6]), notesItems()]);
  await assert.rejects(
    () => sandbox.window.TaqareerDocuments.readPdf(fakeFile),
    error => {
      assert.equal(error.code, 'PDF_TABLE_INCOMPLETE');
      assert.deepEqual(Array.from(error.details.missingRecords), [5]);
      assert.equal(error.details.expectedStudentCount, 6);
      assert.equal(error.details.parsedStudentCount, 5);
      assert.equal(error.details.specializedType, 'multi_subject_results');
      return true;
    },
  );
});

test('multi-subject PDF keeps special nonnumeric students in the analysis population while excluding their markers from arithmetic', async () => {
  const sandbox = load();
  installPdfMock(sandbox, [pageItems(1, 6, [1, 2, 3]), pageItems(2, 6, [4, 5, 6]), notesItems()]);
  const source = await sandbox.window.TaqareerDocuments.readPdf(fakeFile);
  const dataset = source.datasets.find(item => item.id === source.preferredDatasetId);
  const profile = sandbox.window.TaqareerAnalysisProfiler.profileTable({ headers: dataset.headers, rows: dataset.rows, sourceMeta: dataset.meta });
  assert.equal(profile.recommendedTypeId, 'multi_subject_results');
  assert.equal(profile.rowRoles.dataRowIndexes.length, 6);
  assert.equal(profile.rowRoles.numericDataRowIndexes.length, 5);
  assert.equal(profile.metadata.studentCount, 6);
  assert.equal(profile.metadata.analyzableStudentCount, 5);
  assert.equal(profile.metadata.specialStudentCount, 1);
  const analysis = sandbox.window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: dataset.headers, rows: dataset.rows, sourceMeta: dataset.meta, analysisProfile: profile,
    analysisOptions: { mode: 'all', includeSubjectTopTen: true, includeSchoolRanking: true },
  });
  const metric = id => analysis.metrics.find(item => item.id === id)?.value;
  assert.equal(metric('studentCount'), 6);
  assert.equal(metric('subjectCount'), 11);
  assert.equal(metric('scoreCount'), 55);
  assert.equal(analysis.scopeContext.studentCount, 6);
  assert.ok(analysis.statusDistribution.some(item => item.label === 'باق' && item.count === 1));
  assert.ok(analysis.subjects.every(item => item.n === 5));
});


function pdfJsFragmentedHeaderItems(expected, pageNumber) {
  const parts = [
    ['التربية', 'الإسلامية', 700], ['اللغة', 'العربية', 650], ['اللغة', 'الإنجليزية', 600],
    ['الرياضيات', '', 550], ['العلوم', '', 500], ['الدراسات', 'الاجتماعية', 450],
    ['المهارات', 'الحياتية', 400], ['تقنية', 'المعلومات', 350], ['الرياضة', 'المدرسية', 300],
    ['الفنون', 'التشكيلية', 250], ['المهارات', 'الموسيقية', 200],
  ];
  const items = [
    item('كشــــف نتــــائج الطــــلب', 500, 790, 160),
    item('الباسط للبنين الصفوف (10-8)', 860, 760, 170),
    item('الصف : الثامن', 850, 735, 90),
    item('العام الدراسي : 2025/2026', 700, 710, 150),
    item('الشعبة : الكل', 500, 710, 90),
    item('إجمالي الطلبة', 760, 680, 90),
    item(String(expected), 760, 660, 25),
    item(`رقم الصفحة ${pageNumber}`, 930, 680, 90),
    item('م', 1010, 540, 12), item('اسم الطالب', 920, 540, 70), item('الجنسية', 815, 540, 50), item('القيد', 765, 540, 35),
  ];
  for (const [top, bottom, center] of parts) {
    items.push(item(top, center, 575, 42));
    // PDF.js may expose stacked RTL words with slightly different horizontal origins.
    if (bottom) items.push(item(bottom, center + 14, 559, 42));
    items.push(item('الدرجة', center + 10, 540, 20), item('المستوى', center - 10, 540, 20));
  }
  return items;
}

function pdfJsFragmentedPageItems(pageNumber, expected, serials) {
  const items = pdfJsFragmentedHeaderItems(expected, pageNumber);
  serials.forEach((serial, index) => items.push(...studentItems(serial, 500 - index * 25, serial === 3)));
  return items;
}

test('multi-subject PDF uses score/level pair anchors when PDF.js shifts stacked RTL subject fragments', async () => {
  const sandbox = load();
  installPdfMock(sandbox, [
    pdfJsFragmentedPageItems(1, 6, [1, 2, 3]),
    pdfJsFragmentedPageItems(2, 6, [4, 5, 6]),
  ]);

  // Reproduce the live failure boundary: the generic canonical intake sees an
  // incomplete repeated table.  The specialized adapter must recover the real
  // student matrix first, otherwise readPdf throws the generic page error.
  sandbox.window.TaqareerPdfIntakeV2.normalizePdfPages = () => ({
    tables: [{ structure: { pagination: { missingPages: [1, 2], expectedPages: [1, 2], parsedPages: [] } } }],
    diagnostics: { reviewTableCount: 1 },
    metadata: {},
  });
  sandbox.window.TaqareerPdfIntakeV2.datasetsFromCanonical = () => [];

  const source = await sandbox.window.TaqareerDocuments.readPdf(fakeFile);
  assert.equal(source.preferredDatasetId, 'pdf-multi-subject-results');
  const dataset = source.datasets.find(entry => entry.id === source.preferredDatasetId);
  assert.equal(dataset.rows.length, 6);
  assert.equal(dataset.meta.normalization.subjectCount, 11);
  assert.equal(dataset.meta.normalization.scoreCount, 55);
  assert.equal(dataset.meta.normalization.specialValueCount, 11);
  assert.match(dataset.meta.normalization.subjectDiscovery, /(?:score-level-pair-anchors|semantic-subjects-plus-raw-row-recovery)/);
  assert.equal(dataset.rows[5]['الرياضيات - الدرجة'], String(55 + ((6 * 7 + 3 * 5) % 45)));
});

function splitRowPdfJsItems(pageNumber, expected, serials) {
  const items = pdfJsFragmentedHeaderItems(expected, pageNumber);
  serials.forEach((serial, rowIndex) => {
    const baseY = 500 - rowIndex * 25;
    const row = studentItems(serial, baseY, serial === 3);
    row.forEach((entry, index) => {
      // Reproduce PDF.js/Crystal Reports baselines that differ slightly between
      // identity text, numeric scores and RTL level glyphs. The normal line
      // grouper intentionally splits these; raw recovery must rebuild the row.
      if (index >= 4) entry.transform[5] += index % 2 === 0 ? 3.8 : -3.2;
      else if (index === 2 || index === 3) entry.transform[5] += 2.9;
    });
    items.push(...row);
  });
  return items;
}

test('multi-subject PDF rebuilds student rows from raw PDF.js items when score and level baselines split across lines', async () => {
  const sandbox = load();
  installPdfMock(sandbox, [
    splitRowPdfJsItems(1, 6, [1, 2, 3]),
    splitRowPdfJsItems(2, 6, [4, 5, 6]),
  ]);
  sandbox.window.TaqareerPdfIntakeV2.normalizePdfPages = () => ({
    tables: [{ structure: { pagination: { missingPages: [1, 2], expectedPages: [1, 2], parsedPages: [] } } }],
    diagnostics: { reviewTableCount: 1 }, metadata: {},
  });
  sandbox.window.TaqareerPdfIntakeV2.datasetsFromCanonical = () => [];
  const source = await sandbox.window.TaqareerDocuments.readPdf(fakeFile);
  assert.equal(source.preferredDatasetId, 'pdf-multi-subject-results');
  const dataset = source.datasets.find(entry => entry.id === source.preferredDatasetId);
  assert.equal(dataset.rows.length, 6);
  assert.equal(dataset.meta.normalization.subjectCount, 11);
  assert.equal(dataset.meta.normalization.scoreCount, 55);
  assert.equal(dataset.meta.normalization.specialValueCount, 11);
  assert.equal(dataset.meta.normalization.subjectDiscovery, 'semantic-subjects-plus-raw-row-recovery');
});

function rtlOriginShift(items) {
  return items.map(entry => {
    const clone = { ...entry, transform: [...entry.transform] };
    if (clone.dir === 'rtl') clone.transform[4] += Number(clone.width || 0);
    return clone;
  });
}

test('multi-subject raw recovery tolerates RTL text origins shifted to the right edge', async () => {
  const sandbox = load();
  installPdfMock(sandbox, [
    rtlOriginShift(splitRowPdfJsItems(1, 6, [1, 2, 3])),
    rtlOriginShift(splitRowPdfJsItems(2, 6, [4, 5, 6])),
  ]);
  sandbox.window.TaqareerPdfIntakeV2.normalizePdfPages = () => ({
    tables: [{ structure: { pagination: { missingPages: [1, 2], expectedPages: [1, 2], parsedPages: [] } } }],
    diagnostics: { reviewTableCount: 1 }, metadata: {},
  });
  sandbox.window.TaqareerPdfIntakeV2.datasetsFromCanonical = () => [];
  const source = await sandbox.window.TaqareerDocuments.readPdf(fakeFile);
  assert.equal(source.preferredDatasetId, 'pdf-multi-subject-results');
  const dataset = source.datasets.find(entry => entry.id === source.preferredDatasetId);
  assert.equal(dataset.rows.length, 6);
  assert.equal(dataset.meta.normalization.subjectCount, 11);
  assert.equal(dataset.rows[2]['حالة القيد'], 'باق');
});
