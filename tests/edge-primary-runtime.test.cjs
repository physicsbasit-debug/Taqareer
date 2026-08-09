const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const edgePath = path.join(root, 'supabase/functions/analyze-educational-form/index.ts');
const edgeSource = fs.readFileSync(edgePath, 'utf8');
function sourceStringConst(name) {
  const match = edgeSource.match(new RegExp(`const\\s+${name}\\s*=\\s*["']([^"']+)["']`));
  assert.ok(match, `missing ${name}`);
  return match[1];
}
function sourceNumericConst(name) {
  const match = edgeSource.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9_]+)`));
  assert.ok(match, `missing ${name}`);
  return Number(match[1].replace(/_/g, ''));
}
function sourceArrayConst(name) {
  const match = edgeSource.match(new RegExp(`const\\s+${name}\\s*=\\s*Object\\.freeze\\(\\[([^\\]]*)\\]\\)`));
  assert.ok(match, `missing ${name}`);
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map(item => item[1]);
}
function modelUrlPattern(model) {
  const escaped = String(model).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}:generateContent`);
}
const DEFAULT_ANALYSIS_MODEL = sourceStringConst('DEFAULT_ANALYSIS_MODEL');
const DEFAULT_FAST_MODEL = sourceStringConst('DEFAULT_FAST_MODEL');
const PRIMARY_REASONING_MODELS = sourceArrayConst('PRIMARY_REASONING_MODELS');
const PRIMARY_ACTION_MODELS = sourceArrayConst('PRIMARY_ACTION_MODELS');
const PRIMARY_RESCUE_MODELS = sourceArrayConst('PRIMARY_TRANSIENT_RESCUE_MODELS');
const PRIMARY_SERVER_DEADLINE = sourceNumericConst('PRIMARY_ANALYSIS_DEADLINE_MS');
const PRIMARY_INITIAL_DEADLINE = sourceNumericConst('PRIMARY_INITIAL_PHASE_DEADLINE_MS');
const PRIMARY_RESCUE_DEADLINE = sourceNumericConst('PRIMARY_TRANSIENT_RESCUE_PHASE_DEADLINE_MS');
const PRIMARY_REASONING_TIMEOUT = sourceNumericConst('PRIMARY_REASONING_ATTEMPT_TIMEOUT_MS');
const PRIMARY_ACTION_TIMEOUT = sourceNumericConst('PRIMARY_ACTION_ATTEMPT_TIMEOUT_MS');


function payload() {
  const groups = [
    { id: 'mastery', label: 'حققوا حد الإتقان', count: 48, percentage: 17.9 },
    { id: 'near_mastery', label: 'قريبون من الإتقان', count: 7, percentage: 2.6 },
    { id: 'moderate_gap', label: 'دون الإتقان بفجوة متوسطة', count: 28, percentage: 10.4 },
    { id: 'deep_gap', label: 'دون الإتقان بفجوة عميقة', count: 185, percentage: 69 },
  ];
  return {
    locale: 'ar-OM',
    recognizedType: { id: 'assessment_component', nameAr: 'درجات مكوّن تقويمي' },
    availableEvidenceRefs: [
      'metric:n', 'metric:masteryCount', 'metric:masteryPct', 'metric:deepGapCount', 'metric:nearMasteryCount', 'metric:moderateGapCount',
      'metric:sd', 'metric:cv', 'metric:skewness', 'metric:mean', 'metric:median',
    ],
    evidenceAnalysis: {
      metrics: [
        { id: 'n', value: 268 }, { id: 'masteryCount', value: 48 }, { id: 'masteryPct', value: 17.9 },
        { id: 'nearMasteryCount', value: 7 }, { id: 'moderateGapCount', value: 28 }, { id: 'deepGapCount', value: 185 },
      ],
      charts: [{ id: 'intervention-segments', data: groups }],
      interventionMathContext: { totalCount: 268, baselineMasteryCount: 48, baselineMasteryRate: 17.9, groups },
      evidenceCatalog: [],
    },
    data: { mode: 'table', rowCount: 268, sentRowCount: 24, sampleRows: [] },
  };
}

function unit(index, title, analysis, decision, refs, severity = 'high') {
  return {
    title,
    diagnosticAnalysis: analysis,
    decisionFinding: decision,
    claimType: index === 3 ? 'inference' : 'fact',
    evidenceRefs: refs,
    confidence: index === 3 ? 'متوسطة' : 'مرتفعة',
    severity,
    educationalImpact: `يؤثر المحور ${index} مباشرة في ترتيب الفئات وشدة الاستجابة التعليمية المطلوبة.`,
    recommendedAction: `اعتماد إجراء متمايز للمحور ${index} مع قياس قصير يختبر التحسن قبل التوسع.`,
    alternativeExplanations: index === 2 ? ['قد يتأثر التشتت باختلاف صعوبة الاختبار أو ظروف التطبيق.'] : [],
    limitations: ['لا تتوفر نتائج على مستوى مفردات الاختبار.'],
    dataRequests: ['تحليل مفردات أو اختبار تشخيصي لتحديد المهارات عند الحاجة.'],
  };
}

