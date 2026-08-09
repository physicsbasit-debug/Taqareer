const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/analyze-educational-form/index.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'assets/ai-client.js'), 'utf8');

test('rate limits are not treated as model-switch capacity failures', () => {
  assert.match(edge, /function modelFailureKind\(/, 'Edge must classify Gemini failures by kind');
  assert.match(edge, /kind === "rate_limit"/, 'Rate limit must be a dedicated failure kind');
  assert.match(edge, /if \(kind === "rate_limit"\) throw/, '429 must stop model fan-out immediately');
});

test('decision core is capped at two distinct model candidates and has no runtime rescue chain', () => {
  assert.match(edge, /PRIMARY_DECISION_MAX_MODELS = 2/);
  assert.match(edge, /attemptedModelNames/, 'Edge must retain attempted decision models');
  const start = edge.indexOf('async function analyzePrimary(');
  const end = edge.indexOf('function errorInfo(', start);
  const runtime = edge.slice(start, end);
  assert.doesNotMatch(runtime, /rescueTransientPrimarySegment|repairPrimarySegment|requestPrimarySegment/);
});

test('client does not immediately replay a full analysis request after GEMINI_RATE_LIMIT', () => {
  assert.match(client, /code === "GEMINI_RATE_LIMIT"/, 'Client must recognize rate limit separately');
  assert.match(client, /if \(code === "GEMINI_RATE_LIMIT" \|\| status === 429\)[\s\S]*?throw error;/, 'Client must stop immediate full-request replay on rate limit');
});
