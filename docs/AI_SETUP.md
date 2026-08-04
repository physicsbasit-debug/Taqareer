# إعداد Gemini وSupabase لتقارير v0.9.1

## الأسرار

لا توجد أسرار جديدة. تبقى:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`
- `GEMINI_CLASSIFIER_MODEL` اختياري

## تحديث الوظيفة

1. افتح مشروع `taqareer` في Supabase.
2. ادخل إلى `Edge Functions`.
3. افتح `analyze-educational-form`.
4. اختر `Code` ثم `Edit function`.
5. احذف الكود السابق كاملًا.
6. الصق محتوى `SUPABASE_FUNCTION_GEMINI_V0_7_1.txt`.
7. اضغط `Deploy function`.
8. لا تغيّر رابط الوظيفة أو Publishable key أو الأسرار الحالية.

## اختبار القبول

1. نفذ `حفظ واختبار` في إعداد الذكاء الاصطناعي.
2. حلل ملفًا معروفًا.
3. تظهر الحسابات والرسوم المحلية فورًا.
4. تظهر رسالة أن Gemini يبني القراءة التربوية العميقة.
5. عند النجاح تظهر أعداد القراءات العميقة والتحسينات المطبقة.
6. لا تتكرر التدخلات أو مراحل المتابعة.
