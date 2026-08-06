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
  for (const file of ['xlsx-lite.js', 'analysis-profile.js', 'mastery-metrics.js', 'deep-analysis.js', 'report-system.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window;
}

function analysisFixture(mode = 'all', subject = '') {
  const window = loadModules();
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'multi-subject-results-grade10-matrix.json'), 'utf8'));
  const sheet = window.TaqareerXlsx.normalizeMatrix(raw.matrix, { rightToLeft: true });
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const local = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet,
    analysisProfile: profile, analysisOptions: { mode, subject, includeSubjectTopTen: true, includeSchoolRanking: mode === 'all' },
  });
  const analysis = {
    ...local,
    _reconciliation: { aiApplied: true },
    executiveTitle: mode === 'subject' ? `تحليل مادة ${subject}` : 'تحليل شامل متعدد المواد',
    executiveSummary: 'تحليل موثق مبني على الحسابات المحلية والأدلة المرسلة.',
    diagnosticSections: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [],
  };
  return { window, sheet, analysis };
}

test('official report shows grade metadata, school formula and local ranking tables without losing ties', () => {
  const { window, sheet, analysis } = analysisFixture();
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false });
  assert.match(html, /الصف \/ الفئة<\/span><strong>العاشر/);
  assert.match(html, /2025\/2026 - الدور الأول/);
  assert.match(html, /المادة<\/span><strong>متعدد المواد/);
  assert.match(html, /60% متوسط المواد الأساسية \+ 40% متوسط جميع المواد/);
  assert.match(html, /العشرة الأوائل على مستوى المدرسة \/ الدفعة/);
  assert.match(html, /العشرة الأوائل حسب الدرجة/);
  assert.match(html, /طالب اختبار 136/);
  assert.match(html, /تقارير v1\.2\.3/);
});

test('subject report includes only the selected subject top-ten table and selected-subject metadata', () => {
  const { window, sheet, analysis } = analysisFixture('subject', 'الرياضيات');
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false });
  assert.match(html, /المادة<\/span><strong>الرياضيات/);
  assert.match(html, /الأوائل في الرياضيات|>الرياضيات<\/h3>/);
  assert.doesNotMatch(html, /العشرة الأوائل على مستوى الدفعة/);
  assert.doesNotMatch(html, /الأوائل في الفيزياء/);
});
