const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets', 'report-system.js'), 'utf8');

function loadReports() {
  const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'report-system.js' });
  return sandbox.window.TaqareerReports;
}

function contextWithDensePrimaryCharts() {
  return {
    analysis: {
      n: 318,
      metrics: [],
      charts: [
        { id: 'score-histogram', type: 'histogram', title: 'توزيع الدرجات', xKey: 'label', yKey: 'count', data: [65,71,91,46,43,0,0,1,0,1].map((count,i) => ({ label: `${i * 10}-${i * 10 + 9}`, count })) },
        { id: 'intervention-segments', type: 'stacked100', title: 'فئات التدخل التربوي', xKey: 'label', yKey: 'count', data: [
          { label: 'متقنون', count: 183 },
          { label: 'فجوة قريبة', count: 44 },
          { label: 'فجوة متوسطة', count: 46 },
          { label: 'فجوة عميقة', count: 45 },
        ] },
      ],
      findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [],
      executiveTitle: 'تحليل نتائج العلوم للصف الثامن', executiveSummary: 'ملخص تجريبي.',
      _reconciliation: { aiPrimary: true },
    },
    type: { id: 'single_subject', name: 'نتائج الطلبة في مادة واحدة' },
    sourceName: 'pdf.4 · جدول PDF منظم · الصفحات 1، 2، 3، 4، 5، 6، 7، 8، 9، 10، 11، 12، 13، 14',
    sourceMeta: {
      sourceType: 'pdf', pages: Array.from({ length: 14 }, (_, i) => i + 1),
      metadata: { school: 'الباسط للبنين (8-10)', analyzedGrade: 'الثامن', schoolGradeRange: '8-10', subject: 'العلوم', academicYear: '2025/2026' },
    },
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  };
}

test('dense histogram plus intervention chart activates compact executive print layout', () => {
  const html = loadReports().buildReportHtml(contextWithDensePrimaryCharts(), { autoPrint: false });
  assert.match(html, /class="executive-page-layout executive-dense-charts"/);
});

test('PDF source label is fully RTL-safe in the rendered metadata cell', () => {
  const html = loadReports().buildReportHtml(contextWithDensePrimaryCharts(), { autoPrint: false });
  assert.match(html, /مصدر البيانات<\/span><strong>ملف بي دي إف • 14 صفحة<\/strong>/);
  assert.doesNotMatch(html, /مصدر البيانات<\/span><strong>ملف PDF/);
});
