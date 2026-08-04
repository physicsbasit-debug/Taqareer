const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ts=require('typescript');
const assert=require('assert');

const source=fs.readFileSync(path.join(__dirname,'..','supabase','functions','analyze-educational-form','index.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let handler=null;
const sandbox={
  console,crypto,TextEncoder,Uint8Array,performance,structuredClone,Request,Response,Headers,setTimeout,clearTimeout,Math,JSON,
  Deno:{env:{get:(name)=>({GEMINI_API_KEY:'test-key',GEMINI_MODEL:'gemini-2.5-flash',TAQAREER_ALLOWED_ORIGINS:'*',TAQAREER_ACCESS_CODE:''}[name])},serve:(fn)=>{handler=fn;}},
  fetch:async()=>new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"segment":"governance"'}]}}],usageMetadata:{}}),{status:200,headers:{'Content-Type':'application/json'}})
};
vm.createContext(sandbox);vm.runInContext(js,sandbox);
assert.ok(handler,'handler missing');

const payload={
  segment:'governance',
  reconciliationContract:{version:'3.0.0',rules:{maxDeepAnalysisUnits:0,maxPatches:18},deepAnalysisTargets:[],patchTargets:{findings:[],interventions:[],qualityTools:[],monitoring:[]}},
  deterministicAnalysis:{metrics:[],charts:[],evidenceCatalog:[]},
  availableEvidenceRefs:[],data:{mode:'derived-evidence-only'}
};

(async()=>{
  const request=new Request('https://edge.test/functions/v1/analyze-educational-form',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.test'},body:JSON.stringify({operation:'enrich_segment',payload})});
  const response=await handler(request); const body=await response.json();
  assert.strictEqual(response.status,503,JSON.stringify(body));
  assert.strictEqual(body.retryable,true);
  assert.strictEqual(body.errorCode,'SEGMENT_OUTPUT_EXHAUSTED');
  assert.strictEqual(body.operation,'enrich_segment');
  assert.strictEqual(body.segment,'governance');
  console.log('PASS edge returns structured retry metadata for transient segment exhaustion');
})().catch(error=>{console.error(error);process.exit(1);});
