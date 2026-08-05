const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
vm.createContext(sandbox);
for (const file of ['analysis-reconciliation.js', 'report-system.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
}

test('official report renders only an AI-primary reconciled analysis', () => {
  const local = {
    typeId: 'survey',
    kind: 'survey',
    metrics: [{ id: 'positivePct', label: 'الاستجابات الإيجابية', value: 58, format: 'percent', note: '', evidenceRef: 'metric:positivePct' }],
    charts: [{ id: 'survey-bars', type: 'bar', title: 'توزيع الاستجابات', description: '', xKey: 'label', yKey: 'value', data: [{ label: 'إيجابي', value: 58 }] }],
    evidenceMap: { 'metric:positivePct': 'الاستجابات الإيجابية: 58%' },
    limitations: [],
  };
  const primary = {
    contractVersion: '6.0.0',
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
    qualityTools: [],
    interventions: [
      { id: 'i1', priority: 'عالية', issue: 'غياب تحديد البنود ذات الأولوية', targetGroup: 'فريق البرنامج', action: 'تحليل البنود واختيار أعلى فجوتين.', implementationSteps: ['ترتيب البنود', 'اختيار فجوتين', 'تنفيذ تحسين'], responsibleRole: 'فريق البرنامج', timeframe: 'أربعة أسابيع', successIndicator: 'ارتفاع الإيجابية في البنود المستهدفة', monitoringMethod: 'إعادة القياس', contingency: 'مقابلات نوعية', resources: [], evidenceRefs: ['metric:positivePct'] },
    ],
    monitoringPlan: [{ id: 'm1', stage: 'إعادة القياس', timing: 'بعد أربعة أسابيع', measure: 'مقارنة البنود المستهدفة', owner: 'فريق البرنامج', evidenceRefs: ['metric:positivePct'] }],
    additionalCautions: [], missingDataRequests: ['نتائج البنود'], suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
  const analysis = sandbox.window.TaqareerReconciliation.composePrimary(local, primary, { availableEvidenceRefs: ['metric:positivePct'] });
  const context = { analysis, type: { name: 'استبانة اتجاهات أو رضا' }, sourceName: 'survey.csv', sourceMeta: {}, quality: { completeness: 100 }, recognitionStatus: 'معتمد' };
  const html = sandbox.window.TaqareerReports.buildReportHtml(context, { autoPrint: false });
  assert.equal(sandbox.window.TaqareerReports.VERSION, '1.0.1');
  assert.match(html, /تحليل ذكاء اصطناعي موثق/);
  assert.match(html, /رضا متوسط يخفي أولوية محددة/);
  assert.doesNotMatch(html, /تحليل متخصص حتمي/);
});
