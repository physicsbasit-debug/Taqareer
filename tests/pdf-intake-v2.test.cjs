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
  vm.runInContext(read('assets/pdf-table-structure.js'), sandbox, { filename: 'pdf-table-structure.js' });
  vm.runInContext(read('assets/pdf-column-alignment.js'), sandbox, { filename: 'pdf-column-alignment.js' });
  vm.runInContext(read('assets/pdf-intake-v2.js'), sandbox, { filename: 'pdf-intake-v2.js' });
  vm.runInContext(read('assets/document-lite.js'), sandbox, { filename: 'document-lite.js' });
  vm.runInContext(read('assets/report-system.js'), sandbox, { filename: 'report-system.js' });
  return sandbox.window;
}

function line(lineIndex, cells) {
  const values = Array.isArray(cells) ? cells : [cells];
  return { lineIndex, cells: values, text: values.join(' ') };
}

function page(pageNumber, rows) {
  return { pageNumber, lines: rows.map((cells, index) => line(index + 1, cells)) };
}

const indicatorPdf = [page(1, [
  ['سلطنة عمان'],
  ['وزارة التعليم'],
  ['المديرية العامه للتربية والتعليم'],
  ['المنطقة : محافظة جنوب الباطنة'],
  ['المدرسة :'],
  ['رمز المدرسة :3305'],
  ['2026/08/02'],
  ['العام الدراسى'],
  ['2026/2025'],
  ['الباسط للبنين الصفوف )10-8('],
  ['مواطن القوة واولويات التطوير لستمارة استمارة الزيارة الشرافية لمعلم مجال/ مادة لمادة الفيزياء'],
  ['جوانب الجاده اليجابية فى الداء و ادلتها'],
  ['المتوسط', 'بنود التقويم'],
  ['1', 'تحصيل الطلبة في الأعمال الصفية وغير الصفية'],
  ['2', 'التقدم الدراسي للطلبة بما فيهم الطلبة ذوي الاحتياجات التعليمية'],
  ['1', 'تطبيق مهارات التعلم وربطها بالواقع'],
  ['2', 'تمسك الطلبة بالهوية العمانية والقيم الإنسانية'],
  ['1', 'متابعة جوانب الأمن والسلامة والنظافة في بيئة التعلم'],
  ['1', 'تخطيط المنهاج الدراسي لتحقيق نواتج التعلم'],
  ['2', 'فاعلية الإدارة الصفية'],
  ['1', 'توظيف استراتيجيات التدريس الفعالة'],
  ['2', 'تفعيل المصادر والموارد التعليمية'],
  ['1', 'توظيف أساليب تقويم متنوعة'],
  ['2', 'توظيف التقويم الذاتي والتطوير المهني في تحسين الأداء'],
  ['1', 'تطبيق السياسات والأنظمة واللوائح المنظمة للعمل'],
  ['1', 'تنفيذ مبادرات وأنشطة تربوية في المجتمع المدرسي'],
  ['طبع بواسطة :', '[محجوب]'],
])];

test('canonical PDF intake separates metadata from a 13x2 indicator table without a type-specific adapter', () => {
  const window = load();
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(indicatorPdf);
  assert.equal(canonical.canonicalDocumentVersion, '2.4.1');
  assert.equal(canonical.metadata.school, 'الباسط للبنين (8-10)');
  assert.equal(canonical.metadata.subject, 'الفيزياء');
  assert.equal(canonical.metadata.grade, '8-10');
  assert.equal(canonical.metadata.academicYear, '2025/2026');
  assert.equal(canonical.metadata.reportDate, '2026/08/02');
  assert.equal(canonical.metadata.schoolCode, '3305');
  assert.equal(canonical.tables.length, 1);
  assert.deepEqual(Array.from(canonical.tables[0].headers), ['بنود التقويم', 'المتوسط']);
  assert.equal(canonical.tables[0].rows.length, 13);
  assert.equal(canonical.tables[0].status, 'accepted');
  assert.ok(canonical.tables[0].rows.every(row => row['بنود التقويم'] && ['1', '2'].includes(String(row['المتوسط']))));
  assert.equal(canonical.tables[0].rows.some(row => /المدرسة|المنطقة|الساعة|رمز المدرسة/.test(row['بنود التقويم'])), false);
  assert.equal(canonical.sections.length, 0, 'table rows must not leak into narrative sections');
  assert.equal(canonical.unresolved.length, 0, 'known header and metadata values should not be left unresolved');
  assert.ok(canonical.noise.some(block => /طبع بواسطة/.test(block.text)));
});

test('canonical datasets carry provenance metadata and become the preferred clean table contract', () => {
  const window = load();
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(indicatorPdf);
  const datasets = window.TaqareerPdfIntakeV2.datasetsFromCanonical(canonical);
  assert.equal(datasets.length, 1);
  assert.equal(datasets[0].meta.extractionMode, 'canonical-pdf-intake-v2');
  assert.equal(datasets[0].meta.canonicalDocumentVersion, '2.4.1');
  assert.equal(datasets[0].meta.metadata.subject, 'الفيزياء');
  assert.equal(datasets[0].meta.structuralConfidence >= 0.85, true);
  assert.ok(canonical.metadataProvenance.every(item => item.provenance?.sourceText));
});

