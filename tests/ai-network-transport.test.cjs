const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

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
    headers: { 'content-type': 'application/json', 'x-taqareer-edge-version': '0.14.4', ...headers },
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

test('primary analysis verifies Edge health before sending the expensive analysis request', async () => {
  const operations = [];
  const { api } = loadClient(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    if (body.operation === 'health') {
      return jsonResponse({ ok: true, operation: 'health', edgeVersion: '0.14.4', aiKeyConfigured: true, result: { status: 'ready' } });
    }
    if (body.operation === 'analyze_primary') {
      return jsonResponse({ ok: true, operation: 'analyze_primary', edgeVersion: '0.14.4', aiKeyConfigured: true, result: { contractVersion: '6.6.0' } });
    }
    throw new Error(`unexpected operation ${body.operation}`);
  });
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  const response = await api.analyzePrimaryDetailed({ sample: true });
  assert.deepEqual(operations, ['health', 'analyze_primary']);
  assert.equal(response.result.contractVersion, '6.6.0');
  assert.equal(api.getHealth().status, 'live');
  assert.equal(api.getHealth().edgeVersion, '0.14.4');
});

test('rejects malformed endpoints before attempting network access', async () => {
  let calls = 0;
  const { api } = loadClient(async () => { calls += 1; return jsonResponse({ ok: true }); });
  api.saveConfig({ endpoint: 'https://example.com/not-an-edge-function', anonKey: 'anon-key', enabled: true });
  await assert.rejects(() => api.health({ force: true }), error => error.code === 'AI_ENDPOINT_INVALID');
  assert.equal(calls, 0);
});
