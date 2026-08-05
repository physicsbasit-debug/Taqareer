# analyze-educational-form

وظيفة Supabase Edge لتطبيق تقارير.

العمليات الحالية:

- `ping`
- `classify`
- `vision_extract`
- `analyze_primary`
- `enhance_fast` للتوافق مع العملاء الأقدم فقط

## analyze_primary v0.13.5

- عقد `6.4.0`.
- 3 محاور تحليلية في المسار الطبيعي، و2 في الإنقاذ.
- فصل التشخيص عن الاستنتاج القراري.
- 2–3 تدخلات متمايزة و3 مراحل متابعة بالضبط.
- `thinkingLevel: low` مع إنقاذ واحد بـFlash-Lite و`minimal`.
- كل الادعاءات مرتبطة بمراجع أدلة مسموحة.
- ملفات الدرجات ترسل `targetGroupIds` و`successMetric` منظمين.
- الخادم يعيد بناء `targetGroup` و`successIndicator` من الأعداد المحلية.
- الأهداف المستحيلة تُخفض إلى القدرة الفعلية للفئات المستهدفة، مع تسجيل `numericGuard`.
- العميل يعيد التحقق من `numericGuard` قبل عرض التقرير.