test('narrative PDF remains narrative and is not forced into a table', () => {
  const window = load();
  const pages = [
    page(1, [
      ['وزارة التعليم'], ['محافظة جنوب الباطنة'], ['رمز المدرسة :3305'], ['2026/08/02'], ['2026/2025'],
      ['الباسط للبنين الصفوف )10-8('],
      ['التقرير التجميعي لاستمارة الزيارة الإشرافية لمعلم مجال/ مادة لمادة الأحياء'],
      ['جوانب الإجادة في الأداء وأدلتها'],
      ['يخطط المعلم دروسه ويربطها بخبرات الطلبة السابقة.'],
      ['الجوانب التي تحتاج إلى تطوير في الأداء وأدلتها'],
      ['يحتاج بعض الطلبة إلى توجيه إضافي في التفكير الناقد.'],
    ]),
    page(2, [
      ['وزارة التعليم'], ['التقرير التجميعي لاستمارة الزيارة الإشرافية لمعلم مجال/ مادة لمادة الأحياء'],
      ['الدعم المقدم'], ['تزويد المعلم بنماذج تقييم متمايزة.'],
      ['مداولة إشرافية'], ['توسيع الأنشطة التطبيقية التفاعلية.'],
      ['التوصيات'], ['إعداد أوراق عمل إثرائية للطلبة.'],
      ['طبع بواسطة :', '[محجوب]'],
    ]),
  ];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 0);
  assert.equal(canonical.metadata.subject, 'الأحياء');
  assert.deepEqual(Array.from(new Set(canonical.sections.map(section => section.id))), ['strengths', 'development', 'support', 'discussion', 'recommendations']);
  const specialized = window.TaqareerDocuments._test.detectAggregatedSupervisionNarrativePdf(pages, canonical);
  assert.ok(specialized);
  assert.equal(specialized.dataset.meta.metadata.school, 'الباسط للبنين (8-10)');
  assert.equal(specialized.dataset.meta.canonicalDocumentVersion, '2.4.1');
});

test('blind dimension-measure layout is normalized without report-type or filename rules', () => {
  const window = load();
  const pages = [page(1, [
    ['عنوان عام غير معروف'],
    ['المؤشر', 'القيمة'],
    ['الحضور في الموعد', '93'],
    ['إنجاز المهام', '88'],
    ['الاستجابة للمتابعة', '91'],
  ])];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 1);
  assert.deepEqual(Array.from(canonical.tables[0].headers), ['بنود التقويم', 'القيمة']);
  assert.equal(canonical.tables[0].rows.length, 3);
  assert.equal(canonical.tables[0].rows[0]['بنود التقويم'], 'الحضور في الموعد');
  assert.equal(canonical.tables[0].rows[0]['القيمة'], '93');
});

