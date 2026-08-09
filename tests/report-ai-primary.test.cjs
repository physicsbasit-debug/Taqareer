const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { packageVersion, escapeRegExp } = require('../scripts/version-contract.cjs');
const CURRENT_APP_VERSION = packageVersion(root);
const CURRENT_APP_VERSION_RE = escapeRegExp(CURRENT_APP_VERSION);
const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
vm.createContext(sandbox);
for (const file of ['display-terms.js', 'analysis-reconciliation.js', 'report-system.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
}

test('official report renders reconciled analysis without exposing AI provenance or report tokens', () => {
  const local = {
    typeId: 'survey',
    kind: 'survey',
    metrics: [{ id: 'positivePct', label: 'الاستجابات الإيجابية', value: 58, format: 'percent', note: '', evidenceRef: 'metric:positivePct' }],
    charts: [{ id: 'survey-bars', type: 'bar', title: 'توزيع الاستجابات', description: '', xKey: 'label', yKey: 'value', data: [{ label: 'إيجابي', value: 58 }] }],
    evidenceMap: { 'metric:positivePct': 'الاستجابات الإيجابية: 58%' },
    limitations: [],
  };
  const primary = {
    contractVersion: '6.6.0',
    analysisProfile: { method: 'تحليل اتجاهات مدعوم بالأدلة', dataAdequacy: 'كافية وصفيًا', dimensions: ['الاتجاه', 'الفجوة'], decisionUses: ['ترتيب الأولويات'] },
    executive: { title: 'رضا متوسط يخفي أولوية محددة', summary: 'تشير النتيجة إلى اتجاه إيجابي غير حاسم، ويجب التركيز على البنود الأقل قبل إطلاق حكم عام.', overallJudgement: 'تحسين موجه', confidence: 'متوسطة', evidenceRefs: ['metric:positivePct'], limitations: [] },
    diagnosticSections: [
      { id: 'd1', title: 'الاتجاه العام', analysis: 'الإيجابية لا تبلغ مستوى يسمح باعتبار الرضا قويًا.', claimType: 'fact', evidenceRefs: ['metric:positivePct'], confidence: 'مرتفعة', implications: ['تجنب الحكم العام المطمئن'], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { id: 'd2', title: 'حدود المتوسط', analysis: 'قد يخفي المتوسط تباينًا بين البنود.', claimType: 'inference', evidenceRefs: ['metric:positivePct'], confidence: 'متوسطة', implications: ['تحليل البنود منفردة'], alternativeExplanations: [], limitations: [], dataRequests: ['نتائج البنود'] },
    ],
    findings: [
      { id: 'f1', title: 'اتجاه غير حاسم', statement: 'الرضا الإيجابي متوسط.', claimType: 'fact', evidenceRefs: ['metric:positivePct'], confidence: 'مرتفعة', severity: 'medium', educationalImpact: 'لا يدعم تعميم النجاح.', recommendedAction: 'تحليل البنود الأدنى.', limitations: [] },
      { id: 'f2', title: 'حاجة إلى تفصيل', statement: 'المؤشر المجمل لا يكشف موضع الفجوة.', claimType: 'inference', evidenceRefs: ['metric:positivePct'], confidence: 'متوسطة', severity: 'medium', educationalImpact: 'قد يشتت التدخل.', recommendedAction: 'ربط التدخل ببنود محددة.', limitations: [] },
    ],
    qualityTools: [{ id: 'q1', name: 'فحص تجانس الاتجاه', reason: 'النتيجة المجمعة قد تخفي تباين البنود.', interpretation: 'يجب فحص البنود قبل تعميم الحكم.', requiredData: ['نتائج البنود'], evidenceRefs: ['metric:positivePct'] }],
    interventions: [
      { id: 'i1', priority: 'عالية', issue: 'غياب تحديد البنود ذات الأولوية', targetGroup: 'فريق البرنامج', action: 'تحليل البنود واختيار أعلى فجوتين.', implementationSteps: ['ترتيب البنود', 'اختيار فجوتين', 'تنفيذ تحسين'], responsibleRole: 'فريق البرنامج', timeframe: 'أربعة أسابيع', successIndicator: 'ارتفاع الإيجابية في البنود المستهدفة', monitoringMethod: 'إعادة القياس', contingency: 'مقابلات نوعية', resources: [], evidenceRefs: ['metric:positivePct'] },
      { id: 'i2', priority: 'متوسطة', issue: 'ضعف تفسير المؤشر المجمل', targetGroup: 'فريق التقويم', action: 'إضافة تحليل بنود وملاحظات نوعية قبل الحكم النهائي.', implementationSteps: ['جمع نتائج البنود', 'مراجعة التعليقات'], responsibleRole: 'فريق التقويم', timeframe: 'أسبوعان', successIndicator: 'تحديد بندين ذوي أولوية بدليل واضح', monitoringMethod: 'محضر مراجعة الأدلة', contingency: 'تنفيذ مقابلات مركزة', resources: [], evidenceRefs: ['metric:positivePct'] },
    ],
    monitoringPlan: [
      { id: 'm1', stage: 'خط الأساس', timing: 'قبل التنفيذ', measure: 'توثيق المؤشر والبنود المتاحة', owner: 'فريق البرنامج', evidenceRefs: ['metric:positivePct'] },
      { id: 'm2', stage: 'متابعة مرحلية', timing: 'بعد أسبوعين', measure: 'مراجعة تنفيذ التحسين وجمع البنود', owner: 'فريق التقويم', evidenceRefs: ['metric:positivePct'] },
      { id: 'm3', stage: 'قياس الأثر', timing: 'بعد أربعة أسابيع', measure: 'مقارنة البنود المستهدفة بخط الأساس', owner: 'فريق البرنامج', evidenceRefs: ['metric:positivePct'] },
    ],
    additionalCautions: [], missingDataRequests: ['نتائج البنود'], suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
  const analysis = sandbox.window.TaqareerReconciliation.composePrimary(local, primary, { availableEvidenceRefs: ['metric:positivePct'] });
  const context = { analysis, type: { name: 'استبانة اتجاهات أو رضا' }, sourceName: 'survey.csv', sourceMeta: { metadata: { school: 'الباسط للبنين الصفوف (8-10)', subject: 'اللغة العربية', grade: '8-10', academicYear: '2025/2026' } }, quality: { completeness: 100 }, recognitionStatus: 'معتمد' };
  const html = sandbox.window.TaqareerReports.buildReportHtml(context, { autoPrint: false });
  assert.equal(sandbox.window.TaqareerReports.VERSION, CURRENT_APP_VERSION);
  assert.match(html, /تحليل تربوي موثق/);
  assert.match(html, /منصة التحليل التربوي والبيانات التعليمية/);
  assert.doesNotMatch(html, /ذكاء اصطناعي|Gemini|TQR-/i);
  assert.match(html, /رضا متوسط يخفي أولوية محددة/);
  assert.match(html, new RegExp(`تقارير v${CURRENT_APP_VERSION_RE}`));
  assert.match(html, /خط الأساس/);
  assert.match(html, /فحص تجانس الاتجاه/);
  assert.match(html, /الباسط للبنين الصفوف \(8-10\)/);
  assert.match(html, /اللغة العربية/);
  assert.match(html, /2025\/2026/);
  assert.doesNotMatch(html, /تحليل متخصص حتمي/);
});


test('official report prefers analyzed grade over school grade range without discarding either metadata field', () => {
  const analysis = {
    metrics: [], charts: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [],
    executiveTitle: 'اختبار فصل بيانات الصف', executiveSummary: 'اختبار عرض الصف المحلل فعليًا.',
    _reconciliation: { aiPrimary: true },
  };
  const context = {
    analysis,
    type: { id: 'single_subject', name: 'نتائج مادة دراسية' },
    sourceName: 'grade8-results.pdf',
    sourceMeta: { metadata: {
      school: 'الباسط للبنين (8-10)',
      schoolGradeRange: '8-10',
      analyzedGrade: 'الثامن',
      grade: '8-10',
      subject: 'العلوم',
    } },
    quality: { completeness: 100 },
    recognitionStatus: 'معتمد',
  };
  const report = sandbox.window.TaqareerReports.buildReportData(context);
  assert.equal(report.meta.grade, 'الثامن');
  assert.equal(context.sourceMeta.metadata.schoolGradeRange, '8-10');
  const html = sandbox.window.TaqareerReports.buildReportHtml(context, { autoPrint: false });
  assert.match(html, /الصف \/ الفئة<\/span><strong>الثامن<\/strong>/);
  assert.match(html, /الباسط للبنين \(8-10\)/);
});
