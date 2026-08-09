const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('public workspace hides development clutter and exposes compact review controls', () => {
  const index = read('index.html');
  const app = read('assets/app.js');
  const css = read('assets/styles.css');

  assert.match(index, /v1\.2\.44/);
  assert.match(index, /id="togglePreviewColumnsBtn"/);
  assert.match(index, /id="qualityDetails"/);
  assert.match(index, /خدمة التحليل التربوي/);
  assert.match(index, /تنزيل بيانات التحليل/);
  assert.doesNotMatch(index, /شفافية التطوير|ما يعمل الآن وما يأتي لاحقًا|قلب التحليل الذكي|تنبيهات وحدود التحليل الذكي|تصدير JSON/);
  assert.doesNotMatch(index, /Edge 0\.15\.4/);

  assert.match(app, /document\.body\.dataset\.activeStep/);
  assert.match(app, /reviewHeaders\(\)/);
  assert.match(app, /displaySourceLabel\(\)/);
  assert.match(app, /primaryActionCard/);
  assert.match(css, /body\[data-active-step\]:not\(\[data-active-step="1"\]\) \.hero/);
  assert.match(css, /#improvementPlanSection \.plan-table td::before/);
  assert.match(index, /class="setup-support-grid"/);
  assert.match(index, /class="setup-support-column setup-support-plan"/);
  assert.match(css, /\.setup-support-grid \{/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test('public terminology normalizes leaked implementation-language fragments', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(read('assets/display-terms.js'), sandbox, { filename: 'display-terms.js' });
  const terms = sandbox.window.TaqareerDisplayTerms;
  assert.equal(terms.publicLabel('level distribution'), 'تحليل توزيع مستويات الأداء');
  assert.equal(terms.publicText('مدة التنفيذ: 6 semanas'), 'مدة التنفيذ: 6 أسابيع');
  assert.equal(terms.publicText('معالجة undefined خلية'), 'معالجة خلية');
});
