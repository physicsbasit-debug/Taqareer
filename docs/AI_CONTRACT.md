# عقد الذكاء الاصطناعي v0.9.0

## العمليات

- `ping`: اختبار الاتصال.
- `classify`: تحقق دلالي عند الحاجة.
- `vision_extract`: استخراج بصري.
- `enrich`: العملية الحالية للتحليل العميق المصالَح.
- `analyze`: مسار قديم محفوظ للتوافق فقط.

## طلب `enrich`

يرسل التطبيق:

- ملفًا تحليليًا مركزًا محسوبًا من كامل البيانات.
- مراجع الأدلة المتاحة.
- `reconciliationContract` ويتضمن العناصر المستهدفة ومعرفاتها.
- تعليمات صريحة بأن الحسابات والعناصر الأساسية حتمية ومقفلة.

## استجابة `enrich`

```json
{
  "executiveEnhancement": {},
  "profileEnhancement": {},
  "diagnosticEnhancements": [{ "targetId": "diagnostic.measurement_quality" }],
  "findingEnhancements": [{ "targetId": "finding.mastery_spread" }],
  "additionalFindings": [],
  "qualityToolEnhancements": [{ "targetId": "tool-id" }],
  "interventionEnhancements": [{ "targetId": "intervention.deep_gap" }],
  "monitoringEnhancements": [{ "targetId": "monitoring.short_followup" }],
  "additionalCautions": [],
  "missingDataRequests": [],
  "suggestedNewType": { "needed": false }
}
```

## محظورات العقد

- لا إعادة حساب الأعداد أو النسب.
- لا إنشاء خطة تدخل موازية عند وجود تدخل مستهدف.
- لا إنشاء دورة متابعة ثانية.
- لا استخدام `targetId` غير موجود.
- لا الاستشهاد بمرجع دليل غير مرسل.
- لا تحويل فرضية سببية إلى حقيقة.

## ميزانية التنفيذ

- `classify`: `gemini-2.5-flash-lite`، تفكير 0.
- `enrich`: نموذج `GEMINI_MODEL`، تفكير 768، حد إخراج 4200.
- `analyze` القديم: تفكير 1024، محفوظ للتوافق ولا تستخدمه الواجهة الحالية.
