# رفع تقارير v0.5.0

## التحديث فوق المستودع الحالي v0.4.0

1. استخدم حزمة `changed_files_only`.
2. فك الضغط.
3. ارفع محتويات المجلد الناتج إلى جذر المستودع.
4. وافق على استبدال الملفات القديمة.
5. لا تعدّل `.github/workflows/deploy.yml`؛ حزمة التحديث لا تحتويه.
6. انتظر نجاح GitHub Actions ثم نفذ تحديثًا قويًا للصفحة.
7. انشر وظيفة Supabase من المسار:

```text
supabase/functions/analyze-educational-form/index.ts
```

8. أكمل خطوات `docs/AI_SETUP.md`.

## إنشاء مستودع جديد

استخدم `full_backup`، وتأكد من وجود:

```text
.github/workflows/deploy.yml
```

إذا اختفى المجلد المخفي عند فك الضغط من الهاتف، استخدم:

```text
GITHUB_WORKFLOW_VISIBLE/deploy.yml
```

وأنشئ المسار الحقيقي يدويًا داخل GitHub.

## ملاحظة مهمة

نشر GitHub Pages لا ينشر وظيفة Supabase تلقائيًا. الواجهة والوظيفة خدمتان منفصلتان عمدًا حتى لا يظهر مفتاح OpenAI داخل الموقع العام.
