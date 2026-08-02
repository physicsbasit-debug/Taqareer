# analyze-educational-form

وظيفة Supabase Edge Function التي تربط «تقارير» بـGoogle Gemini API.

## الأسرار

```text
GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
TAQAREER_ACCESS_CODE
TAQAREER_ALLOWED_ORIGINS
```

## العمليات

- `ping`
- `classify`
- `analyze`
- `vision_extract`

انسخ `index.ts` إلى محرر الوظيفة في Supabase ثم اضغط Deploy function. لا يلزم تغيير الأسرار عند الانتقال من v0.5.0 إلى v0.5.1.
