const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ts=require('typescript');
const assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','supabase','functions','analyze-educational-form','index.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let handler=null;
const attempts={};
const sandbox={
  console,crypto,TextEncoder,Uint8Array,performance,structuredClone,Request,Response,Headers,setTimeout,clearTimeout,Math,JSON,
  Deno:{env:{get:(name)=>({GEMINI_API_KEY:'test-key',GEMINI_MODEL:'gemini-2.5-flash',TAQAREER_ALLOWED_ORIGINS:'*',TAQAREER_ACCESS_CODE:''}[name])},serve:(fn)=>{handler=fn;}},
  fetch:async(_url,options)=>{
    const request=JSON.parse(options.body);
    const text=request.contents?.[0]?.parts?.[0]?.text||'';
    const match=text.match(/"segment":"([^"]+)"/);
    const segment=match?match[1]:'unknown';
    attempts[segment]=(attempts[segment]||0)+1;
    if(segment==='findings' && attempts[segment]===1){
      return new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"segment":"findings"'}]}}],usageMetadata:{}}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    const result={contractVersion:'4.1.0',segment,deepAnalysisUnits:[],patches:[],additionalCautions:[],missingDataRequests:[]};
    if(segment==='diagnostic') result.deepAnalysisUnits=[{targetId:'diagnostic.a',analysis:'تحليل تربوي عميق',evidenceRefs:['metric:n'],confidence:'مرتفعة',implications:['أثر'],alternativeExplanations:['بديل'],limitations:['حد'],dataRequests:['طلب']}];
    if(segment==='findings') result.patches=[{targetType:'finding',targetId:'finding.a',field:'educationalImpact',text:'أثر تربوي',items:[],evidenceRefs:['metric:n']}];
    if(segment==='interventions') result.patches=[{targetType:'intervention',targetId:'intervention.a',field:'action',text:'إجراء تنفيذي',items:[],evidenceRefs:['metric:n']}];
    if(segment==='governance') result.patches=[{targetType:'monitoring',targetId:'monitoring.a',field:'measure',text:'قياس أسبوعي',items:[],evidenceRefs:['metric:n']}];
    return new Response(JSON.stringify({modelVersion:'gemini-test',candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}],usageMetadata:{promptTokenCount:50,candidatesTokenCount:100}}),{status:200,headers:{'Content-Type':'application/json','x-request-id':`req-${segment}-${attempts[segment]}`}});
  }
};
vm.createContext(sandbox);vm.runInContext(js,sandbox);
assert.ok(handler,'handler missing');
function payload(segment){
  const contracts={
    diagnostic:{deepAnalysisTargets:[{id:'diagnostic.a'}],patchTargets:{findings:[],interventions:[],qualityTools:[],monitoring:[]}},
    findings:{deepAnalysisTargets:[],patchTargets:{findings:[{id:'finding.a',allowedFields:['educationalImpact']}],interventions:[],qualityTools:[],monitoring:[]},executive:{id:'executive',allowedFields:[]},profile:{id:'profile',allowedFields:[]}},
    interventions:{deepAnalysisTargets:[],patchTargets:{findings:[],interventions:[{id:'intervention.a',allowedFields:['action']}],qualityTools:[],monitoring:[]}},
    governance:{deepAnalysisTargets:[],patchTargets:{findings:[],interventions:[],qualityTools:[],monitoring:[{id:'monitoring.a',allowedFields:['measure']}]}}
  };
  return {segment,reconciliationContract:{version:'3.0.0',rules:{maxDeepAnalysisUnits:4,maxPatches:18},...contracts[segment]},deterministicAnalysis:{metrics:[{id:'n',value:268}],charts:[],evidenceCatalog:[{ref:'metric:n',text:'268'}]},availableEvidenceRefs:['metric:n'],data:{sampleRows:[{n:1}]}};
}
(async()=>{
  for(const segment of ['diagnostic','findings','interventions','governance']){
    const request=new Request('https://edge.test/functions/v1/analyze-educational-form',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.test'},body:JSON.stringify({operation:'enrich_segment',payload:payload(segment)})});
    const response=await handler(request); const body=await response.json();
    assert.strictEqual(response.status,200,JSON.stringify(body));
    assert.strictEqual(body.result.segment,segment);
    assert.strictEqual(body.serverTiming.segment,segment);
    assert.strictEqual(body.serverTiming.responseSchemaSent,false);
  }
  assert.strictEqual(attempts.findings,2,'findings MAX_TOKENS should retry only that segment');
  assert.strictEqual(attempts.diagnostic,1);
  console.log('PASS edge segmented enrichment isolates outputs and retries only the truncated segment');
})().catch(error=>{console.error(error);process.exit(1);});
