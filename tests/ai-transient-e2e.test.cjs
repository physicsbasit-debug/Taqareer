const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const { edgeVersion } = require('../scripts/version-contract.cjs');
const CURRENT_EDGE_VERSION = edgeVersion(root);

function storage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-taqareer-edge-version': CURRENT_EDGE_VERSION } });
}
function loadRuntime(fetchImpl) {
  const localStorage = storage();
  const sessionStorage = storage();
  const window = { TAQAREER_CONFIG: {}, dispatchEvent() {} };
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const context = vm.createContext({
    window, globalThis: null, localStorage, sessionStorage, navigator: { onLine: true }, CustomEvent,
    fetch: fetchImpl, Request, Response, Headers, URL, AbortController, TypeError, Error, JSON, Math, Date,
    crypto: globalThis.crypto, performance, setTimeout, clearTimeout, console, structuredClone,
  });
  context.globalThis = context;
  for (const file of ['assets/ai-client.js', 'assets/deep-analysis-orchestrator.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  return { api: window.TaqareerAI, orchestrator: context.TaqareerDeepOrchestrator, localStorage };
}
function basePayload() {
  return {
    source: { name: 'multi-subject.pdf' },
    recognizedType: { id: 'multi_subject_results', nameAr: 'نتائج طلاب فردية متعددة المواد' },
    data: { headers: ['اسم الطالب', 'العلوم'], sampleRows: [{ _evidenceRef: 'row:1', 'اسم الطالب': 'طالب', 'العلوم': 78 }], rowCount: 319, sentRowCount: 1 },
    evidenceAnalysis: { metrics: [{ id: 'mean', label: 'المتوسط', value: 76.4, evidenceRef: 'metric:mean' }], charts: [], evidenceCatalog: [] },
    availableEvidenceRefs: ['row:1', 'metric:mean'],
  };
}

test('End-to-End: one click produces one Edge request and a transient Edge error is surfaced without a browser replay', async () => {
  const operations = [];
  const { api, orchestrator } = loadRuntime(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    return jsonResponse({ ok: false, operation: 'analyze_primary', edgeVersion: CURRENT_EDGE_VERSION, errorCode: 'GEMINI_TRANSIENT', retryable: true, error: 'تعذر المسار المحدود.' }, 503);
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  await assert.rejects(() => orchestrator.run({ basePayload: basePayload(), ai: api }), error => error.code === 'GEMINI_TRANSIENT');
  assert.deepEqual(operations, ['analyze_primary']);
});

test('End-to-End: successful decision core is reused from the local evidence fingerprint cache', async () => {
  const operations = [];
  const { api, orchestrator } = loadRuntime(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    return jsonResponse({
      ok: true, operation: 'analyze_primary', edgeVersion: CURRENT_EDGE_VERSION, aiKeyConfigured: true,
      result: { contractVersion: '6.6.0', executive: { headline: 'تحليل مكتمل' } },
      model: 'gemini-test', serverTiming: { decisionCore: true },
    });
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  const first = await orchestrator.run({ basePayload: basePayload(), ai: api });
  const second = await orchestrator.run({ basePayload: basePayload(), ai: api });
  assert.deepEqual(operations, ['analyze_primary']);
  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(second.durationMs, 0);
  assert.equal(second.result.executive.headline, 'تحليل مكتمل');
});

test('force rerun bypasses the decision-core cache without changing the compact evidence payload', async () => {
  let calls = 0;
  const sentBodies = [];
  const { api, orchestrator } = loadRuntime(async (_url, options) => {
    calls += 1;
    sentBodies.push(JSON.parse(options.body));
    return jsonResponse({ ok: true, operation: 'analyze_primary', edgeVersion: CURRENT_EDGE_VERSION, result: { contractVersion: '6.6.0', executive: { headline: `run-${calls}` } } });
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  await orchestrator.run({ basePayload: basePayload(), ai: api });
  const forced = await orchestrator.run({ basePayload: basePayload(), ai: api, force: true });
  assert.equal(calls, 2);
  assert.equal(forced.cacheHit, false);
  for (const body of sentBodies) {
    assert.deepEqual(body.payload.data.sampleRows, []);
    assert.deepEqual(body.payload.data.headers, []);
    assert.equal(body.payload.data.sampling, 'metrics-and-charts-only');
    assert.ok(!body.payload.availableEvidenceRefs.some(ref => ref.startsWith('row:')));
  }
});

test('End-to-End: orchestrated analysis proceeds without a health preflight when analyze_primary is reachable', async () => {
  const operations = [];
  const { api, orchestrator } = loadRuntime(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    if (body.operation === 'health') throw new TypeError('Failed to fetch');
    return jsonResponse({ ok: true, operation: 'analyze_primary', edgeVersion: CURRENT_EDGE_VERSION, result: { contractVersion: '6.6.0', executive: { headline: 'تحليل مباشر مكتمل' } } });
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  const output = await orchestrator.run({ basePayload: basePayload(), ai: api });
  assert.deepEqual(operations, ['analyze_primary']);
  assert.equal(output.result.executive.headline, 'تحليل مباشر مكتمل');
});
