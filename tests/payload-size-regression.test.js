const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','aaaa-scores.json'),'utf8'));
const root=path.join(__dirname,'..');
const sandbox={window:{},console,Intl,Date,Math,Set,Map,structuredClone,Array,Object,String,Number,RegExp,JSON};
vm.createContext(sandbox);
for(const file of ['mastery-metrics.js','deep-analysis.js']) vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
const rows=fixture.scores.map((score,index)=>({م:index+1,'اسم الطالب':`طالب ${index+1}`,'عنصر المادة':'اختبار','درجة عنصر المادة':score,'ملاحظات':''}));
const analysis=sandbox.window.TaqareerDeepAnalytics.analyze({typeId:'assessment_component',headers:Object.keys(rows[0]),rows,scoreColumn:'درجة عنصر المادة',maxScore:40,thresholdPct:75});
const oldPayload={data:{headers:Object.keys(rows[0]),rows:rows.slice(0,220)},deterministicAnalysis:analysis};
const compact={
  data:{headers:Object.keys(rows[0]),sampleRows:[...rows.slice(0,8),...rows.slice(-8)],rowCount:rows.length,sentRowCount:16},
  deterministicAnalysis:{
    version:analysis.version,kind:analysis.kind,analysisProfile:analysis.analysisProfile,
    metrics:analysis.metrics.slice(0,28),charts:analysis.charts.slice(0,8).map(c=>({...c,data:(c.data||[]).slice(0,24)})),
    diagnosticSections:analysis.diagnosticSections.slice(0,8),findings:analysis.findings.slice(0,10),
    qualityTools:analysis.qualityTools.slice(0,8),improvementPlan:analysis.improvementPlan.slice(0,8),
    monitoringPlan:analysis.monitoringPlan.slice(0,8),limitations:analysis.limitations.slice(0,12)
  }
};
const oldChars=JSON.stringify(oldPayload).length;
const newChars=JSON.stringify(compact).length;
assert.ok(newChars < oldChars * 0.55,`expected payload under 55%; old=${oldChars}, new=${newChars}`);
assert.strictEqual(compact.data.sentRowCount,16);
assert.strictEqual(analysis.n,268);
console.log(`PASS payload reduced from ${oldChars} to ${newChars} chars (${(newChars/oldChars*100).toFixed(1)}%) while full 268-record calculations remain local`);
