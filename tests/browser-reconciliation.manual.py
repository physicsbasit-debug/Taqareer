"""Manual Chromium acceptance for the v0.9.0 reconciliation UI.
Requires Python Playwright and system Chromium. It uses set_content so no local file navigation is needed.
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
    "executiveEnhancement": {"title": "حكم مصالَح", "summary": "تحسين موجز دون تقرير موازٍ."},
    "findingEnhancements": [{
        "targetId": "finding.mastery_spread",
        "statement": "تعزيز الاستنتاج دون تغيير الحساب.",
        "educationalImpact": "قرار أدق.",
        "recommendedAction": "تدخل متدرج."
    }],
    "interventionEnhancements": [
        {"targetId": "intervention.deep_gap", "action": "إجراء عميق محسن."},
        {"targetId": "intervention.moderate_gap", "action": "إجراء متوسط محسن."},
        {"targetId": "intervention.near_mastery", "action": "إجراء قريب محسن."},
        {"targetId": "intervention.mastery_enrichment", "action": "إثراء محسن."}
    ],
    "monitoringEnhancements": [{"targetId": "monitoring.short_followup", "measure": "متابعة محسنة."}],
    "diagnosticEnhancements": [], "additionalFindings": [], "qualityToolEnhancements": [],
    "additionalCautions": [], "missingDataRequests": []
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
            enrichDetailed:async()=>({ok:true,result:delta,model:'mock-delta'}),
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
        await page.wait_for_function("document.querySelector('#aiResultNotice') && !document.querySelector('#aiResultNotice').classList.contains('hidden')")
        result = {
            "notice": await page.locator('#aiResultNotice').inner_text(),
            "findings": await page.locator('#findings > *').count(),
            "interventions": await page.locator('#improvementPlanBody tr').count(),
            "monitoring": await page.locator('#monitoringPlanGrid > *').count(),
            "errors": errors,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        assert result['findings'] == 5
        assert result['interventions'] == 4
        assert result['monitoring'] == 4
        assert not errors
        await browser.close()

asyncio.run(main())
