# عقد الاستنتاجات والأدلة

## 1. الهدف

ضمان أن كل نتيجة أو استنتاج أو توصية قابل للتتبع إلى البيانات الأصلية.

## 2. البنية الأساسية

```ts
interface EducationalFinding {
  id: string;
  type: "fact" | "pattern" | "interpretation" | "hypothesis";
  title: string;
  statement: string;
  evidence: EvidenceReference[];
  confidence: "high" | "medium" | "low";
  educationalImpact: string;
  recommendedAction?: ActionRecommendation;
  limitations: string[];
  generatedBy: "deterministic" | "ai" | "hybrid";
  reviewStatus: "pending" | "approved" | "edited" | "rejected";
  modelTrace?: ModelTrace;
}
```

## 3. مرجع الدليل

يجب أن يستطيع النظام فتح الدليل من التقرير:

- اسم الملف.
- الصفحة أو الورقة.
- الصف والعمود أو نطاق الخلايا.
- النص الأصلي أو القيمة.
- ثقة الاستخراج.
- التحويل أو الحساب المستخدم.

## 4. التوصية

```ts
interface ActionRecommendation {
  action: string;
  targetGroup: string;
  owner?: string;
  timeframe?: string;
  successIndicator: string;
  followUpTool: string;
  linkedFindingIds: string[];
}
```

## 5. قواعد الاعتماد

- الحقيقة الحسابية يمكن اعتمادها آليًا بعد اجتياز التحقق.
- النمط يحتاج حدًا أدنى من البيانات يحدده المحرك.
- التفسير والفرضية يبقيان قيد المراجعة البشرية.
- لا تصدر التوصية في التقرير المعتمد إذا لم ترتبط باستنتاج معتمد.
- أي تعديل بشري يحفظ مع اسم المستخدم والتاريخ.
