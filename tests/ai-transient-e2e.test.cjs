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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-taqareer-edge-version': '0.15.6' },
  });
}

function loadRuntime(fetchImpl) {
  const localStorage = storage();
  const sessionStorage = storage();
  const window = { TAQAREER_CONFIG: {}, dispatchEvent() {} };
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const nativeSetTimeout = setTimeout;
  const fastSetTimeout = (fn, ms, ...args) => nativeSetTimeout(fn, Number(ms) < 8000 ? 0 : ms, ...args);
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
    setTimeout: fastSetTimeout,
    clearTimeout,
    console,
    structuredClone,
  });
  context.globalThis = context;
  for (const file of ['assets/ai-client.js', 'assets/deep-analysis-orchestrator.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  return { api: window.TaqareerAI, orchestrator: context.TaqareerDeepOrchestrator };
}

test('End-to-End: compact analysis payload survives two transient Edge 503 responses and completes on the third automatic attempt', async () => {
  const operations = [];
  const attempts = [];
  let primaryCalls = 0;
  const { api, orchestrator } = loadRuntime(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    attempts.push(options.headers['x-taqareer-attempt']);
    if (body.operation === 'health') {
      return jsonResponse({ ok: true, operation: 'health', edgeVersion: '0.15.6', aiKeyConfigured: true, result: { status: 'ready' } });
    }
    if (body.operation === 'analyze_primary') {
      primaryCalls += 1;
      if (primaryCalls <= 2) {
        return jsonResponse({
          ok: false,
          operation: 'analyze_primary',
          edgeVersion: '0.15.6',
          errorCode: 'GEMINI_TRANSIENT',
          retryable: true,
          error: 'خدمة التحليل مزدحمة مؤقتًا.',
        }, 503);
      }
      return jsonResponse({
        ok: true,
        operation: 'analyze_primary',
        edgeVersion: '0.15.6',
        aiKeyConfigured: true,
        result: { contractVersion: '6.6.0', executive: { headline: 'تحليل مكتمل' } },
      });
    }
    throw new Error(`unexpected operation ${body.operation}`);
  });

  api.saveConfig({ endpoint: 'https://abc123.supabase.co', anonKey: 'anon-key', enabled: true });
  const output = await orchestrator.run({
    basePayload: {
      source: { name: 'multi-subject.pdf' },
      recognizedType: { id: 'multi_subject_results', nameAr: 'نتائج طلاب فردية متعددة المواد' },
      data: { headers: ['اسم الطالب', 'العلوم'], sampleRows: [{ _evidenceRef: 'row:1', 'اسم الطالب': 'طالب', 'العلوم': 78 }], rowCount: 319, sentRowCount: 1 },
      evidenceAnalysis: { metrics: [{ id: 'mean', label: 'المتوسط', value: 76.4, evidenceRef: 'metric:mean' }], charts: [], evidenceCatalog: [] },
      availableEvidenceRefs: ['row:1', 'metric:mean'],
    },
    ai: api,
  });

  assert.deepEqual(operations, ['health', 'analyze_primary', 'analyze_primary', 'analyze_primary']);
  assert.deepEqual(attempts, ['1', '1', '2', '3']);
  assert.equal(primaryCalls, 3);
  assert.equal(output.result.contractVersion, '6.6.0');
  assert.equal(output.result.executive.headline, 'تحليل مكتمل');
});
