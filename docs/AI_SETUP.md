# إعداد الذكاء الاصطناعي لتقارير v0.9.7

تبقى الأسرار الحالية كما هي:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` اختياري للقراءة البصرية.
- `GEMINI_FAST_MODEL` اختياري للتحسين السريع.
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`

النموذج الافتراضي السريع أصبح `gemini-3.5-flash-lite`. عند وجود قيمة قديمة غير متاحة في `GEMINI_FAST_MODEL` تنتقل الوظيفة تلقائيًا إلى نموذج متاح دون تدخل المستخدم.
