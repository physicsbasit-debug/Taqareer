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
  assert.match(html, /تقارير v1\.2\.7/);
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


test('executive report keeps the school ranking but omits per-subject ranking appendices', () => {
  const { window, sheet, analysis } = analysisFixture();
  const context = {
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  };
  const fullHtml = window.TaqareerReports.buildReportHtml(context, { autoPrint: false, reportMode: 'full' });
  const executiveHtml = window.TaqareerReports.buildReportHtml(context, { autoPrint: false, reportMode: 'executive' });
  const fullPages = (fullHtml.match(/class="report-sheet"/g) || []).length;
  const executivePages = (executiveHtml.match(/class="report-sheet"/g) || []).length;
  assert.match(executiveHtml, /التقرير التنفيذي المختصر/);
  assert.match(executiveHtml, /العشرة الأوائل على مستوى المدرسة \/ الدفعة/);
  assert.doesNotMatch(executiveHtml, /العشرة الأوائل حسب الدرجة/);
  assert.ok(executivePages < fullPages);
  assert.match(fullHtml, /التقرير الكامل مع الجداول/);
  assert.match(fullHtml, /العشرة الأوائل حسب الدرجة/);
});

test('executive subject report keeps only the selected subject ranking table', () => {
  const { window, sheet, analysis } = analysisFixture('subject', 'الرياضيات');
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'executive' });
  assert.match(html, /التقرير التنفيذي المختصر/);
  assert.match(html, /العشرة الأوائل حسب الدرجة/);
  assert.match(html, />الرياضيات<\/h3>/);
  assert.doesNotMatch(html, /العشرة الأوائل على مستوى المدرسة \/ الدفعة/);
  assert.doesNotMatch(html, />الفيزياء<\/h3>/);
});


test('full multi-subject report compacts ranking appendices and safely splits very long ties', () => {
  const { window, sheet, analysis } = analysisFixture();
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'full' });
  const fullPages = (html.match(/class="report-sheet"/g) || []).length;
  const rankingPages = (html.match(/class="ranking-stack ranking-stack-/g) || []).length;
  assert.match(html, /المهارات الحياتية - متابعة 1\/3/);
  assert.match(html, /المهارات الحياتية - متابعة 3\/3/);
  assert.ok(rankingPages < 13, `expected compact subject ranking pages, got ${rankingPages}`);
  assert.ok(fullPages < 18, `expected fewer than the v1.2.6 baseline 18 pages, got ${fullPages}`);
  assert.doesNotMatch(html, /TQR-/);
});
