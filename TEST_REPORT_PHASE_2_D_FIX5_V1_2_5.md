# Test Report — Phase 2-D Fix 5 / v1.2.5

## Scope

Validated two official report modes for multi-subject results and a source-provenance guard that preserves a real score-level consistency check for explicit source pairs while preventing false consistency claims for score-only workbooks with locally derived levels.

## Automated results

- `npm run check`: PASS
- Node test suite: 63 passed, 0 failed
- JavaScript syntax: 12/12 asset files passed
- Static references: 13/13 passed
- Analysis and TypeScript contract checks: PASS
- Mastery contract and Ministry fixture: PASS
- Eleven deep-analysis families: PASS
- Chart completeness guard: PASS
- Multi-visit PDF regressions: PASS
- AI-primary, network, timeout, fallback, privacy, and report regressions: PASS

## Report-mode tests

### All-subject analysis

- Full report preserves the school/cohort ranking and all per-subject top-ten appendices.
- Executive report preserves the school/cohort ranking and omits per-subject appendices.
- The deterministic report fixture generated 18 full pages and 4 executive pages. The exact live page count may vary with AI analytical content.

### Single-subject analysis

- Full and executive reports preserve only the selected subject ranking.
- Neither mode leaks another subject ranking or the school ranking into the selected-subject report.
- Ties at rank ten remain visible because ranking data is not recalculated by the report mode.

## Level provenance tests

### Explicit source pairs

Validated the actual uploaded grade-10 workbook:

- sheets: 1
- selected sheet: `Sheet1`
- students: 252
- normalized headers: 31
- normalizer: `multi-subject-results-normalizer-v2`
- subjects: 13
- score-level records: 3276
- level source: `reported`
- score-level mismatches: 0
- ranking-eligible students: 252
- school/cohort ranking rows through rank ten: 10
- subject ranking tables: 13
- grade: العاشر
- period: الدور الأول
- academic year: 2025/2026

For this workbook, the zero-mismatch metric remains valid because score and level are independent source fields.

### Score-only source

- normalizer v3 records `levelSource = derived_from_score`;
- local analysis shows the derivation source and thresholds;
- no local independent consistency metric is created;
- the reconciliation guard removes AI dimensions, decision uses, or quality tools that claim an independent score-level comparison;
- a clear limitation is added to the official report.

## Regression protection

Confirmed no change to:

- Supabase Edge `V0.15.2`;
- analysis contract `6.6.0`;
- Semantic Profile `2.0.0`;
- workbook normalizers v2/v3;
- ranking formulas and core-subject lists;
- competition ranking and repeated places;
- incomplete-core-subject exclusion;
- privacy payload rules;
- multi-visit, narrative, mastery, and adaptive analysis paths.

## Packaging and deployment checks

- Direct overlay over the clean `v1.2.4` baseline: PASS
- Direct full-tree verification: PASS
- Extracted changed-files ZIP overlay over `v1.2.4`: PASS
- Extracted full-backup ZIP: PASS
- Local static server: HTTP 200
- Runtime badge detected: `نسخة تشغيلية v1.2.5`
- Changed-files ZIP entries: 20
- Full-backup ZIP entries: 180
- Forbidden paths (`.git`, `node_modules`, `.env`, private key files): none
- Live API-key pattern scan: no matches