test('PDF intake core contains no hard-coded report type, subject, or filename switch', () => {
  const source = read('assets/pdf-intake-v2.js');
  assert.doesNotMatch(source, /supervision_indicator|supervision_narrative|student_work|multi_subject_results/);
  assert.doesNotMatch(source, /الفيزياء|الأحياء|الكيمياء/);
  assert.doesNotMatch(source, /fileName|filename|\.pdf['"`]/i);
});

test('shadow comparison records canonical-vs-legacy shapes without letting the legacy path override canonical output', () => {
  const window = load();
  const compare = window.TaqareerDocuments._test.comparePdfIntakeTables;
  const result = compare(
    [{ headers: ['بنود التقويم', 'المتوسط'], rows: Array.from({ length: 13 }, () => ({})) }],
    [{ headers: ['المنطقة', 'محافظة جنوب الباطنة', 'الساعة', ':', '12:23:11ص'], rows: Array.from({ length: 19 }, () => ({})) }],
  );
  assert.equal(result.mode, 'canonical-primary');
  assert.equal(result.canonical[0].rows, 13);
  assert.equal(result.canonical[0].columns, 2);
  assert.equal(result.legacy[0].rows, 19);
  assert.equal(result.legacy[0].columns, 5);
});


test('compatible tables repeated across PDF pages are merged before semantic routing', () => {
  const window = load();
  const pages = [
    page(1, [
      ['وزارة التعليم'], ['المؤشر', 'القيمة'],
      ['المؤشر الأول', '10'], ['المؤشر الثاني', '20'], ['المؤشر الثالث', '30'],
    ]),
    page(2, [
      ['وزارة التعليم'], ['المؤشر', 'القيمة'],
      ['المؤشر الرابع', '40'], ['المؤشر الخامس', '50'], ['المؤشر السادس', '60'],
    ]),
  ];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 1);
  assert.deepEqual(Array.from(canonical.tables[0].pages), [1, 2]);
  assert.equal(canonical.tables[0].rows.length, 6);
});


const blindHierarchicalDistributionPdf = [
  page(1, [
    ['سلطنة عمان'],
    ['وزارة التعليم'],
    ['احصائية بنسب مستويات الطلبة في مادة', 'الكيمياء', 'التاريخ', ': 2026/08/02'],
    ['نظام التعليم : أساسي'],
    ['العام الدراسي : 2025/2026'],
    ['المدرسة', ': الباسط للبنين الصفوف (10-8)'],
    ['البيان', 'أ', 'ب', 'ج', 'د', 'هـ', 'المجموع'],
    ['الصف', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث'],
    ['التاسع', '47', '0', '46', '0', '73', '0', '77', '0', '25', '0', '268', '0'],
    ['17.54%', '0%', '17.16%', '0%', '27.24%', '0%', '28.73%', '0%', '9.33%', '0%'],
    ['العاشر', '46', '0', '29', '0', '65', '0', '97', '0', '15', '0', '252', '0'],
    ['18.25%', '0%', '11.51%', '0%', '25.79%', '0%', '38.49%', '0%', '5.95%', '0%'],
    ['جملة', '93', '0', '75', '0', '138', '0', '174', '0', '40', '0', '520', '0'],
    ['17.88%', '0%', '14.42%', '0%', '26.54%', '0%', '33.46%', '0%', '7.69%', '0%'],
  ]),
  page(2, [
    ['سلطنة عمان'],
    ['وزارة التعليم'],
    ['احصائية بنسب مستويات الطلبة في مادة', 'الكيمياء', 'التاريخ', ': 2026/08/02'],
    ['العام الدراسي : 2025/2026'],
    ['البيان', 'أ', 'ب', 'ج', 'د', 'هـ', 'المجموع'],
    ['الصف', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث', 'ذكور', 'إناث'],
    ['جملة عامة', '93', '0', '75', '0', '138', '0', '174', '0', '40', '0', '520', '0'],
    ['17.88%', '0%', '14.42%', '0%', '26.54%', '0%', '33.46%', '0%', '7.69%', '0%'],
    ['طبع بواسطة /', '[محجوب]'],
  ]),
];

test('blind hierarchical PDF headers collapse to parent measures and repeated grand totals are deduplicated', () => {
  const window = load();
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(blindHierarchicalDistributionPdf);
  assert.equal(canonical.canonicalDocumentVersion, '2.4.1');
  assert.equal(canonical.tables.length, 1);
  const table = canonical.tables[0];
  assert.equal(table.status, 'accepted');
  assert.deepEqual(Array.from(table.headers), ['الصف', 'أ', 'ب', 'ج', 'د', 'هـ', 'المجموع']);
  assert.deepEqual(Array.from(table.pages), [1, 2]);
  assert.equal(table.rows.length, 3, 'two detail rows plus one deduplicated aggregate row');
  assert.deepEqual(JSON.parse(JSON.stringify(table.rows)), [
    { 'الصف': 'التاسع', 'أ': '47', 'ب': '46', 'ج': '73', 'د': '77', 'هـ': '25', 'المجموع': '268' },
    { 'الصف': 'العاشر', 'أ': '46', 'ب': '29', 'ج': '65', 'د': '97', 'هـ': '15', 'المجموع': '252' },
    { 'الصف': 'جملة عامة', 'أ': '93', 'ب': '75', 'ج': '138', 'د': '174', 'هـ': '40', 'المجموع': '520' },
  ]);
  assert.equal(table.structure.kind, 'hierarchical-table');
  assert.equal(table.structure.childWidth, 2);
  assert.equal(table.structure.percentageRowsCaptured, 4);
  assert.deepEqual(Array.from(table.rowMeta.map(item => item.role)), ['detail', 'detail', 'grand_total']);
});

test('hierarchical structure parser is generic and not tied to chemistry, gender labels, or report types', () => {
  const window = load();
  const pages = [page(1, [
    ['لوحة تشغيل عامة'],
    ['الوحدة', 'المجال الأول', 'المجال الثاني', 'الإجمالي'],
    ['الفئة', 'قناة 1', 'قناة 2', 'قناة 1', 'قناة 2', 'قناة 1', 'قناة 2'],
    ['المجموعة س', '10', '5', '4', '6', '14', '11'],
    ['المجموعة ص', '7', '3', '8', '2', '15', '5'],
  ])];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 1);
  assert.deepEqual(Array.from(canonical.tables[0].headers), ['الفئة', 'المجال الأول', 'المجال الثاني', 'الإجمالي']);
  assert.deepEqual(JSON.parse(JSON.stringify(canonical.tables[0].rows)), [
    { 'الفئة': 'المجموعة س', 'المجال الأول': '15', 'المجال الثاني': '10', 'الإجمالي': '25' },
    { 'الفئة': 'المجموعة ص', 'المجال الأول': '10', 'المجال الثاني': '10', 'الإجمالي': '20' },
  ]);
  const source = read('assets/pdf-table-structure.js');
  assert.doesNotMatch(source, /الكيمياء|الفيزياء|الأحياء/);
  assert.doesNotMatch(source, /ذكور|إناث/);
  assert.doesNotMatch(source, /supervision_|level_distribution|student_work|filename|fileName/);
});

test('hierarchical PDF projection feeds the existing distribution profile without score settings', () => {
  const window = load();
  vm.runInNewContext(read('assets/analysis-profile.js'), { window, console, Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone }, { filename: 'analysis-profile.js' });
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(blindHierarchicalDistributionPdf);
  const dataset = window.TaqareerPdfIntakeV2.datasetsFromCanonical(canonical)[0];
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: dataset.headers, rows: dataset.rows, sourceMeta: dataset.meta, typeId: 'unknown' });
  assert.equal(profile.recommendedTypeId, 'level_distribution');
  assert.equal(profile.analyzerId, 'level_distribution');
  assert.equal(profile.requiresScoreSettings, false);
  assert.equal(profile.rowRoles.dataRowIndexes.length, 2);
  assert.equal(profile.rowRoles.aggregateRowIndexes.length, 1);
  assert.deepEqual(Array.from(profile.columnRoles.levels.map(item => item.level)), ['أ', 'ب', 'ج', 'د', 'هـ']);
});

