const fs=require('fs');const path=require('path');const assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','supabase','functions','analyze-educational-form','index.ts'),'utf8');
assert.ok(source.includes('scope === "quality-tool"'));
assert.ok(source.includes('maxOutputTokens: 520'));
assert.ok(source.includes('compactMaxOutputTokens: 320'));
assert.ok(source.includes('لا ترجع أكثر من 3 patches'));
assert.ok(source.includes('qualityMicrotaskVersion'));
console.log('PASS edge quality microtask uses bounded thinking/output and explicit one-tool contract');
