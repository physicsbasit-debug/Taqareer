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

const code=fs.readFileSync(path.join(__dirname,'..','assets','performance-pipeline.js'),'utf8');
const sandbox={window:{},globalThis:null,localStorage:new StorageMock(),crypto:webcrypto,TextEncoder,Date,JSON,Math,WeakSet,Object,Array,String,Number,console,performance};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=sandbox.window.TaqareerPerformance;
assert.strictEqual(api.VERSION,'0.9.6');
(async()=>{
  const a=await api.makeKey('analysis',{b:2,a:1});
  const b=await api.makeKey('analysis',{a:1,b:2});
  assert.strictEqual(a,b,'stable key must ignore object key order');
  assert.strictEqual(api.cacheSet(a,{ok:true}),true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(api.cacheGet(a))),{ok:true});
  const span=api.startSpan('test');
  const ended=api.endSpan(span);
  assert.ok(ended.durationMs>=0);
  api.clearCache();
  assert.strictEqual(api.cacheGet(a),null);
  console.log('PASS performance pipeline cache, hashing and timing');
})().catch(error=>{console.error(error);process.exit(1);});
