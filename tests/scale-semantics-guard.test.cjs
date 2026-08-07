const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function loadDocuments() {
  const sandbox = {
    window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
    Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone,
  };
  vm.createContext(sandbox);
  vm.runInContext(read('assets/document-lite.js'), sandbox, { filename: 'document-lite.js' });
  return sandbox.window.TaqareerDocuments;
}

function loadProfiler() {
  const sandbox = { window: {}, console, Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone };
  vm.createContext(sandbox);
  vm.runInContext(read('assets/analysis-profile.js'), sandbox, { filename: 'analysis-profile.js' });
  return sandbox.window.TaqareerAnalysisProfiler;
}

function loadAnalytics() {
  const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
  vm.createContext(sandbox);
  vm.runInContext(read('assets/mastery-metrics.js'), sandbox, { filename: 'mastery-metrics.js' });
  vm.runInContext(read('assets/visualization-policy.js'), sandbox, { filename: 'visualization-policy.js' });
  vm.runInContext(read('assets/deep-analysis.js'), sandbox, { filename: 'deep-analysis.js' });
  return sandbox.window.TaqareerDeepAnalytics;
}

const studentWorkRows = [
  { 'بنود التقويم': 'ينجز الطلبة الأعمال والأنشطة وفقا لمستوياتهم التحصيلية.', 'المتوسط': '1', 'الأكثر تكرارا': '1' },
  { 'بنود التقويم': 'يحقق الطلبة تقدما دراسيا في الأعمال والأنشطة بمرور الوقت.', 'المتوسط': '2', 'الأكثر تكرارا': '2' },
  { 'بنود التقويم': 'يعرض الطلبة الأعمال والأنشطة بشكل واضح ومنظم.', 'المتوسط': '2', 'الأكثر تكرارا': '1,2' },
  { 'بنود التقويم': 'المستوى الكلي', 'المتوسط': '1', 'الأكثر تكرارا': '1' },
];

test('PDF table normalization removes generated columns that are empty in every data row', () => {
  const docs = loadDocuments();
  const table = docs._test.matrixToTable([
    ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا', '', ''],
    ['البند الأول', '1', '1', '', ''],
    ['البند الثاني', '2', '1,2', '', ''],
  ]);
  assert.deepEqual(Array.from(table.headers), ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا']);
  assert.equal(Object.hasOwn(table.rows[0], 'عمود 4'), false);
  assert.equal(Object.hasOwn(table.rows[0], 'عمود 5'), false);
});

test('student-work semantic profile blocks directional interpretation until the scale is confirmed', () => {
  const profiler = loadProfiler();
  const profile = profiler.profileTable({
    headers: ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا'],
    rows: studentWorkRows,
    sourceMeta: {},
    typeId: 'student_work',
  });
  assert.equal(profile.shape, 'ordinal_indicator_summary');
  assert.equal(profile.scaleDirection, 'unknown');
  assert.equal(profile.requiresScaleConfirmation, true);
  assert.deepEqual(Array.from(profile.rowRoles.dataRowIndexes), [0, 1, 2]);
  assert.deepEqual(Array.from(profile.rowRoles.aggregateRowIndexes), [3]);
  assert.equal(profile.scale.minObserved, 1);
  assert.equal(profile.scale.maxObserved, 2);
});

test('confirmed lower-is-better scale excludes the aggregate row and preserves multimode values', () => {
  const profiler = loadProfiler();
  const analytics = loadAnalytics();
  const sourceMeta = { scaleSemantics: { direction: 'lower-is-better', source: 'user', minObserved: 1, maxObserved: 2 } };
  const profile = profiler.profileTable({
    headers: ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا'], rows: studentWorkRows, sourceMeta, typeId: 'student_work'
  });
  const result = analytics.analyze({
    typeId: 'student_work', headers: ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا'], rows: studentWorkRows, sourceMeta, analysisProfile: profile
  });
  assert.equal(result.items.length, 3);
  assert.equal(result.items.some(item => item.label === 'المستوى الكلي'), false);
  assert.equal(result.items[0].normalizedScore, 100);
  assert.equal(result.items[1].normalizedScore, 50);
  assert.deepEqual(Array.from(result.items[2].modeValues), [1, 2]);
  assert.ok(result.metrics.find(item => item.id === 'meanModeGap').value <= 0.34);
  assert.match(result.limitations.join(' '), /القيمة الأقل تمثل أداءً أفضل/);
});

test('descriptive-only mode produces no directional gaps or improvement plan', () => {
  const profiler = loadProfiler();
  const analytics = loadAnalytics();
  const sourceMeta = { scaleSemantics: { direction: 'descriptive-only', source: 'user', minObserved: 1, maxObserved: 2 } };
  const profile = profiler.profileTable({
    headers: ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا'], rows: studentWorkRows, sourceMeta, typeId: 'student_work'
  });
  const result = analytics.analyze({
    typeId: 'student_work', headers: ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا'], rows: studentWorkRows, sourceMeta, analysisProfile: profile
  });
  assert.equal(result.scaleSemantics.direction, 'descriptive-only');
  assert.equal(result.improvementPlan.length, 0);
  assert.equal(result.monitoringPlan.length, 0);
  assert.equal(result.qualityTools.length, 0);
  assert.match(result.executiveSummary, /لم يصدر حكم قوة أو ضعف/);
  assert.match(result.limitations.join(' '), /التحليل وصفي فقط/);
});

test('unknown scale direction fails closed inside the analysis engine', () => {
  const profiler = loadProfiler();
  const analytics = loadAnalytics();
  const profile = profiler.profileTable({
    headers: ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا'], rows: studentWorkRows, sourceMeta: {}, typeId: 'student_work'
  });
  assert.throws(() => analytics.analyze({
    typeId: 'student_work', headers: ['بنود التقويم', 'المتوسط', 'الأكثر تكرارا'], rows: studentWorkRows, sourceMeta: {}, analysisProfile: profile
  }), /اتجاه مقياس التقويم غير محدد/);
});

test('review UI exposes scale choices and blocks silent scale guessing', () => {
  const index = read('index.html');
  const app = read('assets/app.js');
  assert.match(index, /id="scaleSemanticsCard"/);
  assert.match(index, /value="lower-is-better"/);
  assert.match(index, /value="higher-is-better"/);
  assert.match(index, /value="descriptive-only"/);
  assert.match(app, /اتجاه مقياس التقويم غير محدد/);
  assert.match(app, /setScaleDirection/);
  assert.match(app, /currentScaleDirection\(\) === "unknown"/);
  assert.match(app, /confirmedScaleDirection/);
  assert.doesNotMatch(index, /name="scaleDirection"[^>]+checked/);
});
