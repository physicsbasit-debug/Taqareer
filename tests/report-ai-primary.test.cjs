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

test('official report completes with a clearly labeled local evidence fallback when external AI is unavailable', () => {
  const analysis = {
    metrics: [{ id: 'mean', label: 'المتوسط', value: 76.4, format: 'number', note: '', evidenceRef: 'metric:mean' }],
    charts: [],
    findings: [{
      id: 'f-local-1',
      title: 'قراءة محلية للأداء',
      statement: 'تستند القراءة إلى الحسابات والأدلة المحلية المتاحة.',
      evidenceRefs: ['metric:mean'],
      confidence: 'مرتفعة',
      severity: 'medium',
      educationalImpact: 'تحدد اتجاهًا عامًا قابلًا للمراجعة.',
      recommendedAction: 'مراجعة الفئات ذات الأداء الأدنى.',
      limitations: [],
    }],
    qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [], diagnosticSections: [],
    executiveTitle: 'قراءة محلية موثوقة للنتائج',
    executiveSummary: 'اكتمل التقرير من الحسابات والأدلة الحتمية دون الاعتماد على استجابة خارجية في هذه المحاولة.',
    analysisProfile: { method: 'تحليل محلي حتمي', dataSufficiency: 'كافية وصفيًا', dimensions: [], decisionUses: [] },
    _reconciliation: { aiPrimary: true, aiApplied: false, localFallbackUsed: true, analysisMode: 'local-evidence-fallback' },
  };
  const context = {
    analysis,
    type: { id: 'single_subject', name: 'نتائج مادة دراسية' },
    sourceName: 'results.pdf',
    sourceMeta: { metadata: { school: 'مدرسة اختبار', analyzedGrade: 'الثامن', subject: 'العلوم' } },
    quality: { completeness: 100 },
    recognitionStatus: 'معتمد',
  };

  const report = sandbox.window.TaqareerReports.buildReportData(context);
  assert.equal(report.localFallbackUsed, true);
  assert.equal(report.aiUsed, false);

  const html = sandbox.window.TaqareerReports.buildReportHtml(context, { autoPrint: false });
  assert.match(html, /تحليل تربوي محلي موثوق/);
  assert.doesNotMatch(html, /تحليل غير مكتمل/);
  assert.match(html, /قراءة محلية موثوقة للنتائج/);
});

