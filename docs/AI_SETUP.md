# إعداد Gemini لتطبيق تقارير v0.5.1

## الأسرار المطلوبة في Supabase

```text
GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
TAQAREER_ACCESS_CODE
TAQAREER_ALLOWED_ORIGINS
```

لا يوضع مفتاح Gemini في GitHub أو داخل المتصفح.

## تحديث الوظيفة

1. افتح `Edge Functions`.
2. افتح `analyze-educational-form`.
3. افتح محرر الكود.
4. استبدل الكود كاملًا بمحتوى:
   `supabase/functions/analyze-educational-form/index.ts`
5. اضغط `Deploy function`.
6. لا تغيّر الأسرار الحالية.

## العمليات المدعومة

- `ping`: اختبار الاتصال.
- `classify`: التحقق الدلالي السريع من نوع الملف.
- `analyze`: التحليل التربوي العميق.
- `vision_extract`: قراءة الصور وPDF الممسوح.

## اختبار ping

```json
{
  "operation": "ping",
  "payload": { "clientVersion": "0.5.1" }
}
```

الهيدرز:

| Key | Value |
|---|---|
| `Content-Type` | `application/json` |
| `x-taqareer-access-code` | رمز الوصول الفعلي |
