# Test Report — Phase 2-D Fix 4 / v1.2.4

## Scope

Validated support for multi-subject workbooks that contain numeric scores without explicit level columns, including a ten-sheet workbook with one dominant comprehensive sheet, while preserving the explicit score-level workbook path and all previous analysis capabilities.

## Results

- `npm run check`: PASS
- Node test suite: 61 passed, 0 failed
- JavaScript syntax: 12/12 files passed
- Static references: 13/13 passed
- Type/contract checks: PASS
- Mastery metrics and integration: PASS
- Eleven deep-analysis families: PASS
- Chart completeness guard: PASS
- Multi-visit PDF regressions: PASS
- AI primary/reconciliation/report regressions: PASS

## Targeted intake tests

### Existing explicit score-level workbook

- Normalizer retained: `multi-subject-results-normalizer-v2`
- Students: 252
- Subjects: 13
- Score-level records: 3276
- Grade: 10
- Period: first round
- Academic year: 2025/2026

### Score-only workbook

- Normalizer: `multi-subject-results-normalizer-v3`
- Variant: `score_only`
- Level source: `derived_from_score`
- Identity columns may precede or follow subjects
- Subject scores may start at a non-zero column
- The normalized output exposes subject score and level columns to the existing workspace
- Derived-level files do not produce a false source-consistency metric

### Ten-sheet sanitized fixture

- Sheets: 10
- Comprehensive sheet records: 249
- Class-sheet records: 30 each
- Comprehensive sheet detected as `multi_subject_results`
- Subject selector receives the detected subject list
- Fixture contains synthetic student names only

## Regression protection

Confirmed that the release does not modify Supabase Edge logic and does not change:

- ranking formulas;
- core-subject policies;
- tie behavior;
- privacy payload rules;
- report contract `6.6.0`;
- Semantic Profile `2.0.0`;
- Edge version `V0.15.2`.

## Acceptance limitation

The exact live workbook shown in the browser screenshots was not available as a file in the repair message. A structurally equivalent sanitized ten-sheet score-only workbook was tested. The first upload of the live workbook after GitHub Pages deploy is therefore the final acceptance test for its exact formatting.
