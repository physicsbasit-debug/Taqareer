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
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-taqareer-edge-version': CURRENT_EDGE_VERSION },
  });
}

function loadClient(fetchImpl, { immediateTimers = false } = {}) {
  const localStorage = storage();
  const sessionStorage = storage();
  const window = { TAQAREER_CONFIG: {}, dispatchEvent() {} };
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const immediateSetTimeout = (fn, _ms, ...args) => { fn(...args); return 1; };
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
    setTimeout: immediateTimers ? immediateSetTimeout : setTimeout,
    clearTimeout: immediateTimers ? (() => {}) : clearTimeout,
    console,
  });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'ai-client.js'), 'utf8'), context, { filename: 'assets/ai-client.js' });
  return { api: window.TaqareerAI };
}

function configure(api) {
  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
}

test('End-to-End: server contract rejection is preserved and never hidden by a full automatic replay', async () => {
  let calls = 0;
  const { api } = loadClient(async (_url, options) => {
    calls += 1;
    const body = JSON.parse(options.body);
    assert.equal(body.operation, 'analyze_primary');
    return jsonResponse({
      ok: false,
      operation: 'analyze_primary',
      edgeVersion: CURRENT_EDGE_VERSION,
      errorCode: 'GEMINI_CONTRACT_REJECTED',
      retryable: true,
      error: 'وصلت استجابة التحليل لكن عقد الجودة لم يكتمل.',
    }, 502);
  });
  configure(api);
  await assert.rejects(() => api.analyzePrimaryDetailed({ sample: true }), error => error.code === 'GEMINI_CONTRACT_REJECTED');
  assert.equal(calls, 1, 'contract rejection already consumed server repair and must not replay the whole analysis');
});

test('End-to-End: client timeout never starts a second overlapping analyze_primary request', async () => {
  let calls = 0;
  const { api } = loadClient(async (_url, options) => {
    calls += 1;
    if (options.signal?.aborted) {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }
    return new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    });
  }, { immediateTimers: true });
  configure(api);
  await assert.rejects(() => api.analyzePrimaryDetailed({ sample: true }), error => error.code === 'AI_PRIMARY_TIMEOUT');
  assert.equal(calls, 1, 'a timed-out request may still be executing server-side and must not be duplicated automatically');
});

test('End-to-End: even a fast explicit 503 never starts a second browser-level AI cycle', async () => {
  let calls = 0;
  const { api } = loadClient(async (_url, options) => {
    calls += 1;
    const body = JSON.parse(options.body);
    assert.equal(body.operation, 'analyze_primary');
    return jsonResponse({
      ok: false,
      operation: 'analyze_primary',
      edgeVersion: CURRENT_EDGE_VERSION,
      errorCode: 'GEMINI_TRANSIENT',
      retryable: true,
      error: '503 service unavailable',
    }, 503);
  }, { immediateTimers: true });
  configure(api);
  await assert.rejects(() => api.analyzePrimaryDetailed({ sample: true }), error => error.code === 'GEMINI_TRANSIENT');
  assert.equal(calls, 1);
});

