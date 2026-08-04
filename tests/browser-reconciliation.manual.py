"""Chromium acceptance for v0.9.1 Deep Analysis Delta UI.
Uses set_content and a mocked valid deep pedagogical delta. No network is required.
"""
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = re.sub(r'<link rel="stylesheet"[^>]+>', '', (ROOT / 'index.html').read_text())
HTML = re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', HTML)
DELTA = {
    "contractVersion": "3.0.0",
    "deepAnalysisUnits": [
        {
            "targetId": "diagnostic.measurement_quality",
            "analysis": "تسمح البيانات بتقدير حجم فجوة الإتقان وتوزيعها بدرجة ثقة مرتفعة، لكنها لا تكشف المهارات أو المفاهيم المسببة للتعثر. تربويًا، يصلح هذا المستوى من البيانات لتحديد جرعة التدخل والفئات المستهدفة، بينما يتطلب تشخيص المحتوى تحليل مفردات الاختبار وعينات من أعمال الطلبة.",
            "evidenceRefs": ["metric:n", "metric:masteryPct"],
            "confidence": "مرتفعة",
            "implications": ["اعتماد التجزئة العلاجية الحالية بوصفها قرار فرز أولي.", "جمع أدلة أداء نوعية قبل تحديد المحتوى العلاجي."],
            "alternativeExplanations": ["قد تعكس النتيجة صعوبة أداة القياس أو عدم اتساقها مع فرص التعلم، وليس ضعف الفهم وحده."],
            "limitations": ["الدرجات الإجمالية لا تحدد موضع الخطأ المعرفي."],
            "dataRequests": ["تحليل مفردات الاختبار وربطها بالمهارات."]
        },
        {
            "targetId": "diagnostic.distribution_center",
            "analysis": "تقارب المتوسط والوسيط يشير إلى مركز أداء واضح، لكن التشتت الواسع يعني أن المتوسط لا يمثل احتياجات جميع الطلبة. وجود كتلة كبيرة في الفجوة العميقة مع مجموعة متقنة يفرض تدخلًا متمايزًا لا برنامجًا موحدًا.",
            "evidenceRefs": ["metric:mean", "metric:median", "metric:sd"],
            "confidence": "مرتفعة",
            "implications": ["استخدام الربيعات وفئات الإتقان لتوزيع الطلبة إلى مسارات تدخل مختلفة."],
            "alternativeExplanations": ["قد يرتبط التشتت بتفاوت الخبرة السابقة أو الحضور أو فرص الممارسة."],
            "limitations": ["لا تتوافر متغيرات تفسيرية لاختبار أسباب التفاوت."],
            "dataRequests": ["بيانات الحضور والنتائج السابقة وعينات الأعمال."]
        }
    ],
    "patches": [
        {"targetType":"executive","targetId":"executive","field":"executiveSummary","text":"تتطلب النتيجة تدخلًا سريعًا متعدد المسارات، مع حماية المتقنين من الركود وفصل التشخيص المحتوائي عن قرار التجزئة الأولي.","items":[],"evidenceRefs":["metric:masteryPct"]},
        {"targetType":"finding","targetId":"finding.mastery_spread","field":"educationalImpact","text":"انخفاض الانتشار بهذا الحجم يعني أن التدخل الصفي العام وحده غير كافٍ، ويجب الجمع بين إعادة التدريس المكثف ومسار قريب من الإتقان وإثراء المتقنين.","items":[],"evidenceRefs":["metric:masteryPct","metric:n"]},
        {"targetType":"intervention","targetId":"intervention.deep_gap","field":"implementationSteps","text":"","items":["اختبار تشخيصي قصير للمتطلبات السابقة.","إعادة تدريس في مجموعات صغيرة.","اختبارات خروج أسبوعية وتعديل المجموعات."],"evidenceRefs":["metric:deepGapPct"]},
        {"targetType":"intervention","targetId":"intervention.deep_gap","field":"resources","text":"","items":["بنك أسئلة تشخيصي.","سجل انتقال أسبوعي بين الفئات."],"evidenceRefs":["metric:deepGapPct"]},
        {"targetType":"monitoring","targetId":"monitoring.short_followup","field":"measure","text":"قياس انتقال الطلبة بين الفئات الأربع أسبوعيًا مع مقارنة نتائج مهمات قصيرة متكافئة.","items":[],"evidenceRefs":[]}
    ],
    "additionalCautions": ["لا يجوز تفسير التفاوت بوصفه أثرًا للمعلم أو المنهج دون بيانات إضافية."],
    "missingDataRequests": ["تحليل مفردات الاختبار وربطها بالمهارات."]
}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.set_content(HTML, wait_until='domcontentloaded')
        await page.add_style_tag(content=(ROOT / 'assets/styles.css').read_text())
        for name in ['runtime-config.js','xlsx-lite.js','document-lite.js','performance-pipeline.js','ai-client.js','mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','report-system.js']:
            await page.add_script_tag(content=(ROOT / 'assets' / name).read_text())
        await page.evaluate("""delta => {
          const original = window.TaqareerAI;
          window.TaqareerAI = {...original, isConfigured:()=>true, getConfig:()=>({enabled:true}),
            enrichDetailed:async()=>({ok:true,result:delta,model:'mock-deep-delta',serverTiming:{geminiMs:8500,attemptNumber:1,compactRetryUsed:false,acceptedDeepAnalyses:2,acceptedPatches:5}}),
            saveConfig:()=>{}, clearConfig:()=>{}, ping:async()=>({ok:true})};
        }""", DELTA)
        await page.add_script_tag(content=(ROOT / 'assets/app.js').read_text())
        await page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
        await page.click('.input-tab[data-input-mode="sample"]')
        await page.click('[data-sample="component"]')
        await page.click('#toSetupBtn')
        await page.fill('#maxScoreInput', '60')
        await page.fill('#masteryThresholdInput', '75')
        await page.click('#runAnalysisBtn')
        await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('اكتملت المصالحة التحليلية')")
        result = {
            "notice": await page.locator('#aiResultNotice').inner_text(),
            "findings": await page.locator('#findings > *').count(),
            "interventions": await page.locator('#improvementPlanBody tr').count(),
            "monitoring": await page.locator('#monitoringPlanGrid > *').count(),
            "diagnostics": await page.locator('#diagnosticSectionsGrid > *').count(),
            "deepAlternativeVisible": await page.locator('#diagnosticSectionsGrid').inner_text(),
            "errors": errors,
        }
        print(json.dumps({k:(v if k != 'deepAlternativeVisible' else ('تفسيرات بديلة محتملة' in v)) for k,v in result.items()}, ensure_ascii=False, indent=2))
        assert result['findings'] == 5
        assert result['interventions'] == 4
        assert result['monitoring'] == 4
        assert result['diagnostics'] == 4
        assert 'تفسيرات بديلة محتملة' in result['deepAlternativeVisible']
        assert not errors
        await browser.close()

asyncio.run(main())
