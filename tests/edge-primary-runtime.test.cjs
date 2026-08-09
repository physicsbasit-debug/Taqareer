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
function modelUrlPattern(model) {
  const escaped = String(model).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}:generateContent`);
}

const EDGE_VERSION = sourceStringConst('EDGE_VERSION');
const DEFAULT_ANALYSIS_MODEL = sourceStringConst('DEFAULT_ANALYSIS_MODEL');
const DEFAULT_FAST_MODEL = sourceStringConst('DEFAULT_FAST_MODEL');
const DECISION_DEADLINE = sourceNumericConst('PRIMARY_DECISION_DEADLINE_MS');
const DECISION_TIMEOUT = sourceNumericConst('PRIMARY_DECISION_ATTEMPT_TIMEOUT_MS');
const FALLBACK_TIMEOUT = sourceNumericConst('PRIMARY_DECISION_FALLBACK_TIMEOUT_MS');
const MAX_MODELS = sourceNumericConst('PRIMARY_DECISION_MAX_MODELS');

function payload() {
  const groups = [
    { id: 'mastery', label: 'حققوا حد الإتقان', count: 48, percentage: 17.9 },
    { id: 'near_mastery', label: 'قريبون من الإتقان', count: 7, percentage: 2.6 },
    { id: 'moderate_gap', label: 'دون الإتقان بفجوة متوسطة', count: 28, percentage: 10.4 },
    { id: 'deep_gap', label: 'دون الإتقان بفجوة عميقة', count: 185, percentage: 69 },
  ];
  return {
    locale: 'ar-OM',
    source: { meta: { metadata: { school: 'مدرسة اختبار', grade: 'الثامن' } } },
    recognizedType: { id: 'assessment_component', nameAr: 'درجات مكوّن تقويمي' },
    availableEvidenceRefs: [
      'metric:n', 'metric:masteryCount', 'metric:masteryPct', 'metric:deepGapCount', 'metric:nearMasteryCount', 'metric:moderateGapCount',
      'metric:sd', 'metric:cv', 'metric:skewness', 'metric:mean', 'metric:median', 'row:1',
    ],
    evidenceAnalysis: {
      metrics: [
        { id: 'n', value: 268 }, { id: 'masteryCount', value: 48 }, { id: 'masteryPct', value: 17.9 },
        { id: 'nearMasteryCount', value: 7 }, { id: 'moderateGapCount', value: 28 }, { id: 'deepGapCount', value: 185 },
        { id: 'sd', value: 18 }, { id: 'cv', value: 28 }, { id: 'mean', value: 61 }, { id: 'median', value: 62 },
      ],
      charts: [{ id: 'intervention-segments', data: groups }],
      interventionMathContext: { totalCount: 268, baselineMasteryCount: 48, baselineMasteryRate: 17.9, groups },
      evidenceCatalog: [],
    },
    data: { mode: 'table', headers: ['الاسم', 'الدرجة'], rowCount: 268, sentRowCount: 24, sampleRows: [{ _evidenceRef: 'row:1', الاسم: 'محجوب', الدرجة: 75 }] },
  };
}

function unit(index, title, refs, severity = 'high') {
  return {
    title,
    diagnosticAnalysis: `تربط القراءة ${index} بين المؤشرات الموثقة وتوزيع الأداء بما يوضح أولوية مختلفة قابلة للمتابعة دون ادعاء سبب غير مثبت.`,
    decisionFinding: `الأولوية ${index} تتطلب استجابة تعليمية متمايزة مرتبطة بالمؤشرات الحالية.`,
    claimType: index === 3 ? 'inference' : 'fact',
    evidenceRefs: refs,
    confidence: index === 3 ? 'متوسطة' : 'مرتفعة',
    severity,
    educationalImpact: `يؤثر المحور ${index} في ترتيب شدة الدعم المطلوبة للفئات الحالية.`,
    recommendedAction: `تنفيذ إجراء متدرج للمحور ${index} يبدأ بقياس قصير ثم دعم مناسب وإعادة قياس.`,
    alternativeExplanations: [],
    limitations: ['لا تتوفر نتائج على مستوى مفردات الاختبار.'],
    dataRequests: ['تحليل مفردات أو اختبار تشخيصي عند الحاجة.'],
  };
}

function decisionResult() {
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
      summary: 'تجمع الأدلة بين انخفاض واضح في الإتقان وتفاوت يحتاج استجابة متدرجة، مع الحفاظ على الحدود التفسيرية للدرجات الكلية وعدم تسمية مهارات غير مثبتة.',
      overallJudgement: 'تدخل متمايز مع قياس مرحلي',
      confidence: 'مرتفعة',
      evidenceRefs: ['metric:masteryPct', 'metric:deepGapCount', 'metric:sd'],
      limitations: ['لا تحدد الدرجات الكلية المفاهيم المتسببة في الفجوة.'],
    },
    analysisUnits: [
      unit(1, 'مستوى الإتقان', ['metric:masteryPct', 'metric:deepGapCount']),
      unit(2, 'التفاوت', ['metric:sd', 'metric:cv', 'metric:mean', 'metric:median'], 'medium'),
      unit(3, 'فرصة الرفع', ['metric:nearMasteryCount', 'metric:moderateGapCount'], 'medium'),
    ],
    methodChecks: [{ name: 'فحص التشتت', reason: 'يفحص تمثيل المتوسط للفئات.', interpretation: 'التفاوت يدعم التمايز في الاستجابة.', requiredData: [], evidenceRefs: ['metric:sd', 'metric:cv'] }],
    additionalCautions: ['لا تحول الارتباط إلى سبب.'],
    missingDataRequests: ['تحليل مفردات الاختبار لتحديد المهارات.'],
    suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
}

function geminiRaw(result, finishReason = 'STOP', modelVersion = 'gemini-test') {
  return {
    modelVersion,
    candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] }, finishReason }],
    usageMetadata: { thoughtsTokenCount: 80, candidatesTokenCount: 700 },
  };
}
function httpError(status, message, headers = {}) {
  return { __status: status, __headers: headers, __body: { error: { message } } };
}

async function createRuntime(responses, env = {}) {
  const transpiled = ts.transpileModule(edgeSource, {
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
    for (const [id, item] of due) { timers.delete(id); item.fn(); }
  };
  const context = vm.createContext({
    console, Request, Response, Headers, AbortController, TextEncoder, TextDecoder, URL,
    performance: { now: () => nowMs }, crypto: globalThis.crypto, structuredClone,
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
      requestBodies.push(String(options.body || ''));
      const callIndex = calls;
      const item = typeof responses === 'function'
        ? responses({ url: String(url), options, callIndex })
        : responses[Math.min(callIndex, responses.length - 1)];
      calls += 1;
      if (item && typeof item === 'object' && item.__advanceMs) {
        advance(item.__advanceMs);
        if (options.signal && options.signal.aborted) {
          const error = new Error('Aborted after simulated latency'); error.name = 'AbortError'; throw error;
        }
      }
      if (item && typeof item === 'object' && item.__abort) {
        const error = new Error('Aborted'); error.name = 'AbortError'; throw error;
      }
      const status = item && typeof item === 'object' && Number.isInteger(item.__status) ? item.__status : 200;
      const raw = item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, '__body') ? item.__body : item;
      const headers = { 'content-type': 'application/json', 'x-request-id': `req-${calls}`, ...(item?.__headers || {}) };
      return new Response(JSON.stringify(raw), { status, headers });
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

async function invoke(runtime, customPayload = payload()) {
  const request = new Request('https://edge.test/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://example.test' },
    body: JSON.stringify({ operation: 'analyze_primary', payload: customPayload }),
  });
  const response = await runtime.handler(request);
  return { status: response.status, body: await response.json() };
}

function requestPayload(bodyText) {
  const body = JSON.parse(bodyText);
  return JSON.parse(body.contents[0].parts[0].text);
}

test('End-to-End: one decision-core Gemini call expands server-side into a complete primary contract', async () => {
  const runtime = await createRuntime([geminiRaw(decisionResult())]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(runtime.getCalls(), 1, 'normal primary analysis must make exactly one Gemini call');
  assert.equal(body.edgeVersion, EDGE_VERSION);
  assert.equal(body.result.contractVersion, '6.6.0');
  assert.equal(body.result.diagnosticSections.length, 3);
  assert.ok(body.result.interventions.length >= 2);
  assert.equal(body.result.monitoringPlan.length, 3);
  assert.equal(body.serverTiming.decisionCore, true);
  assert.equal(body.serverTiming.segmentedPrimary, false);
  assert.equal(body.serverTiming.repairUsed, false);
  assert.equal(body.serverTiming.rescueUsed, false);
  assert.equal(body.serverTiming.attemptedModels, 1);
  assert.equal(body.serverTiming.serverDeadlineMs, DECISION_DEADLINE);
  assert.equal(body.serverTiming.primaryAttemptTimeoutMs, DECISION_TIMEOUT);
  assert.equal(body.serverTiming.fallbackAttemptTimeoutMs, FALLBACK_TIMEOUT);
  assert.ok(body.result.interventions.every(item => item.numericGuard?.applied), 'server must own score intervention arithmetic');

  const sent = requestPayload(runtime.getRequestBodies()[0]);
  assert.deepEqual(sent.data.sampleRows, []);
  assert.deepEqual(sent.data.headers, []);
  assert.equal(sent.data.sentRowCount, 0);
  assert.equal(sent.data.sampling, 'metrics-and-charts-only');
  assert.ok(!sent.availableEvidenceRefs.some(ref => String(ref).startsWith('row:')));
});

test('End-to-End: transient capacity switches once to a distinct fallback and never starts action/repair/rescue chains', async () => {
  const runtime = await createRuntime([
    httpError(503, 'service unavailable'),
    geminiRaw(decisionResult(), 'STOP', 'fallback-model'),
  ]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(runtime.getCalls(), 2);
  assert.equal(body.serverTiming.attemptedModels, 2);
  assert.equal(body.serverTiming.fallbackUsed, true);
  assert.equal(body.serverTiming.repairUsed, false);
  assert.equal(body.serverTiming.rescueUsed, false);
  const urls = runtime.getUrls();
  assert.match(urls[0], modelUrlPattern(DEFAULT_ANALYSIS_MODEL));
  assert.match(urls[1], modelUrlPattern(DEFAULT_FAST_MODEL));
  const schemas = runtime.getRequestBodies().map(text => JSON.parse(text).generationConfig.responseJsonSchema.properties);
  assert.ok(schemas.every(properties => properties.executive && properties.analysisUnits && !properties.interventions && !properties.monitoringPlan));
});

test('End-to-End: provider 429 stops immediately with no model fan-out', async () => {
  const runtime = await createRuntime([httpError(429, 'RESOURCE_EXHAUSTED quota exceeded', { 'retry-after': '30' })]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 429);
  assert.equal(body.errorCode, 'GEMINI_RATE_LIMIT');
  assert.equal(runtime.getCalls(), 1);
  assert.equal(body.diagnostic?.providerKind, 'rate_limit');
});

test('End-to-End: a contract-invalid primary result uses one fallback only and preserves bounded request count', async () => {
  const invalid = decisionResult();
  invalid.analysisUnits = invalid.analysisUnits.slice(0, 1);
  const runtime = await createRuntime([geminiRaw(invalid), geminiRaw(decisionResult())]);
  const { status, body } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(runtime.getCalls(), 2);
  assert.equal(body.serverTiming.fallbackUsed, true);
  assert.equal(body.serverTiming.fallbackReason, 'decision_contract_fallback');
});

test('configured future model families are honored by the bounded decision core', async () => {
  const futurePrimary = 'gemini-future-reasoning';
  const futureFallback = 'gemini-future-fast';
  const runtime = await createRuntime([
    httpError(503, 'temporary capacity'),
    geminiRaw(decisionResult()),
  ], {
    GEMINI_ANALYSIS_MODEL: futurePrimary,
    GEMINI_FAST_MODEL: futureFallback,
  });
  const { status } = await invoke(runtime);
  assert.equal(status, 200);
  assert.equal(runtime.getCalls(), 2);
  assert.match(runtime.getUrls()[0], modelUrlPattern(futurePrimary));
  assert.match(runtime.getUrls()[1], modelUrlPattern(futureFallback));
});

test('single non-empty score group does not create an impossible distinct-group validation requirement', async () => {
  const p = payload();
  const onlyGap = [{ id: 'deep_gap', label: 'دون الإتقان بفجوة عميقة', count: 268, percentage: 100 }];
  p.evidenceAnalysis.charts = [{ id: 'intervention-segments', data: onlyGap }];
  p.evidenceAnalysis.interventionMathContext = { totalCount: 268, baselineMasteryCount: 0, baselineMasteryRate: 0, groups: onlyGap };
  p.availableEvidenceRefs = ['metric:n', 'metric:deepGapCount', 'metric:masteryCount', 'metric:masteryPct'];
  const decision = decisionResult();
  decision.executive.evidenceRefs = ['metric:deepGapCount'];
  decision.analysisUnits = [
    unit(1, 'الفجوة العميقة', ['metric:deepGapCount']),
    unit(2, 'حجم العينة', ['metric:n'], 'medium'),
  ];
  decision.methodChecks = [];
  const runtime = await createRuntime([geminiRaw(decision)]);
  const { status, body } = await invoke(runtime, p);
  assert.equal(status, 200);
  assert.equal(runtime.getCalls(), 1);
  assert.ok(body.result.interventions.length >= 2);
});

test('server-side decision core keeps multi-visit interventions inside the observed sample scope', async () => {
  const p = payload();
  p.recognizedType = { id: 'supervision_multi_visit', nameAr: 'زيارات إشرافية متعددة' };
  p.data = { mode: 'table', visits: [{ visitId: 'زيارة-1', subject: 'العلوم' }, { visitId: 'زيارة-2', subject: 'العلوم' }], rowCount: 2, sentRowCount: 2 };
  p.evidenceAnalysis = {
    metrics: [{ id: 'n', value: 2 }, { id: 'mean', value: 2.4 }, { id: 'sd', value: 0.4 }],
    charts: [],
    scopeContext: {
      scopeType: 'sampled-multi-visit', sampleOnly: true, visitCount: 2, subjects: ['العلوم'],
      departmentLabel: 'قسم العلوم', populationLabel: 'المعلمون المشمولون بزيارات قسم العلوم',
      forbiddenBroaderPopulations: ['الهيئة التدريسية', 'جميع معلمي المدرسة'],
    },
  };
  p.availableEvidenceRefs = ['metric:n', 'metric:mean', 'metric:sd'];
  const decision = decisionResult();
  decision.executive.evidenceRefs = ['metric:mean', 'metric:sd'];
  decision.analysisUnits = [unit(1, 'اتجاه الزيارات', ['metric:mean']), unit(2, 'تفاوت الزيارات', ['metric:sd'], 'medium')];
  decision.methodChecks = [];
  const runtime = await createRuntime([geminiRaw(decision)]);
  const { status, body } = await invoke(runtime, p);
  assert.equal(status, 200);
  assert.ok(body.result.interventions.every(item => !/جميع معلمي المدرسة|الهيئة التدريسية/.test(item.targetGroup)));
  assert.ok(body.result.interventions.every(item => item.scopeGuard?.applied));
});

test('decision-core architecture is bounded by construction', () => {
  assert.equal(MAX_MODELS, 2);
  assert.ok(DECISION_TIMEOUT < DECISION_DEADLINE);
  assert.ok(FALLBACK_TIMEOUT < DECISION_DEADLINE);
  assert.ok(DECISION_TIMEOUT + FALLBACK_TIMEOUT <= DECISION_DEADLINE);
  assert.doesNotMatch(edgeSource.slice(edgeSource.indexOf('async function analyzePrimary('), edgeSource.indexOf('function errorInfo(')), /Promise\.allSettled|requestPrimarySegment|repairPrimarySegment|rescueTransientPrimarySegment/);
});
