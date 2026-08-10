const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadScripts(paths) {
  const window = {};
  const context = vm.createContext({
    window, globalThis: window, structuredClone, console, Intl, Date, Math, Set, Map, Array, Object, String, Number, RegExp, JSON,
    setTimeout, clearTimeout, performance,
  });
  for (const relative of paths) vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative });
  return window;
}

function deepWindow() {
  return loadScripts(['assets/mastery-metrics.js', 'assets/visualization-policy.js', 'assets/deep-analysis.js']);
}

function smallScoreInput(count = 2) {
  return {
    typeId: 'single_subject',
    headers: ['اسم الطالب', 'الدرجة'],
    rows: Array.from({ length: count }, (_, i) => ({ 'اسم الطالب': `طالب ${i + 1}`, 'الدرجة': i % 2 ? 32 : 18 })),
    scoreColumn: 'الدرجة',
    maxScore: 40,
    thresholdPct: 75,
    sourceMeta: {}, quality: {}, analysisProfile: {},
  };
}

test('small-sample guard turns n<5 into case description and suppresses distribution-heavy tools', () => {
  const window = deepWindow();
  const result = window.TaqareerDeepAnalytics.analyze(smallScoreInput(2));
  assert.equal(result.sampleGuard.mode, 'case_description');
  assert.equal(result.sampleGuard.allowGeneralization, false);
  assert.equal(result.reasoningGuardrails.inferenceStrength, 'محدودة');
  assert.match(result.executiveTitle, /وصف محدود/);
  assert.match(result.executiveSummary, /لا تُعمم/);
  assert.ok(!result.charts.some(chart => chart.id === 'box-summary'));
  assert.ok(!result.charts.some(chart => chart.id === 'mastery-sensitivity'));
  assert.ok(result.findings.every(item => /الحالات|العينة|حد الإتقان/.test(`${item.title} ${item.statement}`)));
  assert.equal(result.targetPolicy.mode, 'baseline_comparison');
});

test('sample sizes 5-14 remain exploratory and explicitly block generalization', () => {
  const window = deepWindow();
  const result = window.TaqareerDeepAnalytics.analyze(smallScoreInput(10));
  assert.equal(result.sampleGuard.mode, 'exploratory_small_sample');
  assert.equal(result.sampleGuard.allowGeneralization, false);
  assert.equal(result.sampleGuard.allowBoxPlot, false);
  assert.equal(result.sampleGuard.allowSensitivity, true);
  assert.match(result.sampleGuard.notice, /استكشافي/);
});

test('multi-visit missing narrative evidence is unavailable, never zero alignment', () => {
  const window = deepWindow();
  const result = window.TaqareerDeepAnalytics.analyze({
    typeId: 'supervision_multi_visit',
    headers: ['معرف الزيارة', 'المادة', 'الصف', 'مؤشر التحصيل', 'مؤشر التقويم', 'جوانب الإجادة', 'جوانب التطوير'],
    rows: [
      { 'معرف الزيارة': 'زيارة 1', 'المادة': 'الفيزياء', 'الصف': '10', 'مؤشر التحصيل': 1, 'مؤشر التقويم': 2, 'جوانب الإجادة': '', 'جوانب التطوير': '' },
      { 'معرف الزيارة': 'زيارة 2', 'المادة': 'الكيمياء', 'الصف': '9', 'مؤشر التحصيل': 2, 'مؤشر التقويم': 2, 'جوانب الإجادة': '', 'جوانب التطوير': '' },
    ],
    sourceMeta: { indicatorCatalog: [
      { id: 'student-achievement', label: 'مؤشر التحصيل' },
      { id: 'assessment', label: 'مؤشر التقويم' },
    ] },
    quality: {}, analysisProfile: {},
  });
  const alignment = result.metrics.find(metric => metric.id === 'numericNarrativeAlignmentPct');
  assert.equal(alignment.value, 'غير متاح');
  assert.equal(result.metrics.find(metric => metric.id === 'numericNarrativeComparableCount').value, 0);
  assert.ok(!result.charts.some(chart => chart.id === 'supervision-numeric-narrative-alignment'));
  assert.match(result.limitations.join(' '), /لا يساوي صفرًا/);
});

test('multi-visit comparison is descriptive only and cannot imply temporal trend', () => {
  const window = deepWindow();
  const result = window.TaqareerDeepAnalytics.analyze({
    typeId: 'supervision_multi_visit',
    headers: ['معرف الزيارة', 'المادة', 'الصف', 'مؤشر التحصيل', 'جوانب الإجادة', 'جوانب التطوير'],
    rows: [
      { 'معرف الزيارة': 'زيارة 1', 'المادة': 'الفيزياء', 'الصف': '10', 'مؤشر التحصيل': 1, 'جوانب الإجادة': 'تحصيل متميز وإتقان واضح', 'جوانب التطوير': '' },
      { 'معرف الزيارة': 'زيارة 2', 'المادة': 'الكيمياء', 'الصف': '9', 'مؤشر التحصيل': 2, 'جوانب الإجادة': 'تحصيل جيد', 'جوانب التطوير': '' },
    ],
    sourceMeta: { indicatorCatalog: [{ id: 'student-achievement', label: 'مؤشر التحصيل' }] },
    quality: {}, analysisProfile: {},
  });
  assert.equal(result.comparabilityGuard.status, 'descriptive_only');
  assert.equal(result.comparabilityGuard.allowTrendInference, false);
  const visitChart = result.charts.find(chart => chart.id === 'supervision-visit-performance');
  assert.equal(visitChart.title, 'مقارنة وصفية بين الزيارات');
  assert.match(visitChart.description, /لا تمثل اتجاهًا زمنيًا/);
});

