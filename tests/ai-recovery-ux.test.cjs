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

test('primary analysis retries transport failures without changing the semantic contract', () => {
  const client = read('assets/ai-client.js');
  assert.match(client, /invoke\("analyze_primary", payload, \{ timeoutMs: 52000, networkRetry: true \}\)/);
});


test('contract rejection is repaired server-side before surfacing a retryable error', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(edge, /buildPrimaryRepairPayload/);
  assert.match(edge, /repairContext/);
  assert.match(edge, /GEMINI_CONTRACT_REJECTED/);
  assert.match(edge, /PRIMARY_RESCUE_MODELS = Object\.freeze\(\["gemini-3\.5-flash", "gemini-3\.6-flash", "gemini-3\.5-flash-lite"\]\)/);
});