function intervention(priority, issue, targetGroup, refs, options = {}) {
  return {
    priority,
    issue,
    targetGroup,
    targetGroupIds: options.targetGroupIds || [],
    action: `تنفيذ مسار تعليمي مخصص لـ${targetGroup} يبدأ بقياس تشخيصي قصير ثم أنشطة متدرجة.` ,
    implementationSteps: ['تحديد خط الأساس', 'تنفيذ أنشطة متدرجة', 'إعادة قياس قصيرة'],
    responsibleRole: 'معلم المادة وفريقها',
    timeframe: 'ثلاثة أسابيع',
    successIndicator: 'مسودة نصية لا يعتمدها الخادم في ملفات الدرجات',
    successMetric: options.successMetric || { mode: 'custom', targetValue: 0, targetSegmentId: '' },
    monitoringMethod: 'قياس أسبوعي مختصر ومقارنة توزيع الفئات',
    contingency: 'تعديل شدة التدخل أو إحالة الحالات غير المستجيبة إلى دعم فردي',
    resources: ['مهام تشخيصية قصيرة'],
    evidenceRefs: refs,
  };
}

function monitoring() {
  return [
    { stage: 'خط الأساس', timing: 'قبل التنفيذ', measure: 'توثيق الإتقان والتشتت وحجم كل فئة مستهدفة', owner: 'معلم المادة', evidenceRefs: ['metric:masteryPct', 'metric:sd'] },
    { stage: 'متابعة مرحلية', timing: 'نهاية الأسبوع الثاني', measure: 'مقارنة انتقال الطلبة بين فئات التدخل ورصد الاستجابة', owner: 'فريق المادة', evidenceRefs: ['metric:nearMasteryCount', 'metric:deepGapCount'] },
    { stage: 'قياس الأثر', timing: 'نهاية الأسبوع الثالث', measure: 'إعادة حساب الإتقان والتشتت ومقارنتهما بخط الأساس', owner: 'معلم المادة وفريق التقويم', evidenceRefs: ['metric:masteryPct', 'metric:sd'] },
  ];
}

