"""Chromium acceptance for progressive local results, delayed deep delta and cache reuse.
Uses set_content to avoid browser navigation policy restrictions.
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
  'contractVersion':'3.0.0',
  'deepAnalysisUnits':[{
    'targetId':'diagnostic.measurement_quality',
    'analysis':'قراءة تربوية عميقة تختبر معنى الفجوة وحدود الاستدلال دون إعادة الحسابات.',
    'evidenceRefs':['metric:n','metric:masteryPct'],'confidence':'مرتفعة',
    'implications':['تجزئة التدخل.'],'alternativeExplanations':['صعوبة الأداة احتمال بديل.'],
    'limitations':['لا تحدد الدرجة المهارة.'],'dataRequests':['تحليل المفردات.']
  }],
  'patches':[{'targetType':'finding','targetId':'finding.mastery_spread','field':'educationalImpact','text':'أثر تربوي محسن ومركز.','items':[],'evidenceRefs':['metric:masteryPct']}],
  'additionalCautions':[], 'missingDataRequests':[]
}

async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    await page.set_content(HTML,wait_until='domcontentloaded')
    await page.evaluate("""() => {
      const store=new Map();
      const memoryStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size;}};
      Object.defineProperty(window,'localStorage',{value:memoryStorage,configurable:true});
      Object.defineProperty(window,'sessionStorage',{value:memoryStorage,configurable:true});
    }""")
    await page.add_style_tag(content=(ROOT/'assets/styles.css').read_text())
    for name in ['runtime-config.js','xlsx-lite.js','document-lite.js','performance-pipeline.js','ai-client.js','mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','report-system.js']:
      await page.add_script_tag(content=(ROOT/'assets'/name).read_text())
    await page.evaluate("""delta => {
      let calls=0;
      window.__aiCalls=()=>calls;
      const original=window.TaqareerAI;
      window.TaqareerAI={...original,isConfigured:()=>true,getConfig:()=>({enabled:true}),
        enrichDetailed:async()=>{calls++; await new Promise(r=>setTimeout(r,1200)); return {ok:true,result:delta,model:'mock-deep',serverTiming:{geminiMs:1200,payloadChars:9200,attemptNumber:1,compactRetryUsed:false,acceptedDeepAnalysisUnits:1,acceptedPatches:1},clientTiming:{durationMs:1200}}},
        saveConfig:()=>{},clearConfig:()=>{},ping:async()=>({ok:true})};
    }""",DELTA)
    await page.add_script_tag(content=(ROOT/'assets/app.js').read_text())
    await page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")

    async def run_sample():
      await page.click('.input-tab[data-input-mode="sample"]')
      await page.click('[data-sample="component"]')
      await page.wait_for_selector('#panel-2.active-panel')
      await page.click('#toSetupBtn')
      await page.wait_for_selector('#panel-3.active-panel')
      await page.click('#runAnalysisBtn')

    await run_sample()
    await page.wait_for_selector('#panel-4.active-panel',timeout=900)
    pending=await page.locator('#aiResultNotice').inner_text()
    assert 'ظهرت الحسابات والرسوم فورًا' in pending,pending
    assert await page.locator('#metrics .metric').count()>0
    await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('اكتملت المصالحة التحليلية')",timeout=6000)
    assert await page.evaluate('window.__aiCalls()')==1
    timing=await page.locator('#analysisTimingPanel').inner_text()
    assert 'الحسابات والرسوم' in timing and 'Gemini' in timing,timing
    assert 'قراءة تربوية عميقة' in await page.locator('#diagnosticSectionsGrid').inner_text()

    await page.click('#restartBtn'); await page.wait_for_selector('#panel-1.active-panel')
    await run_sample(); await page.wait_for_selector('#panel-4.active-panel',timeout=900)
    await page.wait_for_timeout(1800)
    second_notice=await page.locator('#aiResultNotice').inner_text()
    second_calls=await page.evaluate('window.__aiCalls()')
    assert 'الذاكرة المؤقتة' in second_notice,(second_notice,second_calls)
    assert second_calls==1,second_calls
    assert not errors,errors
    print(json.dumps({'pending':pending,'timing':timing,'aiCalls':1,'cacheReuse':True},ensure_ascii=False,indent=2))
    await browser.close()

asyncio.run(main())
