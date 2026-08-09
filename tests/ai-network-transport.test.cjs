const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const { edgeVersion } = require('../scripts/version-contract.cjs');
const CURRENT_EDGE_VERSION = edgeVersion(root);
const LEGACY_EDGE_FIXTURE_VERSION = '0.15.1';

function storage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

function loadClient(fetchImpl) {
  const localStorage = storage();
  const sessionStorage = storage();
  const window = {
    TAQAREER_CONFIG: {},
    dispatchEvent() {},
  };
  class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const context = vm.createContext({
    window,
    globalThis: null,
    localStorage,
    sessionStorage,
    navigator: { onLine: true },
    CustomEvent,
    fetch: fetchImpl,
    Request,
    Response,
    Headers,
    URL,
    AbortController,
    TypeError,
    Error,
    JSON,
    Math,
    Date,
    crypto: globalThis.crypto,
    performance,
    setTimeout,
    clearTimeout,
    console,
  });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/ai-client.js'), 'utf8'), context, { filename: 'assets/ai-client.js' });
  return { api: window.TaqareerAI, localStorage, sessionStorage };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-taqareer-edge-version': LEGACY_EDGE_FIXTURE_VERSION, ...headers },
  });
}

test('normalizes Supabase project and dashboard URLs to the Edge function endpoint', () => {
  const { api } = loadClient(async () => jsonResponse({ ok: true }));
  assert.equal(
    api.normalizeEndpoint('https://abc123.supabase.co/'),
    'https://abc123.supabase.co/functions/v1/analyze-educational-form',
  );
  assert.equal(
    api.normalizeEndpoint('https://supabase.com/dashboard/project/abc123/functions'),
    'https://abc123.supabase.co/functions/v1/analyze-educational-form',
  );
  assert.equal(
    api.normalizeEndpoint('abc123.supabase.co/functions/v1/analyze-educational-form/'),
    'https://abc123.supabase.co/functions/v1/analyze-educational-form',
  );
});

test('health retries one network transport failure and exposes an Arabic error code without leaking Failed to fetch', async () => {
  let calls = 0;
  const { api } = loadClient(async () => {
    calls += 1;
    throw new TypeError('Failed to fetch');
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  await assert.rejects(
    () => api.health({ force: true }),
    error => {
      assert.equal(error.code, 'AI_NETWORK_FETCH_FAILED');
      assert.equal(error.retryable, true);
      assert.doesNotMatch(error.message, /Failed to fetch/i);
      return true;
    },
  );
  assert.equal(calls, 2);
  assert.equal(api.getHealth().status, 'failed');
});

test('primary analysis uses the real analysis request as the authoritative health proof', async () => {
  const operations = [];
  const { api } = loadClient(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    if (body.operation === 'analyze_primary') {
      return jsonResponse({ ok: true, operation: 'analyze_primary', edgeVersion: LEGACY_EDGE_FIXTURE_VERSION, aiKeyConfigured: true, result: { contractVersion: '6.6.0' } });
    }
    throw new Error(`unexpected operation ${body.operation}`);
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  const response = await api.analyzePrimaryDetailed({ sample: true });
  assert.deepEqual(operations, ['analyze_primary']);
  assert.equal(response.result.contractVersion, '6.6.0');
  assert.equal(api.getHealth().status, 'live');
  assert.equal(api.getHealth().edgeVersion, LEGACY_EDGE_FIXTURE_VERSION);
});


test('primary analysis never duplicates a full Edge request after a retryable 503', async () => {
  const operations = [];
  const { api } = loadClient(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    return jsonResponse({
      ok: false,
      operation: 'analyze_primary',
      edgeVersion: CURRENT_EDGE_VERSION,
      errorCode: 'GEMINI_TRANSIENT',
      retryable: true,
      error: 'خدمة التحليل لم تستجب ضمن المسار المحدود.',
    }, 503);
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  await assert.rejects(() => api.analyzePrimaryDetailed({ sample: true }), error => error.code === 'GEMINI_TRANSIENT');
  assert.deepEqual(operations, ['analyze_primary']);
});

test('primary analysis never replays the whole Edge request immediately after GEMINI_RATE_LIMIT', async () => {
  const operations = [];
  const { api } = loadClient(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    return jsonResponse({
      ok: false,
      operation: 'analyze_primary',
      edgeVersion: CURRENT_EDGE_VERSION,
      errorCode: 'GEMINI_RATE_LIMIT',
      retryable: true,
      retryAfterMs: 12000,
      diagnostic: { providerStatus: 429, providerKind: 'rate_limit', attemptedModels: ['gemini-3.6-flash'] },
      error: 'تم بلوغ حد طلبات الذكاء الاصطناعي مؤقتًا.',
    }, 429);
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  await assert.rejects(() => api.analyzePrimaryDetailed({ sample: true }), error => {
    assert.equal(error.code, 'GEMINI_RATE_LIMIT');
    assert.equal(error.retryAfterMs, 12000);
    assert.equal(error.diagnostic.providerKind, 'rate_limit');
    return true;
  });
  assert.deepEqual(operations, ['analyze_primary']);
});

test('End-to-End: primary analysis is not blocked by a failed health preflight when the real analysis request is reachable', async () => {
  const operations = [];
  let healthCalls = 0;
  const { api } = loadClient(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    if (body.operation === 'health') {
      healthCalls += 1;
      throw new TypeError('Failed to fetch');
    }
    if (body.operation === 'analyze_primary') {
      return jsonResponse({
        ok: true,
        operation: 'analyze_primary',
        edgeVersion: CURRENT_EDGE_VERSION,
        aiKeyConfigured: true,
        result: { contractVersion: '6.6.0' },
      });
    }
    throw new Error(`unexpected operation ${body.operation}`);
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  const response = await api.analyzePrimaryDetailed({ sample: true });
  assert.equal(healthCalls, 0);
  assert.deepEqual(operations, ['analyze_primary']);
  assert.equal(response.result.contractVersion, '6.6.0');
  assert.equal(api.getHealth().status, 'live');
});

test('rejects malformed endpoints before attempting network access', async () => {
  let calls = 0;
  const { api } = loadClient(async () => { calls += 1; return jsonResponse({ ok: true }); });
  api.saveConfig({ endpoint: 'https://example.com/not-an-edge-function', anonKey: 'anon-key', enabled: true });
  await assert.rejects(() => api.health({ force: true }), error => error.code === 'AI_ENDPOINT_INVALID');
  assert.equal(calls, 0);
});
