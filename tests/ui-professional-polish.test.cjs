const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { packageVersion, escapeRegExp } = require('../scripts/version-contract.cjs');

const root = path.resolve(__dirname, '..');
const CURRENT_APP_VERSION = packageVersion(root);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('public workspace hides development clutter and exposes compact review controls', () => {
  const index = read('index.html');
  const app = read('assets/app.js');
  const css = read('assets/styles.css');

  assert.match(index, new RegExp(`v${escapeRegExp(CURRENT_APP_VERSION)}`));
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
  assert.match(index, /class="setup-heading-copy"/);
  assert.match(index, /class="setup-title-line"/);
  assert.match(index, /class="inline-message setup-status-message hidden"/);
  assert.match(index, /class="soft-note info-note"/);
  assert.match(css, /#panel-3 \.setup-grid \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /#panel-3 #measurementCard \.form-grid \{[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /setup-status-message:not\(\.error\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#panel-1 \.format-grid \{[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /textarea:focus, input:focus, select:focus/);
  assert.match(css, /primary:hover:not\(:disabled\)/);
});

test('public terminology normalizes leaked implementation-language fragments', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(read('assets/display-terms.js'), sandbox, { filename: 'display-terms.js' });
  const terms = sandbox.window.TaqareerDisplayTerms;
  assert.equal(terms.publicLabel('level distribution'), 'تحليل توزيع مستويات الأداء');
  assert.equal(terms.publicText('مدة التنفيذ: 6 semanas'), 'مدة التنفيذ: 6 أسابيع');
  assert.equal(terms.publicText('معالجة undefined خلية'), 'معالجة خلية');
});
