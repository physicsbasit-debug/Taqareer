const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const {webcrypto}=require('crypto');

class StorageMock {
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(String(key),String(value));}
  removeItem(key){this.map.delete(String(key));}
}

const root=path.join(__dirname,'..');
const sandbox={window:{},console,structuredClone,JSON,Math,Date,Set,Map,Object,Array,String,Number,WeakSet,TextEncoder,crypto:webcrypto,performance,localStorage:new StorageMock(),setTimeout,clearTimeout};
sandbox.globalThis=sandbox; sandbox.window=sandbox;
vm.createContext(sandbox);
for(const file of ['performance-pipeline.js','deep-analysis-orchestrator.js']){
  vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
}
const api=sandbox.TaqareerDeepOrchestrator;
assert.strictEqual(api.VERSION,'0.9.3');
assert.strictEqual(api.RECOVERY_VERSION,'1.0.0');

const contract={
  version:'3.0.0',family:'scores',rules:{maxDeepAnalysisUnits:4,maxPatches:24},
  executive:{id:'executive',allowedFields:[]},profile:{id:'profile',allowedFields:[]},
  deepAnalysisTargets:[{id:'diagnostic.a',title:'أ',currentAnalysis:'محلي',evidenceRefs:['metric:n']}],
  patchTargets:{findings:[{id:'finding.a',allowedFields:['educationalImpact']}],interventions:[{id:'intervention.a',allowedFields:['action']}],qualityTools:[],monitoring:[{id:'monitoring.a',allowedFields:['measure']}]}
};
const basePayload={locale:'ar-OM',source:{name:'x'},recognizedType:{id:'assessment_component'},quality:{},privacy:{},data:{sampleRows:[{_evidenceRef:'row:1'}],rowCount:1},deterministicAnalysis:{metrics:[{id:'n',value:1,evidenceRef:'metric:n'}],charts:[],evidenceCatalog:[{ref:'metric:n',text:'1'}]},reconciliationContract:contract,availableEvidenceRefs:['metric:n','row:1']};

function response(segment){
  return {result:{contractVersion:'4.0.0',segment,deepAnalysisUnits:[],patches:[],additionalCautions:[],missingDataRequests:[],validation:{}},model:'mock',clientTiming:{durationMs:1}};
}

(async()=>{
  const calls={diagnostic:0,findings:0,interventions:0,governance:0};
  const progress=[];
  const ai={async enrichSegmentDetailed(payload){
    calls[payload.segment]++;
    if(payload.segment==='governance' && calls.governance<3){
      const error=new Error('توقف جزء governance عند حد الإخراج. فشلت المحاولة المختصرة لهذا الجزء أيضًا.');
      error.status=503; error.code='SEGMENT_OUTPUT_EXHAUSTED'; error.retryable=true;
      throw error;
    }
    return response(payload.segment);
  }};
  const result=await api.run({
    basePayload,ai,performanceApi:sandbox.TaqareerPerformance,
    recoveryPolicy:{enabled:true,maxAutomaticRetries:2,delaysMs:[0,0],jitterMs:0},
    onProgress:value=>progress.push(value.statuses)
  });
  assert.strictEqual(result.allSucceeded,true);
  assert.strictEqual(result.partialSuccess,false);
  assert.deepStrictEqual(calls,{diagnostic:1,findings:1,interventions:1,governance:3});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.automaticRecovery.recoveredSegments)),['governance']);
  assert.strictEqual(result.automaticRecovery.automaticRetriesUsed,2);
  assert.ok(progress.some(statuses=>statuses.governance?.status==='recovery_wait'));
  assert.ok(progress.some(statuses=>statuses.governance?.status==='recovering'));

  const authCalls={diagnostic:0,findings:0,interventions:0,governance:0};
  const authAi={async enrichSegmentDetailed(payload){
    authCalls[payload.segment]++;
    if(payload.segment==='governance'){
      const error=new Error('رمز الوصول غير صحيح.'); error.status=401; error.retryable=false; throw error;
    }
    return response(payload.segment);
  }};
  const authResult=await api.run({basePayload,ai:authAi,performanceApi:sandbox.TaqareerPerformance,recoveryPolicy:{enabled:true,maxAutomaticRetries:2,delaysMs:[0,0],jitterMs:0},force:true});
  assert.strictEqual(authResult.partialSuccess,true);
  assert.strictEqual(authCalls.governance,1,'non-retryable authentication failures must not loop');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(authResult.automaticRecovery.nonRetryableSegments)),['governance']);
  console.log('PASS automatic recovery retries only transient failed segments, preserves successes, and stops on non-retryable errors');
})().catch(error=>{console.error(error);process.exit(1);});
