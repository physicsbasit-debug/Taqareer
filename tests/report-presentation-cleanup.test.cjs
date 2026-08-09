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

function minimalContext() {
  return {
    analysis: {
      metrics: [], charts: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [],
      executiveTitle: 'اختبار تنظيف العرض', executiveSummary: 'اختبار عرض المصدر والعناوين دون تغيير بيانات التحليل.',
      _reconciliation: { aiPrimary: true },
    },
    type: { id: 'single_subject', name: 'نتائج الطلبة في مادة واحدة' },
    sourceName: 'pdf.4 · جدول PDF منظم · الصفحات 1، 2، 3، 4، 5، 6، 7، 8، 9، 10، 11، 12، 13، 14',
    sourceMeta: {
      sourceType: 'pdf',
      pages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      metadata: {
        school: 'الباسط للبنين (8-10)',
        analyzedGrade: 'الثامن',
        schoolGradeRange: '8-10',
        subject: 'العلوم',
        academicYear: '2025/2026',
      },
    },
    quality: { completeness: 100 },
    recognitionStatus: 'معتمد',
  };
}

test('official report hides technical PDF source labels while preserving raw source metadata internally', () => {
  const reports = loadReports();
  const context = minimalContext();
  const data = reports.buildReportData(context);
  assert.equal(data.meta.sourceName, context.sourceName, 'raw provenance must remain unchanged internally');

  const html = reports.buildReportHtml(context, { autoPrint: false });
  assert.match(html, /مصدر البيانات<\/span><strong>ملف بي دي إف • 14 صفحة<\/strong>/);
  assert.doesNotMatch(html, /مصدر البيانات<\/span><strong>[^<]*جدول PDF منظم/);
  assert.doesNotMatch(html, /مصدر البيانات<\/span><strong>[^<]*الصفحات 1/);
  assert.match(html, /الصف \/ الفئة<\/span><strong>الثامن<\/strong>/);
});

test('packed report page header uses readable section names instead of internal section-count shorthand', () => {
  assert.match(source, /function publicFlowSectionName\(value\)/);
  assert.match(source, /"الاستنتاجات التشخيصية":"الاستنتاجات"/);
  assert.match(source, /"خطة التحسين والتدخل":"خطة التحسين"/);
  assert.match(source, /"المتابعة والحوكمة":"المتابعة"/);
  assert.match(source, /values\.map\(publicFlowSectionName\)\.join\(" \/ "\)/);
  assert.doesNotMatch(source, /\+\s*" أقسام"/);
  assert.doesNotMatch(source, /values\.length>2\?values\[0\]\+" \+ "/);
});
