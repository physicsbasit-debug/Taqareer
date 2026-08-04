const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const {webcrypto}=require('crypto');

class StorageMock { constructor(){this.map=new Map();} getItem(k){return this.map.has(k)?this.map.get(k):null;} setItem(k,v){this.map.set(String(k),String(v));} removeItem(k){this.map.delete(String(k));} }
const root=path.join(__dirname,'..');
const sandbox={window:{},console,structuredClone,JSON,Math,Date,Set,Map,Object,Array,String,Number,WeakSet,TextEncoder,crypto:webcrypto,performance,localStorage:new StorageMock(),setTimeout,clearTimeout};
sandbox.globalThis=sandbox;sandbox.window=sandbox;vm.createContext(sandbox);
for(const file of ['performance-pipeline.js','deep-analysis-orchestrator.js']) vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
const api=sandbox.TaqareerDeepOrchestrator;
assert.strictEqual(api.VERSION,'0.9.4');
assert.strictEqual(api.PROTOCOL_VERSION,'4.1.0');
assert.strictEqual(api.ISOLATION_VERSION,'1.0.0');

const contract={
  version:'3.0.0',family:'scores',rules:{maxDeepAnalysisUnits:4,maxPatches:24},
  executive:{id:'executive',allowedFields:['executiveSummary'],title:'x',summary:'y'},profile:{id:'profile',allowedFields:['method'],method:'m'},
  deepAnalysisTargets:[1,2,3,4].map(n=>({id:`diagnostic.${n}`,title:`د${n}`,currentAnalysis:'محلي',evidenceRefs:['metric:n']})),
  patchTargets:{
    findings:[1,2,3,4,5].map(n=>({id:`finding.${n}`,allowedFields:['educationalImpact'],title:`ن${n}`,evidenceRefs:['metric:n']})),
    interventions:[1,2,3,4].map(n=>({id:`intervention.${n}`,allowedFields:['action'],issue:`ف${n}`})),
    qualityTools:[{id:'tool.a',allowedFields:['interpretation'],name:'أداة'}],
    monitoring:[{id:'monitoring.a',allowedFields:['measure'],stage:'متابعة'}]
  }
};
const basePayload={locale:'ar-OM',source:{name:'x'},recognizedType:{id:'assessment_component'},quality:{},privacy:{},data:{sampleRows:[{_evidenceRef:'row:1'}],rowCount:1},deterministicAnalysis:{metrics:[{id:'n',value:1,evidenceRef:'metric:n'}],charts:[],evidenceCatalog:[{ref:'metric:n',text:'1'}]},reconciliationContract:contract,availableEvidenceRefs:['metric:n','row:1']};

const initial=api.initialTasks();
assert.deepStrictEqual(JSON.parse(JSON.stringify(initial.map(t=>t.id))),['diagnostic.full','findings.full','interventions.full','governance.quality','governance.monitoring']);
assert.strictEqual(api.buildTaskPayload(basePayload,initial[3]).reconciliationContract.patchTargets.qualityTools.length,1);
assert.strictEqual(api.buildTaskPayload(basePayload,initial[3]).reconciliationContract.patchTargets.monitoring.length,0);
assert.strictEqual(api.buildTaskPayload(basePayload,initial[4]).reconciliationContract.patchTargets.monitoring.length,1);

const calls=[];
const ai={async enrichSegmentDetailed(payload){
  calls.push(payload.taskId);
  if(payload.taskId==='findings.full'){
    const e=new Error('توقفت مهمة findings.full عند حد الإخراج.');e.status=503;e.code='SEGMENT_OUTPUT_EXHAUSTED';e.retryable=true;e.failureType='output_exhausted';e.details={failureType:'output_exhausted',taskId:payload.taskId};throw e;
  }
  return {result:{contractVersion:'4.1.0',segment:payload.segment,deepAnalysisUnits:[],patches:[],additionalCautions:[],missingDataRequests:[],validation:{}},model:'test',clientTiming:{durationMs:1}};
}};

(async()=>{
  const result=await api.run({basePayload,ai,performanceApi:sandbox.TaqareerPerformance,isolationPolicy:{concurrency:3,transientRetries:0}});
  assert.strictEqual(result.allSucceeded,true);
  assert.ok(calls.includes('findings.full'));
  assert.ok(calls.includes('findings.batch1'));
  assert.ok(calls.includes('findings.batch2'));
  assert.strictEqual(calls.filter(x=>x==='findings.full').length,1,'failed full payload must not be repeated identically');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.automaticRecovery.isolatedSegments)),['findings']);
  assert.strictEqual(result.failedTaskIds.length,0);
  assert.strictEqual(result.succeededSegments.length,4);
  console.log('PASS orchestrator isolates governance by design and decomposes content failures instead of repeating the same request');
})().catch(e=>{console.error(e);process.exit(1);});