test('non-additive hierarchical child groups are not promoted to an accepted parent-sum dataset', () => {
  const window = load();
  const pages = [page(1, [
    ['عنوان مجهول'],
    ['الوحدة', 'المجال الأول', 'المجال الثاني', 'الإجمالي'],
    ['الفئة', 'مقياس 1', 'مقياس 2', 'مقياس 1', 'مقياس 2', 'مقياس 1', 'مقياس 2'],
    ['س', '10', '20', '30', '40', '999', '0'],
    ['ص', '5', '15', '25', '35', '888', '0'],
  ])];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 1);
  assert.equal(canonical.tables[0].status, 'unresolved');
  assert.equal(window.TaqareerPdfIntakeV2.datasetsFromCanonical(canonical).length, 0);
});


test('RTL individual-results table keeps seven semantic columns aligned across 14 pages', () => {
  const window = load();
  const headers = ['م', 'اسم الطالب', 'الجنسية', 'حالة القيد', 'المجموع', 'المستوى', 'دور ثاني'];
  const rows = Array.from({ length: 319 }, (_, index) => {
    const serial = index + 1;
    const score = serial === 313 ? 'غـ' : serial === 36 ? '0' : serial === 124 ? '21' : String(50 + (serial * 7) % 51);
    const numeric = Number(score);
    const level = score === 'غـ' ? 'غـ' : numeric >= 90 ? 'أ' : numeric >= 80 ? 'ب' : numeric >= 65 ? 'ج' : numeric >= 50 ? 'د' : 'هـ';
    return [String(serial), `طالب اختبار ${serial}`, serial % 19 === 0 ? 'جنسية أخرى' : 'عماني', serial % 53 === 0 ? 'مستجد' : 'منقول', score, level, serial === 124 ? 'شامل الفصلين' : serial === 313 ? 'الفصل الثاني' : '--'];
  });
  const pages = [];
  const pageSizes = [25, 25, 24, 25, 25, 25, 22, 24, 24, 24, 24, 24, 23, 5];
  let rowCursor = 0;
  pageSizes.forEach((pageSize, pageIndex) => {
    const body = rows.slice(rowCursor, rowCursor + pageSize);
    rowCursor += pageSize;
    pages.push(page(pageIndex + 1, [
      ['وزارة التعليم'],
      ['كشف نتائج الطلب على مستوى المادة'],
      ['المادة', 'العلوم'],
      ['الصف', 'الثامن'],
      headers,
      ...body,
    ]));
  });
  assert.equal(rowCursor, 319);
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 1);
  const table = canonical.tables[0];
  assert.equal(table.status, 'accepted');
  assert.deepEqual(Array.from(table.headers), ['م', 'اسم الطالب', 'الجنسية', 'حالة القيد', 'الدرجة', 'المستوى', 'دور ثانٍ']);
  assert.equal(table.rows.length, 319);
  assert.deepEqual(JSON.parse(JSON.stringify(table.rows[0])), {
    'م': '1', 'اسم الطالب': 'طالب اختبار 1', 'الجنسية': 'عماني', 'حالة القيد': 'منقول', 'الدرجة': '57', 'المستوى': 'د', 'دور ثانٍ': '--'
  });
  assert.equal(table.rows[35]['الدرجة'], '0', 'zero is a valid observed score');
  assert.equal(table.rows[35]['المستوى'], 'هـ');
  assert.equal(table.rows[312]['الدرجة'], 'غـ', 'non-numeric source token must be preserved, not coerced to zero');
  assert.equal(table.rows[312]['المستوى'], 'غـ');
  assert.equal(table.rows[312]['دور ثانٍ'], 'الفصل الثاني');
  assert.equal(table.structure.kind, 'flat-table');
  assert.equal(table.structure.alignmentMode, 'semantic-column-order');
  assert.equal(table.structure.columnAlignmentVersion, '1.2.0');
  assert.equal(table.structure.validationIssues.length, 0);
});

test('column alignment can recover a reversed RTL row without changing the header contract', () => {
  const window = load();
  const pages = [page(1, [
    ['رقم الطالب', 'اسم الطالب', 'الجنسية', 'حالة القيد', 'الدرجة', 'المستوى', 'ملاحظات'],
    ['--', 'د', '58', 'منقول', 'عماني', 'طالب ألف', '1'],
    ['--', 'ب', '80', 'منقول', 'عماني', 'طالب باء', '2'],
    ['--', 'أ', '95', 'مستجد', 'عماني', 'طالب جيم', '3'],
  ])];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 1);
  const table = canonical.tables[0];
  assert.equal(table.status, 'accepted');
  assert.deepEqual(JSON.parse(JSON.stringify(table.rows[0])), {
    'م': '1', 'اسم الطالب': 'طالب ألف', 'الجنسية': 'عماني', 'حالة القيد': 'منقول', 'الدرجة': '58', 'المستوى': 'د', 'الملاحظات': '--'
  });
});

test('column-alignment core is generic and contains no report, subject, or filename switch', () => {
  const source = read('assets/pdf-column-alignment.js');
  assert.doesNotMatch(source, /single_subject|supervision_|student_work|level_distribution/);
  assert.doesNotMatch(source, /العلوم|الفيزياء|الكيمياء|الأحياء/);
  assert.doesNotMatch(source, /filename|fileName|\.pdf/i);
});


