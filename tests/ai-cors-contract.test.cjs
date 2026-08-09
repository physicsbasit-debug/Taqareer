const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'assets/ai-client.js'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/analyze-educational-form/index.ts'), 'utf8');

function normalize(name) { return String(name || '').trim().toLowerCase(); }

test('browser custom request headers are covered by Edge CORS allow-list', () => {
  const headersBlock = client.match(/const headers = \{([\s\S]*?)\n\s*\};/);
  assert.ok(headersBlock, 'ai-client request headers block not found');

  const custom = [...headersBlock[1].matchAll(/["'](x-taqareer-[^"']+)["']\s*:/gi)]
    .map(match => normalize(match[1]));
  if (/headers\[\s*["']x-taqareer-access-code["']\s*\]/i.test(client)) custom.push('x-taqareer-access-code');

  const allow = edge.match(/"Access-Control-Allow-Headers"\s*:\s*"([^"]+)"/i);
  assert.ok(allow, 'Edge Access-Control-Allow-Headers not found');
  const allowed = new Set(allow[1].split(',').map(normalize));
  const missing = [...new Set(custom)].filter(name => !allowed.has(name));
  assert.deepEqual(missing, [], `browser CORS preflight would block request headers: ${missing.join(', ')}`);
});

test('retry attempt counter stays client-side and is not emitted as an undeclared CORS header', () => {
  assert.doesNotMatch(client, /["']x-taqareer-attempt["']\s*:/i);
  assert.match(client, /for \(let attempt = 1; attempt <= maxAttempts; attempt \+= 1\)/);
});
