const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets', 'setup-policy.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'setup-policy.js' });
const policy = sandbox.window.TaqareerSetupPolicy;

test('all known supervision indicator families receive meaningful public labels without duplicate placeholders', () => {
  const plan = policy.resolvePlan({
    semanticFamilies: ['indicator_analysis', 'domain_comparison', 'priority_analysis', 'mean_mode_consistency', 'unknown_family'],
    fallbackPlan: ['خطة نمو مهني ودورة متابعة'],
    maxItems: 4,
  });
  assert.deepEqual([...plan], [
    'تحليل المؤشرات وترتيب الفجوات',
    'مقارنة المجالات وترتيب الفجوات',
    'ترتيب أولويات التحسين وفق حجم الفجوة',
    'فحص اتساق المتوسط مع القيمة الأكثر تكرارًا',
  ]);
  assert.ok(!plan.some(item => /مسار تحليلي/.test(item)));
});

test('unknown semantic families are ignored and the type fallback plan fills the setup instead of repeating a generic label', () => {
  const plan = policy.resolvePlan({
    semanticFamilies: ['future_unknown_a', 'future_unknown_b'],
    fallbackPlan: ['تحليل المؤشرات وترتيب الفجوات', 'مصفوفة أولوية الأثر والجهد'],
    maxItems: 4,
  });
  assert.deepEqual([...plan], ['تحليل المؤشرات وترتيب الفجوات', 'مصفوفة أولوية الأثر والجهد']);
});

test('ordinal indicator setup never describes its evidence as a total-score mastery calculation', () => {
  const result = policy.evidencePolicy({
    typeId: 'supervision_indicator',
    semanticProfile: { shape: 'ordinal_indicator_summary', dataNature: 'aggregated_ordinal_indicators', measureType: 'ordinal_mean' },
    narrativeMode: false,
    requiresScoreSettings: false,
  });
  assert.equal(result.title, 'الحسابات والأدلة المؤشرية');
  assert.equal(result.items.length, 4);
  assert.ok(result.items.some(item => /دلالة المقياس/.test(item)));
  assert.ok(result.items.every(item => !/الدرجة الكلية/.test(item)));
  assert.ok(result.items.every(item => !/نسبة الإتقان/.test(item)));
});

test('score datasets retain mastery wording only when score settings are actually required', () => {
  const result = policy.evidencePolicy({
    typeId: 'single_subject',
    semanticProfile: { shape: 'student_score_table', dataNature: 'individual_scores' },
    requiresScoreSettings: true,
  });
  assert.equal(result.title, 'الحسابات والأدلة');
  assert.ok(result.items.some(item => /الإتقان/.test(item)));
  assert.ok(result.items.some(item => /الدرجة الكلية/.test(item)));
});

test('narrative and level-distribution documents receive structure-aware evidence policies', () => {
  const narrative = policy.evidencePolicy({ typeId: 'supervision_narrative', semanticProfile: { dataNature: 'narrative' }, narrativeMode: true });
  assert.equal(narrative.title, 'الأدلة البنيوية والسردية');
  assert.ok(narrative.items.some(item => /دون تحويل النص إلى جدول درجات/.test(item)));

  const levels = policy.evidencePolicy({ typeId: 'level_distribution', semanticProfile: { shape: 'aggregated_level_distribution' } });
  assert.equal(levels.title, 'الحسابات والأدلة التوزيعية');
  assert.ok(levels.items.some(item => /دون اختراع درجات فردية/.test(item)));
});
