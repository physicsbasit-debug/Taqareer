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
  assert.equal(canonical.canonicalDocumentVersion, '2.0.0');
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
  assert.equal(datasets[0].meta.canonicalDocumentVersion, '2.0.0');
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
  assert.equal(specialized.dataset.meta.canonicalDocumentVersion, '2.0.0');
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