function primaryResult() {
  return {
    contractVersion: '6.6.0',
    analysisProfile: {
      method: 'تحليل علاقات الإتقان والتوزيع وفرص التدخل من الأدلة الرقمية.',
      dataAdequacy: 'كافية لاتخاذ قرار وصفي متمايز وغير كافية لتسمية مهارة بعينها.',
      dimensions: ['الإتقان', 'التفاوت', 'قابلية التدخل'],
      decisionUses: ['ترتيب الأولويات', 'تصميم تدخلات متمايزة', 'متابعة الأثر'],
    },
    executive: {
      title: 'فجوة واسعة مع فرصة تدخل متمايز',
      summary: 'تجمع البيانات بين انخفاض واضح في الإتقان وتشتت مرتفع، مع وجود فئة قريبة يمكن رفعها سريعًا وفئة فجوة عميقة تحتاج مسارًا مكثفًا. القرار الأنسب هو فصل التدخلات ومتابعة انتقال الفئات بدل تطبيق برنامج موحد.',
      overallJudgement: 'تدخل عاجل متمايز مع قياس مرحلي',
      confidence: 'مرتفعة',
      evidenceRefs: ['metric:masteryPct', 'metric:deepGapCount', 'metric:nearMasteryCount', 'metric:sd'],
      limitations: ['لا تحدد الدرجات الكلية المفاهيم أو المهارات المتسببة في الفجوة.'],
    },
    analysisUnits: [
      unit(1, 'مستوى الإتقان', 'تظهر نسبة الإتقان المنخفضة مع العدد الكبير في الفجوة العميقة أن المشكلة واسعة وليست حالات فردية متفرقة، لكن الدرجات الكلية لا تكشف المفهوم المتسبب فيها.', 'الأولوية الأولى هي خفض حجم الفجوة العميقة قبل توسيع الإثراء العام.', ['metric:masteryPct', 'metric:deepGapCount']),
      unit(2, 'التشتت وشكل التوزيع', 'ارتفاع الانحراف ومعامل الاختلاف مع تقارب المتوسط والوسيط يوضح أن الصف غير متجانس وأن المتوسط العام يخفي احتياجات مختلفة بين مجموعات الطلبة.', 'لا يصلح تدخل موحد للصف؛ يجب تقسيم الاستجابة حسب شدة الفجوة.', ['metric:sd', 'metric:cv', 'metric:mean', 'metric:median'], 'medium'),
      unit(3, 'فرصة الرفع السريع', 'وجود فئة قريبة من حد الإتقان يوفر فرصة لتحسن سريع بتدخل قصير، بالتوازي مع مسار أطول للفجوة العميقة حتى لا تستهلك مجموعة واحدة جميع الموارد.', 'اعتماد مسارين متزامنين يحقق أثرًا سريعًا دون إهمال الحالات الأعمق.', ['metric:nearMasteryCount', 'metric:deepGapCount'], 'medium'),
    ],
    interventions: [
      intervention('عاجلة جدًا', 'الفجوة العميقة', 'الطلبة في الفجوة العميقة', ['metric:deepGapCount', 'metric:masteryPct'], {
        targetGroupIds: ['deep_gap'],
        successMetric: { mode: 'segment_reduction', targetValue: 20, targetSegmentId: 'deep_gap' },
      }),
      intervention('عالية', 'الاقتراب من الإتقان', 'الطلبة القريبون وذوو الفجوة المتوسطة', ['metric:nearMasteryCount', 'metric:moderateGapCount', 'metric:masteryPct'], {
        targetGroupIds: ['near_mastery', 'moderate_gap'],
        successMetric: { mode: 'mastery_gain', targetValue: 25, targetSegmentId: '' },
      }),
    ],
    methodChecks: [
      { name: 'فحص التشتت النسبي', reason: 'يحدد ما إذا كان المتوسط يمثل الصف أو يخفي مجموعات مختلفة.', interpretation: 'ارتفاع التشتت يدعم تقسيم التدخل بدل تعميم إجراء واحد.', requiredData: [], evidenceRefs: ['metric:sd', 'metric:cv'] },
    ],
    monitoringPlan: monitoring(),
    additionalCautions: ['لا يجوز تفسير الدرجات الكلية بوصفها دليلًا على مهارة محددة.'],
    missingDataRequests: ['تحليل مفردات الاختبار لتحديد مواضع الضعف بدقة.'],
    suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
}

function rescueResult() {
  const result = primaryResult();
  result.analysisUnits = result.analysisUnits.slice(0, 2);
  result.interventions = result.interventions.slice(0, 2);
  result.methodChecks = [];
  result.executive.summary = 'تؤكد الأدلة انخفاض الإتقان مع تفاوت مرتفع، لذا يلزم فصل التدخل المكثف للفجوة العميقة عن الدعم القصير للفئة القريبة، ثم قياس انتقال الفئات عبر ثلاث محطات متابعة.';
  return result;
}


function reasoningResult(full = primaryResult()) {
  return {
    contractVersion: full.contractVersion,
    analysisProfile: full.analysisProfile,
    executive: full.executive,
    analysisUnits: full.analysisUnits,
    methodChecks: full.methodChecks,
    additionalCautions: full.additionalCautions,
    missingDataRequests: full.missingDataRequests,
    suggestedNewType: full.suggestedNewType,
  };
}

function actionResult(full = primaryResult()) {
  return {
    interventions: full.interventions,
    monitoringPlan: full.monitoringPlan,
  };
}

function geminiRaw(result, finishReason = 'STOP') {
  return {
    modelVersion: 'gemini-test',
    candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] }, finishReason }],
    usageMetadata: { thoughtsTokenCount: 120, candidatesTokenCount: 980 },
  };
}

