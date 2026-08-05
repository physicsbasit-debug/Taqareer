const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadBrowserScript(relativePath, extra = {}) {
  const window = {};
  const context = vm.createContext({
    window,
    globalThis: window,
    structuredClone,
    console,
    setTimeout,
    clearTimeout,
    performance,
    ...extra,
  });
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
  return window;
}

function localScoreEvidence() {
  return {
    typeId: 'single_subject',
    n: 100,
    masteryCount: 42,
    masteryPctDisplay: 42,
    segments: [
      { id: 'mastery', label: 'حققوا حد الإتقان', count: 42, percentage: 42 },
      { id: 'near_mastery', label: 'قريبون من الإتقان', count: 8, percentage: 8 },
      { id: 'moderate_gap', label: 'دون الإتقان بفجوة متوسطة', count: 12, percentage: 12 },
      { id: 'deep_gap', label: 'دون الإتقان بفجوة عميقة', count: 38, percentage: 38 },
    ],
    metrics: [
      { id: 'mean', label: 'المتوسط', value: 61 },
      { id: 'masteryPct', label: 'الإتقان', value: 42 },
      { id: 'masteryCount', label: 'المتقنون', value: 42 },
      { id: 'nearMasteryCount', label: 'القريبون', value: 8 },
      { id: 'moderateGapCount', label: 'الفجوة المتوسطة', value: 12 },
      { id: 'deepGapCount', label: 'الفجوة العميقة', value: 38 },
      { id: 'sd', label: 'التشتت', value: 18 },
    ],
    charts: [{ id: 'intervention-segments', type: 'bar', title: 'فئات التدخل', data: [] }],
    evidenceMap: {
      'metric:mean': 'المتوسط: 61',
      'metric:masteryPct': 'الإتقان: 42%',
      'metric:masteryCount': 'المتقنون: 42',
      'metric:nearMasteryCount': 'القريبون: 8',
      'metric:moderateGapCount': 'الفجوة المتوسطة: 12',
      'metric:deepGapCount': 'الفجوة العميقة: 38',
      'metric:sd': 'التشتت: 18',
      'metric:n': 'السجلات: 100',
    },
    limitations: [],
  };
}

const scoreRefs = ['metric:mean', 'metric:masteryPct', 'metric:masteryCount', 'metric:nearMasteryCount', 'metric:moderateGapCount', 'metric:deepGapCount', 'metric:sd', 'metric:n'];

