const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'report-system.js'), 'utf8');

test('official report uses true A4 geometry without any scaled wrapper', () => {
  assert.match(source, /\.report-sheet\{position:relative;width:210mm;height:297mm/);
  assert.match(source, /\.report-page\{position:relative;top:auto;left:auto;width:210mm;height:297mm/);
  assert.doesNotMatch(source, /scale\(\.929293\)/);
  assert.match(source, /@page\{size:A4 portrait;margin:0\}/);
  assert.match(source, /@media print\{html,body\{width:210mm/);
});

test('all packable analytical sections use one measured global flow paginator', () => {
  assert.match(source, /const SPLITTABLE_SELECTOR="\.chart-grid,\.diagnostic-grid,\.findings-grid,\.plan-cards,\.tools-grid,\.timeline,\.governance-grid,\.metric-grid"/);
  assert.match(source, /function paginatePackableRun\(run\)/);
  assert.match(source, /function flowPaginateA4\(\)/);
  assert.match(source, /runs\.forEach\(paginatePackableRun\)/);
  assert.match(source, /dataset\.flowPagination="ready"/);
  const start = source.indexOf('function paginatePackableRun');
  const end = source.indexOf('function integrity', start);
  const flow = source.slice(start, end);
  assert.doesNotMatch(flow, /student_work|survey|scores|supervision|multi_subject/);
  assert.doesNotMatch(source, /function repackA4\(/);
});

test('flow paginator can split reusable grids at card boundaries while keeping sections legible', () => {
  assert.match(source, /function isSplittableContainer\(node\)/);
  assert.match(source, /function refreshFragment\(container\)/);
  assert.match(source, /function continuationLabel\(heading,section\)/);
  assert.match(source, /flow-continuation-label/);
  assert.match(source, /report-sheet-flow-packed \.diagnostic-card/);
  assert.match(source, /report-sheet-flow-packed \.finding-card/);
  assert.match(source, /report-sheet-flow-packed \.plan-card/);
});

test('report integrity guard rejects page, ranking, chart and plan overflow after flow pagination', () => {
  assert.match(source, /page-overflow:/);
  assert.match(source, /ranking-clip:/);
  assert.match(source, /plan-clip:/);
  assert.match(source, /Taqareer chart integrity failed/);
  assert.match(source, /if\(pageFits\(sheet\)\)/);
});

test('automatic printing waits for measured flow pagination and toolbar states true A4', () => {
  assert.match(source, /A4 · 210 × 297 مم/);
  assert.match(source, /طباعة التقرير أو حفظه PDF - A4/);
  assert.match(source, /dataset\.flowPagination==="ready"/);
  assert.match(source, /printWhenReady/);
});