async function createRuntime(responses, env = {}) {
  const source = fs.readFileSync(edgePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    fileName: edgePath,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));

  let handler = null;
  let calls = 0;
  let nowMs = 0;
  let nextTimerId = 1;
  const timers = new Map();
  const urls = [];
  const requestBodies = [];
  const advance = ms => {
    nowMs += Math.max(0, Number(ms) || 0);
    const due = [...timers.entries()].filter(([, item]) => item.due <= nowMs);
    for (const [id, item] of due) {
      timers.delete(id);
      item.fn();
    }
  };
  const context = vm.createContext({
    console,
    Request,
    Response,
    Headers,
    AbortController,
    TextEncoder,
    TextDecoder,
    URL,
    performance: { now: () => nowMs },
    crypto: globalThis.crypto,
    structuredClone,
    setTimeout: (fn, ms) => {
      const delay = Number(ms) || 0;
      if (delay < 5_000) { fn(); return 0; }
      const id = nextTimerId++;
      timers.set(id, { due: nowMs + delay, fn });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, options = {}) => {
      urls.push(String(url));
      requestBodies.push(String(options.body || ""));
      const callIndex = calls;
      const item = typeof responses === 'function'
        ? responses({ url: String(url), options, callIndex })
        : responses[Math.min(callIndex, responses.length - 1)];
      calls += 1;
      if (item && typeof item === 'object' && item.__advanceMs) {
        advance(item.__advanceMs);
        if (options.signal && options.signal.aborted) {
          const error = new Error('Aborted after simulated latency');
          error.name = 'AbortError';
          throw error;
        }
      }
      if (item && typeof item === 'object' && item.__abort) {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
      }
      if (item && typeof item === 'object' && item.__bodyAbort) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json', 'x-request-id': `req-${calls}` }),
          text: async () => { const error = new Error('Aborted while reading body'); error.name = 'AbortError'; throw error; },
        };
      }
      const status = item && typeof item === 'object' && Number.isInteger(item.__status) ? item.__status : 200;
      const raw = item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, '__body') ? item.__body : item;
      return new Response(JSON.stringify(raw), { status, headers: { 'content-type': 'application/json', 'x-request-id': `req-${calls}` } });
    },
    Deno: {
      env: { get: key => key === 'GEMINI_API_KEY' ? 'test-key' : String(env[key] || '') },
      serve: fn => { handler = fn; },
    },
  });
  vm.runInContext(transpiled.outputText, context, { filename: 'edge-runtime.js' });
  assert.equal(typeof handler, 'function');
  return { handler, getCalls: () => calls, getUrls: () => urls.slice(), getRequestBodies: () => requestBodies.slice() };
}

function httpError(status, message) {
  return { __status: status, __body: { error: { message } } };
}

async function invoke(runtime, customPayload = payload()) {
  const request = new Request('https://edge.test/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://example.test' },
    body: JSON.stringify({ operation: 'analyze_primary', payload: customPayload }),
  });
  const response = await runtime.handler(request);
  return { status: response.status, body: await response.json() };
}

