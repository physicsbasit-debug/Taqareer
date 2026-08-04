# analyze-educational-form v0.8.1

وظيفة Supabase Edge لتقارير v0.9.3.

تدعم العمليات:

- `ping`
- `classify`
- `vision_extract`
- `analyze` للتوافق
- `enrich` للتوافق
- `enrich_segment` للمسار الحالي

أضيف في v0.8.1 عقد أخطاء منظم لتمكين الاستعادة الآلية في المتصفح:

- `errorCode`
- `retryable`
- `operation`
- `segment`

لا توجد أسرار جديدة. تستخدم الوظيفة الأسرار الحالية:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_CLASSIFIER_MODEL` اختياري
- `TAQAREER_ACCESS_CODE`
- `TAQAREER_ALLOWED_ORIGINS`
