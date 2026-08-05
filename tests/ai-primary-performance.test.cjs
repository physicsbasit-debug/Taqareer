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

test('primary prompt separates diagnosis from decision and requires balanced coverage', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(edge, /أخرج 3 analysisUnits مختلفة/);
  assert.match(edge, /diagnosticAnalysis يشرح العلاقة/);
  assert.match(edge, /decisionFinding يصوغ القرار/);
  assert.match(edge, /أخرج 2-3 interventions لفئات أو قضايا مختلفة/);
  assert.match(edge, /monitoringPlan من 3 مراحل بالضبط/);
  assert.match(edge, /إذا كانت البيانات درجات كلية فقط، لا تسمِّ مهارة أو مفهومًا بعينه/);
  assert.match(edge, /استخدم بيانات الترويسة المنظمة داخل source\.meta\.metadata/);
  assert.match(edge, /تباينًا سياقيًا يحتاج فصل السجلات حسب المعلم أو الزيارة/);
  assert.match(edge, /لا تنسب جميع الإيجابيات والسلبيات إلى شخص واحد/);
  assert.match(edge, /const diagnosticSections = units\.map/);
  assert.match(edge, /analysis: item\.diagnosticAnalysis/);
  assert.match(edge, /statement: item\.decisionFinding/);
  assert.match(edge, /const monitoringPlan = \(Array\.isArray\(input\.monitoringPlan\)/);
});


test('schema constrains balanced output and thinking remains explicitly controlled', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(edge, /analysisUnits: \{[\s\S]*?minItems: 2,[\s\S]*?maxItems: 3,/);
  assert.match(edge, /interventions: \{[\s\S]*?minItems: 2,[\s\S]*?maxItems: 3,/);
  assert.match(edge, /methodChecks: \{[\s\S]*?maxItems: 2,/);
  assert.match(edge, /monitoringPlan: \{[\s\S]*?minItems: 3,[\s\S]*?maxItems: 3,/);
  assert.match(edge, /mode === "primary" && richEvidence \? 3 : 2/);
  assert.match(edge, /interventions\.length < 2/);
  assert.match(edge, /monitoringPlan\.length < 3/);
  assert.match(edge, /textOverlapRatio/);
  assert.match(edge, /targetGroups\.size < 2/);
  assert.match(edge, /firstThoughtTokens/);
  assert.match(edge, /finalCandidateTokens/);
});

test('score intervention arithmetic is structured and server-owned', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  const app = read('assets/app.js');
  const orchestrator = read('assets/deep-analysis-orchestrator.js');
  const reconciliation = read('assets/analysis-reconciliation.js');
  assert.match(edge, /targetGroupIds: \{ type: "array"/);
  assert.match(edge, /successMetric: \{/);
  assert.match(edge, /mode: \{ type: "string", enum: \["mastery_gain", "segment_reduction", "mastery_maintenance", "custom"\]/);
  assert.match(edge, /applyScoreInterventionGuard/);
  assert.match(edge, /خُفّض الهدف إلى الحد الممكن داخل الفئات المستهدفة/);
  assert.match(edge, /const feasibleGain = Math\.min\(eligibleCount, requestedGain\)/);
  assert.match(app, /interventionMathContext/);
  assert.match(orchestrator, /interventionTargetsAndIndicatorsAreServerCalculatedForScores: true/);
  assert.match(reconciliation, /clientGuardScoreIntervention/);
  assert.match(reconciliation, /هدف إتقان غير متسق مع حجم الفئات المستهدفة/);
});
