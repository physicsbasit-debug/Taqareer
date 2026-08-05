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
  assert.match(edge, /maxOutputTokens: 4300/);
  assert.match(edge, /temperature: 0\.25/);
  assert.match(edge, /\}, 1\);\n  const candidate = candidateResult\(raw\);/);
  assert.match(client, /analyze_primary", payload, \{ timeoutMs: 32000 \}/);
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

test('primary prompt requests concise variable depth rather than a fixed template', () => {
  const edge = read('supabase/functions/analyze-educational-form/index.ts');
  assert.match(edge, /2-4 قراءات تشخيصية، 2-5 استنتاجات، 1-3 تدخلات/);
  assert.match(edge, /هذه حدود مرنة وليست قوالب ثابتة/);
  assert.match(edge, /لا تكرر الفكرة نفسها/);
});
