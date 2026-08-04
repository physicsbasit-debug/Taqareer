# إعداد Gemini وSupabase لتقارير v0.9.4

1. افتح Supabase ثم `Edge Functions`.
2. افتح الوظيفة `analyze-educational-form`.
3. استبدل الكود كاملًا بمحتوى `SUPABASE_FUNCTION_GEMINI_V0_9_0.txt`.
4. اضغط `Deploy function`.
5. لا حاجة إلى SQL أو أسرار جديدة.

الأسرار المستخدمة كما هي:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`

الإصدار الجديد يعيد تفاصيل فشل المهمة مثل `taskId` و`scope` و`failureType` ومحاولات Gemini، ولا يعرض المفتاح أو رمز الوصول أو البيانات الخام.
