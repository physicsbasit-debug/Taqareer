"""Chromium acceptance for v0.9.5 Quality Microtask Engine.
One quality tool fails with a content error. The report still completes with the
local deterministic interpretation, no manual retry button, and no sibling task repetition.
"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<link rel="stylesheet"[^>]+>','',(ROOT/'index.html').read_text())
HTML=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',HTML)

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
      const calls={};
      const makeResult=(payload)=>{
        const value={contractVersion:'4.2.0',segment:payload.segment,deepAnalysisUnits:[],patches:[],additionalCautions:[],missingDataRequests:[],validation:{}};
        if(payload.segment==='diagnostic') value.deepAnalysisUnits=[{targetId:'diagnostic.measurement_quality',analysis:'تحليل عميق',evidenceRefs:['metric:validCount'],confidence:'مرتفعة',implications:[],alternativeExplanations:[],limitations:[],dataRequests:[]}];
        else if(payload.segment==='findings') value.patches=[{targetType:'finding',targetId:'finding.mastery_gap',field:'educationalImpact',text:'أثر تربوي',items:[],evidenceRefs:['metric:masteryPct']}];
        else if(payload.segment==='interventions') value.patches=[{targetType:'intervention',targetId:'intervention.deep_gap',field:'action',text:'إجراء علاجي',items:[],evidenceRefs:['metric:deepGapCount']}];
        else if(payload.scope==='monitoring') value.patches=[{targetType:'monitoring',targetId:'monitoring.baseline',field:'measure',text:'قياس خط الأساس',items:[],evidenceRefs:['metric:mean']}];
        else if(payload.scope==='quality-tool') {
          const target=payload.reconciliationContract.patchTargets.qualityTools[0];
          value.patches=[{targetType:'qualityTool',targetId:target.id,field:'interpretation',text:'تفسير سياقي موجز',items:[],evidenceRefs:payload.availableEvidenceRefs.slice(0,1)}];
        }
        return value;
      };
      window.__calls=()=>({...calls});
      window.TaqareerAI={...window.TaqareerAI,isConfigured:()=>true,getConfig:()=>({enabled:true}),
        enrichSegmentDetailed:async(payload)=>{
          calls[payload.taskId]=(calls[payload.taskId]||0)+1; await new Promise(r=>setTimeout(r,20));
          if(payload.taskId==='quality.sensitivity'){const e=new Error('توقف عند حد الإخراج');e.status=503;e.code='SEGMENT_OUTPUT_EXHAUSTED';e.retryable=true;e.failureType='output_exhausted';e.details={failureType:'output_exhausted',taskId:payload.taskId};throw e;}
          return {result:makeResult(payload),model:'mock',usage:null,serverTiming:{taskId:payload.taskId,segment:payload.segment,scope:payload.scope},clientTiming:{durationMs:20}};
        },saveConfig:()=>{},clearConfig:()=>{},ping:async()=>({ok:true})};
    }""")
    await page.add_script_tag(content=(ROOT/'assets/app.js').read_text())
    await page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    await page.click('.input-tab[data-input-mode="sample"]');await page.click('[data-sample="component"]');await page.wait_for_selector('#panel-2.active-panel');await page.click('#toSetupBtn');await page.wait_for_selector('#panel-3.active-panel');await page.click('#runAnalysisBtn');await page.wait_for_selector('#panel-4.active-panel',timeout=1500)
    await page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('اكتملت المصالحة التحليلية المعزولة')",timeout=15000)
    calls=await page.evaluate('window.__calls()');notice=await page.locator('#aiResultNotice').inner_text();timing=await page.locator('#analysisTimingPanel').inner_text()
    quality_calls={k:v for k,v in calls.items() if k.startswith('quality.')}
    assert len(quality_calls)==6,quality_calls
    assert quality_calls.get('quality.sensitivity')==1,quality_calls
    assert calls.get('governance.monitoring')==1,calls
    assert 'تعتمد 1 على التفسير المحلي الآمن' in notice,notice
    assert '5/6 محسنة بالذكاء' in timing,timing
    assert await page.locator('#retryAiOnlyBtn').count()==0
    assert not errors,errors
    print(json.dumps({'qualityCalls':quality_calls,'notice':notice,'timing':timing,'errors':errors},ensure_ascii=False,indent=2))
    await browser.close()

asyncio.run(main())
