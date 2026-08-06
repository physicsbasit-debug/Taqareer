const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(ref => !/^(?:https?:|data:|#)/.test(ref));
for (const ref of refs) {
  const localRef = ref.split('?')[0].split('#')[0];
  assert.ok(fs.existsSync(path.join(root, localRef)), `Missing static asset: ${ref}`);
}
assert.match(html, /v1\.2\.5/);
assert.match(html, /محرك التحليل التربوي بالذكاء الاصطناعي/);
console.log(`PASS static site contract: ${refs.length} referenced files`);
