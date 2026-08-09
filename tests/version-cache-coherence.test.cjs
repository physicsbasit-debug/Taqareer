const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('public HTML cache-busters and runtime version markers match package version', () => {
  const packageVersion = JSON.parse(read('package.json')).version;
  const index = read('index.html');
  const app = read('assets/app.js');
  const client = read('assets/ai-client.js');
  const report = read('assets/report-system.js');

  const queryVersions = [...index.matchAll(/assets\/[a-z0-9._-]+\.(?:js|css)\?v=([0-9.]+)/gi)].map(match => match[1]);
  assert.ok(queryVersions.length >= 10, 'expected public asset cache-busters');
  assert.deepEqual([...new Set(queryVersions)], [packageVersion]);
  assert.match(index, new RegExp(`v${packageVersion.replace(/\./g, '\\.')}`));
  assert.match(app, new RegExp(`appVersion:\\s*["']${packageVersion.replace(/\./g, '\\.')}["']`));
  assert.match(client, new RegExp(`CLIENT_VERSION\\s*=\\s*["']${packageVersion.replace(/\./g, '\\.')}["']`));
  assert.match(report, new RegExp(`VERSION\\s*=\\s*["']${packageVersion.replace(/\./g, '\\.')}["']`));
});
