# Phase 2-D Fix 4 — Score-Only & Multi-Sheet Workbook Intake

## Release

- Application: `v1.2.4`
- Supabase Edge: `V0.15.2` unchanged
- Analysis contract: `6.6.0` unchanged
- Semantic Profile: `2.0.0` unchanged

## Problem fixed

Some multi-subject result workbooks contain one numeric score column per subject and do not include a separate level column. They can also contain one comprehensive sheet plus several class sheets. In `v1.2.3`, this structure could fall back to generic parsing, use the first student row as headers, classify the file as an unknown type, leave the subject selector empty, and block analysis because explicit score-level pairs were not found.

## Root fix

`assets/xlsx-lite.js` now has two compatible normalizers:

1. `multi-subject-results-normalizer-v2` for explicit score-level pairs.
2. `multi-subject-results-normalizer-v3` for score-only subject columns.

The v3 normalizer:

- scans multi-row header bands rather than assuming one fixed header row;
- detects known school subjects from any column position;
- detects student identity columns on either side of the subject block;
- validates score density before accepting the structure;
- derives levels locally from numeric scores using the application thresholds;
- emits the same normalized score-level schema used by the existing analysis, ranking, privacy, and report engines;
- preserves grade, period, academic year, group, and sheet metadata;
- supports comprehensive-sheet selection in multi-sheet workbooks.

## Derived level policy

For score-only workbooks, levels are calculated locally:

- A: 90–100
- B: 80–89.999…
- C: 65–79.999…
- D: 50–64.999…
- E: below 50

Because the level is derived from the score, the report does not claim that it checked consistency between two independent source columns. Instead, it records that the level source is local derivation.

## Preserved capabilities

The release preserves:

- full multi-subject analysis and single-subject analysis;
- top ten per subject;
- school/cohort ranking using the approved 70/30 and 60/40 formulas;
- competition ranking with repeated places and no tie-break;
- incomplete-core-subject exclusion;
- privacy masking before Gemini;
- local calculations as the source of truth;
- multi-visit PDF analysis;
- mastery metrics;
- AI primary analysis, evidence guards, numerical guards, timeouts, fallbacks, and reports.

## Deployment

This is a frontend/workbook-intake release. Supabase Edge `V0.15.2` remains current. No SQL migration, new secret, or Edge redeployment is required.
