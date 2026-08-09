const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('visual ingestion failures do not open manual extraction automatically', () => {
  const app = read('assets/app.js');
  const ingestStart = app.indexOf('async function ingestDocument');
  const ingestEnd = app.indexOf('function openManualExtraction', ingestStart);
  const documentFlow = app.slice(ingestStart, ingestEnd);
  assert.match(documentFlow, /showInputRecovery/);
  assert.doesNotMatch(documentFlow, /openManualExtraction\(/);

  const imageStart = app.indexOf('async function ingestImage');
  const imageEnd = app.indexOf('function applyManualExtraction', imageStart);
  const imageFlow = app.slice(imageStart, imageEnd);
  assert.match(imageFlow, /showInputRecovery/);
  assert.doesNotMatch(imageFlow, /openManualExtraction\(/);
});

test('manual extraction is explicit and recovery keeps the original file in session', () => {
  const index = read('index.html');
  const app = read('assets/app.js');
  assert.match(index, /id="inputRecoveryActions"/);
  assert.match(index, /id="retryInputBtn"/);
  assert.match(index, /id="manualFallbackBtn"/);
  assert.match(index, /إدخال يدوي عند الحاجة/);
  assert.doesNotMatch(index, /استخراج يدوي احتياطي/);
  assert.match(app, /state\.inputRecovery = \{ file, sourceType/);
  assert.match(app, /retryInputRecovery/);
  assert.match(app, /openInputManualFallback/);
});

test('primary analysis failure preserves local evidence and tells the user to retry without re-uploading', () => {
  const app = read('assets/app.js');
  const runStart = app.indexOf('async function runAnalysis()');
  const runEnd = app.indexOf('function round(v)', runStart);
  const run = app.slice(runStart, runEnd);
  assert.match(run, /الحسابات والأدلة والملف ما زالت محفوظة/);
  assert.match(run, /لا حاجة لإعادة رفع الملف/);
  assert.doesNotMatch(run, /openManualExtraction\(/);
});

test('primary analysis sends exactly one browser-level request per click', () => {
  const client = read('assets/ai-client.js');
  assert.match(client, /PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS = 1/);
  assert.match(client, /invoke\("analyze_primary", payload, \{ timeoutMs: PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS, networkRetry: false, maxAttempts: PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS \}\)/);
});

test('contract failure uses one bounded model fallback and has no runtime repair/rescue chain', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  const primaryStart = edge.indexOf('async function analyzePrimary(');
  const primaryEnd = edge.indexOf('function errorInfo(', primaryStart);
  const runtime = edge.slice(primaryStart, primaryEnd);
  assert.match(edge, /PRIMARY_DECISION_MAX_MODELS = 2/);
  assert.match(runtime, /PRIMARY_DECISION_SCHEMA/);
  assert.match(runtime, /expandPrimaryDecision/);
  assert.doesNotMatch(runtime, /Promise\.allSettled|requestPrimarySegment|repairPrimarySegment|rescueTransientPrimarySegment/);
  assert.match(edge, /GEMINI_CONTRACT_REJECTED/);
});
