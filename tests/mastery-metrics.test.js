const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const code = fs.readFileSync(path.join(__dirname, '..', 'assets', 'mastery-metrics.js'), 'utf8');
const sandbox = { window: {}, console, Math, Number, String, Array, Object, Set, Map, JSON };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const engine = sandbox.window.TaqareerMasteryMetrics;

function close(actual, expected, epsilon = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}
function bandCounts(result) {
  return Object.fromEntries(result.distribution.map(item => [item.key, item.count]));
}
function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; }
}

test('defaults and judgement scale are the Bousla contract', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(engine.DEFAULTS)), {
    masteryCutoffPercent: 75, nearMasteryMargin: 5, deepGapMargin: 15, decimalPlaces: 1
  });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(engine.JUDGEMENT_SCALE.map(x => [x.code, x.minPercent, x.maxPercent]))), [
    ['distinguished',70,100],['good',60,70],['adequate',50,60],['not_adequate',40,50],['rapid_intervention',0,40]
  ]);
});

test('canonical 7 of 12 case', () => {
  const scores = [30,31,35,38,40,32,34,29,27,25,20,18];
  const r = engine.calculate(scores, { totalScore: 40, masteryCutoffPercent: 75 });
  assert.strictEqual(r.summary.masteryCount, 7);
  assert.strictEqual(r.summary.nonMasteryCount, 5);
  close(r.summary.masterySpreadPercentRaw, 7/12*100);
  assert.strictEqual(r.summary.masterySpreadPercent, 58.3);
  assert.strictEqual(r.judgement.code, 'adequate');
  assert.strictEqual(r.judgement.label, 'ملائم');
  assert.deepStrictEqual(bandCounts(r), { mastery:7, near_mastery:1, moderate_gap:2, deep_gap:2 });
  assert.strictEqual(r.gapToNextLevel.requiredSpreadPercent, 60);
  assert.strictEqual(r.gapToNextLevel.requiredMasteryCount, 8);
  assert.strictEqual(r.gapToNextLevel.additionalStudentsNeeded, 1);
});

test('raw spread controls judgement while rounded value is display only', () => {
  const scores = [...Array(699).fill(75), ...Array(300).fill(0)];
  const r = engine.calculate(scores, { totalScore: 100, masteryCutoffPercent: 75 });
  close(r.summary.masterySpreadPercentRaw, 699/999*100);
  assert.strictEqual(r.summary.masterySpreadPercent, 70.0);
  assert.strictEqual(r.judgement.code, 'good');
});

test('1499 of 2000 is below a 75 percent cutoff', () => {
  const r = engine.calculate([1499], { totalScore: 2000, masteryCutoffPercent: 75 });
  assert.strictEqual(r.summary.masteryCount, 0);
  assert.strictEqual(r.summary.nonMasteryCount, 1);
});

test('judgement boundaries use raw values', () => {
  const cases = [
    [40, 'not_adequate'], [50, 'adequate'], [60, 'good'], [70, 'distinguished']
  ];
  for (const [mastered, expected] of cases) {
    const scores = [...Array(mastered).fill(75), ...Array(100-mastered).fill(0)];
    assert.strictEqual(engine.calculate(scores, { totalScore:100 }).judgement.code, expected);
  }
});

test('actual Ministry aaaa.xlsx regression', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'aaaa-scores.json'), 'utf8'));
  const r = engine.calculate(fixture.scores, { totalScore:fixture.totalScore, masteryCutoffPercent:fixture.masteryCutoffPercent });
  const e = fixture.expected;
  assert.strictEqual(r.validation.validCount, e.validCount);
  assert.strictEqual(r.summary.masteryCount, e.masteryCount);
  assert.strictEqual(r.summary.nonMasteryCount, e.nonMasteryCount);
  close(r.summary.masterySpreadPercentRaw, e.masterySpreadPercentRaw);
  assert.strictEqual(r.summary.masterySpreadPercent, e.masterySpreadPercent);
  assert.strictEqual(r.judgement.code, e.judgementCode);
  assert.strictEqual(r.judgement.label, e.judgementLabel);
  assert.deepStrictEqual(bandCounts(r), e.distributionCounts);
  assert.strictEqual(r.gapToNextLevel.requiredMasteryCount, e.nextLevelRequiredMasteryCount);
  assert.strictEqual(r.gapToNextLevel.additionalStudentsNeeded, e.additionalStudentsNeeded);
  assert.strictEqual(r.distribution.reduce((sum,item)=>sum+item.percent,0), 100);
});

test('Arabic numerals and invalid records are explicit', () => {
  const r = engine.calculate(['٣٠','٢٩','نص','-1','41'], { totalScore:40, masteryCutoffPercent:75 });
  assert.strictEqual(r.validation.validCount, 2);
  assert.strictEqual(r.validation.invalidCount, 3);
  assert.strictEqual(r.summary.masteryCount, 1);
});

console.log('ALL MASTERY CONTRACT TESTS PASSED');
