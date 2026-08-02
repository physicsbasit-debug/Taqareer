# نشر «تقارير» على GitHub Pages

## الطريقة الأساسية

1. ارفع جميع ملفات الحزمة إلى جذر المستودع.
2. تأكد من وجود:

```text
.github/workflows/deploy.yml
```

3. افتح `Settings → Pages` واختر `GitHub Actions`.
4. افتح `Actions` وتابع تشغيل `Deploy Taqareer to GitHub Pages`.

## عندما يختفي مجلد `.github`

استخدم النسخة المرئية:

```text
GITHUB_WORKFLOW_VISIBLE/deploy.yml
```

داخل GitHub اختر `Add file → Create new file` واكتب اسم الملف كاملًا:

```text
.github/workflows/deploy.yml
```

ثم انسخ المحتوى واحفظه على فرع `main`.

## ملاحظة `.nojekyll`

لا يوجد اعتماد على رفع ملف `.nojekyll` المخفي يدويًا. مسار التشغيل ينشئه تلقائيًا داخل مجلد `_site` قبل النشر.