test('PDF line geometry preserves semantic columns when a three-digit serial visually fuses with the student cell', () => {
  const window = load();
  const item = (str, x, y, width, dir = 'rtl') => ({ str, transform: [1, 0, 0, 10, x, y], width, height: 10, dir });
  const yHeader = 700;
  const yRows = [680, 660, 640];
  const headerItems = [
    item('دور ثاني', 20, yHeader, 55), item('المستوى', 120, yHeader, 48), item('المجموع', 190, yHeader, 48),
    item('حالة القيد', 270, yHeader, 65), item('الجنسية', 355, yHeader, 50), item('اسم الطالب', 440, yHeader, 75), item('م', 675, yHeader, 10)
  ];
  const rowItems = (serial, y, score, level) => [
    item('--', 25, y, 20, 'ltr'), item(level, 135, y, 12), item(String(score), 195, y, 28, 'ltr'),
    item('منقول', 275, y, 45), item('عماني', 355, y, 40), item(`طالب اختبار ${serial}`, 430, y, 220),
    item(String(serial), serial >= 100 ? 657 : 682, y, serial >= 100 ? 20 : 8, 'ltr')
  ];
  const lines = window.TaqareerDocuments._test.groupPdfItemsIntoLines([
    ...headerItems,
    ...rowItems(100, yRows[0], 58, 'د'),
    ...rowItems(101, yRows[1], 80, 'ب'),
    ...rowItems(102, yRows[2], 95, 'أ'),
  ]);
  const dataLine = lines.find(line => /100/.test(line.text));
  assert.ok(dataLine, 'synthetic three-digit row should exist');
  assert.ok(dataLine.cells.length < 7, 'legacy gap grouping must reproduce the fused-cell failure');
  assert.equal(dataLine.cellBoxes.length, dataLine.cells.length);
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages([{ pageNumber: 1, lines }]);
  assert.equal(canonical.tables.length, 1);
  assert.equal(canonical.tables[0].status, 'accepted');
  assert.equal(canonical.tables[0].rows.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(canonical.tables[0].rows[0])), {
    'م': '100', 'اسم الطالب': 'طالب اختبار 100', 'الجنسية': 'عماني', 'حالة القيد': 'منقول', 'الدرجة': '58', 'المستوى': 'د', 'دور ثانٍ': '--'
  });
  assert.equal(canonical.tables[0].structure.alignmentMode, 'semantic-column-order');
});

test('full-document pagination contract rejects a repeated table when later header pages are silently missing', () => {
  const window = load();
  const headers = ['م', 'اسم الطالب', 'الجنسية', 'حالة القيد', 'المجموع', 'المستوى', 'دور ثاني'];
  const pages = Array.from({ length: 14 }, (_, pageIndex) => page(pageIndex + 1, [
    ['وزارة التعليم'],
    ['كشف نتائج الطلب على مستوى المادة'],
    headers,
    [String(pageIndex * 25 + 1), `طالب ${pageIndex + 1}`, 'عماني', 'منقول', '80', 'ب', '--'],
    [String(pageIndex * 25 + 2), `طالب ${pageIndex + 2}`, 'عماني', 'منقول', '70', 'ج', '--'],
    [String(pageIndex * 25 + 3), `طالب ${pageIndex + 3}`, 'عماني', 'منقول', '60', 'د', '--'],
  ]));
  const partial = {
    headers: ['م', 'اسم الطالب', 'الجنسية', 'حالة القيد', 'الدرجة', 'المستوى', 'دور ثانٍ'],
    roles: ['serial', 'student', 'nationality', 'enrollment', 'score', 'level', 'second_round'],
    rows: Array.from({ length: 99 }, (_, i) => ({ 'م': String(i + 1), 'اسم الطالب': `طالب ${i + 1}`, 'الجنسية': 'عماني', 'حالة القيد': 'منقول', 'الدرجة': '80', 'المستوى': 'ب', 'دور ثانٍ': '--' })),
    pages: [1, 2, 3, 4], status: 'accepted', confidence: 0.96, structure: { kind: 'flat-table' }
  };
  const guarded = window.TaqareerPdfIntakeV2._test.withPaginationContract(partial, pages);
  assert.equal(guarded.status, 'unresolved');
  assert.deepEqual(Array.from(guarded.structure.pagination.missingPages), [5,6,7,8,9,10,11,12,13,14]);
  assert.equal(guarded.structure.pagination.coverageRatio, 4 / 14);
});

test('PDF metadata distinguishes analyzed grade from school grade range and reads explicit subject key-value cells', () => {
  const window = load();
  const pages = [page(1, [
    ['وزارة التعليم'],
    ['كشف نتائج الطلب على مستوى المادة'],
    ['الباسط للبنين الصفوف )10-8('],
    ['الصف', ': الثامن', 'رمز المدرسة', ': 3305'],
    ['الشعبة', ': 1', 'الفصل الدراسي', ': الدور الأول', 'المادة', ': العلوم'],
    ['م', 'اسم الطالب', 'الجنسية', 'حالة القيد', 'المجموع', 'المستوى', 'دور ثاني'],
    ['1', 'طالب ألف', 'عماني', 'منقول', '58', 'د', '--'],
    ['2', 'طالب باء', 'عماني', 'منقول', '80', 'ب', '--'],
    ['3', 'طالب جيم', 'عماني', 'منقول', '95', 'أ', '--'],
  ])];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.metadata.subject, 'العلوم');
  assert.equal(canonical.metadata.analyzedGrade, 'الثامن');
  assert.equal(canonical.metadata.grade, 'الثامن');
  assert.equal(canonical.metadata.schoolGradeRange, '8-10');
  assert.equal(canonical.metadata.school, 'الباسط للبنين (8-10)');
});

