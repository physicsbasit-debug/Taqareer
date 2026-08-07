# Taqareer v1.2.8 — Phase 2-D Fix 8 Test Report

## Scope

Public terminology boundary, internal identifier sanitization, provider-neutral official reporting, and UI wording cleanup. No analytical formulas, ranking formulas, SQL, secrets, or Edge runtime behavior were changed.

## Automated checks

- Node test suite: **66 passed / 0 failed**.
- Bousla mastery contract tests: **PASS**.
- Mastery integration fixture: **PASS**.
- Chart completeness contract: **PASS**.
- JavaScript syntax: **PASS — 13 asset files**.
- Analysis contracts: **PASS**.
- Static-site contract: **PASS — 14 referenced files**.
- New regression guard verifies that raw values such as `multi_subject_individual_analysis`, internal dimension ids, missing evidence ids, and unnamed quality-tool ids cannot leak into the official report.
- HTML leak-guard preview with deliberately injected raw ids: **PASS**. No raw internal ids, `TQR-` token, Gemini name, or Arabic AI-provenance wording appeared in generated report HTML.

## TypeScript environment note

The project remains pinned to **TypeScript 5.9.3** in `package.json` and `package-lock.json`. The isolated packaging environment could not download that exact package because its internal npm registry returned HTTP 404. The full suite was therefore executed using the system-installed **TypeScript 5.8.3** through `NODE_PATH`. No TypeScript-dependent Edge/runtime logic was changed in Fix 8. The prior project baseline had already passed with the pinned 5.9.3 in Codespaces.

## Visual/browser limitation

A browser-based PDF render could not be completed in this isolated environment because Chromium/Playwright navigation was blocked by the environment administrator. Therefore this release does **not** claim a fresh visual PDF render here. Structural report tests and the generated HTML leak scan passed; the final visual acceptance remains the regenerated live report after GitHub deployment.

## Deployment impact

- SQL: **none**
- New Secret: **none**
- Supabase Edge redeploy: **not required**
- Keep Edge Function: **V0.15.3**
