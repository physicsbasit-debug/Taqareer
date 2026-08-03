# إعداد Gemini وSupabase لتقارير v0.9.0

## الأسرار الحالية

لا تضف أسرارًا جديدة. تبقى:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`

والسر الاختياري للتصنيف:

- `GEMINI_CLASSIFIER_MODEL`

## تحديث الوظيفة

1. افتح مشروع `taqareer` في Supabase.
2. ادخل إلى `Edge Functions`.
3. افتح `analyze-educational-form`.
4. اختر `Code` ثم `Edit function`.
5. احذف الكود السابق كاملًا.
6. الصق محتوى `SUPABASE_FUNCTION_GEMINI_V0_7_0.txt`.
7. اضغط `Deploy function`.
8. اترك `Verify JWT` وفق الإعداد السابق للمشروع.

## اختبار الاتصال

أعد اختبار `ping` بنفس الرؤوس الحالية. لا يتغير رابط الوظيفة أو المفتاح العام أو رمز الوصول.

## اختبار عقد المصالحة

بعد نشر GitHub والوظيفة:

1. حلل ملف الدرجات المرجعي.
2. يجب أن تظهر رسالة `اكتملت المصالحة التحليلية`.
3. يجب أن يبقى عدد التدخلات 4 ومراحل المتابعة 4.
4. يجب ألا تظهر صفحة تدخلات مكررة من Gemini.
