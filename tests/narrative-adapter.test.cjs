const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sandbox = {
  window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
  Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'document-lite.js'), 'utf8'), sandbox, { filename: 'document-lite.js' });
const docs = sandbox.window.TaqareerDocuments._test;
const appSource = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function line(text, lineIndex) {
  return { text, cells: [text], lineIndex };
}

function page(pageNumber, texts) {
  return { pageNumber, lines: texts.map((text, index) => line(text, index + 1)) };
}

test('aggregated supervision PDF is normalized into narrative sections with structured metadata', () => {
  const pages = [
    page(1, [
      'سلطنة عمان', 'وزارة التعليم', 'المديرية العامه للتعليم', 'محافظة جنوب الباطنة', 'المنطقة :', 'المدرسة :', 'رمز المدرسة :3305',
      '2026/08/02', 'العام الدراسى', '2026/2025', 'التقرير التجميعي لاستمارة استمارة الزيارة الإشرافية لمعلم مجال/ مادة لمادة الاحياء',
      ')10-8( الباسط للبنين الصفوف', 'جوانب الإجادة في الأداء وأدلتها',
      'يخطط المعلم جميع دروسه بصورة ممتازة ويربطها بخبرات الطلبة السابقة.',
      'الجوانب التى تحتاج إلى تطوير في الأداء وأدلتها', 'لا يوجد',
      'يحتاج بعض الطلبة إلى توجيه إضافي في مهارات التفكير الناقد.',
      'طبع بواسطة :', 'اسم شخص يجب ألا يدخل التحليل'
    ]),
    page(2, [
      'التقرير التجميعي لاستمارة استمارة الزيارة الإشرافية لمعلم مجال/ مادة لمادة الاحياء', ')10-8( الباسط للبنين الصفوف',
      'الدعم المقدم', 'تزويد المعلم بنماذج تقييم متمايزة.',
      'مداولة إشرافية', 'توسيع استثمار العروض المرئية بأنشطة تطبيقية تفاعلية مباشرة.',
      'التوصيات', 'إعداد أوراق عمل إثرائية تتحدى قدرات الطلبة العليا.'
    ])
  ];
  const result = docs.detectAggregatedSupervisionNarrativePdf(pages);
  assert.ok(result);
  assert.equal(result.dataset.id, 'pdf-supervision-narrative');
  assert.equal(result.dataset.meta.mode, 'narrative');
  assert.equal(result.dataset.meta.specializedType, 'supervision_narrative');
  assert.equal(result.dataset.meta.metadata.school, 'الباسط للبنين (8-10)');
  assert.equal(result.dataset.meta.metadata.subject, 'الأحياء');
  assert.equal(result.dataset.meta.metadata.grade, '8-10');
  assert.equal(result.dataset.meta.metadata.academicYear, '2025/2026');
  assert.equal(result.dataset.meta.metadata.reportDate, '2026/08/02');
  assert.equal(result.dataset.meta.metadata.schoolCode, '3305');
  assert.equal(result.dataset.meta.metadata.aggregatedReport, true);
  const sections = new Set(result.dataset.rows.map(row => row['القسم']));
  assert.deepEqual([...sections], ['جوانب الإجادة', 'جوانب التطوير', 'الدعم المقدم', 'المداولة الإشرافية', 'التوصيات']);
  assert.ok(result.dataset.rows.every(row => row['النص'] && row['القسم']));
  assert.ok(!result.dataset.rows.some(row => /طبع بواسطة|اسم شخص/.test(row['النص'])));
});

test('narrative setup uses narrative evidence instead of score statistics and labels semantic families explicitly', () => {
  assert.match(html, /id="deterministicEvidenceTitle"/);
  assert.match(html, /id="deterministicEvidenceList"/);
  assert.match(appSource, /الأدلة البنيوية والسردية/);
  assert.match(appSource, /عدّ العبارات وربط كل عبارة بالقسم/);
  assert.match(appSource, /consistency_analysis:\s*"فحص الاتساق والتباين السياقي بين الأقسام"/);
  assert.match(appSource, /recommendation_quality:\s*"فحص جودة الدعم والتوصيات وقابليتها للتنفيذ والقياس"/);
  const setupStart = appSource.indexOf('function renderSetup()');
  const setupEnd = appSource.indexOf('function parseNumber', setupStart);
  const setup = appSource.slice(setupStart, setupEnd);
  assert.match(setup, /narrativeMode/);
  assert.doesNotMatch(setup, /publicDisplayLabel\(item, "مسار تحليلي"\).*publicDisplayLabel\(item, "مسار تحليلي"\)/s);
});

test('narrative quality bypasses tabular missing-cell and duplicate-record diagnostics', () => {
  const start = appSource.indexOf('function assessQuality');
  const end = appSource.indexOf('function redactRecognitionText', start);
  const quality = appSource.slice(start, end);
  const narrativeBranch = quality.slice(0, quality.indexOf('const requirements ='));
  assert.match(narrativeBranch, /narrativeQuality/);
  assert.match(narrativeBranch, /اكتملت بنية التقرير السردي/);
  assert.match(narrativeBranch, /return \{ blockers, warnings, info, completeness/);
});
