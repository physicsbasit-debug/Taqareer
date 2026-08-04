const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ts=require('typescript');
const assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','supabase','functions','analyze-educational-form','index.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let handler=null;
let fetchCalls=0;
const validDelta={
  contractVersion:'3.0.0',
  deepAnalysisUnits:[{targetId:'diagnostic.a',analysis:'قراءة تربوية عميقة تربط النمط بالأثر والقرار دون إعادة الحساب.',evidenceRefs:['metric:n'],confidence:'مرتفعة',implications:['تدخل متمايز.'],alternativeExplanations:['صعوبة الأداة قد تسهم في النمط.'],limitations:['لا توجد بيانات مهارية.'],dataRequests:['تحليل المفردات.']}],
  patches:[{targetType:'finding',targetId:'finding.a',field:'educationalImpact',text:'أثر تربوي محسن.',items:[],evidenceRefs:['metric:n']}],
  additionalCautions:[],missingDataRequests:[]
};
const sandbox={
  console,crypto,TextEncoder,Uint8Array,performance,structuredClone,Request,Response,Headers,setTimeout,clearTimeout,Math,JSON,
  Deno:{env:{get:(name)=>({GEMINI_API_KEY:'test-key',GEMINI_MODEL:'gemini-2.5-flash',TAQAREER_ALLOWED_ORIGINS:'*',TAQAREER_ACCESS_CODE:''}[name])},serve:(fn)=>{handler=fn;}},
  fetch:async()=>{
    fetchCalls+=1;
    const body=fetchCalls===1
      ? {candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"contractVersion":"3.0.0"'}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:4800}}
      : {modelVersion:'gemini-test',candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(validDelta)}]}}],usageMetadata:{promptTokenCount:80,thoughtsTokenCount:50,candidatesTokenCount:300}};
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json','x-request-id':`req-${fetchCalls}`}});
  }
};
vm.createContext(sandbox);vm.runInContext(js,sandbox);
assert.ok(handler,'Deno.serve handler was not captured');
(async()=>{
  const payload={
    reconciliationContract:{version:'3.0.0',rules:{maxDeepAnalysisUnits:4,maxPatches:24},deepAnalysisTargets:[{id:'diagnostic.a'}],patchTargets:{findings:[{id:'finding.a',allowedFields:['educationalImpact']}],qualityTools:[],interventions:[],monitoring:[]},executive:{id:'executive',allowedFields:['executiveTitle','executiveSummary']},profile:{id:'profile',allowedFields:['method'] }},
    deterministicAnalysis:{metrics:[{id:'n',value:268}],charts:[],evidenceCatalog:[{ref:'metric:n',text:'268'}]},
    availableEvidenceRefs:['metric:n'],data:{sampleRows:[{n:1}]}
  };
  const request=new Request('https://edge.test/functions/v1/analyze-educational-form',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.test'},body:JSON.stringify({operation:'enrich',payload})});
  const response=await handler(request);const body=await response.json();
  assert.strictEqual(response.status,200,JSON.stringify(body));
  assert.strictEqual(fetchCalls,2,'MAX_TOKENS must trigger one compact semantic retry');
  assert.strictEqual(body.serverTiming.attemptNumber,2);
  assert.strictEqual(body.serverTiming.compactRetryUsed,true);
  assert.strictEqual(body.serverTiming.acceptedDeepAnalysisUnits,1);
  assert.strictEqual(body.serverTiming.acceptedPatches,1);
  assert.strictEqual(body.result.contractVersion,'3.0.0');
  console.log('PASS edge retries once in compact mode after MAX_TOKENS and returns validated deep delta');
})().catch(error=>{console.error(error);process.exit(1);});
