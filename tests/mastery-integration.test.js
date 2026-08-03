const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const masteryCode=fs.readFileSync(path.join(root,'assets','mastery-metrics.js'),'utf8');
const deepCode=fs.readFileSync(path.join(root,'assets','deep-analysis.js'),'utf8');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','aaaa-scores.json'),'utf8'));
const sandbox={window:{},console,Intl,Date,Math,Set,Map,structuredClone,Array,Object,String,Number,RegExp,JSON};
vm.createContext(sandbox);vm.runInContext(masteryCode,sandbox);vm.runInContext(deepCode,sandbox);
const rows=fixture.scores.map((score,index)=>({م:index+1,'درجة عنصر المادة':score}));
const result=sandbox.window.TaqareerDeepAnalytics.analyze({
  typeId:'assessment_component',headers:['م','درجة عنصر المادة'],rows,
  scoreColumn:'درجة عنصر المادة',maxScore:fixture.totalScore,thresholdPct:fixture.masteryCutoffPercent
});
assert.strictEqual(result.masteryContractVersion,'1.0.0');
assert.strictEqual(result.n,268);
assert.strictEqual(result.masteryCount,48);
assert.strictEqual(result.nonMasteryCount,220);
assert.strictEqual(result.masteryPctDisplay,17.9);
assert.ok(Math.abs(result.masteryPct-48/268*100)<1e-10);
assert.strictEqual(result.masteryJudgement.code,'rapid_intervention');
assert.strictEqual(result.masteryGapToNextLevel.additionalStudentsNeeded,60);
assert.deepStrictEqual(JSON.parse(JSON.stringify(Object.fromEntries(result.masteryDistribution.map(x=>[x.key,x.count])))),fixture.expected.distributionCounts);
const metricMap=Object.fromEntries(result.metrics.map(x=>[x.id,x.value]));
assert.strictEqual(metricMap.masteryPct,17.9);
assert.strictEqual(metricMap.masteryJudgement,'يحتاج إلى تدخل سريع');
assert.strictEqual(metricMap.additionalStudentsNeeded,60);
assert.ok(result.findings.some(x=>x.title.includes('يحتاج إلى تدخل سريع')));
assert.ok(result.improvementPlan.some(x=>x.issue==='فجوة عميقة'));
console.log('PASS mastery integration with actual Ministry fixture');
