# عقد الذكاء الاصطناعي v0.9.2

## المبدأ

التحليل الحتمي المتخصص هو مصدر الحسابات والأدلة والرسوم وبنية التقرير. Gemini يضيف قراءة تربوية عميقة وتحسينات تنفيذية مرتبطة بمعرفات موجودة فقط.

## العملية الإنتاجية

`enrich_segment`

## الأجزاء

| segment | المخرجات المسموحة |
|---|---|
| diagnostic | `deepAnalysisUnits` لمحاور التشخيص فقط |
| findings | رقع executive/profile/finding فقط |
| interventions | رقع intervention فقط |
| governance | رقع qualityTool/monitoring مع cautions وdata requests |

## شكل الرد

```json
{
  "contractVersion": "4.0.0",
  "segment": "diagnostic",
  "deepAnalysisUnits": [],
  "patches": [],
  "additionalCautions": [],
  "missingDataRequests": []
}
```

## القيود

- كل `targetId` يجب أن يوجد في العقد المحلي.
- كل `field` يجب أن يكون مسموحًا لنوع الهدف.
- كل `evidenceRef` يجب أن يوجد في قائمة الأدلة.
- لا تغيير للأعداد أو النسب أو الفئات أو الرسوم.
- لا عناصر موازية ولا تدخلات أو مراحل متابعة إضافية.
- يسمح بالرد الفارغ إذا لم توجد إضافة ذات قيمة.

## الفشل

- `MAX_TOKENS` أو JSON التالف يشغل محاولة مختصرة واحدة للجزء نفسه.
- فشل جزء لا يلغي الأجزاء الناجحة.
- الواجهة تعيد الجزء المتعثر فقط.
