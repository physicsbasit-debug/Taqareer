import json, time, mimetypes
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://taqareer.test'
EDGE = 'https://edge.test/analyze'

ai_result = {
    "classification": {"id":"assessment_component","nameAr":"درجات مكوّن تقويمي","confidence":99,"rationale":"متسق"},
    "executiveTitle":"قراءة ذكية مكتملة",
    "executiveSummary":"تفسير تربوي اختباري مبني على المؤشرات الحتمية.",
    "analysisProfile":{"method":"تحليل متخصص سريع","dataAdequacy":"مرتفعة","dimensions":["الإتقان"],"decisionUses":["التدخل"]},
    "diagnosticSections":[], "findings":[], "qualityTools":[], "improvementPlan":[],
    "monitoringPlan":[], "dataRequests":[], "cautions":[],
    "suggestedNewType":{"needed":False,"nameAr":"","purpose":"","requiredFields":[],"analysisFamily":[]}
}

requests=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context=browser.new_context()
    context.add_init_script(f"""
      localStorage.setItem('taqareer.ai.config.v1', JSON.stringify({{
        endpoint: '{EDGE}', anonKey: 'test-public-key', enabled: true, timeoutMs: 10000
      }}));
      sessionStorage.setItem('taqareer.ai.access-code.v1','test-code');
    """)
    page=context.new_page()
    console_errors=[]
    page.on('pageerror',lambda exc:console_errors.append(str(exc)))

    def app_route(route, request):
        rel=request.url[len(BASE):].split('?',1)[0].lstrip('/') or 'index.html'
        path=(ROOT/rel).resolve()
        if ROOT not in path.parents and path!=ROOT:
            route.fulfill(status=403, body='forbidden'); return
        if not path.exists() or not path.is_file():
            route.fulfill(status=404, body='not found'); return
        ctype=mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        route.fulfill(status=200, content_type=ctype, body=path.read_bytes())

    def edge_route(route, request):
        body=json.loads(request.post_data or '{}'); op=body.get('operation'); requests.append(op)
        if op=='analyze':
            time.sleep(1.2)
            route.fulfill(status=200, content_type='application/json', body=json.dumps({
                'ok':True,'operation':'analyze','result':ai_result,'model':'gemini-2.5-flash',
                'usage':{'totalTokenCount':321},'serverTiming':{'geminiMs':1200,'payloadChars':len(request.post_data or '')}
            },ensure_ascii=False))
        elif op=='classify':
            route.fulfill(status=200, content_type='application/json', body=json.dumps({
                'ok':True,'operation':'classify','result':{'classification':{'id':'assessment_component','nameAr':'درجات مكوّن تقويمي','confidence':99,'rationale':'متسق'}}
            },ensure_ascii=False))
        else:
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok':True,'result':{'status':'ready'},'aiKeyConfigured':True}))

    page.route(f'{BASE}/**',app_route)
    page.route(f'{EDGE}',edge_route)
    page.goto(f'{BASE}/index.html',wait_until='networkidle')

    def run_sample():
        page.click('[data-input-mode="sample"]')
        page.click('[data-sample="component"]')
        page.wait_for_selector('#panel-2.active-panel')
        page.click('#toSetupBtn')
        page.wait_for_selector('#panel-3.active-panel')
        page.click('#runAnalysisBtn')

    run_sample()
    page.wait_for_selector('#panel-4.active-panel',timeout=900)
    pending=page.locator('#aiResultNotice').inner_text()
    assert 'ظهرت الحسابات والرسوم فورًا' in pending,pending
    assert page.locator('#metrics .metric').count()>0
    page.wait_for_function("document.querySelector('#executiveTitle')?.textContent.includes('قراءة ذكية')",timeout=6000)
    assert requests.count('analyze')==1,requests
    timing=page.locator('#analysisTimingPanel').inner_text()
    assert 'الحسابات والرسوم' in timing and 'Gemini' in timing,timing

    page.click('#restartBtn'); page.wait_for_selector('#panel-1.active-panel')
    run_sample(); page.wait_for_selector('#panel-4.active-panel',timeout=900)
    page.wait_for_function("document.querySelector('#aiResultNotice')?.textContent.includes('الذاكرة المؤقتة')",timeout=2500)
    assert requests.count('analyze')==1,requests
    assert not console_errors,console_errors
    print('PASS browser progressive local results, delayed AI enrichment and cache reuse')
    browser.close()
