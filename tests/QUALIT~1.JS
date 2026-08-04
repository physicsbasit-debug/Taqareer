const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),{webcrypto}=require('crypto');
class StorageMock{getItem(){return null;}setItem(){}removeItem(){}}
const root=path.join(__dirname,'..');const sandbox={window:{},console,structuredClone,JSON,Math,Date,Set,Map,Object,Array,String,Number,WeakSet,TextEncoder,crypto:webcrypto,performance,localStorage:new StorageMock(),setTimeout,clearTimeout};sandbox.globalThis=sandbox;sandbox.window=sandbox;vm.createContext(sandbox);
for(const f of ['performance-pipeline.js','mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','deep-analysis-orchestrator.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',f),'utf8'),sandbox);
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','aaaa-scores.json'),'utf8'));
const rows=fixture.scores.map((score,index)=>({م:index+1,'اسم الطالب':`طالب ${index+1}`,'عنصر المادة':'اختبار','درجة عنصر المادة':score}));
const analysis=sandbox.TaqareerDeepAnalytics.analyze({typeId:'assessment_component',headers:['م','اسم الطالب','عنصر المادة','درجة عنصر المادة'],rows,sourceMeta:{},scoreColumn:'درجة عنصر المادة',maxScore:40,thresholdPct:75,quality:{}});
const contract=sandbox.TaqareerReconciliation.buildContract(analysis);
const base={locale:'ar-OM',source:{name:'aaaa.xlsx'},recognizedType:{id:'assessment_component'},quality:{},privacy:{},data:{rowCount:rows.length,sampleRows:rows.slice(0,16)},deterministicAnalysis:analysis,reconciliationContract:contract,availableEvidenceRefs:Object.keys(analysis.evidenceMap||{})};
const tasks=sandbox.TaqareerDeepOrchestrator.initialTasks(sandbox.TaqareerDeepOrchestrator.SEGMENTS,contract);
const sizes=Object.fromEntries(tasks.map(task=>[task.id,JSON.stringify(sandbox.TaqareerDeepOrchestrator.buildTaskPayload(base,task)).length]));
const total=Object.values(sizes).reduce((a,b)=>a+b,0);
assert.strictEqual(tasks.filter(sandbox.TaqareerDeepOrchestrator.isQualityMicrotask).length,6);
assert.ok(total<60000,`aggregate payload ${total} must stay below 60000 chars`);
assert.ok(Math.max(...tasks.filter(sandbox.TaqareerDeepOrchestrator.isQualityMicrotask).map(task=>sizes[task.id]))<5000);
console.log(`PASS real Ministry regression: ${tasks.length} tasks, ${total} aggregate chars, each quality microtask under 5000 chars`);