test('narrative frequency is labeled as presence in text rather than performance quality', () => {
  const window = deepWindow();
  const result = window.TaqareerDeepAnalytics.analyze({
    typeId: 'supervision_narrative',
    headers: [], rows: [],
    narrativeText: 'جوانب الإجادة\nالتخطيط فعال ومحدد.\nالتخطيط واضح.\nجوانب التطوير\nيحتاج التخطيط إلى تنويع.\nالتوصيات\nمراجعة التخطيط في الزيارة القادمة.',
    sourceMeta: {}, quality: {}, analysisProfile: {},
  });
  const chart = result.charts.find(item => item.id === 'themes');
  assert.equal(chart.title, 'حضور المجالات في النص');
  assert.match(chart.description, /الحضور لا يعني جودة الأداء/);
  assert.match(result.findings[0].title, /لا يعني أنه الأقوى أداءً/);
});

test('client reasoning guards allow one intervention for case-description samples and cap inference confidence', () => {
  const window = loadScripts(['assets/analysis-reconciliation.js']);
  const local = {
    typeId: 'single_subject', kind: 'scores', n: 2, masteryCount: 1, masteryPct: 50, masteryPctDisplay: 50,
    sampleGuard: { applied: true, mode: 'case_description', n: 2, inferenceStrength: 'محدودة', confidenceCap: 'منخفضة', allowGeneralization: false, notice: 'العينة صغيرة جدًا (2 حالات)؛ النتائج تصف الحالات المتاحة فقط ولا تُعمم على الصف أو المجتمع.' },
    reasoningGuardrails: { inferenceStrength: 'محدودة' }, targetPolicy: { mode: 'baseline_comparison', explicitTarget: false },
    segments: [
      { id: 'mastery', label: 'حققوا حد الإتقان', count: 1, percentage: 50 },
      { id: 'deep_gap', label: 'دون الإتقان بفجوة عميقة', count: 1, percentage: 50 },
    ],
    metrics: [{ id: 'n', value: 2 }, { id: 'masteryPct', value: 50 }, { id: 'masteryCount', value: 1 }, { id: 'deepGapCount', value: 1 }],
    charts: [], evidenceMap: { 'metric:n': '2', 'metric:masteryPct': '50%', 'metric:masteryCount': '1', 'metric:deepGapCount': '1' }, limitations: [],
  };
  const primary = {
    analysisProfile: { method: 'تحليل وصفي', dataAdequacy: 'كافية', dimensions: ['الحالات'], decisionUses: ['المتابعة'] },
    executive: { title: 'قراءة', summary: 'قراءة الحالات.', overallJudgement: 'متابعة فردية', confidence: 'مرتفعة', evidenceRefs: ['metric:n'] },
    diagnosticSections: [
      { title: 'حقيقة', analysis: 'توجد حالتان.', claimType: 'fact', evidenceRefs: ['metric:n'], confidence: 'مرتفعة', implications: ['متابعة'], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { title: 'تفسير', analysis: 'قد تشير النتيجة إلى فجوة.', claimType: 'inference', evidenceRefs: ['metric:masteryPct'], confidence: 'مرتفعة', implications: ['تحقق'], alternativeExplanations: [], limitations: [], dataRequests: [] },
    ],
    findings: [
      { title: 'وصف', statement: 'واحدة من حالتين متقنة.', claimType: 'fact', evidenceRefs: ['metric:masteryCount'], confidence: 'مرتفعة', severity: 'medium', educationalImpact: 'متابعة الحالة.', recommendedAction: 'متابعة فردية.', limitations: [] },
      { title: 'فرضية سبب', statement: 'قد يكون السبب متطلبات سابقة.', claimType: 'hypothesis', evidenceRefs: ['metric:deepGapCount'], confidence: 'مرتفعة', severity: 'medium', educationalImpact: 'يحتاج تحققًا.', recommendedAction: 'تشخيص مباشر.', limitations: [] },
    ],
    qualityTools: [],
    interventions: [{
      priority: 'عالية', issue: 'متابعة الحالة ذات الفجوة العميقة', targetGroup: 'الحالة ذات الفجوة العميقة', targetGroupIds: ['deep_gap'], action: 'تشخيص فردي قصير.', implementationSteps: ['تشخيص', 'دعم', 'إعادة قياس'], responsibleRole: 'معلم المادة', timeframe: 'أسبوعان', successIndicator: 'تحسن 50%', successMetric: { mode: 'segment_reduction', targetValue: 50, targetSegmentId: 'deep_gap' }, numericGuard: { applied: true, mode: 'segment_reduction', totalCount: 2, segmentId: 'deep_gap', baselineSegmentCount: 1 }, monitoringMethod: 'إعادة القياس', contingency: 'تعديل الدعم', resources: [], evidenceRefs: ['metric:deepGapCount', 'metric:n']
    }],
    monitoringPlan: [
      { stage: 'خط الأساس', timing: 'الآن', measure: 'تثبيت الحالة.', owner: 'المعلم', evidenceRefs: ['metric:n'] },
      { stage: 'متابعة', timing: 'بعد أسبوع', measure: 'قياس قصير.', owner: 'المعلم', evidenceRefs: ['metric:deepGapCount'] },
      { stage: 'إعادة قياس', timing: 'بعد أسبوعين', measure: 'مقارنة بخط الأساس.', owner: 'المعلم', evidenceRefs: ['metric:masteryPct'] },
    ], additionalCautions: [], missingDataRequests: [],
  };
  primary.interventions.push({
    ...primary.interventions[0],
    priority: 'متوسطة',
    issue: 'إثراء الحالة المتقنة',
    targetGroup: 'الحالة المتقنة',
    targetGroupIds: ['mastery'],
    action: 'مهمة إثرائية فردية قصيرة.',
    evidenceRefs: ['metric:masteryCount', 'metric:n'],
  });
  const analysis = window.TaqareerReconciliation.composePrimary(local, primary, { availableEvidenceRefs: Object.keys(local.evidenceMap) });
  assert.equal(analysis.improvementPlan.length, 1);
  assert.equal(analysis.executiveConfidence, 'منخفضة');
  assert.equal(analysis.diagnosticSections.find(item => item.claimType === 'inference').confidence, 'منخفضة');
  assert.equal(analysis.findings.find(item => item.claimType === 'hypothesis').confidence, 'منخفضة');
  assert.equal(analysis.improvementPlan[0].successMetric.targetValue, 0);
  assert.equal(analysis.improvementPlan[0].targetBasis, 'مقارنة بخط الأساس');
  assert.match(analysis.limitations.join(' '), /لا تُعمم/);
});

test('multi-subject n<5 uses case-description guard and suppresses correlations', () => {
  const window = deepWindow();
  const rows = [
    { 'اسم الطالب':'طالب 1', 'الفيزياء - الدرجة':95, 'الفيزياء - المستوى':'أ', 'الكيمياء - الدرجة':70, 'الكيمياء - المستوى':'ج', 'الأحياء - الدرجة':55, 'الأحياء - المستوى':'د' },
    { 'اسم الطالب':'طالب 2', 'الفيزياء - الدرجة':85, 'الفيزياء - المستوى':'ب', 'الكيمياء - الدرجة':65, 'الكيمياء - المستوى':'ج', 'الأحياء - الدرجة':50, 'الأحياء - المستوى':'د' },
    { 'اسم الطالب':'طالب 3', 'الفيزياء - الدرجة':75, 'الفيزياء - المستوى':'ج', 'الكيمياء - الدرجة':60, 'الكيمياء - المستوى':'د', 'الأحياء - الدرجة':45, 'الأحياء - المستوى':'هـ' },
    { 'اسم الطالب':'طالب 4', 'الفيزياء - الدرجة':65, 'الفيزياء - المستوى':'ج', 'الكيمياء - الدرجة':55, 'الكيمياء - المستوى':'د', 'الأحياء - الدرجة':40, 'الأحياء - المستوى':'هـ' },
  ];
  const result = window.TaqareerDeepAnalytics.analyze({
    typeId: 'multi_subject_results',
    headers: Object.keys(rows[0]),
    rows,
    sourceMeta: { normalization: { levelSource: 'reported' }, metadata: { grade: 'العاشر', period: 'الدور الأول', academicYear: '2025/2026' } },
    analysisProfile: {
      columnRoles: {
        studentName: 'اسم الطالب',
        subjects: [
          { subject:'الفيزياء', scoreHeader:'الفيزياء - الدرجة', levelHeader:'الفيزياء - المستوى' },
          { subject:'الكيمياء', scoreHeader:'الكيمياء - الدرجة', levelHeader:'الكيمياء - المستوى' },
          { subject:'الأحياء', scoreHeader:'الأحياء - الدرجة', levelHeader:'الأحياء - المستوى' },
        ],
      },
      rowRoles: { dataRowIndexes:[0,1,2,3] },
    },
    analysisOptions: { mode:'all', includeSubjectTopTen:false, includeSchoolRanking:false },
    quality: {},
  });
  assert.equal(result.n, 4);
  assert.equal(result.sampleGuard.mode, 'case_description');
  assert.equal(result.sampleGuard.allowGeneralization, false);
  assert.equal(result.reasoningGuardrails.inferenceStrength, 'محدودة');
  assert.deepEqual(Array.from(result.correlations || []), []);
  assert.match(result.executiveTitle, /وصف محدود/);
  assert.match(result.executiveSummary, /لا تُعمم/);
  assert.equal(result.findings.length, 1);
  assert.match(result.limitations.join(' '), /معاملات الارتباط/);
});
