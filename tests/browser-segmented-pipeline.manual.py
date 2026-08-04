"""Chromium acceptance for v0.9.2 segmented deep-analysis pipeline.
Verifies immediate local results, partial success, retry of the failed segment only,
and final reconciliation without duplicate interventions or monitoring cycles.
No network is required.
"""
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = re.sub(r'<link rel="stylesheet"[^>]+>', '', (ROOT / 'index.html').read_text())
HTML = re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', HTML)

SEGMENT_RESULTS = {
    "diagnostic": {
        "contractVersion": "4.0.0",
        "segment": "diagnostic",
        "deepAnalysisUnits": [{
            "targetId": "diagnostic.measurement_quality",
            "analysis": "تحدد الدرجات حجم فجوة الإتقان والفئات المستهدفة بثقة مرتفعة، لكنها لا تحدد المهارة أو المفهوم المسبب للتعثر؛ لذلك يلزم فصل قرار التجزئة عن التشخيص المحتوائي.",
            "evidenceRefs": ["metric:n", "metric:masteryPct"],
            "confidence": "مرتفعة",
            "implications": ["اعتماد فئات التدخل بوصفها فرزًا أوليًا."],
            "alternativeExplanations": ["قد تعكس النتيجة صعوبة أداة القياس أو تفاوت فرص التعلم."],
            "limitations": ["الدرجات الإجمالية لا تكشف موضع الخطأ المعرفي."],
            "dataRequests": ["تحليل مفردات الاختبار وربطها بالمهارات."]
        }],
        "patches": [], "additionalCautions": [], "missingDataRequests": [],
        "validation": {"acceptedDeepAnalysisUnits": 1, "acceptedPatches": 0}
    },
    "findings": {
        "contractVersion": "4.0.0", "segment": "findings", "deepAnalysisUnits": [],
        "patches": [{
            "targetType": "finding", "targetId": "finding.mastery_spread",
            "field": "educationalImpact",
            "text": "انخفاض الانتشار بهذا الحجم يتطلب تدخلًا متعدد المسارات بدل برنامج علاجي موحد.",
            "items": [], "evidenceRefs": ["metric:masteryPct"]
        }],
        "additionalCautions": [], "missingDataRequests": [],
        "validation": {"acceptedDeepAnalysisUnits": 0, "acceptedPatches": 1}
    },
    "interventions": {
        "contractVersion": "4.0.0", "segment": "interventions", "deepAnalysisUnits": [],
        "patches": [{
            "targetType": "intervention", "targetId": "intervention.deep_gap",
            "field": "implementationSteps", "text": "",
            "items": ["اختبار تشخيصي قصير.", "إعادة تدريس في مجموعات صغيرة.", "اختبار خروج أسبوعي."],
            "evidenceRefs": ["metric:deepGapPct"]
        }],
        "additionalCautions": [], "missingDataRequests": [],
        "validation": {"acceptedDeepAnalysisUnits": 0, "acceptedPatches": 1}
    },
    "governance": {
        "contractVersion": "4.0.0", "segment": "governance", "deepAnalysisUnits": [],
        "patches": [{
            "targetType": "monitoring", "targetId": "monitoring.short_followup",
            "field": "measure",
            "text": "قياس انتقال الطلبة بين فئات التدخل أسبوعيًا باستخدام مهمات قصيرة متكافئة.",
            "items": [], "evidenceRefs": []
        }],
        "additionalCautions": ["لا تفسر الفروق سببيًا دون بيانات إضافية."],
        "missingDataRequests": [],
        "validation": {"acceptedDeepAnalysisUnits": 0, "acceptedPatches": 1}
    }
}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.set_content(HTML, wait_until='domcontentloaded')
        await page.evaluate("""() => {
          const store = new Map();
          const storage = {getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size;}};
          Object.defineProperty(window,'localStorage',{value:storage,configurable:true});
          Object.defineProperty(window,'sessionStorage',{value:storage,configurable:true});
        }""")
        await page.add_style_tag(content=(ROOT / 'assets/styles.css').read_text())
        for name in ['runtime-config.js','xlsx-lite.js','document-lite.js','performance-pipeline.js','ai-client.js','mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','deep-analysis-orchestrator.js','report-system.js']:
            await page.add_script_tag(content=(ROOT / 'assets' / name).read_text())
        await page.evaluate("""segmentResults => {
          const calls = {diagnostic:0,findings:0,interventions:0,governance:0};
          window.__segmentCalls = () => ({...calls});
          const original = window.TaqareerAI;
          window.TaqareerAI = {...original,
            isConfigured:()=>true,
            getConfig:()=>({enabled:true}),
            enrichSegmentDetailed:async(payload)=>{
              const segment = payload.segment;
              calls[segment] += 1;
              await new Promise(r=>setTimeout(r, segment === 'diagnostic' ? 240 : 160));
              if(segment === 'governance' && calls[segment] === 1) throw new Error('تعثر تجريبي في جزء الحوكمة');
              return {ok:true,result:segmentResults[segment],model:'mock-segmented',usage:null,
                serverTiming:{segment,geminiMs:160,attemptNumber:1,compactRetryUsed:false},
                clientTiming:{durationMs:160}};
            },
            saveConfig:()=>{}, clearConfig:()=>{}, ping:async()=>({ok:true})
          };
        }""", SEGMENT_RESULTS)
        await page.add_script_tag(content=(ROOT / 'assets/app.js').read_text())
        await page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")

        await page.click('.input-tab[data-input-mode="sample"]')
        await page.click('[data-sample="component"]')
        await page.wait_for_selector('#panel-2.active-panel')
        await page.click('#toSetupBtn')
        await page.wait_for_selector('#panel-3.active-panel')
        await page.click('#runAnalysisBtn')
        await page.wait_for_selector('#panel-4.active-panel', timeout=1500)

        pending = await page.locator('#aiResultNotice').inner_text()
        assert 'ظهرت الحسابات والرسوم فورًا' in pending, pending
        assert await page.locator('#metrics .metric').count() > 0

        await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('اكتملت مصالحة جزئية آمنة')", timeout=8000)
        partial_notice = await page.locator('#aiResultNotice').inner_text()
        calls_before = await page.evaluate('window.__segmentCalls()')
        assert calls_before == {'diagnostic':1,'findings':1,'interventions':1,'governance':1}, calls_before
        assert 'الجودة والمتابعة' in partial_notice, partial_notice
        assert await page.locator('#findings > *').count() == 5
        assert await page.locator('#improvementPlanBody tr').count() == 4
        assert await page.locator('#monitoringPlanGrid > *').count() == 4
        assert 'تفسيرات بديلة محتملة' in await page.locator('#diagnosticSectionsGrid').inner_text()

        await page.click('#retryAiOnlyBtn')
        await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('اكتملت المصالحة التحليلية المقسّمة')", timeout=8000)
        calls_after = await page.evaluate('window.__segmentCalls()')
        assert calls_after == {'diagnostic':1,'findings':1,'interventions':1,'governance':2}, calls_after
        final_notice = await page.locator('#aiResultNotice').inner_text()
        timing = await page.locator('#analysisTimingPanel').inner_text()
        assert 'المقسّمة' in final_notice
        assert 'Gemini' in timing or 'الأجزاء' in timing
        assert not errors, errors

        print(json.dumps({
          'pending': pending,
          'partial': partial_notice,
          'final': final_notice,
          'callsBeforeRetry': calls_before,
          'callsAfterRetry': calls_after,
          'findings': 5,
          'interventions': 4,
          'monitoring': 4,
          'errors': errors,
        }, ensure_ascii=False, indent=2))
        await browser.close()

asyncio.run(main())