test('edge primary runtime composes reasoning and action segments in parallel', async () => {
  const full = primaryResult();
  const runtime = await createRuntime([
    geminiRaw(reasoningResult(full)),
    geminiRaw(actionResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 2);
  assert.equal(body.result.contractVersion, '6.6.0');
  assert.equal(body.result.diagnosticSections.length, 3);
  assert.equal(body.result.findings.length, 3);
  assert.equal(body.result.interventions.length, 2);
  assert.equal(body.result.monitoringPlan.length, 3);
  assert.equal(body.result.qualityTools.length, 1);
  assert.notEqual(body.result.diagnosticSections[0].analysis, body.result.findings[0].statement);
  assert.equal(body.serverTiming.segmentedPrimary, true);
  assert.equal(body.serverTiming.parallelSegments, true);
  assert.equal(body.serverTiming.rescueUsed, false);
  assert.equal(body.serverTiming.serverDeadlineMs, PRIMARY_SERVER_DEADLINE);
  assert.equal(body.serverTiming.reasoningAttemptTimeoutMs, PRIMARY_REASONING_TIMEOUT);
  assert.equal(body.serverTiming.actionAttemptTimeoutMs, PRIMARY_ACTION_TIMEOUT);
  assert.equal(body.serverTiming.distinctTargetGroups, 2);
  assert.equal(body.result.interventions[1].numericGuard.applied, true);
  assert.equal(body.result.interventions[1].numericGuard.mode, 'mastery_gain');
  assert.equal(body.result.interventions[1].numericGuard.eligibleCount, 35);
  assert.equal(body.result.interventions[1].numericGuard.targetCount, 67);
  assert.equal(body.result.interventions[1].numericGuard.feasibleGain, 19);
  assert.match(body.result.interventions[1].successIndicator, /من 48 إلى 67/);
  const requestBodies = runtime.getRequestBodies().map(JSON.parse);
  assert.ok(requestBodies[0].generationConfig.responseJsonSchema.properties.executive);
  assert.equal(requestBodies[0].generationConfig.responseJsonSchema.properties.interventions, undefined);
  assert.ok(requestBodies[1].generationConfig.responseJsonSchema.properties.interventions);
  assert.equal(requestBodies[1].generationConfig.responseJsonSchema.properties.executive, undefined);
});

test('edge numeric guard clamps an impossible mastery target after segmented composition', async () => {
  const full = primaryResult();
  full.interventions[1].targetGroupIds = ['mastery', 'near_mastery'];
  full.interventions[1].successMetric = { mode: 'mastery_gain', targetValue: 25, targetSegmentId: '' };
  const runtime = await createRuntime([
    geminiRaw(reasoningResult(full)),
    geminiRaw(actionResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const guarded = body.result.interventions[1];
  assert.deepEqual(guarded.targetGroupIds, ['near_mastery']);
  assert.equal(guarded.numericGuard.eligibleCount, 7);
  assert.equal(guarded.numericGuard.requiredGain, 19);
  assert.equal(guarded.numericGuard.feasibleGain, 7);
  assert.equal(guarded.numericGuard.targetCount, 55);
  assert.equal(guarded.numericGuard.targetRate, 20.5);
  assert.equal(guarded.numericGuard.adjusted, true);
  assert.match(guarded.successIndicator, /من 48 إلى 55/);
  assert.doesNotMatch(guarded.successIndicator, /25%/);
});

test('student-work primary analysis does not fail merely because no extra method check is needed', async () => {
  const full = primaryResult();
  full.methodChecks = [];
  full.interventions = full.interventions.map((item, index) => ({
    ...item,
    targetGroup: index === 0 ? 'البنود ذات الأولوية الأعلى' : 'البنود المتوسطة التي تحتاج متابعة',
    targetGroupIds: [],
    successIndicator: index === 0 ? 'تحسن المؤشرات ذات الأولوية في إعادة القياس' : 'ثبات التحسن في العينة اللاحقة',
    successMetric: { mode: 'custom', targetValue: 0, targetSegmentId: '' },
  }));
  const studentWorkPayload = {
    ...payload(),
    recognizedType: { id: 'student_work', nameAr: 'ملخص فحص أعمال الطلبة' },
  };
  const runtime = await createRuntime([
    geminiRaw(reasoningResult(full)),
    geminiRaw(actionResult(full)),
  ]);
  const { status, body } = await invoke(runtime, studentWorkPayload);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.result.qualityTools.length, 0);
  assert.equal(body.result.interventions.length, 2);
  assert.equal(body.result.monitoringPlan.length, 3);
});

test('edge preserves cross-subject analysis when score segmentation math is not applicable', async () => {
  const full = primaryResult();
  full.interventions = full.interventions.map((item, index) => ({
    ...item,
    targetGroup: index === 0 ? 'طلبة المادة الأضعف' : 'الطلبة المتعثرون في أكثر من مادة',
    targetGroupIds: [],
    successIndicator: index === 0 ? 'تحسن متوسط المادة في القياس اللاحق' : 'تحسن مادتين على الأقل لكل حالة',
    successMetric: { mode: 'custom', targetValue: 0, targetSegmentId: '' },
  }));
  const crossPayload = {
    ...payload(),
    recognizedType: { id: 'cross_subject', nameAr: 'مقارنة مواد متعددة' },
    evidenceAnalysis: { metrics: [], charts: [], evidenceCatalog: [] },
  };
  const runtime = await createRuntime([
    geminiRaw(reasoningResult(full)),
    geminiRaw(actionResult(full)),
  ]);
  const { status, body } = await invoke(runtime, crossPayload);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.result.interventions.length, 2);
  assert.equal(body.result.interventions[0].numericGuard, undefined);
});

test('edge repairs only a malformed reasoning segment while keeping a valid action segment', async () => {
  const full = primaryResult();
  const runtime = await createRuntime([
    geminiRaw({}, 'MAX_TOKENS'),
    geminiRaw(actionResult(full), 'STOP'),
    geminiRaw(reasoningResult(full), 'STOP'),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 3);
  assert.equal(body.serverTiming.rescueUsed, true);
  assert.ok(body.serverTiming.repairedSegments.includes('reasoning'));
  assert.equal(body.result.diagnosticSections.length, 3);
  assert.equal(body.result.interventions.length, 2);
  assert.equal(body.result.monitoringPlan.length, 3);
});

test('edge repairs a validation-rejected reasoning segment with the exact full-contract reason', async () => {
  const full = primaryResult();
  const incompleteReasoning = reasoningResult(full);
  incompleteReasoning.analysisUnits = incompleteReasoning.analysisUnits.slice(0, 2);
  incompleteReasoning.methodChecks = [];
  const repairedReasoning = reasoningResult(full);
  const runtime = await createRuntime([
    geminiRaw(incompleteReasoning, 'STOP'),
    geminiRaw(actionResult(full), 'STOP'),
    geminiRaw(repairedReasoning, 'STOP'),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.serverTiming.rescueUsed, true);
  assert.equal(body.serverTiming.repairContextUsed, true);
  assert.match(body.serverTiming.firstValidationError, /عمق القرار المتوازن/);
  assert.ok(body.serverTiming.repairedSegments.includes('reasoning'));
  const bodies = runtime.getRequestBodies().map(JSON.parse);
  const repairPayload = JSON.parse(bodies[2].contents[0].parts[0].text);
  assert.equal(repairPayload.segmentRepairContext.mode, 'segment_contract_repair');
  assert.equal(repairPayload.segmentRepairContext.segment, 'reasoning');
  assert.match(repairPayload.segmentRepairContext.rejectionReason, /عمق القرار المتوازن/);
  assert.equal(repairPayload.segmentRepairContext.previousCandidate.analysisUnits.length, 2);
});

test('edge reasoning segment fails over without restarting the successful action segment', async () => {
  const busy = httpError(503, 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.');
  const full = primaryResult();
  const runtime = await createRuntime([
    busy,
    geminiRaw(actionResult(full)),
    geminiRaw(reasoningResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 3);
  const urls = runtime.getUrls();
  assert.match(urls[0], modelUrlPattern(DEFAULT_ANALYSIS_MODEL));
  assert.match(urls[1], modelUrlPattern(DEFAULT_FAST_MODEL));
  assert.match(urls[2], modelUrlPattern(PRIMARY_REASONING_MODELS.find(model => model !== DEFAULT_ANALYSIS_MODEL) || PRIMARY_REASONING_MODELS[0]));
  assert.equal(body.serverTiming.parallelSegments, true);
});

test('edge transient rescue reruns only reasoning after its normal model chain is exhausted', async () => {
  const busy = httpError(503, 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.');
  const full = primaryResult();
  const runtime = await createRuntime([
    busy,
    geminiRaw(actionResult(full)),
    busy,
    geminiRaw(reasoningResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 4);
  assert.equal(body.serverTiming.transientRescueUsed, true);
  assert.deepEqual(body.serverTiming.transientRescuedSegments, ['reasoning']);
  assert.equal(body.serverTiming.rescueUsed, true);
  assert.equal(body.serverTiming.transientInitialAttemptedModels, 2);
  assert.equal(body.serverTiming.attemptedModels, 4);
  assert.match(body.serverTiming.fallbackReason, /segment_transient_rescue/);
  const requestBodies = runtime.getRequestBodies().map(JSON.parse);
  const reasoningRequests = requestBodies.filter(item => item.generationConfig.responseJsonSchema.properties.executive);
  const actionRequests = requestBodies.filter(item => item.generationConfig.responseJsonSchema.properties.interventions);
  assert.equal(reasoningRequests.length, 3);
  assert.equal(actionRequests.length, 1);
  const urls = runtime.getUrls();
  assert.match(urls[0], modelUrlPattern(DEFAULT_ANALYSIS_MODEL));
  assert.match(urls[1], modelUrlPattern(DEFAULT_FAST_MODEL));
  assert.match(urls[2], modelUrlPattern(PRIMARY_REASONING_MODELS.find(model => model !== DEFAULT_ANALYSIS_MODEL) || PRIMARY_REASONING_MODELS[0]));
  assert.match(urls[3], modelUrlPattern(PRIMARY_RESCUE_MODELS[0]));
});

test('edge transient rescue reruns only action after its normal model chain is exhausted', async () => {
  const busy = httpError(503, 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.');
  const full = primaryResult();
  const runtime = await createRuntime([
    geminiRaw(reasoningResult(full)),
    busy,
    busy,
    busy,
    geminiRaw(actionResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 5);
  assert.equal(body.serverTiming.transientRescueUsed, true);
  assert.deepEqual(body.serverTiming.transientRescuedSegments, ['action']);
  assert.equal(body.serverTiming.transientInitialAttemptedModels, 3);
  assert.equal(body.serverTiming.attemptedModels, 5);
  const requestBodies = runtime.getRequestBodies().map(JSON.parse);
  const reasoningRequests = requestBodies.filter(item => item.generationConfig.responseJsonSchema.properties.executive);
  const actionRequests = requestBodies.filter(item => item.generationConfig.responseJsonSchema.properties.interventions);
  assert.equal(reasoningRequests.length, 1);
  assert.equal(actionRequests.length, 4);
});

test('edge treats a reasoning timeout as transient and fails over while action remains independent', async () => {
  const full = primaryResult();
  const runtime = await createRuntime([
    { __abort: true },
    geminiRaw(actionResult(full)),
    geminiRaw(reasoningResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 3);
  assert.match(runtime.getUrls()[2], modelUrlPattern(PRIMARY_REASONING_MODELS.find(model => model !== DEFAULT_ANALYSIS_MODEL) || PRIMARY_REASONING_MODELS[0]));
});

test('edge treats an aborted reasoning response body as transient and fails over', async () => {
  const full = primaryResult();
  const runtime = await createRuntime([
    { __bodyAbort: true },
    geminiRaw(actionResult(full)),
    geminiRaw(reasoningResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 3);
});

test('configured future model families are honored without a hard-coded Gemini generation guard', async () => {
  const full = primaryResult();
  const futureReasoning = 'gemini-future-reasoning';
  const futureAction = 'gemini-future-action';
  const runtime = await createRuntime(({ url }) => {
    if (modelUrlPattern(futureReasoning).test(url)) return geminiRaw(reasoningResult(full));
    if (modelUrlPattern(futureAction).test(url)) return geminiRaw(actionResult(full));
    throw new Error(`Unexpected model URL while honoring configured future models: ${url}`);
  }, {
    GEMINI_ANALYSIS_MODEL: futureReasoning,
    GEMINI_REASONING_FALLBACK_MODELS: futureReasoning,
    GEMINI_FAST_MODEL: futureAction,
    GEMINI_ACTION_FALLBACK_MODELS: futureAction,
  });
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(runtime.getCalls(), 2);
  assert.ok(runtime.getUrls().some(url => modelUrlPattern(futureReasoning).test(url)));
  assert.ok(runtime.getUrls().some(url => modelUrlPattern(futureAction).test(url)));
});

test('edge stops model fan-out immediately when a primary segment hits provider rate limit', async () => {
  const full = primaryResult();
  const rateLimited = httpError(429, 'RESOURCE_EXHAUSTED: rate limit exceeded for this project');
  const runtime = await createRuntime([
    rateLimited,
    geminiRaw(actionResult(full)),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 429);
  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'GEMINI_RATE_LIMIT');
  assert.equal(body.retryable, true);
  assert.equal(body.diagnostic.providerKind, 'rate_limit');
  assert.deepEqual(body.diagnostic.attemptedModels, [DEFAULT_ANALYSIS_MODEL]);
  assert.equal(runtime.getCalls(), 2, 'the successful parallel action call may finish, but reasoning must not fan out to fallback/rescue models');
});

test('edge returns a retryable Arabic transient error when every segment model is unavailable', async () => {
  const busy = httpError(503, 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.');
  const runtime = await createRuntime([busy, busy, busy, busy, busy]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'GEMINI_TRANSIENT');
  assert.equal(body.retryable, true);
  assert.match(body.error, /مزدحمة مؤقتًا/);
  assert.doesNotMatch(body.error, /high demand|Spikes in demand|try again later/i);
});

function multiVisitPayload() {
  return {
    locale: 'ar-OM',
    recognizedType: { id: 'supervision_multi_visit', nameAr: 'زيارات إشرافية متعددة' },
    availableEvidenceRefs: ['metric:visitCount', 'metric:ratingCount', 'metric:excellentPct', 'metric:excellentGoodPct', 'metric:supportRatingPct', 'metric:numericNarrativeMismatchCount'],
    source: { meta: { metadata: { school: 'الباسط للبنين الصفوف (8-10)', grade: '8-10' } } },
    data: {
      structure: 'multi-visit-supervision',
      visits: Array.from({ length: 7 }, (_, index) => ({ visitId: `زيارة ${index + 1}`, subject: ['الفيزياء', 'الكيمياء', 'العلوم', 'الأحياء'][index % 4], grade: ['الثامن', 'التاسع', 'العاشر'][index % 3] })),
      visitCount: 7,
      ratingCount: 91,
    },
    evidenceAnalysis: {
      metrics: [
        { id: 'visitCount', value: 7 }, { id: 'ratingCount', value: 91 }, { id: 'excellentPct', value: 63.7 },
        { id: 'excellentGoodPct', value: 97.8 }, { id: 'supportRatingPct', value: 2.2 }, { id: 'numericNarrativeMismatchCount', value: 2 },
      ],
      charts: [],
      evidenceCatalog: [],
      scopeContext: {
        scopeType: 'sampled-multi-visit', sampleOnly: true, visitCount: 7,
        school: 'الباسط للبنين الصفوف (8-10)', gradeRange: '8-10',
        subjects: ['الفيزياء', 'الكيمياء', 'العلوم', 'الأحياء'],
        departmentLabel: 'قسم العلوم',
        populationLabel: 'معلمو قسم العلوم المشمولون بالزيارات',
        forbiddenBroaderPopulations: ['الهيئة التدريسية', 'جميع معلمي المدرسة', 'معلمو المدرسة'],
      },
    },
  };
}

function multiVisitPrimaryResult() {
  const result = primaryResult();
  const refs = ['metric:visitCount', 'metric:ratingCount', 'metric:excellentPct', 'metric:excellentGoodPct', 'metric:supportRatingPct', 'metric:numericNarrativeMismatchCount'];
  result.executive.evidenceRefs = refs.slice(0, 4);
  result.analysisUnits = result.analysisUnits.map((item, index) => ({ ...item, evidenceRefs: [refs[index], refs[index + 2]] }));
  result.interventions = [
    {
      ...intervention('عالية', 'اتساق التقدير والدليل', 'ملحق ومجموعة مادة العلوم للصف الثامن', [refs[0], refs[5]]),
      targetGroupIds: [], successIndicator: 'مراجعة 100% من الحالات غير المتسقة', successMetric: { mode: 'custom', targetValue: 0, targetSegmentId: '' },
    },
    {
      ...intervention('متوسطة', 'تطبيق السياسات والنمو المهني', 'الهيئة التدريسية بمدرسة الباسط', [refs[2], refs[4]]),
      targetGroupIds: [], successIndicator: 'تحسن المؤشر في الزيارة اللاحقة', successMetric: { mode: 'custom', targetValue: 0, targetSegmentId: '' },
    },
  ];
  result.methodChecks = [{ name: 'فحص الاتساق', reason: 'يربط التقدير بالدليل داخل الزيارة.', interpretation: 'تراجع الحالات غير المتسقة قبل الاعتماد.', requiredData: [], evidenceRefs: [refs[5]] }];
  result.monitoringPlan = [
    { stage: 'خط الأساس', timing: 'الأسبوع القادم', measure: 'توثيق الحالات والمؤشرات', owner: 'المعلم الأول', evidenceRefs: [refs[0]] },
    { stage: 'متابعة مرحلية', timing: 'منتصف الفصل', measure: 'مراجعة عينة الزيارات', owner: 'الإدارة المدرسية', evidenceRefs: [refs[4]] },
    { stage: 'قياس الأثر', timing: 'نهاية الفصل', measure: 'إعادة حساب المؤشرات', owner: 'المشرف التربوي', evidenceRefs: [refs[2]] },
  ];
  return result;
}


test('edge scope guard narrows a school-wide intervention to the observed science visits sample', async () => {
  const full = multiVisitPrimaryResult();
  const runtime = await createRuntime([geminiRaw(reasoningResult(full)), geminiRaw(actionResult(full))]);
  const { status, body } = await invoke(runtime, multiVisitPayload());
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.result.interventions.length, 2);
  assert.equal(body.result.interventions[0].scopeGuard.adjusted, false);
  assert.equal(body.result.interventions[0].targetGroup, 'ملحق ومجموعة مادة العلوم للصف الثامن');
  assert.equal(body.result.interventions[1].scopeGuard.adjusted, true);
  assert.equal(body.result.interventions[1].targetGroup, 'معلمو قسم العلوم المشمولون بالزيارات');
  assert.match(body.result.interventions[1].scopeGuard.reason, /ضُيّق نطاق التدخل/);
  assert.equal(body.result.validation.scopeGuardedInterventions, 2);
  assert.equal(body.result.validation.adjustedScopeTargets, 1);
  assert.equal(body.serverTiming.adjustedScopeTargets, 1);
});

test('edge reserves enough wall-clock budget for transient action rescue after slow initial models', async () => {
  const full = primaryResult();
  const busy = (message, ms) => ({ __status: 503, __advanceMs: ms, __body: { error: { message } } });
  let fastLiteCalls = 0;
  const runtime = await createRuntime(({ url }) => {
    if (modelUrlPattern(DEFAULT_ANALYSIS_MODEL).test(url)) {
      // reasoning succeeds on its first 3.6 request; action later reaches the same model and receives a slow transient failure.
      const reasoningAlreadySent = fastLiteCalls > 0;
      return reasoningAlreadySent ? busy('slow busy action model two', 12_000) : geminiRaw(reasoningResult(full));
    }
    if (modelUrlPattern(DEFAULT_FAST_MODEL).test(url)) {
      fastLiteCalls += 1;
      return busy('slow busy action model one', 12_000);
    }
    if (modelUrlPattern(PRIMARY_RESCUE_MODELS[0]).test(url)) {
      return { __advanceMs: 7_800, __body: geminiRaw(actionResult(full)) };
    }
    if (modelUrlPattern(PRIMARY_REASONING_MODELS.find(model => model !== DEFAULT_ANALYSIS_MODEL) || PRIMARY_REASONING_MODELS[0]).test(url)) {
      return busy('slow busy action model three', 12_900);
    }
    throw new Error(`Unexpected model URL: ${url}`);
  });
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.serverTiming.transientRescueUsed, true);
  assert.deepEqual(body.serverTiming.transientRescuedSegments, ['action']);
  assert.equal(body.serverTiming.initialPhaseDeadlineMs, PRIMARY_INITIAL_DEADLINE);
  assert.equal(body.serverTiming.transientRescuePhaseDeadlineMs, PRIMARY_RESCUE_DEADLINE);
  assert.equal(body.serverTiming.reservedPostRescueMs, PRIMARY_SERVER_DEADLINE - PRIMARY_RESCUE_DEADLINE);
});