function primaryFixture() {
  const refs = ['metric:mean', 'metric:masteryPct', 'metric:sd'];
  return {
    contractVersion: '6.5.0',
    analysisProfile: {
      method: 'تحليل علاقات الأداء والأولوية من الأدلة الرقمية',
      dataAdequacy: 'كافية للقراءة الوصفية، وغير كافية لإثبات السبب',
      dimensions: ['الانتشار', 'التفاوت', 'قابلية التدخل'],
      decisionUses: ['ترتيب الأولويات', 'تصميم تدخل قصير'],
    },
    executive: {
      title: 'فجوة مركزة قابلة للتدخل',
      summary: 'تكشف المؤشرات عن انخفاض في انتشار الإتقان مع تفاوت يستلزم تدخلًا متمايزًا، دون ادعاء سبب غير مثبت.',
      overallJudgement: 'أولوية مرتفعة قابلة للمعالجة المرحلية',
      confidence: 'مرتفعة',
      evidenceRefs: ['metric:masteryPct', 'metric:sd'],
      limitations: ['لا تتوفر نتائج على مستوى المفردات'],
    },
    diagnosticSections: [
      { id: 'd1', title: 'انتشار الإتقان', analysis: 'الانتشار منخفض مقارنة بالحد المعتمد.', claimType: 'fact', evidenceRefs: ['metric:masteryPct'], confidence: 'مرتفعة', implications: ['الحاجة إلى تدخل منظم'], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { id: 'd2', title: 'التفاوت', analysis: 'التشتت يوحي بأن التدخل الموحد قد لا يناسب الجميع.', claimType: 'inference', evidenceRefs: ['metric:sd'], confidence: 'متوسطة', implications: ['تقسيم الفئات'], alternativeExplanations: ['اختلاف صعوبة البنود'], limitations: ['لا توجد بيانات مفردات'], dataRequests: ['نتائج المفردات'] },
      { id: 'd3', title: 'قابلية الرفع السريع', analysis: 'قد توجد فئة قريبة يمكن رفعها بتدخل قصير.', claimType: 'hypothesis', evidenceRefs: ['metric:mean', 'metric:masteryPct'], confidence: 'متوسطة', implications: ['اختبار تشخيصي قصير'], alternativeExplanations: [], limitations: [], dataRequests: ['توزيع تفصيلي للفئات'] },
    ],
    findings: [
      { id: 'f1', title: 'اتساع فجوة الإتقان', statement: 'نسبة الإتقان منخفضة.', claimType: 'fact', evidenceRefs: ['metric:masteryPct'], confidence: 'مرتفعة', severity: 'high', educationalImpact: 'يحد من تحقق النتائج المتوقعة.', recommendedAction: 'بناء تدخل متدرج.', limitations: [] },
      { id: 'f2', title: 'تفاوت يحتاج تمايزًا', statement: 'التفاوت ملحوظ.', claimType: 'inference', evidenceRefs: ['metric:sd'], confidence: 'متوسطة', severity: 'medium', educationalImpact: 'قد يخفي المتوسط مجموعات مختلفة.', recommendedAction: 'تقسيم الطلبة حسب الحاجة.', limitations: [] },
      { id: 'f3', title: 'فرضية متطلبات سابقة', statement: 'قد ترتبط الفجوة بمتطلبات سابقة.', claimType: 'hypothesis', evidenceRefs: ['metric:mean'], confidence: 'منخفضة', severity: 'medium', educationalImpact: 'قد يحد النقص السابق من التعلم الجديد.', recommendedAction: 'اختبار تشخيصي للمتطلبات.', limitations: ['السبب غير مثبت'] },
      { id: 'f4', title: 'أولوية القياس', statement: 'يلزم خط أساس تفصيلي.', claimType: 'inference', evidenceRefs: ['metric:masteryPct'], confidence: 'متوسطة', severity: 'low', educationalImpact: 'يحسن دقة القرار.', recommendedAction: 'قياس قبلي قصير.', limitations: [] },
    ],
    qualityTools: [{ id: 'q1', name: 'فحص التشتت', reason: 'يكشف أثر تفاوت الدرجات على قرار التمايز.', interpretation: 'ارتفاع التشتت يستدعي تدخلات مختلفة الشدة بدل مسار واحد.', requiredData: [], evidenceRefs: ['metric:sd'] }],
    interventions: [
      {
        id: 'i1', priority: 'عالية', issue: 'الفجوة العميقة', targetGroup: 'مسودة يتجاهلها العميل', targetGroupIds: ['deep_gap'],
        action: 'تدخل متدرج مبني على تشخيص قصير.', implementationSteps: ['تشخيص', 'تجميع مرن', 'إعادة قياس'], responsibleRole: 'معلم المادة', timeframe: 'أسبوعان',
        successIndicator: 'مسودة يتجاهلها العميل', successMetric: { mode: 'segment_reduction', targetValue: 20, targetSegmentId: 'deep_gap' },
        numericGuard: { applied: true, mode: 'segment_reduction', totalCount: 100, segmentId: 'deep_gap', baselineSegmentCount: 38, reductionCount: 8, targetSegmentCount: 30, targetReductionRate: 21.1, adjusted: false, adjustmentReasons: [] },
        monitoringMethod: 'مقارنة قبلي وبعدي', contingency: 'تدخل فردي للحالات غير المتحسنة', resources: ['مهام قصيرة'], evidenceRefs: ['metric:masteryPct', 'metric:deepGapCount', 'metric:n']
      },
      {
        id: 'i2', priority: 'متوسطة', issue: 'فرصة رفع الإتقان', targetGroup: 'مسودة يتجاهلها العميل', targetGroupIds: ['near_mastery', 'moderate_gap'],
        action: 'تنويع مستوى المهام.', implementationSteps: ['تصنيف الفئات', 'مهام متدرجة'], responsibleRole: 'معلم المادة', timeframe: 'ثلاثة أسابيع',
        successIndicator: 'مسودة يتجاهلها العميل', successMetric: { mode: 'mastery_gain', targetValue: 55, targetSegmentId: '' },
        numericGuard: { applied: true, mode: 'mastery_gain', totalCount: 100, baselineCount: 42, baselineRate: 42, eligibleCount: 20, requestedTargetRate: 55, requiredGain: 13, feasibleGain: 13, targetCount: 55, targetRate: 55, adjusted: false, adjustmentReasons: [] },
        monitoringMethod: 'متابعة التوزيع', contingency: 'مراجعة صعوبة الأدوات', resources: [], evidenceRefs: ['metric:masteryPct', 'metric:nearMasteryCount', 'metric:moderateGapCount', 'metric:n']
      },
    ],
    monitoringPlan: [
      { id: 'm1', stage: 'خط الأساس', timing: 'الآن', measure: 'توثيق الإتقان والتفاوت', owner: 'معلم المادة', evidenceRefs: ['metric:masteryPct', 'metric:sd'] },
      { id: 'm2', stage: 'متابعة مرحلية', timing: 'بعد أسبوع', measure: 'مراجعة استجابة الفئات للتدخل', owner: 'فريق المادة', evidenceRefs: ['metric:masteryPct', 'metric:sd'] },
      { id: 'm3', stage: 'قياس الأثر', timing: 'بعد ثلاثة أسابيع', measure: 'مقارنة الإتقان والتفاوت بخط الأساس', owner: 'فريق المادة', evidenceRefs: ['metric:masteryPct', 'metric:sd'] },
    ],
    additionalCautions: ['لا يثبت الوصف سبب الفجوة'],
    missingDataRequests: ['نتائج المفردات'],
    suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
}

test('AI primary composition replaces local prose templates and accepts variable counts', () => {
  const window = loadBrowserScript('assets/analysis-reconciliation.js');
  const local = {
    ...localScoreEvidence(),
    diagnosticSections: [{ title: 'قالب محلي', analysis: 'نص محلي جامد' }],
    findings: [{ title: 'استنتاج محلي محفوظ' }],
    improvementPlan: [{ issue: 'خطة جاهزة', action: 'نفذ القالب' }],
    monitoringPlan: [],
  };
  const result = window.TaqareerReconciliation.composePrimary(local, primaryFixture(), {
    availableEvidenceRefs: scoreRefs,
  });
  assert.equal(result._reconciliation.aiPrimary, true);
  assert.equal(result.diagnosticSections.length, 3);
  assert.equal(result.findings.length, 4);
  assert.equal(result.improvementPlan.length, 2);
  assert.equal(result.monitoringPlan.length, 3);
  assert.equal(result.diagnosticSections[0].source, 'gemini-primary');
  assert.doesNotMatch(JSON.stringify(result), /قالب محلي|استنتاج محلي محفوظ|نفذ القالب/);
  assert.equal(result.metrics[1].value, 42);
});

test('client independently rejects an impossible score intervention target', () => {
  const window = loadBrowserScript('assets/analysis-reconciliation.js');
  const bad = primaryFixture();
  bad.interventions[1].numericGuard.targetCount = 80;
  bad.interventions[1].numericGuard.feasibleGain = 38;
  assert.throws(() => window.TaqareerReconciliation.composePrimary(localScoreEvidence(), bad, {
    availableEvidenceRefs: scoreRefs,
  }), /هدف إتقان غير متسق/);
});

test('AI primary composition rejects an analysis without enough evidence-backed reasoning', () => {
  const window = loadBrowserScript('assets/analysis-reconciliation.js');
  const bad = primaryFixture();
  bad.diagnosticSections = [{ ...bad.diagnosticSections[0], evidenceRefs: ['metric:not-allowed'] }];
  bad.findings = [{ ...bad.findings[0], evidenceRefs: ['metric:not-allowed'] }];
  assert.throws(() => window.TaqareerReconciliation.composePrimary(localScoreEvidence(), bad, {
    availableEvidenceRefs: scoreRefs,
  }), /وحدات قرار وتدخلين متمايزين وثلاث مراحل متابعة/);
});

test('client rejects a primary result with one intervention or fewer than three monitoring stages', () => {
  const window = loadBrowserScript('assets/analysis-reconciliation.js');
  const bad = primaryFixture();
  bad.interventions = bad.interventions.slice(0, 1);
  bad.monitoringPlan = bad.monitoringPlan.slice(0, 2);
  assert.throws(() => window.TaqareerReconciliation.composePrimary(localScoreEvidence(), bad, {
    availableEvidenceRefs: scoreRefs,
  }), /تدخلين متمايزين وثلاث مراحل متابعة/);
});

test('primary orchestrator sends evidence, not local interpretive prose', () => {
  const window = loadBrowserScript('assets/deep-analysis-orchestrator.js');
  const payload = window.TaqareerDeepOrchestrator.compactPayload({
    source: { name: 'fixture.csv' },
    recognizedType: { id: 'single_subject' },
    data: { headers: ['الدرجة'], sampleRows: [{ _evidenceRef: 'row:1', الدرجة: '60' }], rowCount: 1, sentRowCount: 1 },
    evidenceAnalysis: {
      metrics: [{ id: 'mean', label: 'المتوسط', value: 60, evidenceRef: 'metric:mean' }],
      charts: [],
      executiveSummary: 'قالب محلي يجب ألا يرسل',
      findings: [{ title: 'استنتاج محلي يجب ألا يرسل' }],
    },
    availableEvidenceRefs: ['row:1', 'metric:mean'],
  });
  const text = JSON.stringify(payload);
  assert.equal(payload.pipeline.mode, 'ai-primary-analysis-v1');
  assert.match(text, /metric:mean/);
  assert.doesNotMatch(text, /قالب محلي|استنتاج محلي/);
});

test('local evidence engine strips all interpretive prose from the AI-primary path', () => {
  const mastery = fs.readFileSync(path.join(root, 'assets/mastery-metrics.js'), 'utf8');
  const deep = fs.readFileSync(path.join(root, 'assets/deep-analysis.js'), 'utf8');
  const window = {};
  const context = vm.createContext({
    window,
    globalThis: window,
    structuredClone,
    console,
    Intl,
    Date,
    Math,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    RegExp,
    JSON,
  });
  vm.runInContext(mastery, context, { filename: 'assets/mastery-metrics.js' });
  vm.runInContext(deep, context, { filename: 'assets/deep-analysis.js' });
  const result = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'assessment_component',
    headers: ['اسم الطالب', 'الدرجة'],
    rows: [
      { 'اسم الطالب': 'طالب 1', 'الدرجة': 18 },
      { 'اسم الطالب': 'طالب 2', 'الدرجة': 15 },
      { 'اسم الطالب': 'طالب 3', 'الدرجة': 9 },
      { 'اسم الطالب': 'طالب 4', 'الدرجة': 6 },
    ],
    scoreColumn: 'الدرجة',
    maxScore: 20,
    thresholdPct: 75,
  });
  assert.equal(result._evidenceOnly, true);
  assert.ok(result.metrics.length > 0);
  assert.ok(result.charts.length > 0);
  assert.ok(Object.keys(result.evidenceMap).length > 0);
  assert.equal(result.diagnosticSections.length, 0);
  assert.equal(result.findings.length, 0);
  assert.equal(result.qualityTools.length, 0);
  assert.equal(result.improvementPlan.length, 0);
  assert.equal(result.monitoringPlan.length, 0);
  assert.equal(result.executiveTitle, '');
  assert.equal(result.executiveSummary, '');
});

