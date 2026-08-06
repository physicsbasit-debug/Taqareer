const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const edgePath = path.join(root, 'supabase/functions/analyze-educational-form/index.ts');

function createRuntime(env = {}) {
  const source = fs.readFileSync(edgePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    fileName: edgePath,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  let handler = null;
  let geminiCalls = 0;
  const context = vm.createContext({
    console,
    Request,
    Response,
    Headers,
    AbortController,
    TextEncoder,
    TextDecoder,
    URL,
    performance,
    crypto: globalThis.crypto,
    structuredClone,
    setTimeout,
    clearTimeout,
    fetch: async () => { geminiCalls += 1; throw new Error('Gemini should not be called by health'); },
    Deno: {
      env: { get: key => Object.prototype.hasOwnProperty.call(env, key) ? env[key] : key === 'GEMINI_API_KEY' ? 'test-key' : '' },
      serve: fn => { handler = fn; },
    },
  });
  vm.runInContext(transpiled.outputText, context, { filename: 'edge-network-health.js' });
  return { handler, getGeminiCalls: () => geminiCalls };
}

test('normalizes a GitHub Pages URL with path in TAQAREER_ALLOWED_ORIGINS', async () => {
  const runtime = createRuntime({ TAQAREER_ALLOWED_ORIGINS: 'https://physicsbasit-debug.github.io/Taqareer/' });
  const response = await runtime.handler(new Request('https://edge.test/analyze', {
    method: 'OPTIONS',
    headers: { origin: 'https://physicsbasit-debug.github.io' },
  }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://physicsbasit-debug.github.io');
  assert.match(response.headers.get('access-control-allow-headers') || '', /x-taqareer-client-version/);
  assert.match(response.headers.get('access-control-expose-headers') || '', /x-taqareer-edge-version/);
});

test('health operation verifies Edge connectivity without calling Gemini', async () => {
  const runtime = createRuntime({ TAQAREER_ALLOWED_ORIGINS: '*' });
  const response = await runtime.handler(new Request('https://edge.test/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://physicsbasit-debug.github.io' },
    body: JSON.stringify({ operation: 'health', payload: { clientVersion: '1.2.1' } }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.operation, 'health');
  assert.equal(body.edgeVersion, '0.15.1');
  assert.equal(body.aiKeyConfigured, true);
  assert.equal(body.provider, 'supabase-edge');
  assert.equal(response.headers.get('x-taqareer-edge-version'), '0.15.1');
  assert.equal(runtime.getGeminiCalls(), 0);
});

test('disallowed origins receive a readable CORS 403 instead of a browser-level Failed to fetch', async () => {
  const runtime = createRuntime({ TAQAREER_ALLOWED_ORIGINS: 'https://allowed.example' });
  const response = await runtime.handler(new Request('https://edge.test/analyze', {
    method: 'OPTIONS',
    headers: { origin: 'https://blocked.example' },
  }));
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://blocked.example');
  assert.match(body.error, /النطاق غير مسموح/);
});
