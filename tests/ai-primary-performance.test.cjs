const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function numericConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9_]+)`));
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1].replace(/_/g, ''));
}


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
  const clientTimeout = numericConst(client, 'PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS');
  const clientAttempts = numericConst(client, 'PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS');
  assert.ok(clientTimeout > numericConst(edge, 'PRIMARY_ANALYSIS_DEADLINE_MS'), 'client timeout must exceed the server deadline');
  assert.equal(clientAttempts, 2, 'primary full-request replay budget must stay at one replay maximum');
  assert.match(client, /analyze_primary", payload, \{ timeoutMs: PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS, networkRetry: true, maxAttempts: PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS \}/);
  const overallDeadline = numericConst(edge, 'PRIMARY_ANALYSIS_DEADLINE_MS');
  const initialDeadline = numericConst(edge, 'PRIMARY_INITIAL_PHASE_DEADLINE_MS');
  const rescueDeadline = numericConst(edge, 'PRIMARY_TRANSIENT_RESCUE_PHASE_DEADLINE_MS');
  const reasoningTimeout = numericConst(edge, 'PRIMARY_REASONING_ATTEMPT_TIMEOUT_MS');
  const actionTimeout = numericConst(edge, 'PRIMARY_ACTION_ATTEMPT_TIMEOUT_MS');
  const repairTimeout = numericConst(edge, 'PRIMARY_REPAIR_ATTEMPT_TIMEOUT_MS');
  assert.ok(initialDeadline > 0 && initialDeadline < rescueDeadline && rescueDeadline < overallDeadline, 'phase deadlines must reserve time for rescue and final validation');
  assert.ok(overallDeadline - rescueDeadline >= 5000, 'post-rescue validation must retain at least five seconds');
  assert.ok(reasoningTimeout > 0 && reasoningTimeout <= overallDeadline);
  assert.ok(actionTimeout > 0 && actionTimeout <= overallDeadline);
  assert.ok(repairTimeout > 0 && repairTimeout <= overallDeadline);
  assert.match(client, /code === "GEMINI_RATE_LIMIT" \|\| status === 429/);
  assert.match(client, /PRIMARY_ANALYSIS_FAST_CAPACITY_REPLAY_MAX_MS = 12_000/);
  assert.match(client, /transientCapacity[\s\S]*attemptDurationMs <= PRIMARY_ANALYSIS_FAST_CAPACITY_REPLAY_MAX_MS/);
  assert.match(client, /await delay\(2600 \+ Math\.round\(Math\.random\(\) \* 1200\)\)/);
  assert.doesNotMatch(client, /attempt < Math\.min\(maxAttempts, 2\).*AI_PRIMARY_TIMEOUT/s, 'timeout must not replay the whole primary request');
  assert.match(client, /code === "GEMINI_CONTRACT_REJECTED"\) throw error/);
  assert.match(edge, /configuredModelChain\("GEMINI_CLASSIFIER_MODEL", "GEMINI_CLASSIFIER_FALLBACK_MODELS"/);
  assert.match(edge, /configuredModelChain\("GEMINI_ANALYSIS_MODEL", "GEMINI_REASONING_FALLBACK_MODELS"/);
  assert.match(edge, /configuredModelChain\("GEMINI_FAST_MODEL", "GEMINI_ACTION_FALLBACK_MODELS"/);
  assert.match(edge, /configuredModelList\("GEMINI_REPAIR_MODELS"/);
  assert.doesNotMatch(edge, /\^gemini-3/, 'future configured Gemini model families must not be blocked by a generation-specific regex');
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
