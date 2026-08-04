# analyze-educational-form v0.7.1

تدعم الوظيفة: `ping`, `classify`, `vision_extract`, `enrich`، إضافة إلى `analyze` القديم للتوافق.

واجهة تقارير v0.9.1 تستخدم `enrich` بعقد Deep Analysis Delta v3:

- `deepAnalysisUnits` لقراءات تربوية عميقة مرتبطة بمحاور موجودة.
- `patches` لتحسين حقول محددة داخل عناصر العقد المحلي.
- تحقق من `targetId` والحقل ومراجع الأدلة.
- رفض `MAX_TOKENS` وتنفيذ محاولة مختصرة واحدة.
- لا تغيير للحسابات ولا إنشاء خطط أو متابعة موازية.

لا توجد أسرار أو SQL جديدة.
