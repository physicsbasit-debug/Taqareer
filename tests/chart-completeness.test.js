const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const sandbox={window:{},console,Intl,Date,Math,Set,Map,structuredClone,Array,Object,String,Number,RegExp,JSON};
vm.createContext(sandbox);
for(const file of ['mastery-metrics.js','visualization-policy.js','deep-analysis.js','report-system.js']){
  vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
}
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','aaaa-scores.json'),'utf8'));
const analysis=sandbox.window.TaqareerDeepAnalytics.analyze({
  typeId:'assessment_component',
  headers:['م','درجة عنصر المادة'],
  rows:fixture.scores.map((score,index)=>({م:index+1,'درجة عنصر المادة':score})),
  scoreColumn:'درجة عنصر المادة',
  maxScore:40,
  thresholdPct:75
});
const context={analysis,type:{name:'درجات مكوّن تقويمي'},sourceName:'aaaa.xlsx · Sheet1',sourceMeta:{reportTitle:'كشف مراجعة إدخال الدرجات لمادة دراسية ( الأحياء ) - الصف التاسع',metadata:{preamble:'المدرسة: الباسط للتعليم الأساسي (8-10) | المادة: الأحياء | الصف: التاسع | العام الدراسي: 2025/2026'}},quality:{completion:100},recognitionStatus:'تصنيف هجين معتمد'};
const html=sandbox.window.TaqareerReports.buildReportHtml(context,{autoPrint:false});
const histogram=analysis.charts.find(chart=>chart.id==='score-histogram');
const segments=analysis.charts.find(chart=>chart.id==='intervention-segments');
assert.strictEqual(histogram.data.length,10);
assert.strictEqual(segments.data.length,4);
assert.strictEqual(histogram.data.reduce((s,row)=>s+row.count,0),268);
assert.strictEqual(segments.data.reduce((s,row)=>s+row.count,0),268);
assert.ok(/data-chart-id="score-histogram"[^>]*data-chart-type="histogram"[^>]*data-expected-rows="10"/.test(html));
assert.ok(/data-chart-id="intervention-segments"[^>]*data-chart-type="stacked100"/.test(html));
assert.ok(html.includes('class="stack-track"'));
for(const label of ['24-28','28-32','32-36','36-40','دون الإتقان بفجوة عميقة']) assert.ok(html.includes(label),`missing ${label}`);
assert.ok(html.includes('chartIntegrity'));
assert.ok(html.includes('Taqareer chart integrity failed'));
console.log('PASS chart completeness data and HTML contract');
