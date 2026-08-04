# إعداد Gemini وSupabase لتقارير v0.9.6

## الأسرار المطلوبة

- `GEMINI_API_KEY`
- `GEMINI_MODEL` للقراءة البصرية، والافتراضي `gemini-2.5-flash`
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`

اختياري:

- `GEMINI_FAST_MODEL`، والافتراضي تلقائيًا `gemini-2.5-flash-lite`
- `GEMINI_CLASSIFIER_MODEL`، والافتراضي `gemini-2.5-flash-lite`

## الوظيفة

انشر الملف `SUPABASE_FUNCTION_GEMINI_V0_11_0.txt` داخل وظيفة:

```text
analyze-educational-form
```

العمليات التشغيلية الوحيدة:

- `ping`
- `classify`
- `vision_extract`
- `enhance_fast`

لا توجد عمليات تقسيم أو مهام جودة أو حلقات إعادة في واجهة v0.9.6.
