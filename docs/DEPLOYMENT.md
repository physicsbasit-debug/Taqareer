# نشر تقارير

## GitHub Pages

المصدر هو الفرع `main`. Workflow النشر في `.github/workflows/deploy.yml` يبني Artifact عامًا من ملفات التشغيل فقط:

- `index.html`
- `manifest.json`
- `assets/`
- `.nojekyll` داخل Artifact فقط

لا تُنشر `docs/` أو `samples/` أو `registry/` أو `tests/` أو `supabase/` إلى الموقع العام.

## Supabase Edge

المصدر التشغيلي الحالي هو:

```text
supabase/functions/analyze-educational-form/index.ts
```

الأسرار تبقى في Supabase ولا توضع في GitHub Pages أو ملفات الواجهة. لا توجد حاجة للاحتفاظ بنسخ `SUPABASE_FUNCTION_GEMINI_V*.txt` في جذر المستودع؛ Git يحتفظ بالتاريخ.

## فحص الإصدار

قبل الرفع:

```bash
npm ci
npm run check
```

## صيانة المستودع

الملف `scripts/repository-hygiene.cjs` يمنع رجوع مخلفات الحزم القديمة. ويمكن تشغيل التنظيف المقيد يدويًا عند الحاجة:

```bash
node scripts/repository-hygiene.cjs --clean
```
