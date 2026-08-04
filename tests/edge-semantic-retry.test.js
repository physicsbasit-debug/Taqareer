const fs=require('fs');const path=require('path');const assert=require('assert');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets','app.js'),'utf8');
const orchestrator=fs.readFileSync(path.join(root,'assets','deep-analysis-orchestrator.js'),'utf8');
assert.ok(app.includes('single-fast-ai-enhancement-v1'));
assert.ok(!app.includes('enrich_segment'));
assert.ok(!orchestrator.includes('runPool('));
assert.ok(!orchestrator.includes('qualityTasks('));
console.log('PASS obsolete segmented orchestration is retired in v0.9.6');
