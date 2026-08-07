const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'report-system.js'), 'utf8');

test('official report uses true A4 geometry without the legacy scaled wrapper', () => {
  assert.match(source, /\.report-sheet\{position:relative;width:210mm;height:297mm/);
  assert.match(source, /\.report-page\{position:relative;top:auto;left:auto;width:210mm;height:297mm/);
  assert.doesNotMatch(source, /scale\(\.929293\)/);
  assert.match(source, /@page\{size:A4 portrait;margin:0\}/);
  assert.match(source, /@media print\{html,body\{width:210mm/);
  assert.match(source, /\.report-sheet\{width:210mm;height:297mm;margin:0/);
});

test('sparse report pages are compacted only after real browser measurement', () => {
  assert.match(source, /data-packable="\$\{packable\?"1":"0"\}"/);
  assert.match(source, /function pageFits\(sheet\)/);
  assert.match(source, /function repackA4\(\)/);
  assert.match(source, /content\.scrollHeight>content\.clientHeight\+2/);
  assert.match(source, /report-sheet-auto-packed/);
  assert.match(source, /dataset\.a4Pagination="ready"/);
  assert.doesNotMatch(source, /\.page-content>:is\(\.chart-grid,\.diagnostic-grid,\.findings-grid,\.plan-cards\):last-child/);
  assert.doesNotMatch(source, />\.plan-cards:last-child>\.plan-card\{height:100%\}/);
});

test('report integrity guard rejects any packed page that overflows the footer', () => {
  assert.match(source, /page-overflow:/);
  assert.match(source, /if\(!pageFits\(current\)\)/);
  assert.match(source, /added\.forEach\(node=>node\.remove\(\)\)/);
});

test('report toolbar communicates the actual target paper size', () => {
  assert.match(source, /A4 · 210 × 297 مم/);
  assert.match(source, /طباعة التقرير أو حفظه PDF - A4/);
  assert.match(source, /عند استخدام طابعة PDF اختر حجم الورق A4/);
  assert.doesNotMatch(source, /متوافق A4 وLetter/);
});
