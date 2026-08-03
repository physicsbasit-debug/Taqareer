# إعداد Gemini لتطبيق تقارير v0.7.0

لا توجد أسرار جديدة في هذا الإصدار.

## الأسرار المطلوبة

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`

## تحديث الوظيفة

1. افتح Supabase.
2. اذهب إلى `Edge Functions > analyze-educational-form > Code > Edit function`.
3. استبدل الكود كاملًا بمحتوى:
   `supabase/functions/analyze-educational-form/index.ts`
4. اضغط `Deploy function`.

## اختبار ping

Body:

```json
{
  "operation": "ping",
  "payload": { "clientVersion": "0.7.0" }
}
```

Headers:

- Key: `Content-Type` / Value: `application/json`
- Key: `x-taqareer-access-code` / Value: رمز الوصول الفعلي

## اختبار القبول الحقيقي

نجاح `ping` لا يكفي. ارفع ملفًا ثم تأكد أن نتيجة Gemini تتضمن:

- `analysisProfile`
- `diagnosticSections`
- عدة `findings`
- `qualityTools`
- `improvementPlan`
- `monitoringPlan`
- `dataRequests`

عند فشل Gemini يبقى المحلل المحلي المتخصص ظاهرًا.
