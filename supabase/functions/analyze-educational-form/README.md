# analyze-educational-form

وظيفة Supabase Edge لتقارير v0.9.2.

## العمليات

- `ping`
- `classify`
- `vision_extract`
- `analyze` للتوافق القديم
- `enrich` للتوافق مع v0.9.1
- `enrich_segment` للمسار الإنتاجي الحالي

## enrich_segment

يستقبل `payload.segment` بقيمة واحدة من:

- `diagnostic`
- `findings`
- `interventions`
- `governance`

كل جزء يملك تعليماته وميزانيته وحدوده ومحاولته المختصرة الخاصة. لا ترسل العملية مخطط استجابة معقدًا إلى Gemini؛ يتحقق الخادم من JSON والمعرفات والأدلة والحقول قبل إعادة النتيجة.
