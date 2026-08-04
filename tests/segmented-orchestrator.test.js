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
const sandbox={window:{},console,structuredClone,JSON,Math,Date,Set,Map,Object,Array,String,Number,WeakSet,TextEncoder,crypto:webcrypto,performance,localStorage:new StorageMock()};
sandbox.globalThis=sandbox; sandbox.window=sandbox;
vm.createContext(sandbox);
for(const file of ['performance-pipeline.js','deep-analysis-orchestrator.js']){
  vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
}
const api=sandbox.TaqareerDeepOrchestrator;
assert.strictEqual(api.VERSION,'0.9.2');
assert.strictEqual(api.PROTOCOL_VERSION,'4.0.0');
const contract={
  version:'3.0.0',family:'scores',rules:{maxDeepAnalysisUnits:4,maxPatches:24,lockedCounts:{findings:5,interventions:4,monitoring:4}},
  executive:{id:'executive',allowedFields:['executiveSummary'],title:'x',summary:'y'},
  profile:{id:'profile',allowedFields:['method'],method:'m'},
  deepAnalysisTargets:[{id:'diagnostic.a',title:'أ',currentAnalysis:'محلي',evidenceRefs:['metric:n']}],
  patchTargets:{
    findings:[{id:'finding.a',allowedFields:['educationalImpact'],title:'أ',evidenceRefs:['metric:n']}],
    interventions:[{id:'intervention.a',allowedFields:['action'],issue:'فجوة'}],
    qualityTools:[{id:'tool.a',allowedFields:['interpretation'],name:'أداة'}],
    monitoring:[{id:'monitoring.a',allowedFields:['measure'],stage:'متابعة'}]
  }
};
const basePayload={locale:'ar-OM',source:{name:'x'},recognizedType:{id:'assessment_component'},quality:{},privacy:{},data:{sampleRows:[{_evidenceRef:'row:1'}],rowCount:1},deterministicAnalysis:{metrics:[{id:'n',value:1,evidenceRef:'metric:n'}],charts:[],evidenceCatalog:[{ref:'metric:n',text:'1'}]},reconciliationContract:contract,availableEvidenceRefs:['metric:n','row:1']};
assert.strictEqual(api.buildSegmentPayload(basePayload,'diagnostic').reconciliationContract.deepAnalysisTargets.length,1);
assert.strictEqual(api.buildSegmentPayload(basePayload,'diagnostic').reconciliationContract.patchTargets.findings.length,0);
assert.strictEqual(api.buildSegmentPayload(basePayload,'findings').reconciliationContract.patchTargets.findings.length,1);
assert.strictEqual(api.buildSegmentPayload(basePayload,'interventions').data.mode,'derived-evidence-only');

let calls=[];
const ai={
  async enrichSegmentDetailed(payload){
    calls.push(payload.segment);
    if(payload.segment==='governance') throw new Error('temporary governance failure');
    const result={contractVersion:'4.0.0',segment:payload.segment,deepAnalysisUnits:[],patches:[],additionalCautions:[],missingDataRequests:[],validation:{}};
    if(payload.segment==='diagnostic') result.deepAnalysisUnits=[{targetId:'diagnostic.a',analysis:'تحليل عميق',evidenceRefs:['metric:n'],confidence:'مرتفعة',implications:[],alternativeExplanations:[],limitations:[],dataRequests:[]}];
    if(payload.segment==='findings') result.patches=[{targetType:'finding',targetId:'finding.a',field:'educationalImpact',text:'أثر',items:[],evidenceRefs:['metric:n']}];
    if(payload.segment==='interventions') result.patches=[{targetType:'intervention',targetId:'intervention.a',field:'action',text:'إجراء',items:[],evidenceRefs:['metric:n']}];
    return {result,model:'test',serverTiming:{segment:payload.segment},clientTiming:{durationMs:5}};
  }
};
(async()=>{
  const first=await api.run({basePayload,ai,performanceApi:sandbox.TaqareerPerformance});
  assert.strictEqual(first.partialSuccess,true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first.failedSegments)),['governance']);
  assert.strictEqual(first.delta.deepAnalysisUnits.length,1);
  assert.strictEqual(first.delta.patches.length,2);
  assert.strictEqual(first.succeededSegments.length,3);
  const previous=first.results;
  ai.enrichSegmentDetailed=async payload=>({result:{contractVersion:'4.0.0',segment:payload.segment,deepAnalysisUnits:[],patches:[{targetType:'monitoring',targetId:'monitoring.a',field:'measure',text:'قياس',items:[],evidenceRefs:['metric:n']}],additionalCautions:[],missingDataRequests:[],validation:{}},model:'test',clientTiming:{durationMs:3}});
  const second=await api.run({basePayload,ai,performanceApi:sandbox.TaqareerPerformance,previousResults:previous,retrySegments:['governance']});
  assert.strictEqual(second.allSucceeded,true);
  assert.strictEqual(second.delta.deepAnalysisUnits.length,1);
  assert.strictEqual(second.delta.patches.length,3);
  console.log('PASS segmented orchestrator runs independent parts, preserves successes and retries only failed parts');
})().catch(error=>{console.error(error);process.exit(1);});
