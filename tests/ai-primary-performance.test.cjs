const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('primary AI request has a bounded latency budget and compact output', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  const client = read('assets/ai-client.js');
  assert.match(edge, /GEMINI_ANALYSIS_MODEL/);
  assert.match(edge, /DEFAULT_ANALYSIS_MODEL = "gemini-3\.5-flash"/);
  assert.match(edge, /primaryRequestBody\(payload, primaryAnalysisInstructions\(\), "low", 8192\)/);
  assert.match(edge, /thinkingConfig: \{ thinkingLevel \}/);
  assert.match(edge, /primaryRequestBody\(payload, primaryRescueInstructions\(\), "minimal", 6144\)/);
  assert.match(edge, /rescueUsed = true/);
  assert.match(client, /analyze_primary", payload, \{ timeoutMs: 45000 \}/);
});

test('frontend sends compact evidence for scores and shows elapsed progress', () => {
  const app = read('assets/app.js');
  const orchestrator = read('assets/deep-analysis-orchestrator.js');
  assert.match(app, /\["single_subject", "assessment_component"\]\.includes\(state\.type\.id\)\) return 24/);
  assert.match(app, /const limit = 120/);
  assert.match(app, /startPrimaryAnalysisTicker/);
  assert.match(app, /جارٍ بناء التحليل الذكي… \$\{seconds\}ث/);
  assert.match(orchestrator, /slice\(0, 24\)\.map\(item => \(\{/);
  assert.match(orchestrator, /slice\(0, 6\)\.map\(chart => \(\{/);
  assert.match(orchestrator, /chart\.data\.slice\(0, 18\)/);
});

test('primary prompt uses compact decision units instead of duplicated report sections', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(edge, /أخرج 2-3 analysisUnits فقط/);
  assert.match(edge, /كل وحدة تدمج التشخيص والاستنتاج والأثر والإجراء/);
  assert.match(edge, /أخرج 1-2 interventions فقط/);
  assert.match(edge, /const diagnosticSections = units\.map/);
  assert.match(edge, /const findings = units\.map/);
  assert.match(edge, /const monitoringPlan = interventions\.map/);
});


test('schema constrains output cardinality and thinking is explicitly controlled', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(edge, /analysisUnits: \{[\s\S]*?minItems: 2,[\s\S]*?maxItems: 3,/);
  assert.match(edge, /interventions: \{[\s\S]*?minItems: 1,[\s\S]*?maxItems: 2,/);
  assert.match(edge, /methodChecks: \{[\s\S]*?maxItems: 1,/);
  assert.match(edge, /firstThoughtTokens/);
  assert.match(edge, /finalCandidateTokens/);
});