test('official report visibly distinguishes facts, supported inferences, and hypotheses requiring verification', () => {
  const analysis = {
    metrics: [{ id: 'm1', label: 'مؤشر', value: 82.7, format: 'number', evidenceRef: 'metric:m1' }],
    charts: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], limitations: [],
    diagnosticSections: [
      { id: 'd1', title: 'مؤشر مباشر', analysis: 'المتوسط محسوب من البيانات.', claimType: 'fact', evidenceRefs: ['metric:m1'], confidence: 'مرتفعة', implications: [], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { id: 'd2', title: 'قراءة محدودة', analysis: 'قد يحتاج التفاوت إلى تمايز في الدعم.', claimType: 'inference', evidenceRefs: ['metric:m1'], confidence: 'متوسطة', implications: [], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { id: 'd3', title: 'عامل غير مقاس', analysis: 'فرضية تحتاج بيانات مباشرة.', claimType: 'hypothesis', evidenceRefs: ['metric:m1'], confidence: 'منخفضة', implications: [], alternativeExplanations: [], limitations: ['لا يقاس العامل مباشرة.'], dataRequests: ['بيانات مباشرة'] },
    ],
    findings: [
      { id: 'f1', title: 'مؤكد', statement: 'المؤشر مرتفع.', claimType: 'fact', evidenceRefs: ['metric:m1'], confidence: 'مرتفعة', severity: 'low', educationalImpact: 'يوصف المستوى.', recommendedAction: 'المتابعة.', limitations: [] },
      { id: 'f2', title: 'استنتاج', statement: 'قد يلزم تمايز.', claimType: 'inference', evidenceRefs: ['metric:m1'], confidence: 'متوسطة', severity: 'medium', educationalImpact: 'يوجه الدعم.', recommendedAction: 'تقسيم الدعم.', limitations: [] },
      { id: 'f3', title: 'فرضية', statement: 'العامل يحتاج تحققًا.', claimType: 'hypothesis', evidenceRefs: ['metric:m1'], confidence: 'منخفضة', severity: 'medium', educationalImpact: 'لا يعتمد سببيًا.', recommendedAction: 'جمع دليل مباشر.', limitations: ['غير مقاس'] },
    ],
    executiveTitle: 'اختبار طبقات اليقين', executiveSummary: 'عرض مستويات الاستدلال بوضوح.',
    analysisProfile: { method: 'اختبار', dataSufficiency: 'كافية وصفيًا', dimensions: [], decisionUses: [] },
    _reconciliation: { aiPrimary: true, aiApplied: true },
  };
  const context = {
    analysis,
    type: { id: 'single_subject', name: 'نتائج مادة دراسية' },
    sourceName: 'results.pdf',
    sourceMeta: { metadata: { school: 'مدرسة اختبار', analyzedGrade: 'الثامن', subject: 'العلوم' } },
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  };
  const html = sandbox.window.TaqareerReports.buildReportHtml(context, { autoPrint: false });
  assert.match(html, /مؤكد من البيانات/);
  assert.match(html, /استنتاج مدعوم/);
  assert.match(html, /فرضية تحتاج تحققًا/);
});

test('End-to-End client guard keeps assessment-component cohort, action, and success indicator aligned and strips motivational leakage', () => {
  const groups = [
    { id: 'mastery', label: 'حققوا حد الإتقان', count: 141, percentage: 52.6 },
    { id: 'near_mastery', label: 'قريبون من الإتقان', count: 47, percentage: 17.5 },
    { id: 'moderate_gap', label: 'دون الإتقان بفجوة متوسطة', count: 71, percentage: 26.5 },
    { id: 'deep_gap', label: 'دون الإتقان بفجوة عميقة', count: 9, percentage: 3.4 },
  ];
  const local = {
    typeId: 'assessment_component', kind: 'scores', n: 268, masteryCount: 141, masteryPct: 52.6, masteryPctDisplay: 52.6, segments: groups,
    metrics: [
      { id: 'n', label: 'السجلات الصالحة', value: 268, evidenceRef: 'metric:n' },
      { id: 'masteryCount', label: 'حققوا حد الإتقان', value: 141, evidenceRef: 'metric:masteryCount' },
      { id: 'masteryPct', label: 'نسبة الإتقان', value: 52.6, evidenceRef: 'metric:masteryPct' },
      { id: 'nearMasteryCount', label: 'القريبون من الإتقان', value: 47, evidenceRef: 'metric:nearMasteryCount' },
      { id: 'moderateGapCount', label: 'الفجوة المتوسطة', value: 71, evidenceRef: 'metric:moderateGapCount' },
      { id: 'deepGapCount', label: 'الفجوة العميقة', value: 9, evidenceRef: 'metric:deepGapCount' },
    ], charts: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [], diagnosticSections: [], limitations: [],
    evidenceMap: {
      'metric:n': '268 طالبًا', 'metric:masteryCount': '141 متقنًا', 'metric:masteryPct': '52.6%',
      'metric:nearMasteryCount': '47 قريبًا', 'metric:moderateGapCount': '71 بفجوة متوسطة', 'metric:deepGapCount': '9 بفجوة عميقة',
    },
  };
  const primary = {
    contractVersion: '6.6.0',
    analysisProfile: { method: 'تحليل مكون تقويمي', dataAdequacy: 'كافية', dimensions: ['الإتقان'], decisionUses: ['التدخل'] },
    executive: { title: 'قراءة المكون', summary: 'توزيع متمايز حول حد الإتقان.', overallJudgement: 'دعم متدرج', confidence: 'مرتفعة', evidenceRefs: ['metric:masteryPct'] },
    diagnosticSections: [
      { id: 'd1', title: 'مؤشرات التشتت', analysis: 'المؤشرات الرقمية تصف التوزيع.', claimType: 'fact', evidenceRefs: ['metric:n'], confidence: 'مرتفعة', implications: ['تعزيز دافعية الطلبة المتميزة واستمرار التفوق التحصيلي.'], alternativeExplanations: [], limitations: ['الدرجات لا تقيس الدافعية.'], dataRequests: [] },
      { id: 'd2', title: 'فئات الإتقان', analysis: 'توجد فئات متفاوتة.', claimType: 'fact', evidenceRefs: ['metric:nearMasteryCount', 'metric:moderateGapCount', 'metric:deepGapCount'], confidence: 'مرتفعة', implications: ['توجيه الدعم حسب الفئة.'], alternativeExplanations: [], limitations: [], dataRequests: [] },
    ],
    findings: [
      { id: 'f1', title: 'فئات الدعم', statement: 'توجد فئات متفاوتة.', claimType: 'fact', evidenceRefs: ['metric:deepGapCount'], confidence: 'مرتفعة', severity: 'high', educationalImpact: 'تحتاج تمايزًا.', recommendedAction: 'دعم متدرج.', limitations: [] },
      { id: 'f2', title: 'المتابعة', statement: 'إعادة القياس لازمة.', claimType: 'inference', evidenceRefs: ['metric:masteryPct'], confidence: 'متوسطة', severity: 'medium', educationalImpact: 'تقيس الأثر.', recommendedAction: 'إعادة القياس.', limitations: [] },
    ],
    qualityTools: [],
    interventions: [
      {
        id: 'i1', priority: 'عالية', issue: 'تأهيل الطلبة القريبين من الإتقان', targetGroup: 'قريبون من الإتقان', targetGroupIds: ['deep_gap'], action: 'برنامج سريع للقريبين من الإتقان.', implementationSteps: ['خطوة'], responsibleRole: 'معلم المادة', timeframe: '6 أسابيع', successIndicator: 'قديم', monitoringMethod: 'متابعة', contingency: 'بديل', resources: [], evidenceRefs: ['metric:deepGapCount'],
        successMetric: { mode: 'segment_reduction', targetValue: 20, targetSegmentId: 'deep_gap' },
        numericGuard: { applied: true, mode: 'segment_reduction', totalCount: 268, segmentId: 'deep_gap', baselineSegmentCount: 9, reductionCount: 2, targetSegmentCount: 7 },
        basisClaimType: 'fact', basisConfidence: 'مرتفعة',
      },
      {
        id: 'i2', priority: 'متوسطة', issue: 'إثراء المتفوقين', targetGroup: 'المتفوقون', targetGroupIds: ['moderate_gap', 'near_mastery'], action: 'أنشطة إثرائية للمتفوقين.', implementationSteps: ['خطوة'], responsibleRole: 'معلم المادة', timeframe: '6 أسابيع', successIndicator: 'قديم', monitoringMethod: 'متابعة', contingency: 'بديل', resources: [], evidenceRefs: ['metric:moderateGapCount', 'metric:nearMasteryCount'],
        successMetric: { mode: 'mastery_gain', targetValue: 57.8, targetSegmentId: '' },
        numericGuard: { applied: true, mode: 'mastery_gain', totalCount: 268, baselineCount: 141, baselineRate: 52.6, eligibleCount: 118, feasibleGain: 14, targetCount: 155, targetRate: 57.8 },
        basisClaimType: 'fact', basisConfidence: 'مرتفعة',
      },
    ],
    monitoringPlan: [
      { id: 'm1', stage: 'خط الأساس', timing: 'الآن', measure: 'تثبيت الفئات.', owner: 'معلم المادة', evidenceRefs: ['metric:n'] },
      { id: 'm2', stage: 'متابعة مرحلية', timing: 'بعد أسبوعين', measure: 'إعادة القياس.', owner: 'معلم المادة', evidenceRefs: ['metric:masteryPct'] },
      { id: 'm3', stage: 'قياس أثر', timing: 'بعد 4 أسابيع', measure: 'مقارنة الانتقال.', owner: 'معلم المادة', evidenceRefs: ['metric:masteryPct'] },
    ],
    additionalCautions: [], missingDataRequests: [],
  };
  const refs = Object.keys(local.evidenceMap);
  const analysis = sandbox.window.TaqareerReconciliation.composePrimary(local, primary, { availableEvidenceRefs: refs });
  const serialized = JSON.stringify(analysis);
  assert.doesNotMatch(serialized, /تعزيز دافعية الطلبة المتميزة/);
  const hypothesis = analysis.diagnosticSections.find(item => item.claimType === 'hypothesis');
  assert.ok(hypothesis);
  assert.match(hypothesis.title, /الدافعية/);

  const deep = analysis.improvementPlan.find(item => item.targetGroupIds?.length === 1 && item.targetGroupIds[0] === 'deep_gap');
  assert.ok(deep);
  assert.match(deep.issue, /الفجوة العميقة/);
  assert.match(deep.action, /تشخيص|دعم مكثف/);
  assert.match(deep.successIndicator, /فجوة عميقة/);

  const lift = analysis.improvementPlan.find(item => item.targetGroupIds?.includes('moderate_gap') && item.targetGroupIds?.includes('near_mastery'));
  assert.ok(lift);
  assert.match(lift.issue, /الفجوة المتوسطة|القريبين من الإتقان/);
  assert.match(lift.action, /دعم متدرج|مراجعة مركزة/);
  assert.match(lift.targetGroup, /فجوة متوسطة/);
  assert.match(lift.targetGroup, /قريبون من الإتقان/);
  assert.match(lift.successIndicator, /طالبًا مستهدفًا/);

  const html = sandbox.window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'assessment_component', name: 'درجات مكوّن تقويمي' }, sourceName: 'component.pdf',
    sourceMeta: { metadata: { school: 'الباسط للبنين (8-10)', schoolGradeRange: '8-10', analyzedGrade: 'التاسع', grade: 'التاسع', subject: 'الأحياء' } },
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false });
  assert.match(html, /الصف \/ الفئة<\/span><strong>التاسع<\/strong>/);
  assert.doesNotMatch(html, /تعزيز دافعية الطلبة المتميزة/);
  assert.match(html, /الفجوة العميقة تحتاج تشخيصًا ودعمًا مكثفًا/);
  assert.match(html, /رفع الفجوة المتوسطة والقريبين من الإتقان نحو الإتقان/);
});
