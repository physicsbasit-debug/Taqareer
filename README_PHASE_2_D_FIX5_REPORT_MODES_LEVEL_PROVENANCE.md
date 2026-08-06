# Phase 2-D Fix 5 — Executive & Full Reports + Level Provenance Guard

## Release

- Application: `v1.2.5`
- Supabase Edge: `V0.15.2` unchanged
- Analysis contract: `6.6.0` unchanged
- Semantic Profile: `2.0.0` unchanged

## Why this release

The multi-subject workflow now produces long, evidence-rich reports with school ranking and top-ten tables for every subject. That is useful for documentation, but cumbersome for leadership review. The same workflow must also distinguish between two valid level sources:

1. an explicit level column reported by the workbook;
2. a level derived locally from a numeric score in score-only workbooks.

Treating those sources as identical could either hide a valid score-level consistency check or falsely claim that two independent source fields were compared.

## Two official report modes

### Executive report

- keeps the first page of every core analytical section;
- keeps the school/cohort ranking for all-subject analysis;
- keeps the selected-subject ranking for single-subject analysis;
- omits the per-subject ranking appendices from all-subject analysis;
- identifies itself in the toolbar and footer as an executive report.

### Full report

- preserves every analytical page;
- preserves school/cohort ranking;
- preserves all top-ten subject appendices;
- preserves competition ranking and all ties at the tenth place;
- identifies itself as the full report with tables.

The existing full-report output remains the default programmatic mode, so older calls are not broken.

## Level provenance policy

### Explicit score and level pairs

When the workbook contains independent score and level columns:

- `levelSource` remains `reported`;
- the local mismatch calculation remains available;
- a value such as `0 اختلاف` is valid because two source fields were checked.

### Score-only workbooks

When levels are derived from scores:

- `levelSource` is `derived_from_score`;
- the report shows `مصدر المستويات: مشتقة محليًا من الدرجات`;
- the report shows the thresholds A 90+, B 80–89, C 65–79, D 50–64, E below 50;
- the reconciliation guard removes AI dimensions, decision uses, and quality tools that claim an independent score-level consistency check;
- the limitations section records that no independent level source existed.

## Preserved capabilities

This release does not change:

- workbook normalization v2 or v3;
- comprehensive-sheet selection;
- full or single-subject analysis;
- ranking formulas and core-subject lists;
- competition ranking and repeated places;
- incomplete-core-subject exclusion;
- privacy masking;
- local calculations as the source of truth;
- multi-visit PDFs, mastery metrics, charts, evidence guards, numerical guards, timeouts, fallbacks, and AI-primary analysis.

## Deployment

This is a frontend, report, and client-side reconciliation release. No SQL migration, new secret, or Supabase Edge redeployment is required.