test('real PDF header geometry carries analyzed grade from intake through dataset metadata to final report', () => {
  const window = load();
  const item = (str, x, y, width, dir = 'rtl') => ({ str, transform: [1, 0, 0, 10, x, y], width, height: 10, dir });
  const pageOneItems = [
    item('الباسط للبنين الصفوف )10-8(', 460, 790, 107),
    item('الثامن', 485, 752, 20),
    item('كشف نتائج الطلب على مستوى المادة', 162, 752, 222),
    item('الصف', 545, 746, 21), item(':', 506, 746, 4),
    item('الشعبة', 545, 724, 23), item(': 8', 499, 724, 11),
    item('الفصل الدراسي', 311, 724, 52), item(': الدور الأول', 245, 724, 44),
    item('المادة', 145, 724, 19), item(': العلوم', 108, 724, 26),
    item('دور ثاني', 20, 700, 55), item('المستوى', 120, 700, 48), item('المجموع', 190, 700, 48),
    item('حالة القيد', 270, 700, 65), item('الجنسية', 355, 700, 50), item('اسم الطالب', 440, 700, 75), item('م', 675, 700, 10),
    item('--', 25, 680, 20, 'ltr'), item('د', 135, 680, 12), item('58', 195, 680, 28, 'ltr'),
    item('منقول', 275, 680, 45), item('عماني', 355, 680, 40), item('طالب اختبار 1', 430, 680, 150), item('1', 682, 680, 8, 'ltr'),
    item('--', 25, 660, 20, 'ltr'), item('ب', 135, 660, 12), item('80', 195, 660, 28, 'ltr'),
    item('منقول', 275, 660, 45), item('عماني', 355, 660, 40), item('طالب اختبار 2', 430, 660, 150), item('2', 682, 660, 8, 'ltr'),
    item('--', 25, 640, 20, 'ltr'), item('أ', 135, 640, 12), item('95', 195, 640, 28, 'ltr'),
    item('منقول', 275, 640, 45), item('عماني', 355, 640, 40), item('طالب اختبار 3', 430, 640, 150), item('3', 682, 640, 8, 'ltr'),
  ];
  const lines = window.TaqareerDocuments._test.groupPdfItemsIntoLines(pageOneItems);
  const gradeValueLine = lines.find(line => line.cells.includes('الثامن'));
  const gradeLabelLine = lines.find(line => line.cells.includes('الصف'));
  assert.ok(gradeValueLine && gradeLabelLine, 'fixture must contain the real split grade geometry');
  assert.notEqual(gradeValueLine.lineIndex, gradeLabelLine.lineIndex, 'grade value must reproduce the real adjacent-line split');

  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages([{ pageNumber: 1, lines }]);
  assert.equal(canonical.metadata.schoolGradeRange, '8-10');
  assert.equal(canonical.metadata.analyzedGrade, 'الثامن');
  assert.equal(canonical.metadata.grade, 'الثامن');
  assert.equal(canonical.metadata.subject, 'العلوم');

  const dataset = window.TaqareerPdfIntakeV2.datasetsFromCanonical(canonical)[0];
  assert.ok(dataset, 'canonical dataset must survive the intake boundary');
  assert.equal(dataset.meta.metadata.analyzedGrade, 'الثامن');
  assert.equal(dataset.meta.metadata.schoolGradeRange, '8-10');

  const context = {
    analysis: { metrics: [], charts: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [], _reconciliation: { aiPrimary: true } },
    type: { id: 'single_subject', name: 'نتائج الطلبة في مادة واحدة' },
    sourceName: 'real-grade8-results.pdf · جدول PDF منظم',
    sourceMeta: dataset.meta,
    quality: { completeness: 100 },
    recognitionStatus: 'معتمد',
  };
  const report = window.TaqareerReports.buildReportData(context);
  assert.equal(report.meta.grade, 'الثامن');
  const html = window.TaqareerReports.buildReportHtml(context, { autoPrint: false });
  assert.match(html, /الصف \/ الفئة<\/span><strong>الثامن<\/strong>/);
  assert.doesNotMatch(html, /الصف \/ الفئة<\/span><strong>8-10<\/strong>/);
});

