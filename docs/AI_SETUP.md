# إعداد Gemini لتطبيق تقارير v0.8.2

## الأسرار المطلوبة

لا توجد أسرار إلزامية جديدة:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`

يوجد سر اختياري فقط:

- `GEMINI_CLASSIFIER_MODEL`

إذا لم تضفه، تستخدم الوظيفة تلقائيًا `gemini-2.5-flash-lite` للتصنيف السريع. يبقى `GEMINI_MODEL` للتحليل العميق والقراءة البصرية.

## تحديث الوظيفة

1. افتح Supabase.
2. اذهب إلى `Edge Functions > analyze-educational-form > Code > Edit function`.
3. استبدل الكود كاملًا بمحتوى:
   `supabase/functions/analyze-educational-form/index.ts`
4. اضغط `Deploy function`.
5. لا تغيّر `Verify JWT` أو الأسرار الحالية.

## اختبار ping

```json
{
  "operation": "ping",
  "payload": { "clientVersion": "0.8.2" }
}
```

Headers:

- Key: `Content-Type` / Value: `application/json`
- Key: `x-taqareer-access-code` / Value: رمز الوصول الفعلي

## اختبار القبول

- تظهر الحسابات والرسوم قبل انتهاء Gemini.
- بعد اكتمال Gemini تظهر القراءة التفسيرية.
- عند تحليل الملف نفسه مرة ثانية تظهر عبارة «من الذاكرة المؤقتة» ولا يرسل طلب تحليل جديد.
- في بطاقة الأزمنة يظهر زمن الحساب المحلي وزمن Gemini وحجم الحمولة.
