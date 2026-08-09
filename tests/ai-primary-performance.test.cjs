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

test('primary AI architecture is one decision core with one bounded model fallback and one browser request', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  const client = read('assets/ai-client.js');
  const primaryStart = edge.indexOf('async function analyzePrimary(');
  const primaryEnd = edge.indexOf('function errorInfo(', primaryStart);
  const runtime = edge.slice(primaryStart, primaryEnd);

  assert.match(runtime, /compactPrimaryDecisionPayload/);
  assert.match(runtime, /primaryDecisionModels/);
  assert.match(runtime, /PRIMARY_DECISION_SCHEMA/);
  assert.match(runtime, /expandPrimaryDecision/);
  assert.doesNotMatch(runtime, /Promise\.allSettled|requestPrimarySegment|repairPrimarySegment|rescueTransientPrimarySegment/);
  assert.equal(numericConst(edge, 'PRIMARY_DECISION_MAX_MODELS'), 2);
  const serverDeadline = numericConst(edge, 'PRIMARY_DECISION_DEADLINE_MS');
  const primaryTimeout = numericConst(edge, 'PRIMARY_DECISION_ATTEMPT_TIMEOUT_MS');
  const fallbackTimeout = numericConst(edge, 'PRIMARY_DECISION_FALLBACK_TIMEOUT_MS');
  assert.ok(primaryTimeout + fallbackTimeout <= serverDeadline);

  const clientTimeout = numericConst(client, 'PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS');
  const clientAttempts = numericConst(client, 'PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS');
  assert.ok(clientTimeout > serverDeadline, 'browser envelope must outlive the bounded Edge decision core');
  assert.equal(clientAttempts, 1, 'one click must never duplicate the full Edge analysis cycle');
  assert.match(client, /analyze_primary", payload, \{ timeoutMs: PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS, networkRetry: false, maxAttempts: PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS \}/);
});

test('score-like payloads send deterministic metrics and charts but no raw student rows to the decision core', () => {
  const app = read('assets/app.js');
  const orchestrator = read('assets/deep-analysis-orchestrator.js');
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(app, /startPrimaryAnalysisTicker/);
  assert.match(orchestrator, /scoreLikeType\(typeId\)/);
  assert.match(orchestrator, /compactedData\.sampleRows = \[\]/);
  assert.match(orchestrator, /compactedData\.headers = \[\]/);
  assert.match(orchestrator, /metrics-and-charts-only/);
  assert.match(orchestrator, /ref\.startsWith\("row:"\)/);
  assert.match(edge, /function compactPrimaryDecisionPayload/);
  assert.match(edge, /sampleRows: \[\]/);
  assert.match(edge, /sentRowCount: 0/);
});

test('decision prompt owns diagnosis and recommendations while server owns interventions and monitoring', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  const start = edge.indexOf('function primaryDecisionInstructions');
  const end = edge.indexOf('function compactPrimaryDecisionPayload', start);
  const prompt = edge.slice(start, end);
  assert.match(prompt, /نواة قرار تربوي قصيرة/);
  assert.match(prompt, /recommendedAction/);
  assert.match(prompt, /لا تعِد الحسابات/);
  assert.match(prompt, /الخادم سيبني analysisProfile والتدخلات والمتابعة/);
  assert.match(edge, /const PRIMARY_DECISION_SCHEMA: JsonRecord = \{/);
  assert.match(edge, /findings: \{[\s\S]*?minItems: 2,[\s\S]*?maxItems: 3,/);
  assert.doesNotMatch(edge.slice(edge.indexOf("const PRIMARY_DECISION_SCHEMA"), edge.indexOf("const PRIMARY_ACTION_SCHEMA")), /analysisProfile:|interventions:|monitoringPlan:/);
  assert.match(edge, /function expandPrimaryDecision/);
  assert.match(edge, /const monitoringPlan = \[/);
  assert.match(edge, /applyScoreInterventionGuard/);
  assert.match(edge, /applyMultiVisitScopeGuard/);
});

test('schema and validators keep evidence depth without requiring an impossible second score group', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(edge, /findings: \{[\s\S]*?minItems: 2,[\s\S]*?maxItems: 3,/);
  assert.match(edge, /mode === "primary" && richEvidence \? 3 : 2/);
  assert.match(edge, /const requiredDistinctScoreGroups = scoreContext \? Math\.min\(2, Math\.max\(1, availableScoreGroups\)\) : 2/);
  assert.match(edge, /numericGuardedInterventions/);
  assert.match(edge, /serverOwnedInterventionMath: Boolean\(scoreContext\)/);
  assert.match(edge, /targetGroupIds: \{ type: "array"/);
  assert.match(edge, /successMetric: \{/);
});

test('model configuration remains future-family compatible and rate limits stop fan-out', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  const client = read('assets/ai-client.js');
  assert.match(edge, /GEMINI_DECISION_MODEL/);
  assert.match(edge, /GEMINI_DECISION_FALLBACK_MODELS/);
  assert.match(edge, /DEFAULT_DECISION_MODEL = "gemini-3\.5-flash-lite"/);
  assert.match(edge, /DEFAULT_DECISION_FALLBACK_MODEL = "gemini-3\.6-flash"/);
  assert.match(edge, /if \(kind === "rate_limit"\) break/);
  assert.match(edge, /localEvidenceFallbackDecision/);
  assert.doesNotMatch(edge, /\^gemini-3/);
  assert.match(client, /code === "GEMINI_RATE_LIMIT" \|\| status === 429/);
});

test('decision-core cache is bounded and fingerprinted by evidence', () => {
  const orchestrator = read('assets/deep-analysis-orchestrator.js');
  assert.match(orchestrator, /CACHE_TTL_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(orchestrator, /CACHE_MAX_ITEMS = 6/);
  assert.match(orchestrator, /cacheFingerprint\(payload\)/);
  assert.match(orchestrator, /force \? null : readCachedAnalysis/);
  assert.match(orchestrator, /writeCachedAnalysis\(cacheKey, response\)/);
  assert.match(orchestrator, /outcome\?\.serverTiming\?\.localFallbackUsed/);
});
