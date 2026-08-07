const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const clean = process.argv.includes('--clean');

const rootFilePatterns = [
  /^APPLY_.*\.txt$/,
  /^CHANGED_FILES_MANIFEST.*\.txt$/,
  /^DELETE_OBSOLETE_FILES_PHASE_.*\.txt$/,
  /^GITHUB_UPLOAD_INSTRUCTIONS\.md$/,
  /^HIDDEN_FILES_INSTRUCTIONS\.txt$/,
  /^NOJEKYLL_VISIBLE\.txt$/,
  /^PHASE_.*_TEST_REPORT\.md$/,
  /^README_PHASE_.*\.md$/,
  /^SUPABASE_FUNCTION_GEMINI_V.*\.txt$/,
  /^TEST_REPORT_PHASE_.*\.md$/,
];

const obsoletePaths = new Set([
  'dist',
  'src',
  'supabase/functions/generate-source-questions',

  'docs/AI_CONTRACT.md',
  'docs/AI_SETUP.md',
  'docs/ANALYTICAL_RECONCILIATION_ARCHITECTURE.md',
  'docs/ANALYT~1.MD',
  'docs/AUTOMATIC_SEGMENT_RECOVERY.md',
  'docs/AUTOMATIC_SILENT_AI.md',
  'docs/DEEP_ANALYSIS_DELTA_PROTOCOL.md',
  'docs/FAST_DEEP_ANALYSIS_PIPELINE.md',
  'docs/IMPLEMENTATION_NOTE.md',
  'docs/PHASE_2_C1_VISUAL_FIRST_2D_SCIENTIFIC_RENDERING.md',
  'docs/QUALITY_MICROTASK_ENGINE.md',
  'docs/SEGMENTED_DEEP_ANALYSIS_PIPELINE.md',
  'docs/SEGMENT_FAILURE_ISOLATION.md',
  'docs/SEGMEN~2.MD',
  'docs/SINGLE_FAST_AI_ENHANCEMENT.md',
  'docs/TAQARE~1.PDF',
  'docs/TAQARE~2.PDF',
  'docs/TEST_REPORT.md',
  'docs/VISUAL_REPORT_REBUILD.md',
  'docs/preview_v0_4_0.png',
  'docs/preview_v0_5_0.png',
  'docs/taqareer_v0_9_1_deep_analysis_delta_preview.pdf',
  'docs/taqareer_v0_9_2_segmented_deep_analysis_preview.html',
  'docs/taqareer_v0_9_2_segmented_deep_analysis_preview.pdf',

  'tests/AUTOMA~1.JS',
  'tests/BROWSE~1.PY',
  'tests/BROWSE~2.PY',
  'tests/EDGE-E~1.JS',
  'tests/EDGE-T~1.JS',
  'tests/QUALIT~1.JS',
  'tests/QUALIT~2.JS',
  'tests/SEGMEN~1.JS',
  'tests/app-fast-background-contract.test.js',
  'tests/automatic-segment-recovery.test.js',
  'tests/automatic-silent-ai.test.js',
  'tests/browser-automatic-recovery.manual.py',
  'tests/browser-fast-pipeline.manual.py',
  'tests/browser-quality-microtask.manual.py',
  'tests/browser-reconciliation.manual.py',
  'tests/browser-segment-failure-isolation.manual.py',
  'tests/browser-segmented-pipeline.manual.py',
  'tests/edge-enrichment-contract.test.js',
  'tests/edge-fast-enhancement.test.js',
  'tests/edge-quality-microtask.test.js',
  'tests/edge-retry-metadata.test.js',
  'tests/edge-segmented-enrichment.test.js',
  'tests/edge-semantic-retry.test.js',
  'tests/edge-task-scope-isolation.test.js',
  'tests/fast-payload-contract.test.js',
  'tests/generate-v090-preview.js',
  'tests/generate-v091-preview.js',
  'tests/generate-v092-preview.js',
  'tests/payload-size-regression.test.js',
  'tests/performance-pipeline.test.js',
  'tests/phase-1-a-simple-source-brief.test.mjs',
  'tests/phase-1-b-files.test.mjs',
  'tests/phase-1-b3-files.test.mjs',
  'tests/phase-1-b4-files.test.mjs',
  'tests/phase-1-b5-files.test.mjs',
  'tests/phase-1-b6-files.test.mjs',
  'tests/phase-1-b7-files.test.mjs',
  'tests/phase-1-b8-files.test.mjs',
  'tests/phase-1-c1-files.test.mjs',
  'tests/phase-1-c1-fix2-files.test.mjs',
  'tests/phase-1-c2-files.test.mjs',
  'tests/phase-1-c2-fix1-files.test.mjs',
  'tests/phase-1-c2-fix2-files.test.mjs',
  'tests/phase-1-c2-fix3-files.test.mjs',
  'tests/phase-1-c2-fix4-files.test.mjs',
  'tests/phase-1-c2-fix5-files.test.mjs',
  'tests/phase-1-c2-fix6-files.test.mjs',
  'tests/phase-1-c2-fix7-files.test.mjs',
  'tests/phase-1-c3-files.test.mjs',
  'tests/phase-1-d2-files.test.mjs',
  'tests/phase-1-d2-fix1-lesson-tree.test.mjs',
  'tests/phase-2-a-fix2-calculation-working.test.mjs',
  'tests/phase-2-a-fix3-visual-reference-normalization.test.mjs',
  'tests/phase-2-a-fix4-question-visual-semantic-binding.test.mjs',
  'tests/phase-2-a-whole-exam-v2-files.test.mjs',
  'tests/phase-2-b-exam-integrity-resume.test.mjs',
  'tests/phase-2-c1-visual-first-2d.test.mjs',
  'tests/quality-microtask-engine.test.js',
  'tests/quality-payload-regression.test.js',
  'tests/question-visual.test.mjs',
  'tests/reconciliation-contract.test.js',
  'tests/report-generation.test.js',
  'tests/segment-failure-isolation.test.js',
  'tests/segmented-orchestrator.test.js',
  'tests/single-fast-enhancer.test.js',
  'tests/fixtures/deep-analysis-delta-v091.json',
  'tests/fixtures/reconciled-analysis-v090.json',
  'tests/fixtures/segmented-deep-analysis-v092.json',
]);

