const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, packageVersion, packageLockVersion, manifest, edgeVersion, escapeRegExp } = require('../scripts/version-contract.cjs');

const root = path.resolve(__dirname, '..');

function numericConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9_]+)`));
  if (!match) throw new Error(`${name} constant not found`);
  return Number(match[1].replace(/_/g, ''));
}

function clientNumericConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9_]+)`));
  if (!match) throw new Error(`${name} client constant not found`);
  return Number(match[1].replace(/_/g, ''));
}

test('public HTML cache-busters and runtime version markers match package version', () => {
  const appVersion = packageVersion(root);
  const lockVersion = packageLockVersion(root);
  const appManifest = manifest(root);
  const edge = edgeVersion(root);
  const index = readText(root, 'index.html');
  const app = readText(root, 'assets/app.js');
  const client = readText(root, 'assets/ai-client.js');
  const report = readText(root, 'assets/report-system.js');
  const setup = readText(root, 'assets/setup-policy.js');
  const escaped = escapeRegExp(appVersion);

  const queryVersions = [...index.matchAll(/assets\/[a-z0-9._-]+\.(?:js|css)\?v=([0-9.]+)/gi)].map(match => match[1]);
  assert.equal(lockVersion, appVersion, 'package-lock version must match package.json');
  assert.equal(appManifest.version, appVersion, 'manifest app version must match package.json');
  assert.equal(appManifest.runtime?.edgeFunctionVersion, edge, 'manifest Edge version must match deployed Edge source');
  assert.ok(queryVersions.length >= 10, 'expected public asset cache-busters');
  assert.deepEqual([...new Set(queryVersions)], [appVersion]);
  assert.match(index, new RegExp(`v${escaped}`));
  assert.match(app, new RegExp(`appVersion:\\s*["']${escaped}["']`));
  assert.match(client, new RegExp(`CLIENT_VERSION\\s*=\\s*["']${escaped}["']`));
  assert.match(report, new RegExp(`VERSION\\s*=\\s*["']${escaped}["']`));
  assert.match(setup, new RegExp(`VERSION\\s*=\\s*["']${escaped}["']`));
  assert.match(app, new RegExp(`taqareer-analysis-v${escaped}\\.json`));
  const edgeSource = readText(root, 'supabase/functions/analyze-educational-form/index.ts');
  assert.equal(appManifest.runtime?.primaryServerDeadlineMs, numericConst(edgeSource, 'PRIMARY_ANALYSIS_DEADLINE_MS'));
  assert.equal(appManifest.runtime?.primaryInitialPhaseDeadlineMs, numericConst(edgeSource, 'PRIMARY_INITIAL_PHASE_DEADLINE_MS'));
  assert.equal(appManifest.runtime?.primaryTransientRescuePhaseDeadlineMs, numericConst(edgeSource, 'PRIMARY_TRANSIENT_RESCUE_PHASE_DEADLINE_MS'));
  assert.equal(appManifest.runtime?.primaryAnalysisClientTimeoutMs, clientNumericConst(client, 'PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS'));
  assert.equal(appManifest.runtime?.primaryAnalysisClientMaxAttempts, clientNumericConst(client, 'PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS'));
});

test('current-version tests do not hard-code the release number outside the dynamic version contract', () => {
  const appVersion = packageVersion(root);
  const currentLiteral = escapeRegExp(appVersion);
  const brittleFiles = [
    'scripts/verify-static.cjs',
    'tests/report-ai-primary.test.cjs',
    'tests/multi-visit-pdf.test.cjs',
    'tests/edge-network-health.test.cjs',
    'tests/ai-transient-e2e.test.cjs',
    'tests/multi-subject-report.test.cjs',
    'tests/multi-subject-results.test.cjs',
    'tests/semantic-analysis-router.test.cjs',
    'tests/ui-professional-polish.test.cjs',
  ];
  for (const rel of brittleFiles) {
    assert.doesNotMatch(readText(root, rel), new RegExp(currentLiteral), `${rel} must derive current versions dynamically`);
  }
});


test('GitHub Pages deployment verifies the application and visible workflow mirror cannot drift', () => {
  const hiddenWorkflow = readText(root, '.github/workflows/deploy.yml');
  const visibleWorkflow = readText(root, 'GITHUB_WORKFLOW_VISIBLE/deploy.yml');
  assert.equal(visibleWorkflow, hiddenWorkflow, 'visible deploy workflow mirror must match the real workflow byte-for-byte');
  assert.match(hiddenWorkflow, /npm\s+ci/);
  assert.match(hiddenWorkflow, /npm\s+run\s+check/);
  assert.ok(hiddenWorkflow.indexOf('npm run check') < hiddenWorkflow.indexOf('Prepare clean Pages artifact'), 'verification must run before the publish artifact is prepared');
});
