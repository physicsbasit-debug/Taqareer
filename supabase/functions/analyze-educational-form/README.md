# analyze-educational-form

وظيفة Supabase Edge Function للتحليل التربوي والقراءة البصرية في «تقارير».

## الأسرار المطلوبة

```text
OPENAI_API_KEY
TAQAREER_ACCESS_CODE
TAQAREER_ALLOWED_ORIGINS
```

اختياري:

```text
OPENAI_MODEL=gpt-4o-mini
```

## العمليات المدعومة

- `ping`
- `analyze`
- `vision_extract`

## النشر

يمكن نشر الملف من محرر Supabase Dashboard أو باستخدام Supabase CLI. لا يحتاج تطبيق GitHub Pages إلى مفتاح OpenAI.

## تنبيه

رمز الوصول المشترك حماية انتقالية، وليس نظام هوية وصلاحيات كاملًا.
