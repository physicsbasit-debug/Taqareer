# analyze-educational-form v0.7.0

Supabase Edge Function for Taqareer with Google Gemini.

Operations:

- `ping`: connection check.
- `classify`: semantic form verification.
- `vision_extract`: image/scanned-PDF extraction.
- `analyze`: deep type-aware educational interpretation.

The `analyze` operation receives deterministic specialized analysis and a closed evidence-reference catalog. It must not recalculate or invent metrics. Invalid evidence references are removed server-side.

No new secrets are required beyond the existing Gemini and Taqareer secrets.
