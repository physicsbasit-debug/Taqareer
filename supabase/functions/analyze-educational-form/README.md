# analyze-educational-form v0.8.2

Supabase Edge Function for Taqareer with Google Gemini.

Operations:

- `ping`: connection check with thinking disabled.
- `classify`: semantic verification using `GEMINI_CLASSIFIER_MODEL` or `gemini-2.5-flash-lite`, thinking budget 0.
- `vision_extract`: image/scanned-PDF extraction with thinking budget 0.
- `analyze`: deep type-aware interpretation using `GEMINI_MODEL`, thinking budget 1024.

The client sends a compact deterministic dossier rather than the full raw dataset for known score reports. Invalid evidence references remain removed server-side. No new required secrets.