function rel(absPath) {
  return path.relative(root, absPath).split(path.sep).join('/');
}

function collectGarbage() {
  const hits = new Set();

  for (const name of fs.readdirSync(root)) {
    const abs = path.join(root, name);
    const stat = fs.lstatSync(abs);
    if (stat.isFile() && rootFilePatterns.some(pattern => pattern.test(name))) hits.add(name);
    if (stat.isDirectory() && /^taqareer_phase_.*_changed_files_only$/i.test(name)) hits.add(name);
  }

  for (const item of obsoletePaths) {
    if (fs.existsSync(path.join(root, item))) hits.add(item);
  }

  return [...hits].sort();
}

const hits = collectGarbage();

if (clean && hits.length) {
  for (const item of hits) {
    fs.rmSync(path.join(root, item), { recursive: true, force: true });
    console.log(`REMOVED ${item}`);
  }
}

const remaining = collectGarbage();
if (remaining.length) {
  console.error('FAIL repository hygiene: obsolete artifacts remain:');
  for (const item of remaining) console.error(`- ${item}`);
  process.exit(1);
}

const currentEdge = path.join(root, 'supabase/functions/analyze-educational-form/index.ts');
if (!fs.existsSync(currentEdge)) {
  console.error('FAIL repository hygiene: current Supabase Edge source is missing.');
  process.exit(1);
}

console.log(`PASS repository hygiene: ${clean ? `${hits.length} obsolete artifacts removed; ` : ''}current sources only.`);
