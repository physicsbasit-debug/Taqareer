const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function load() {
  const sandbox = {
    window: {}, console, Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone,
    TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
  };
  vm.createContext(sandbox);
  vm.runInContext(read('assets/pdf-table-structure.js'), sandbox, { filename: 'pdf-table-structure.js' });
  vm.runInContext(read('assets/pdf-column-alignment.js'), sandbox, { filename: 'pdf-column-alignment.js' });
  vm.runInContext(read('assets/pdf-intake-v2.js'), sandbox, { filename: 'pdf-intake-v2.js' });
  vm.runInContext(read('assets/document-lite.js'), sandbox, { filename: 'document-lite.js' });
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
  assert.equal(canonical.canonicalDocumentVersion, '2.2.0');
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
  assert.equal(datasets[0].meta.canonicalDocumentVersion, '2.2.0');
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
  assert.equal(specialized.dataset.meta.canonicalDocumentVersion, '2.2.0');
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
  assert.equal(canonical.canonicalDocumentVersion, '2.2.0');
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
  for (let pageIndex = 0; pageIndex < 14; pageIndex += 1) {
    const start = pageIndex * 25;
    const end = pageIndex === 13 ? rows.length : Math.min(rows.length, start + 25);
    const body = rows.slice(start, end);
    pages.push(page(pageIndex + 1, [
      ['وزارة التعليم'],
      ['كشف نتائج الطلب على مستوى المادة'],
      ['المادة', 'العلوم'],
      ['الصف', 'الثامن'],
      headers,
      ...body,
    ]));
  }
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
  assert.equal(table.structure.columnAlignmentVersion, '1.0.0');
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