test('realistic 14-page geometry regression keeps all 319 serial rows after the serial width crosses three digits', () => {
  const window = load();
  const item = (str, x, y, width, dir = 'rtl') => ({ str, transform: [1, 0, 0, 10, x, y], width, height: 10, dir });
  const headerItems = y => [
    item('دور ثاني', 20, y, 55), item('المستوى', 120, y, 48), item('المجموع', 190, y, 48),
    item('حالة القيد', 270, y, 65), item('الجنسية', 355, y, 50), item('اسم الطالب', 440, y, 75), item('م', 675, y, 10)
  ];
  const rowItems = (serial, y) => {
    const score = serial === 313 ? 'غـ' : serial === 36 ? '0' : serial === 124 ? '21' : String(50 + (serial * 7) % 51);
    const numeric = Number(score);
    const level = score === 'غـ' ? 'غـ' : numeric >= 90 ? 'أ' : numeric >= 80 ? 'ب' : numeric >= 65 ? 'ج' : numeric >= 50 ? 'د' : 'هـ';
    const note = serial === 124 ? 'شامل الفصلين' : serial === 313 ? 'الفصل الثاني' : '--';
    const enrollment = serial % 53 === 0 ? 'مستجد' : 'منقول';
    const compact = new Set([106, 195, 248, 275]).has(serial);
    if (compact) return [
      item(`${enrollment}--`, 60, y, 216), item(`${score}${level}`, 137, y, 78),
      item('جنسية اختبار', 314, y, 42), item(`طالب قصير ${serial}`, 483, y, 54),
      item(String(serial), 543, y, 21, 'ltr')
    ];
    return [
      item(note, 20, y, note === '--' ? 22 : 72), item(level, 135, y, 12), item(score, 195, y, 28, 'ltr'),
      item(enrollment, 275, y, 45), item(serial % 19 === 0 ? 'جنسية أخرى' : 'عماني', 350, y, 55),
      item(`طالب اختبار ${serial}`, 430, y, 220), item(String(serial), serial >= 100 ? 657 : 682, y, serial >= 100 ? 20 : 8, 'ltr')
    ];
  };
  const pageSizes = [25, 25, 24, 25, 25, 25, 22, 24, 24, 24, 24, 24, 23, 5];
  const pages = [];
  let serial = 1;
  pageSizes.forEach((pageSize, pageIndex) => {
    const items = [...headerItems(700)];
    if (pageIndex === 0) items.push(
      item('الباسط للبنين الصفوف )10-8(', 460, 790, 107),
      item('الثامن', 485, 752, 20), item('كشف نتائج الطلب على مستوى المادة', 162, 752, 222),
      item('الصف', 545, 746, 21), item(':', 506, 746, 4),
      item('الشعبة', 545, 724, 23), item(': 8', 499, 724, 11),
      item('الفصل الدراسي', 311, 724, 52), item(': الدور الأول', 245, 724, 44),
      item('المادة', 145, 724, 19), item(': العلوم', 108, 724, 26)
    );
    for (let rowIndex = 0; rowIndex < pageSize; rowIndex += 1) {
      items.push(...rowItems(serial, 680 - rowIndex * 16));
      serial += 1;
    }
    pages.push({ pageNumber: pageIndex + 1, lines: window.TaqareerDocuments._test.groupPdfItemsIntoLines(items) });
  });
  assert.equal(serial, 320);
  const hundredLine = pages[4].lines.find(line => /100/.test(line.text));
  assert.ok(hundredLine && hundredLine.cells.length < 7, 'page 5 must reproduce the fused serial/name geometry');
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.tables.length, 1);
  const table = canonical.tables[0];
  assert.equal(table.status, 'accepted');
  assert.equal(table.rows.length, 319);
  assert.deepEqual(Array.from(table.pages), [1,2,3,4,5,6,7,8,9,10,11,12,13,14]);
  for (const serial of [106, 195, 248, 275]) {
    const recovered = table.rows.find(row => Number(row['م']) === serial);
    assert.ok(recovered, `compact fused row ${serial} must survive the full 14-page merge`);
    assert.match(recovered['اسم الطالب'], /طالب قصير/);
    assert.ok(/^\d+$/.test(recovered['الدرجة']));
    assert.ok(['أ','ب','ج','د','هـ'].includes(recovered['المستوى']));
  }
  assert.equal(table.rows[99]['م'], '100');
  assert.equal(table.rows[99]['اسم الطالب'], 'طالب اختبار 100');
  assert.equal(table.rows[312]['الدرجة'], 'غـ');
  assert.equal(table.rows[312]['دور ثانٍ'], 'الفصل الثاني');
  assert.equal(table.structure.pagination.missingPages.length, 0);
  assert.equal(table.structure.pagination.coverageRatio, 1);
  assert.equal(table.structure.pagination.serial.first, 1);
  assert.equal(table.structure.pagination.serial.last, 319);
  assert.equal(table.structure.pagination.serial.gaps.length, 0);
  assert.equal(canonical.metadata.analyzedGrade, 'الثامن');
  assert.equal(canonical.metadata.grade, 'الثامن');
  assert.equal(canonical.metadata.schoolGradeRange, '8-10');
  assert.equal(canonical.metadata.subject, 'العلوم');
  const dataset = window.TaqareerPdfIntakeV2.datasetsFromCanonical(canonical)[0];
  assert.equal(dataset.rows.length, 319);
  assert.equal(dataset.meta.metadata.analyzedGrade, 'الثامن');
  const report = window.TaqareerReports.buildReportData({
    analysis: { metrics: [], charts: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [], _reconciliation: { aiPrimary: true } },
    type: { id: 'single_subject', name: 'نتائج الطلبة في مادة واحدة' },
    sourceName: 'وزارة-نتائج-الصف-الثامن.pdf · جدول PDF منظم · الصفحات 1-14',
    sourceMeta: dataset.meta,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  });
  assert.equal(report.meta.grade, 'الثامن');
  assert.equal(report.meta.subject, 'العلوم');
});