test('frontend waits for primary AI analysis before showing results', () => {
  const source = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
  const runStart = source.indexOf('async function runAnalysis()');
  const runEnd = source.indexOf('function round(v)', runStart);
  const run = source.slice(runStart, runEnd);
  assert.ok(run.indexOf('await enrichAnalysisWithAi') < run.indexOf('renderResults()'));
  assert.match(run, /لم يعرض التطبيق قوالب محلية بديلة/);
  assert.doesNotMatch(run, /canonicalize\?\.\(state\.analysis\)/);
});

test('edge function exposes the analyze_primary operation and evidence-first contract', () => {
  const source = fs.readFileSync(path.join(root, 'supabase/functions/analyze-educational-form/index.ts'), 'utf8');
  assert.match(source, /operation === "analyze_primary"/);
  assert.match(source, /primaryAnalysisInstructions/);
  assert.match(source, /كل وحدة وتدخل وفحص ومرحلة متابعة تستخدم evidenceRefs/);
  assert.match(source, /contractVersion: "6\.5\.0"/);
  assert.match(source, /analysisUnits/);
  assert.match(source, /nonDuplicativeDecisionContract: true/);
  assert.match(source, /thinkingConfig: \{ thinkingLevel \}/);
  assert.match(source, /primaryRescueInstructions/);
});
