const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadModules() {
  const sandbox = {
    window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
    Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone, Intl, Date,
  };
  vm.createContext(sandbox);
  for (const file of ['xlsx-lite.js', 'analysis-profile.js', 'mastery-metrics.js', 'visualization-policy.js', 'deep-analysis.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window;
}

async function readFixture() {
  const window = loadModules();
  const buffer = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'level-distribution-crystal.xlsx'));
  const workbook = await window.TaqareerXlsx.readWorkbook({
    name: 'كشف نسب مستويات الطلبة.xlsx',
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  });
  return { window, sheet: workbook.sheets[0] };
}

test('semantic profiler recognizes an aggregated level distribution without score settings', async () => {
  const { window, sheet } = await readFixture();
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  assert.equal(profile.shape, 'categorical_distribution');
  assert.equal(profile.analyzerId, 'level_distribution');
  assert.equal(profile.recommendedTypeId, 'level_distribution');
  assert.equal(profile.requiresScoreSettings, false);
  assert.equal(profile.columnRoles.group, 'الشعبة');
  assert.deepEqual(Array.from(profile.columnRoles.levels, item => item.level), ['أ', 'ب', 'ج', 'د', 'هـ']);
  assert.deepEqual(Array.from(profile.rowRoles.aggregateRowIndexes), [8]);
  assert.equal(profile.rowRoles.dataRowIndexes.length, 8);
  assert.match(profile.rationale, /5 أعمدة مستويات/);
});

test('level-distribution analyzer excludes the aggregate row and uses it only for consistency checks', async () => {
  const { window, sheet } = await readFixture();
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const analysis = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'level_distribution', headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet, analysisProfile: profile,
  });
  assert.equal(analysis.total, 267);
  assert.equal(analysis.groups.length, 8);
  assert.equal(analysis.entries.reduce((sum, item) => sum + item.count, 0), 267);
  assert.equal(analysis.metrics.find(item => item.id === 'reportedTotal').value, 267);
  assert.equal(analysis.metrics.find(item => item.id === 'reportedSuccessCount').value, 266);
  assert.equal(analysis.metrics.find(item => item.id === 'reportedSuccessRate').value, 99.63);
  assert.equal(analysis.analysisRouting.analyzerId, 'level_distribution');
  assert.match(analysis.limitations.join(' '), /استُبعد صف الإجمالي/);
});

test('local structural evidence remains authoritative while Gemini enriches the semantic profile', () => {
  const window = loadModules();
  const local = window.TaqareerAnalysisProfiler.profileTable({
    headers: ['الشعبة', 'أ', 'ب', 'ج', 'د', 'هـ'],
    rows: [{ 'الشعبة': '9/1', 'أ': 2, 'ب': 3, 'ج': 4, 'د': 5, 'هـ': 1 }],
    sourceMeta: { title: 'كشف مستويات' },
  });
  const merged = window.TaqareerAnalysisProfiler.mergeProfiles(local, {
    shape: 'individual_scores', analyzerId: 'single_subject', recommendedTypeId: 'single_subject', requiresScoreSettings: true,
    typeNameAr: 'كشف مستويات مجمع', purpose: 'تحليل توزيع المستويات بين الشعب', confidence: 94,
    analysisFamilies: ['decision_support'], dimensionFields: ['الشعبة'], measureFields: ['أ', 'ب'], levelFields: ['أ', 'ب', 'ج', 'د', 'هـ'], totalFields: [],
  }, ['الشعبة', 'أ', 'ب', 'ج', 'د', 'هـ']);
  assert.equal(merged.shape, 'categorical_distribution');
  assert.equal(merged.analyzerId, 'level_distribution');
  assert.equal(merged.requiresScoreSettings, false);
  assert.equal(merged.typeNameAr, 'كشف مستويات مجمع');
  assert.ok(merged.analysisFamilies.includes('decision_support'));
});

test('frontend routes setup and analysis from the semantic profile instead of one fixed form method', () => {
  const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /analysis-profile\.js/);
  assert.match(app, /state\.semanticProfile\?\.requiresScoreSettings/);
  assert.match(app, /analysisProfile: state\.semanticProfile/);
  assert.match(app, /dynamicTypeFromRecognition/);
  assert.match(app, /بُني نوع ومسار تحليل خاصان بالملف/);
});

test('Edge classification returns a semantic analysis profile and is instructed not to force a known type', () => {
  const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze-educational-form', 'index.ts'), 'utf8');
  assert.match(edge, /analysisProfile/);
  assert.match(edge, /requiresScoreSettings/);
  assert.match(edge, /levelFields/);
  assert.match(edge, /لا تُجبر|لا تجبر/);
  assert.match(edge, /توزيع مستويات مجمع/);
  assert.match(edge, /EDGE_VERSION = "0\.15\.6"/);
});