test('semantic geometry recovery keeps short RTL rows when adjacent PDF spans fuse multiple roles', () => {
  const window = load();
  const item = (str, x, y, width, dir = 'rtl') => ({ str, transform: [1, 0, 0, 10, x, y], width, height: 10, dir });
  const headerItems = [
    item('دور ثاني', 20, 700, 55), item('المستوى', 120, 700, 48), item('المجموع', 190, 700, 48),
    item('حالة القيد', 270, 700, 65), item('الجنسية', 355, 700, 50), item('اسم الطالب', 440, 700, 75), item('م', 675, 700, 10)
  ];
  const compactRow = (serial, y, score, level, enrollment = 'منقول', nationality = 'جنسية اختبار') => [
    item(`${enrollment}--`, 60, y, 216),
    item(`${score}${level}`, 137, y, 78),
    item(nationality, 314, y, 36),
    item('طالب قصير', 483, y, 54),
    item(String(serial), 543, y, 21, 'ltr'),
  ];
  const lines = window.TaqareerDocuments._test.groupPdfItemsIntoLines([
    ...headerItems,
    ...compactRow(106, 680, 52, 'د', 'مستجد', 'باكستان'),
    ...compactRow(107, 660, 80, 'ب'),
    ...compactRow(108, 640, 0, 'هـ', 'باق'),
  ]);
  const compactLine = lines.find(line => /106/.test(line.text));
  assert.ok(compactLine && compactLine.cells.length < 7, 'fixture must reproduce fused sparse RTL cells');
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages([{ pageNumber: 1, lines }]);
  assert.equal(canonical.tables.length, 1);
  const table = canonical.tables[0];
  assert.equal(table.status, 'accepted');
  assert.equal(table.rows.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(table.rows[0])), {
    'م': '106', 'اسم الطالب': 'طالب قصير', 'الجنسية': 'باكستان', 'حالة القيد': 'مستجد', 'الدرجة': '52', 'المستوى': 'د', 'دور ثانٍ': '--'
  });
  assert.equal(table.rows[2]['الدرجة'], '0', 'zero must remain a valid score after composite-span recovery');
  assert.equal(table.rows[2]['المستوى'], 'هـ');
});

test('recovered short row receives its following nationality continuation instead of leaking it to the previous student', () => {
  const window = load();
  const item = (str, x, y, width, dir = 'rtl') => ({ str, transform: [1, 0, 0, 10, x, y], width, height: 10, dir });
  const header = [
    item('دور ثاني', 20, 700, 55), item('المستوى', 120, 700, 48), item('المجموع', 190, 700, 48),
    item('حالة القيد', 270, 700, 65), item('الجنسية', 355, 700, 50), item('اسم الطالب', 440, 700, 75), item('م', 675, 700, 10)
  ];
  const normal = (serial, y) => [item('--', 25, y, 20, 'ltr'), item('ج', 135, y, 12), item('70', 195, y, 28, 'ltr'), item('منقول', 275, y, 45), item('عماني', 355, y, 40), item(`طالب ${serial}`, 430, y, 150), item(String(serial), 543, y, 21, 'ltr')];
  const short = [item('منقول--', 60, 660, 216), item('89ب', 136, 660, 79), item('الجمهورية', 308, 660, 39), item('طالب قصير', 483, 660, 53), item('195', 543, 660, 21, 'ltr')];
  const continuation = [item('العربية التجريبية', 300, 648, 70)];
  const lines = window.TaqareerDocuments._test.groupPdfItemsIntoLines([...header, ...normal(194, 680), ...short, ...continuation, ...normal(196, 630)]);
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages([{ pageNumber: 1, lines }]);
  const table = canonical.tables[0];
  assert.equal(table.rows.length, 3);
  assert.equal(table.rows[0]['الجنسية'], 'عماني');
  assert.equal(table.rows[1]['م'], '195');
  assert.match(table.rows[1]['الجنسية'], /الجمهورية/);
  assert.match(table.rows[1]['الجنسية'], /العربية التجريبية/);
  assert.doesNotMatch(table.rows[0]['الجنسية'], /العربية التجريبية/);
});

test('End-to-End metadata regression: combined grade line overrides school grade range for an assessment-component PDF', () => {
  const window = load();
  const pages = [page(1, [
    ['سلطنة عمان'],
    ['وزارة التعليم'],
    ['الباسط للبنين الصفوف (10-8)'],
    ['كشف مراجعة إدخال الدرجات لمادة دراسية ( الأحياء ) - للعام الدراسي : 2026/2025 في التقويم المستمر ( الفصل الأول )'],
    ['الصف : التاسع - كل الشعب'],
    ['م', 'اسم الطالب', 'عنصر المادة', 'درجة عنصر المادة', 'ملاحظات'],
    ['1', 'طالب تجريبي', 'التقويم المستمر', '42.00', ''],
    ['2', 'طالب ثان', 'التقويم المستمر', '47.00', ''],
    ['3', 'طالب ثالث', 'التقويم المستمر', '51.00', ''],
  ])];
  const canonical = window.TaqareerPdfIntakeV2.normalizePdfPages(pages);
  assert.equal(canonical.metadata.schoolGradeRange, '8-10');
  assert.equal(canonical.metadata.analyzedGrade, 'التاسع');
  assert.equal(canonical.metadata.grade, 'التاسع');
  const report = window.TaqareerReports.buildReportData({
    analysis: { metrics: [], charts: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [], executiveTitle: 'اختبار الصف', executiveSummary: 'اختبار metadata', _reconciliation: { aiPrimary: true } },
    type: { id: 'assessment_component', name: 'درجات مكوّن تقويمي' },
    sourceName: 'component.pdf', sourceMeta: { metadata: canonical.metadata }, quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  });
  assert.equal(report.meta.grade, 'التاسع');
  assert.equal(canonical.metadata.schoolGradeRange, '8-10');
});
