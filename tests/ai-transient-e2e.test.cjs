const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const { edgeVersion } = require('../scripts/version-contract.cjs');
const CURRENT_EDGE_VERSION = edgeVersion(root);
const clientSource = fs.readFileSync(path.join(root, 'assets', 'ai-client.js'), 'utf8');
const clientTimeoutMatch = clientSource.match(/const\s+PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS\s*=\s*([0-9_]+)/);
if (!clientTimeoutMatch) throw new Error('PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS not found');
const PRIMARY_CLIENT_TIMEOUT_MS = Number(clientTimeoutMatch[1].replace(/_/g, ''));

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

function loadRuntime(fetchImpl) {
  const localStorage = storage();
  const sessionStorage = storage();
  const window = { TAQAREER_CONFIG: {}, dispatchEvent() {} };
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const nativeSetTimeout = setTimeout;
  const fastSetTimeout = (fn, ms, ...args) => nativeSetTimeout(fn, Number(ms) < PRIMARY_CLIENT_TIMEOUT_MS ? 0 : ms, ...args);
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

test('End-to-End: compact analysis payload allows one full Edge replay after a transient 503 and then completes', async () => {
  const operations = [];
  let primaryCalls = 0;
  const { api, orchestrator } = loadRuntime(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    assert.equal(options.headers['x-taqareer-attempt'], undefined);
    if (body.operation === 'analyze_primary') {
      primaryCalls += 1;
      if (primaryCalls === 1) {
        return jsonResponse({
          ok: false,
          operation: 'analyze_primary',
          edgeVersion: CURRENT_EDGE_VERSION,
          errorCode: 'GEMINI_TRANSIENT',
          retryable: true,
          error: 'خدمة التحليل مزدحمة مؤقتًا.',
        }, 503);
      }
      return jsonResponse({
        ok: true,
        operation: 'analyze_primary',
        edgeVersion: CURRENT_EDGE_VERSION,
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

  assert.deepEqual(operations, ['analyze_primary', 'analyze_primary']);
  assert.equal(primaryCalls, 2);
  assert.equal(output.result.contractVersion, '6.6.0');
  assert.equal(output.result.executive.headline, 'تحليل مكتمل');
});

test('End-to-End: orchestrated analysis proceeds when advisory health would fail but analyze_primary is reachable', async () => {
  const operations = [];
  const { api, orchestrator } = loadRuntime(async (_url, options) => {
    const body = JSON.parse(options.body);
    operations.push(body.operation);
    if (body.operation === 'health') throw new TypeError('Failed to fetch');
    if (body.operation === 'analyze_primary') {
      return jsonResponse({
        ok: true,
        operation: 'analyze_primary',
        edgeVersion: CURRENT_EDGE_VERSION,
        aiKeyConfigured: true,
        result: { contractVersion: '6.6.0', executive: { headline: 'تحليل مباشر مكتمل' } },
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

  assert.deepEqual(operations, ['analyze_primary']);
  assert.equal(output.result.executive.headline, 'تحليل مباشر مكتمل');
  assert.equal(api.getHealth().status, 'live');
});
