const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('primary AI request is split into bounded reasoning and action segments', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  const client = read('assets/ai-client.js');
  assert.match(edge, /PRIMARY_REASONING_SCHEMA/);
  assert.match(edge, /PRIMARY_ACTION_SCHEMA/);
  assert.match(edge, /Promise\.allSettled\(\[/);
  assert.match(edge, /requestPrimarySegment\("reasoning"/);
  assert.match(edge, /requestPrimarySegment\("action"/);
  assert.match(edge, /primarySegmentOutputLimit\(segment: PrimarySegmentName\)/);
  assert.match(edge, /return segment === "reasoning" \? 2700 : 2300/);
  assert.match(edge, /thinkingConfig: \{ thinkingLevel \}/);
  assert.match(client, /analyze_primary", payload, \{ timeoutMs: 60000, networkRetry: true, maxAttempts: 3 \}/);
  assert.match(edge, /PRIMARY_ANALYSIS_DEADLINE_MS = 45_000/);
  assert.match(edge, /PRIMARY_REASONING_ATTEMPT_TIMEOUT_MS = 15_000/);
  assert.match(client, /transientCapacity && attempt >= 2 && attemptDurationMs > 20_000/);
  assert.match(client, /const baseDelay = attempt === 1 \? 2600 : 5600/);
  assert.match(client, /attempt < Math\.min\(maxAttempts, 2\).*AI_PRIMARY_TIMEOUT/s);
  assert.match(edge, /PRIMARY_ACTION_ATTEMPT_TIMEOUT_MS = 13_000/);
  assert.match(edge, /PRIMARY_REPAIR_ATTEMPT_TIMEOUT_MS = 11_000/);
  assert.match(edge, /PRIMARY_REASONING_MODELS = Object\.freeze\(\["gemini-3\.6-flash", "gemini-3\.5-flash"\]\)/);
  assert.match(edge, /PRIMARY_ACTION_MODELS = Object\.freeze\(\["gemini-3\.5-flash-lite", "gemini-3\.6-flash", "gemini-3\.5-flash"\]\)/);
  assert.match(edge, /PRIMARY_REPAIR_MODELS = Object\.freeze\(\["gemini-3\.5-flash", "gemini-3\.6-flash", "gemini-3\.5-flash-lite"\]\)/);
  assert.match(edge, /rawText = await response\.text\(\);[\s\S]*?finally \{[\s\S]*?clearTimeout\(timeoutId\)/);
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
  assert.match(edge, /const minTools = 0/);
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
