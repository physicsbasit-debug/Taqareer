const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ts=require('typescript');
const assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','supabase','functions','analyze-educational-form','index.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let handler=null;let fetchCalls=0;const fetchUrls=[];let sentBody=null;
const delta={contractVersion:'5.1.0',deepAnalysisUnits:[{targetId:'diagnostic.a',analysis:'قراءة تربوية مركزة وعميقة تربط النمط بالقرار.',evidenceRefs:['metric:n'],confidence:'مرتفعة',implications:['تدخل متمايز'],alternativeExplanations:[],limitations:['لا تتوفر بيانات مهارية'],dataRequests:['تحليل المفردات']}],patches:[{targetType:'finding',targetId:'finding.a',field:'educationalImpact',text:'أثر تربوي محسن.',items:[],evidenceRefs:['metric:n']}],additionalCautions:[],missingDataRequests:[]};
const sandbox={console,crypto,TextEncoder,Uint8Array,performance,structuredClone,Request,Response,Headers,setTimeout,clearTimeout,Math,JSON,
  Deno:{env:{get:(name)=>({GEMINI_API_KEY:'test-key',GEMINI_MODEL:'gemini-2.5-flash',GEMINI_FAST_MODEL:'gemini-2.5-flash-lite',TAQAREER_ALLOWED_ORIGINS:'*',TAQAREER_ACCESS_CODE:''}[name])},serve:(fn)=>{handler=fn;}},
  fetch:async(url,options)=>{fetchCalls++;fetchUrls.push(String(url));sentBody=JSON.parse(options.body);
    if(fetchCalls===1){return new Response(JSON.stringify({error:{message:'This model models/gemini-2.5-flash-lite is no longer available to new users.'}}),{status:404,headers:{'Content-Type':'application/json'}});}
    const body={modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(delta)}]}}],usageMetadata:{promptTokenCount:300,candidatesTokenCount:500}};
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json','x-request-id':'req-fast'}});
  }
};
vm.createContext(sandbox);vm.runInContext(js,sandbox);assert.ok(handler);
(async()=>{
 const payload={reconciliationContract:{version:'3.0.0',rules:{maxDeepAnalysisUnits:4,maxPatches:14},deepAnalysisTargets:[{id:'diagnostic.a'}],patchTargets:{findings:[{id:'finding.a',allowedFields:['educationalImpact']}],qualityTools:[],interventions:[],monitoring:[]},executive:{id:'executive',allowedFields:['executiveSummary']},profile:null},deterministicAnalysis:{metrics:[{id:'n',value:268}],charts:[],evidenceCatalog:[{ref:'metric:n',text:'268'}]},availableEvidenceRefs:['metric:n'],data:{sampleRows:[{n:1}]}};
 const request=new Request('https://edge.test/functions/v1/analyze-educational-form',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.test'},body:JSON.stringify({operation:'enhance_fast',payload})});
 const response=await handler(request);const body=await response.json();
 assert.strictEqual(response.status,200,JSON.stringify(body));
 assert.strictEqual(fetchCalls,2,'unavailable configured model must fall back automatically once');
 assert.ok(fetchUrls[0].includes('gemini-2.5-flash-lite'));
 assert.ok(fetchUrls[1].includes('gemini-3.5-flash-lite'));
 assert.ok(!('thinkingConfig' in sentBody.generationConfig));
 assert.strictEqual(sentBody.generationConfig.maxOutputTokens,2600);
 assert.strictEqual(body.serverTiming.fastSingle,true);
 assert.strictEqual(body.serverTiming.fallbackUsed,true);
 assert.strictEqual(body.serverTiming.acceptedDeepAnalysisUnits,1);
 assert.strictEqual(body.serverTiming.acceptedPatches,1);
 console.log('PASS edge silently falls back from unavailable model to gemini-3.5-flash-lite');
})().catch(e=>{console.error(e);process.exit(1);});
