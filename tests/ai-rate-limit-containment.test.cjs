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

test('transient rescue excludes models already attempted by the failed segment', () => {
  assert.match(edge, /attemptedModelNames/, 'Edge must retain attempted model names');
  assert.match(edge, /excludeModels/, 'Transient rescue must be able to exclude already-attempted models');
});

test('client does not immediately replay a full analysis request after GEMINI_RATE_LIMIT', () => {
  assert.match(client, /code === "GEMINI_RATE_LIMIT"/, 'Client must recognize rate limit separately');
  assert.match(client, /throw error;\s*\/\/ rate-limit/i, 'Client must stop immediate full-request replay on rate limit');
});
