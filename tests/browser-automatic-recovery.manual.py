"""Chromium acceptance for v0.9.4 automatic segment recovery.
A transient segment fails twice, is retried automatically, and succeeds without a user click.
"""
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = re.sub(r'<link rel="stylesheet"[^>]+>', '', (ROOT / 'index.html').read_text())
HTML = re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', HTML)


def result(segment):
    value = {"contractVersion":"4.1.0","segment":segment,"deepAnalysisUnits":[],"patches":[],"additionalCautions":[],"missingDataRequests":[],"validation":{}}
    if segment == "diagnostic":
        value["deepAnalysisUnits"] = [{"targetId":"diagnostic.measurement_quality","analysis":"تحليل عميق","evidenceRefs":["metric:n"],"confidence":"مرتفعة","implications":[],"alternativeExplanations":[],"limitations":[],"dataRequests":[]}]
    return value

SEGMENTS = {key: result(key) for key in ["diagnostic","findings","interventions","governance"]}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={"width":1440,"height":1000})
        errors=[]
        page.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.set_content(HTML, wait_until='domcontentloaded')
        await page.evaluate("""() => {
          const store=new Map();
          const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size;}};
          Object.defineProperty(window,'localStorage',{value:storage,configurable:true});
          Object.defineProperty(window,'sessionStorage',{value:storage,configurable:true});
        }""")
        await page.add_style_tag(content=(ROOT/'assets/styles.css').read_text())
        for name in ['runtime-config.js','xlsx-lite.js','document-lite.js','performance-pipeline.js','ai-client.js','mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','deep-analysis-orchestrator.js','report-system.js']:
            await page.add_script_tag(content=(ROOT/'assets'/name).read_text())
        await page.evaluate("""segmentResults => {
          const calls={diagnostic:0,findings:0,interventions:0,governance:0};
          window.__segmentCalls=()=>({...calls});
          window.TaqareerAI={...window.TaqareerAI,isConfigured:()=>true,getConfig:()=>({enabled:true}),
            enrichSegmentDetailed:async(payload)=>{
              const segment=payload.segment; calls[segment]++;
              await new Promise(r=>setTimeout(r,60));
              if(segment==='governance' && calls[segment]<3){
                const error=new Error('توقف جزء governance عند حد الإخراج. فشلت المحاولة المختصرة لهذا الجزء أيضًا.');
                error.status=503; error.code='SEGMENT_OUTPUT_EXHAUSTED'; error.retryable=true; throw error;
              }
              return {ok:true,result:segmentResults[segment],model:'mock-recovery',usage:null,serverTiming:{segment,geminiMs:60},clientTiming:{durationMs:60}};
            },saveConfig:()=>{},clearConfig:()=>{},ping:async()=>({ok:true})};
        }""", SEGMENTS)
        await page.add_script_tag(content=(ROOT/'assets/app.js').read_text())
        await page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
        await page.click('.input-tab[data-input-mode="sample"]')
        await page.click('[data-sample="component"]')
        await page.wait_for_selector('#panel-2.active-panel')
        await page.click('#toSetupBtn')
        await page.wait_for_selector('#panel-3.active-panel')
        await page.click('#runAnalysisBtn')
        await page.wait_for_selector('#panel-4.active-panel', timeout=1500)
        await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('اكتملت المصالحة التحليلية المقسّمة')", timeout=12000)
        calls=await page.evaluate('window.__segmentCalls()')
        notice=await page.locator('#aiResultNotice').inner_text()
        timing=await page.locator('#analysisTimingPanel').inner_text()
        assert calls == {'diagnostic':1,'findings':1,'interventions':1,'governance':3}, calls
        assert 'استُعيد 1 جزء متعثر تلقائيًا' in notice, notice
        assert 'الاستعادة الآلية' in timing, timing
        assert await page.locator('#retryAiOnlyBtn').count() == 0
        assert not errors, errors
        print(json.dumps({'calls':calls,'notice':notice,'timing':timing,'errors':errors},ensure_ascii=False,indent=2))
        await browser.close()

asyncio.run(main())
