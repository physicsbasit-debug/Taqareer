const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { packageVersion, escapeRegExp } = require('./version-contract.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(ref => !/^(?:https?:|data:|#)/.test(ref));
for (const ref of refs) {
  const localRef = ref.split('?')[0].split('#')[0];
  assert.ok(fs.existsSync(path.join(root, localRef)), `Missing static asset: ${ref}`);
}
const appVersion = packageVersion(root);
const escaped = escapeRegExp(appVersion);
assert.match(html, new RegExp(`v${escaped}`));
assert.match(html, new RegExp(`تقارير \\| منصة التحليل التربوي v${escaped}`));
assert.match(html, /إعداد خدمة التحليل/);
assert.doesNotMatch(html, /إعداد الذكاء الاصطناعي|ذكاء اصطناعي حي جاهز|تحليل ذكاء اصطناعي موثق/);
console.log(`PASS static site contract: ${refs.length} referenced files; app v${appVersion}`);
