# معمارية تقارير v0.6.1

```text
ملف المستخدم
  ↓
قارئ الصيغة المحلي
  ↓
محرك تطبيع ملفات الوزارة عند Excel
  ↓
تصنيف محلي قائم على البنية والدلالات
  ↓
تحقق Gemini اختياري من نوع النموذج
  ↓
فحص جودة يعتمد الحقول الأساسية
  ↓
محرك حسابات حتمي
  ↓
تحليل تربوي عميق عبر Gemini
  ↓
أدلة + خطة تحسين + مراجعة بشرية
```

## الفصل بين الأدوار

- المتصفح: قراءة الملفات، التطبيع، الحسابات، وإخفاء الحقول الشخصية.
- Supabase Edge Function: حماية مفتاح Gemini، ضبط النطاق ورمز الوصول، والتحقق من مراجع الأدلة.
- Gemini: التصنيف الدلالي والتفسير التربوي والقراءة البصرية.

## Phase 1-B2: Official report boundary

The interactive UI is no longer a printable document. `report-system.js` receives a read-only snapshot of analysis state and generates a standalone A4 HTML document. This boundary prevents dashboard CSS, controls, scrolling containers, development labels, and technical evidence references from leaking into official output.
