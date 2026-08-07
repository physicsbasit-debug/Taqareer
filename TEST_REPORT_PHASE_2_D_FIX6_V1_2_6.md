# Test Report — Taqareer v1.2.6 / Phase 2-D Fix 6

## Scope

إصلاح مهلة التحليل الذكي البطيئة دون تغيير الحسابات أو معادلات التقارير أو عقد التحليل التربوي.

## Root cause reproduced statically

كان `AbortController` الخاص بمحاولة Gemini يُلغى في `finally` مباشرة بعد اكتمال `fetch()`، بينما قراءة `response.text()` تتم بعد ذلك خارج المهلة. لذلك لم تكن مهلة المحاولة تغطي جسم الاستجابة كاملًا.

## Fix verification

- `response.text()` أصبح داخل نفس نطاق `try/finally` الذي يحافظ على مؤقت `AbortController`.
- أضيف اختبار Runtime يحاكي فشل/انقطاع جسم استجابة Gemini بعد وصول الترويسات، ويتحقق من الانتقال إلى النموذج البديل وعدم تعليق المسار.
- ترتيب نماذج primary أصبح:
  1. `gemini-3.6-flash`
  2. `gemini-3.5-flash-lite`
- الميزانيات:
  - Edge total deadline: 42s
  - Primary model attempt: 16s
  - Rescue attempt: 12s
  - Browser timeout: 52s
- Output token caps:
  - Primary: 4096
  - Rescue: 3072

## Automated results

`npm run check`:

- Node tests: **64 passed / 0 failed**
- Mastery contract tests: PASS
- Ministry mastery integration: PASS
- Deep-analysis families: PASS
- Chart completeness: PASS
- JavaScript syntax: PASS (12 asset files)
- Analysis contracts: PASS
- Static site contract: PASS (13 referenced files)

## Important limitation

لم يتوفر في بيئة التجهيز اتصال حي بمشروع Supabase/Gemini الخاص بالمستخدم، لذلك قياس زمن الاستجابة الحقيقي بعد النشر يبقى اختبار القبول النهائي.
