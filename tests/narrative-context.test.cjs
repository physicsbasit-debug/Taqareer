const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'mastery-metrics.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'visualization-policy.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'deep-analysis.js'), 'utf8'), sandbox);

test('aggregated narrative reports contextual variation without declaring confirmed contradiction', () => {
  const analysis = sandbox.window.TaqareerDeepAnalytics.analyze({
    typeId: 'supervision_narrative',
    headers: ['م', 'القسم', 'النص'],
    rows: [
      { 'م': 1, 'القسم': 'جوانب الإجادة', 'النص': 'وظف المعلم التعلم التعاوني بصورة فعالة وقسم الطلبة إلى مجموعات متوازنة.' },
      { 'م': 2, 'القسم': 'جوانب التطوير', 'النص': 'لم تطبق مهارة التعلم التعاوني مما قلل فرص مشاركة الطلبة ضمن مجموعات.' },
      { 'م': 3, 'القسم': 'جوانب الإجادة', 'النص': 'استخدم المعلم السبورة التفاعلية ومصادر رقمية بصورة متميزة.' },
      { 'م': 4, 'القسم': 'جوانب التطوير', 'النص': 'اقتصر استخدام المصادر التعليمية على الكتاب المدرسي مع غياب الوسائط التقنية.' },
      { 'م': 5, 'القسم': 'الدعم المقدم', 'النص': 'تقديم دعم إشرافي لتوسيع استخدام المصادر الرقمية خلال أسبوعين.' },
      { 'م': 6, 'القسم': 'التوصيات', 'النص': 'تنفيذ زيارة لاحقة للتحقق من التطبيق وتوثيق أثره.' },
    ],
    narrativeText: '',
    sourceMeta: {
      metadata: { aggregatedReport: true },
      documentContext: { aggregatedReport: true, entityScope: 'aggregated-multiple-visits-or-teachers' }
    }
  });
  assert.equal(analysis.contradictions.length, 0);
  assert.ok(analysis.contextualVariations.length >= 2);
  assert.ok(analysis.contextualVariations.every(item => /تباين سياقي/.test(item.status)));
  const metric = analysis.metrics.find(item => item.id === 'contextVariationCount');
  assert.equal(metric.value, analysis.contextualVariations.length);
  assert.match(analysis.limitations.join(' '), /لا يُعتمد التعارض إلا بعد ثبوت وحدة المعلم والزيارة والزمن/);
});
