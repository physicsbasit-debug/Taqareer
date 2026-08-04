const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const sandbox={window:{},console,Intl,Date,Math,Set,Map,structuredClone,Array,Object,String,Number,RegExp,JSON};
vm.createContext(sandbox);
for(const file of ['mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','report-system.js']){
  vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
}
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','aaaa-scores.json'),'utf8'));
const analysis=sandbox.window.TaqareerDeepAnalytics.analyze({typeId:'assessment_component',headers:['م','درجة عنصر المادة'],rows:fixture.scores.map((score,index)=>({م:index+1,'درجة عنصر المادة':score})),scoreColumn:'درجة عنصر المادة',maxScore:40,thresholdPct:75});
const reconciled=sandbox.window.TaqareerReconciliation.canonicalize(analysis);
const context={analysis:reconciled,type:{name:'درجات مكوّن تقويمي'},sourceName:'aaaa.xlsx · Sheet1',sourceMeta:{reportTitle:'كشف مراجعة إدخال الدرجات لمادة دراسية ( الأحياء ) - الصف التاسع',metadata:{preamble:'المدرسة: الباسط للتعليم الأساسي (8-10) | المادة: الأحياء | الصف: التاسع | العام الدراسي: 2025/2026'}},quality:{completion:100},recognitionStatus:'تصنيف هجين معتمد'};
const data=sandbox.window.TaqareerReports.buildReportData(context);
const html=sandbox.window.TaqareerReports.buildReportHtml(context,{autoPrint:false});
assert.strictEqual(sandbox.window.TaqareerReports.VERSION,'0.9.7');
assert.strictEqual(data.analysis.masteryCount,48);
assert.strictEqual(data.analysis.masteryJudgement.label,'يحتاج إلى تدخل سريع');
assert.ok(html.includes('تقارير v0.9.7'));
assert.ok(html.includes('انتشار الإتقان 17.9%'));
assert.ok(html.includes('تحتاج المجموعة إلى انتقال 60'));
assert.ok(html.includes('حققوا حد الإتقان'));
assert.ok((html.match(/class="report-sheet"/g)||[]).length>=6);
assert.ok(!html.includes('طالب/طلبة'));
console.log('PASS report generation with locked mastery contract');
