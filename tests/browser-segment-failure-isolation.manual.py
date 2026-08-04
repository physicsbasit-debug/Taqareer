"""Chromium acceptance for v0.9.4 segment failure isolation.
Governance is split into quality and monitoring tasks. A content failure is not
repeated identically; the successful sibling is preserved; manual retry runs
only the failed task and completes the reconciliation.
"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<link rel="stylesheet"[^>]+>','',(ROOT/'index.html').read_text())
HTML=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',HTML)

def result(payload):
    segment=payload['segment']; scope=payload.get('scope','full')
    value={"contractVersion":"4.1.0","segment":segment,"deepAnalysisUnits":[],"patches":[],"additionalCautions":[],"missingDataRequests":[],"validation":{}}
    if segment=='diagnostic':
        value['deepAnalysisUnits']=[{"targetId":"diagnostic.measurement_quality","analysis":"تحليل عميق","evidenceRefs":["metric:validCount"],"confidence":"مرتفعة","implications":[],"alternativeExplanations":[],"limitations":[],"dataRequests":[]}]
    elif segment=='findings':
        value['patches']=[{"targetType":"finding","targetId":"finding.mastery_gap","field":"educationalImpact","text":"أثر تربوي","items":[],"evidenceRefs":["metric:masteryPct"]}]
    elif segment=='interventions':
        value['patches']=[{"targetType":"intervention","targetId":"intervention.deep_gap","field":"action","text":"إجراء علاجي","items":[],"evidenceRefs":["metric:deepGapCount"]}]
    elif segment=='governance' and scope=='monitoring':
        value['patches']=[{"targetType":"monitoring","targetId":"monitoring.baseline","field":"measure","text":"قياس خط الأساس","items":[],"evidenceRefs":["metric:mean"]}]
    return value

async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=await browser.new_page(viewport={"width":1440,"height":1000})
    errors=[];page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None);page.on('pageerror',lambda e: errors.append(str(e)))
    await page.set_content(HTML,wait_until='domcontentloaded')
    await page.evaluate("""() => { const store=new Map(); const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size;}}; Object.defineProperty(window,'localStorage',{value:storage,configurable:true}); Object.defineProperty(window,'sessionStorage',{value:storage,configurable:true}); }""")
    await page.add_style_tag(content=(ROOT/'assets/styles.css').read_text())
    for name in ['runtime-config.js','xlsx-lite.js','document-lite.js','performance-pipeline.js','ai-client.js','mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','deep-analysis-orchestrator.js','report-system.js']:
      await page.add_script_tag(content=(ROOT/'assets'/name).read_text())
    await page.evaluate("""() => {
      const calls={}; let qualityCanSucceed=false;
      const makeResult=(payload)=>{
        const segment=payload.segment, scope=payload.scope||'full';
        const value={contractVersion:'4.1.0',segment,deepAnalysisUnits:[],patches:[],additionalCautions:[],missingDataRequests:[],validation:{}};
        if(segment==='diagnostic') value.deepAnalysisUnits=[{targetId:'diagnostic.measurement_quality',analysis:'تحليل عميق',evidenceRefs:['metric:validCount'],confidence:'مرتفعة',implications:[],alternativeExplanations:[],limitations:[],dataRequests:[]}];
        else if(segment==='findings') value.patches=[{targetType:'finding',targetId:'finding.mastery_gap',field:'educationalImpact',text:'أثر تربوي',items:[],evidenceRefs:['metric:masteryPct']}];
        else if(segment==='interventions') value.patches=[{targetType:'intervention',targetId:'intervention.deep_gap',field:'action',text:'إجراء علاجي',items:[],evidenceRefs:['metric:deepGapCount']}];
        else if(segment==='governance' && scope==='monitoring') value.patches=[{targetType:'monitoring',targetId:'monitoring.baseline',field:'measure',text:'قياس خط الأساس',items:[],evidenceRefs:['metric:mean']}];
        return value;
      };
      window.__calls=()=>({...calls}); window.__allowQuality=()=>{qualityCanSucceed=true;};
      window.TaqareerAI={...window.TaqareerAI,isConfigured:()=>true,getConfig:()=>({enabled:true}),
        enrichSegmentDetailed:async(payload)=>{
          calls[payload.taskId]=(calls[payload.taskId]||0)+1; await new Promise(r=>setTimeout(r,30));
          if(payload.taskId==='governance.quality' && !qualityCanSucceed){ const e=new Error('توقف عند حد الإخراج');e.status=503;e.code='SEGMENT_OUTPUT_EXHAUSTED';e.retryable=true;e.failureType='output_exhausted';e.details={failureType:'output_exhausted',taskId:payload.taskId};throw e; }
          return {result:makeResult(payload),model:'mock',usage:null,serverTiming:{taskId:payload.taskId,segment:payload.segment,scope:payload.scope},clientTiming:{durationMs:30}};
        },saveConfig:()=>{},clearConfig:()=>{},ping:async()=>({ok:true})};
    }""")
    await page.add_script_tag(content=(ROOT/'assets/app.js').read_text())
    await page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    await page.click('.input-tab[data-input-mode="sample"]');await page.click('[data-sample="component"]');await page.wait_for_selector('#panel-2.active-panel');await page.click('#toSetupBtn');await page.wait_for_selector('#panel-3.active-panel');await page.click('#runAnalysisBtn');await page.wait_for_selector('#panel-4.active-panel',timeout=1500)
    await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('أدوات الجودة')",timeout=10000)
    calls1=await page.evaluate('window.__calls()');notice1=await page.locator('#aiResultNotice').inner_text()
    assert calls1.get('governance.quality')==1,calls1
    assert calls1.get('governance.monitoring')==1,calls1
    assert 'أدوات الجودة' in notice1,notice1
    await page.evaluate('window.__allowQuality()');await page.click('#retryAiOnlyBtn')
    await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('اكتملت المصالحة التحليلية المعزولة')",timeout=10000)
    calls2=await page.evaluate('window.__calls()');notice2=await page.locator('#aiResultNotice').inner_text()
    assert calls2.get('governance.quality')==2,calls2
    assert calls2.get('governance.monitoring')==1,calls2
    assert await page.locator('#retryAiOnlyBtn').count()==0
    assert not errors,errors
    print(json.dumps({'firstCalls':calls1,'finalCalls':calls2,'firstNotice':notice1,'finalNotice':notice2,'errors':errors},ensure_ascii=False,indent=2))
    await browser.close()

asyncio.run(main())
