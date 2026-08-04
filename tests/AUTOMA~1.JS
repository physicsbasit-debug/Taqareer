const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const {webcrypto}=require('crypto');
class StorageMock { constructor(){this.map=new Map();} getItem(k){return this.map.has(k)?this.map.get(k):null;} setItem(k,v){this.map.set(String(k),String(v));} removeItem(k){this.map.delete(String(k));} }
const root=path.join(__dirname,'..');
const sandbox={window:{},console,structuredClone,JSON,Math,Date,Set,Map,Object,Array,String,Number,WeakSet,TextEncoder,crypto:webcrypto,performance,localStorage:new StorageMock(),setTimeout,clearTimeout};sandbox.globalThis=sandbox;sandbox.window=sandbox;vm.createContext(sandbox);
for(const file of ['performance-pipeline.js','deep-analysis-orchestrator.js']) vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
const api=sandbox.TaqareerDeepOrchestrator;
assert.strictEqual(api.VERSION,'0.9.5');
const contract={version:'3.0.0',family:'scores',rules:{maxDeepAnalysisUnits:1,maxPatches:8},executive:{id:'executive',allowedFields:[]},profile:{id:'profile',allowedFields:[]},deepAnalysisTargets:[{id:'diagnostic.a',evidenceRefs:['metric:n']}],patchTargets:{findings:[{id:'finding.a',allowedFields:['educationalImpact']}],interventions:[{id:'intervention.a',allowedFields:['action']}],qualityTools:[{id:'tool.a',name:'أداة أ',allowedFields:['interpretation']}],monitoring:[{id:'monitoring.a',allowedFields:['measure']}]}};
const basePayload={locale:'ar-OM',source:{name:'x'},recognizedType:{id:'assessment_component'},quality:{},privacy:{},data:{rowCount:1,sampleRows:[]},deterministicAnalysis:{metrics:[{id:'n',value:1}],qualityTools:[{id:'tool.a',name:'أداة أ',reason:'سبب',interpretation:'محلي',output:{value:1}}],evidenceCatalog:[{ref:'metric:n',text:'1'}]},reconciliationContract:contract,availableEvidenceRefs:['metric:n']};
function ok(payload){return {result:{contractVersion:'4.2.0',segment:payload.segment,deepAnalysisUnits:[],patches:[],additionalCautions:[],missingDataRequests:[],validation:{}},model:'mock',clientTiming:{durationMs:1}};}
(async()=>{
  const calls={};
  const ai={async enrichSegmentDetailed(payload){
    calls[payload.taskId]=(calls[payload.taskId]||0)+1;
    if(payload.taskId==='quality.tool-a' && calls[payload.taskId]===1){const e=new Error('انتهت مهلة مؤقتة');e.status=503;e.retryable=true;e.failureType='transient';e.details={failureType:'transient'};throw e;}
    return ok(payload);
  }};
  const result=await api.run({basePayload,ai,performanceApi:sandbox.TaqareerPerformance,isolationPolicy:{concurrency:3,qualityConcurrency:2,transientRetries:1,transientDelayMs:0,jitterMs:0}});
  assert.strictEqual(result.allSucceeded,true);
  assert.strictEqual(calls['quality.tool-a'],2,'transient quality microtask gets one bounded retry');
  assert.strictEqual(calls['governance.monitoring'],1,'monitoring is never repeated');
  assert.strictEqual(result.qualityMicrotasks.enhanced,1);

  const badCalls={};
  const badAi={async enrichSegmentDetailed(payload){
    badCalls[payload.taskId]=(badCalls[payload.taskId]||0)+1;
    if(payload.taskId==='quality.tool-a'){const e=new Error('توقف عند حد الإخراج');e.status=503;e.retryable=true;e.failureType='output_exhausted';e.details={failureType:'output_exhausted'};throw e;}
    return ok(payload);
  }};
  const fallback=await api.run({basePayload,ai:badAi,performanceApi:sandbox.TaqareerPerformance,isolationPolicy:{concurrency:3,qualityConcurrency:2,transientRetries:1,transientDelayMs:0,jitterMs:0},force:true});
  assert.strictEqual(fallback.allSucceeded,true,'quality content failure uses local-safe completion');
  assert.strictEqual(fallback.partialSuccess,false);
  assert.strictEqual(badCalls['quality.tool-a'],1,'orchestrator does not repeat content-failed microtask');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(fallback.failedTaskIds)),[]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(fallback.automaticRecovery.localFallbackTasks)),['quality.tool-a']);
  assert.strictEqual(fallback.qualityMicrotasks.localFallback,1);
  console.log('PASS quality microtask retries transient errors once and converts persistent content failure to local-safe completion');
})().catch(e=>{console.error(e);process.exit(1);});
