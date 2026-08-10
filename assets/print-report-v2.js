(() => {
  "use strict";

  const VERSION = "1.4.6";
  const RENDERER_ID = "print-report-v2";

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  }
  function text(value, fallback="") {
    const clean = String(value ?? "").replace(/\s+/g, " ").trim();
    return clean || fallback;
  }
  function round(value, digits=1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const factor = 10 ** digits;
    return Math.round(n * factor) / factor;
  }
  function formatDate(value=new Date()) {
    try { return new Intl.DateTimeFormat("ar-OM", {year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"}).format(value); }
    catch { return new Date(value).toLocaleString("ar"); }
  }
  function legacy() {
    const api = window.TaqareerReports;
    if (!api?.buildReportData) throw new Error("تعذر الوصول إلى بيانات التقرير الموثوقة.");
    return api;
  }
  function familyOf(data) {
    return data.analysis?.analysisProfile?.family || data.analysis?.family || "generic";
  }
  function reportTitle(data, context) {
    if (typeof legacy().reportTitle === "function") return legacy().reportTitle(data, context);
    const family = familyOf(data), subject = data.meta?.subject ? ` لمادة ${data.meta.subject}` : "";
    if (family === "scores") return `تقرير التحليل التشخيصي لنتائج الدرجات${subject}`;
    if (family === "narrative") return `تقرير التحليل الإشرافي السردي${subject}`;
    return `تقرير التحليل التربوي - ${context.type?.name || "نموذج تعليمي"}`;
  }
  function sourceLabel(context) {
    if (typeof legacy().reportSourceLabel === "function") return legacy().reportSourceLabel(context);
    return text(context.sourceName, "ملف مرفوع");
  }
  function metricValue(item) {
    if (typeof legacy().metricValue === "function") return legacy().metricValue(item);
    if (item?.value === null || item?.value === undefined || item?.value === "") return "—";
    if (item.format === "percent") return `${round(item.value)}%`;
    return typeof item.value === "number" ? round(item.value) : String(item.value);
  }
  function metricGroups(data) {
    if (typeof legacy().selectMetricGroups === "function") return legacy().selectMetricGroups(data);
    return {core:(data.metrics || []).slice(0,6), advanced:(data.metrics || []).slice(6)};
  }
  function claim(value) {
    const type = ["fact","inference","hypothesis"].includes(value) ? value : "inference";
    if (type === "fact") return {type, label:"مؤكد من البيانات", cls:"fact"};
    if (type === "hypothesis") return {type, label:"فرضية تحتاج تحققًا", cls:"hyp"};
    return {type, label:"استنتاج مدعوم", cls:"infer"};
  }
  function confidence(value) {
    return text(value, "متوسطة");
  }
  function renderChart(chart) {
    if (typeof legacy().renderChart === "function") return legacy().renderChart(chart);
    const rows = Array.isArray(chart?.data) ? chart.data : [];
    const xKey = chart?.xKey || "label", yKey = chart?.yKey || "count";
    const max = Math.max(1, ...rows.map(row => Number(row?.[yKey] || row?.value || 0)));
    return `<div class="bar-chart">${rows.slice(0,20).map(row => {
      const value = Number(row?.[yKey] ?? row?.value ?? 0);
      return `<div class="bar-row"><span class="bar-label">${esc(row?.[xKey] ?? row?.label ?? "—")}</span><div class="bar-track"><i style="width:${Math.max(2, value/max*100)}%"></i></div><strong>${esc(round(value))}</strong></div>`;
    }).join("")}</div>`;
  }
  function evidenceText(item, analysis) {
    if (item?.evidence) return text(item.evidence);
    const refs = Array.isArray(item?.evidenceRefs) ? item.evidenceRefs : [];
    return refs.map(ref => analysis?.evidenceMap?.[ref] || ref).filter(Boolean).join("، ");
  }
  function inferStatus(data) {
    const inferenceStrength = text(data.analysis?.reasoningGuardrails?.inferenceStrength || data.profile?.dataSufficiency, "غير محددة");
    if (data.aiUsed) return {label:"سلامة الحسابات: موثوقة", detail:`قوة الاستدلال التربوي: ${inferenceStrength}`, cls:"ai"};
    if (data.localFallbackUsed) return {label:"سلامة الحسابات: موثوقة", detail:`قوة الاستدلال التربوي: ${inferenceStrength} · قراءة محلية`, cls:"local"};
    return {label:"تحليل بحاجة إلى مراجعة", detail:`قوة الاستدلال التربوي: ${inferenceStrength}`, cls:"review"};
  }
  function metaEntries(data, context) {
    const meta = data.meta || {}, source = sourceLabel(context), isMulti = context.type?.id === "multi_subject_results";
    const mode = data.analysis?.scopeContext?.analysisMode === "subject" ? "مادة واحدة" : "تحليل شامل";
    if (isMulti) return [
      ["نوع المصدر","كشف نتائج متعدد المواد"], ["نطاق التحليل",mode], ["المدرسة",meta.school || "غير محددة في الملف"],
      ["المادة",meta.subject || "غير محددة"], ["الصف / الفئة",meta.grade || "غير محدد"], ["العام / الفترة",[meta.academicYear,meta.period].filter(Boolean).join(" - ") || "غير محدد"],
      ["مصدر البيانات",source], ["حالة المصدر",context.recognitionStatus || "مقروء محليًا"]
    ];
    return [
      ["نوع الاستمارة",context.type?.name || "—"], ["المدرسة",meta.school || "غير محددة في الملف"], ["المادة",meta.subject || "غير محددة"],
      ["الصف / الفئة",meta.grade || "غير محدد"], ["العام / الفترة",[meta.academicYear,meta.period].filter(Boolean).join(" - ") || "غير محدد"], ["مصدر البيانات",source],
      ["حالة المصدر",context.recognitionStatus || "مقروء محليًا"], ["تاريخ التقرير",formatDate(data.generatedAt)]
    ];
  }
  function metricCard(item) {
    return `<div class="kpi"><span>${esc(item.label || item.id || "مؤشر")}</span><strong>${esc(metricValue(item))}</strong><small>${esc(item.note || item.description || "")}</small></div>`;
  }
  function chartPanel(chart, index, compact=false) {
    const rows = Array.isArray(chart?.data) ? chart.data.length : 0;
    return `<article class="panel chart-panel${compact ? " compact" : ""}" data-chart-id="${esc(chart?.id || "")}" data-chart-rows="${rows}"><div class="panel-head"><div><small>الرسم ${index}</small><h3>${esc(chart?.title || "رسم تحليلي")}</h3></div>${chart?.subtitle ? `<span>${esc(chart.subtitle)}</span>` : ""}</div>${renderChart(chart)}${chart?.note ? `<p class="chart-note">${esc(chart.note)}</p>` : ""}</article>`;
  }
  function pageShell(section, body, pageNo, total, modeLabel, extraClass="") {
    return `<section class="sheet ${extraClass}" data-section="${esc(section)}"><div class="page"><header class="header"><div class="brand"><div class="mark">ت</div><div><strong>تقارير</strong><small>منصة التحليل التربوي والبيانات التعليمية</small></div></div><div class="section-tag"><b>${esc(section)}</b><small>${esc(modeLabel)}</small></div></header><main class="content">${body}</main><footer class="footer"><span>تقارير · Print Report V2 · v${VERSION}</span><strong>صفحة ${pageNo} من ${total}</strong></footer></div></section>`;
  }
  function sectionTitle(no, title, note="") {
    return `<div class="section-title"><div class="left"><span class="sec-no">${esc(no)}</span><h2>${esc(title)}</h2></div>${note ? `<p>${esc(note)}</p>` : ""}</div>`;
  }
  function executivePage(data, context, mode) {
    const analysis = data.analysis || {}, groups = metricGroups(data), core = groups.core.slice(0,6), charts = (data.charts || []).slice(0,2), status = inferStatus(data), title = reportTitle(data, context);
    const meta = metaEntries(data, context);
    const fullMode = mode !== "executive";
    const overviewTitle = fullMode ? "الخلاصة العامة" : "الملخص التنفيذي";
    const overviewNote = fullMode ? "خلاصة مركزة للنتائج قبل الانتقال إلى التفاصيل الإحصائية والتشخيصية" : "صفحة قرار سريعة قبل التفاصيل";
    const judgementLabel = fullMode ? "الحكم العام" : "الحكم التنفيذي";
    return `<div class="title-row"><div><span class="kicker">التقرير التحليلي الرسمي</span><h1 class="title">${esc(title)}</h1><p class="subtitle">${esc(data.meta?.title || sourceLabel(context))}</p></div><div class="datebox"><small>تاريخ التقرير</small><strong>${esc(formatDate(data.generatedAt))}</strong></div></div>
      <div class="meta">${meta.map(([label,value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>
      ${sectionTitle("01",overviewTitle,overviewNote)}
      <div class="exec"><article class="exec-main"><small>${esc(judgementLabel)}</small><h3>${esc(analysis.executiveTitle || title)}</h3><p>${esc(analysis.executiveSummary || "")}</p></article><article class="status ${status.cls}"><small>حالة التحليل</small><strong>${esc(status.label)}</strong><p>${esc(status.detail)}</p></article></div>
      <div class="kpis">${core.map(metricCard).join("")}</div>
      ${charts.length ? `<div class="grid2 executive-charts">${charts.map((chart,i) => chartPanel(chart,i+1,true)).join("")}</div>` : ""}`;
  }
  function indicatorPages(data) {
    const groups = metricGroups(data), advanced = groups.advanced.slice(0,8), charts = (data.charts || []).slice(2);
    const pages=[];
    const firstCharts = charts.slice(0,2);
    pages.push({section:"لوحة المؤشرات والتحليل الإحصائي", body:`${sectionTitle("02","لوحة المؤشرات والتحليل الإحصائي","المؤشرات المتقدمة والرسوم في مساحة واحدة")}
      ${advanced.length ? `<div class="metric-band">${advanced.map(item=>`<div><small>${esc(item.label || item.id || "مؤشر")}</small><strong>${esc(metricValue(item))}</strong><em>${esc(item.note || "")}</em></div>`).join("")}</div>` : ""}
      <div class="profile-strip"><div><span>منهج التحليل</span><strong>${esc(data.profile?.purpose || "—")}</strong></div><div><span>كفاية البيانات</span><strong>${esc(data.profile?.dataSufficiency || "—")}</strong></div><div><span>الاستخدام</span><strong>${esc((data.profile?.decisionUse || []).join("، ") || "—")}</strong></div></div>
      ${firstCharts.length ? `<div class="grid2 stats-charts">${firstCharts.map((chart,i)=>chartPanel(chart,i+3,false)).join("")}</div>` : `<div class="note-strip">لا توجد رسوم إضافية؛ تعتمد هذه الصفحة على المؤشرات الرقمية المتاحة.</div>`}`});
    const rest = charts.slice(2);
    for(let i=0;i<rest.length;i+=2){const pair=rest.slice(i,i+2);pages.push({section:"الرسوم والتحليل البصري", body:`${sectionTitle("02+","التحليل البصري المتخصص","رسوم إضافية وفق نوع البيانات")}${pair.length===1?`<div class="single-chart">${chartPanel(pair[0],i+5,false)}</div>`:`<div class="grid2 stats-charts">${pair.map((chart,j)=>chartPanel(chart,i+j+5,false)).join("")}</div>`}`});}
    return pages;
  }
  function diagnosticCost(item) {
    const lists = [item.implications,item.alternativeExplanations,item.limitations,item.dataRequests].reduce((sum,list)=>sum+(Array.isArray(list)?list.length:0),0);
    return 24 + Math.ceil(text(item.analysis).length/180)*6 + lists*3;
  }
  function pack(items, costFn, capacity, maxItems) {
    const pages=[]; let current=[], budget=0;
    (items || []).forEach(item => {const cost=costFn(item); if(current.length && (current.length>=maxItems || budget+cost>capacity)){pages.push(current);current=[];budget=0;} current.push(item);budget+=cost;});
    if(current.length) pages.push(current); return pages;
  }
  function diagnosticCard(item, index, analysis) {
    const c=claim(item.claimType), refs=Array.isArray(item.evidenceRefs)?item.evidenceRefs:[], evidence=refs.map(ref=>analysis?.evidenceMap?.[ref] || ref).filter(Boolean);
    const request=(item.dataRequests || []).slice(0,2), limits=(item.limitations || []).slice(0,2), impact=(item.implications || []).slice(0,2);
    return `<article class="diagnostic"><div class="diag-no">${index}</div><div class="diag-body"><header><h3>${esc(item.title || "قراءة تفسيرية")}</h3><span class="badge ${c.cls}">${esc(c.label)} · ثقة ${esc(confidence(item.confidence))}</span></header><p>${esc(item.analysis || "")}</p><div class="evidence-row"><div><span>الدليل</span><strong>${esc(evidence.join("، ") || "دليل موثق في التحليل")}</strong></div><div><span>الأثر العملي</span><strong>${esc(impact.join("، ") || "يوجه القرار وفق نطاق البيانات")}</strong></div></div>${limits.length||request.length?`<div class="diag-foot">${limits.length?`<div><span>حدود القراءة</span><p>${esc(limits.join("، "))}</p></div>`:""}${request.length?`<div><span>ما يحتاج تحققًا</span><p>${esc(request.join("، "))}</p></div>`:""}</div>`:""}</div></article>`;
  }
  function diagnosticPages(data) {
    const groups=pack(data.diagnosticSections || [], diagnosticCost, 132, 3); let cursor=0;
    return groups.map((group,pageIndex)=>{const start=cursor; cursor+=group.length; return {section:"القراءة التفسيرية", body:`${sectionTitle("03",pageIndex?"القراءة التفسيرية - متابعة":"القراءة التفسيرية المتخصصة","الدليل أولًا، والفرضية تبقى فرضية")}<div class="diagnostic-list">${group.map((item,i)=>diagnosticCard(item,start+i+1,data.analysis)).join("")}</div>`};});
  }
  function findingCost(item){return 12 + Math.ceil(([item.title,item.statement,item.evidence,item.impact,item.action].map(text).join(" ").length)/150)*3;}
  function findingRows(data){return (data.findings || []).map((item,index)=>{const c=claim(item.claimType); return `<tr><td><strong>${index+1}</strong></td><td><strong>${esc(item.title)}</strong>${item.statement?`<small>${esc(item.statement)}</small>`:""}</td><td><span class="badge ${c.cls}">${esc(c.label)}</span><small>ثقة ${esc(confidence(item.confidence))}</small></td><td>${esc(evidenceText(item,data.analysis) || "—")}</td><td>${esc(item.action || item.impact || "—")}</td></tr>`;});}
  function findingPages(data) {
    const groups=pack(data.findings || [], findingCost, 72, 6); let cursor=0;
    return groups.map((group,pageIndex)=>{const sliceRows=findingRows({...data,findings:group}); cursor+=group.length; return {section:"خريطة القرار والاستنتاجات", body:`${sectionTitle("04",pageIndex?"خريطة القرار - متابعة":"الاستنتاجات التشخيصية وخريطة القرار","ملخص قرار يمكن استخدامه مباشرة في اجتماع النتائج")}<table class="decision-table"><thead><tr><th>#</th><th>الاستنتاج</th><th>رتبة الاستدلال</th><th>الدليل</th><th>القرار التربوي</th></tr></thead><tbody>${sliceRows.join("")}</tbody></table>`};});
  }
  function planCost(item){return 34 + Math.ceil(([item.issue,item.action,item.successIndicator,item.monitoringMethod,item.contingency].map(text).join(" ").length)/180)*5 + (item.implementationSteps || []).length*3;}
  function planRow(item,index){const basis=item.basisClaimType?claim(item.basisClaimType):null;return `<article class="plan-row"><div class="plan-head"><div class="pnum">${index}</div><div><small>${esc(item.priority || "متوسطة")}</small><strong>${esc(item.issue || "أولوية تحسين")}</strong>${basis?`<span class="badge ${basis.cls}">${esc(basis.label)}${item.basisConfidence?` · ثقة ${esc(item.basisConfidence)}`:""}</span>`:""}</div><div><small>الفئة المستهدفة</small><strong>${esc(item.targetGroup || "—")}</strong></div><div><small>الإطار الزمني</small><strong>${esc(item.timeframe || "—")}</strong></div></div><div class="plan-body"><div><span>الإجراء وخطوات التنفيذ</span><strong>${esc(item.action || "")}</strong>${item.implementationSteps?.length?`<ol>${item.implementationSteps.slice(0,4).map(step=>`<li>${esc(step)}</li>`).join("")}</ol>`:""}</div><div><span>المسؤول</span><strong>${esc(item.responsibleRole || "—")}</strong></div><div><span>مؤشر النجاح والمتابعة</span><strong>${esc(item.successIndicator || "—")}</strong>${item.targetBasis?`<small>أساس المستهدف: ${esc(item.targetBasis)}</small>`:""}<small>${esc(item.monitoringMethod || "")}</small></div><div><span>الخطة البديلة</span><strong>${esc(item.contingency || "—")}</strong></div></div></article>`;}
  function planPages(data){const groups=pack(data.plan || [], planCost, 156, 2);let cursor=0;return groups.map((group,pageIndex)=>{const start=cursor;cursor+=group.length;return {section:"خطة التحسين والتدخل",body:`${sectionTitle("05",pageIndex?"خطة التحسين - متابعة":"خطة التحسين والتدخل","تدخلات محددة مرتبطة بمسؤول وزمن ومؤشر نجاح")}<div class="plan-list">${group.map((item,i)=>planRow(item,start+i+1)).join("")}</div>`};});}
  function toolCard(item){return `<article class="tool-card"><small>أداة جودة</small><h3>${esc(item.name || "أداة جودة")}</h3><p>${esc(item.reason || "")}</p>${item.interpretation?`<strong>${esc(item.interpretation)}</strong>`:""}</article>`;}
  function governancePages(data){
    const monitoring=(data.monitoring || []).slice(0,6), tools=(data.tools || []).slice(0,4), limits=(data.limitations || []).slice(0,10);
    const body=`${sectionTitle("06","المتابعة والحوكمة","إعادة القياس وحدود الاعتماد في صفحة قرار واحدة")}${monitoring.length?`<div class="timeline">${monitoring.slice(0,3).map((item,index)=>`<article class="stage"><small>المرحلة ${index+1} · ${esc(item.timing || "")}</small><h3>${esc(item.stage || "مرحلة متابعة")}</h3><p>${esc(item.measure || "")}</p><strong>${esc(item.owner || "")}</strong></article>`).join("")}</div>`:""}${tools.length?`<div class="tools-line">${tools.slice(0,2).map(toolCard).join("")}</div>`:""}<div class="governance"><article class="gov-box"><h3>حدود التحليل</h3><ul>${limits.map(item=>`<li>${esc(item)}</li>`).join("") || "<li>لا توجد حدود إضافية مسجلة.</li>"}</ul></article><article class="gov-box"><h3>ضوابط الاعتماد</h3><ul><li>تراجع الاستنتاجات منخفضة الثقة قبل الاعتماد.</li><li>تربط الخطط بمؤشرات قياس محددة ومواعيد متابعة.</li><li>لا تعمم النتائج خارج نطاق البيانات المرفوعة.</li><li>الفرضيات غير المقاسة توجه جمع الأدلة ولا تتحول إلى حقائق.</li></ul></article></div><div class="approval"><div>إعداد التقرير</div><div>المراجعة والاعتماد</div><div>تاريخ المتابعة</div></div>`;
    const pages=[{section:"المتابعة والحوكمة",body}];
    if(monitoring.length>3 || tools.length>2){pages.push({section:"ملحق المتابعة والجودة",body:`${sectionTitle("06+","متابعة موسعة وأدوات الجودة","تفاصيل إضافية دون تشتيت صفحة الحوكمة الأساسية")}${monitoring.length>3?`<div class="timeline">${monitoring.slice(3,6).map((item,index)=>`<article class="stage"><small>مرحلة إضافية ${index+4} · ${esc(item.timing || "")}</small><h3>${esc(item.stage || "مرحلة متابعة")}</h3><p>${esc(item.measure || "")}</p><strong>${esc(item.owner || "")}</strong></article>`).join("")}</div>`:""}${tools.length>2?`<div class="tools-line">${tools.slice(2,4).map(toolCard).join("")}</div>`:""}`});}
    return pages;
  }
  function schoolRankingPage(privateTables,companion=null){if(!privateTables?.schoolTopTen?.length)return null;const rows=privateTables.schoolTopTen;const companionHtml=companion?`<div class="school-companion"><div class="companion-head"><span>بداية ملحق الأوائل حسب المادة</span><strong>${esc(companion.subject)}</strong></div><table class="ranking ranking-companion"><thead><tr><th>المركز</th><th>اسم الطالب</th><th>الدرجة</th><th>المستوى</th></tr></thead><tbody>${companion.rows.map(row=>`<tr><td>${esc(row.rankLabel ?? "—")}</td><td>${esc(row.name ?? "—")}</td><td>${esc(row.scoreDisplay ?? "—")}</td><td>${esc(row.level ?? "—")}</td></tr>`).join("")}</tbody></table></div>`:"";return {section:"الأوائل على مستوى المدرسة / الدفعة",body:`${sectionTitle("07","العشرة الأوائل على مستوى المدرسة / الدفعة",privateTables.rankingFormulaLabel || "عرض توثيقي للنتائج")}<table class="ranking ranking-school"><thead><tr><th>المركز</th><th>اسم الطالب</th><th>متوسط الأساسية</th><th>متوسط جميع المواد</th><th>درجة الترتيب</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.rankLabel ?? "—")}</td><td>${esc(row.name ?? "—")}</td><td>${esc(row.coreMeanDisplay ?? "—")}</td><td>${esc(row.allMeanDisplay ?? "—")}</td><td>${esc(row.rankingScoreDisplay ?? "—")}</td></tr>`).join("")}</tbody></table>${privateTables.incompleteRankingCount?`<div class="note-strip">غير مكتمل للترتيب: ${esc(privateTables.incompleteRankingCount)} سجلًا بسبب نقص مادة أساسية.</div>`:""}${companionHtml}`};}
  function subjectRankingPages(privateTables,excludedSubject=""){
    const blocks=[];Object.entries(privateTables?.subjectTopTen || {}).forEach(([subject,rows])=>{if(subject!==excludedSubject)blocks.push({subject,rows:Array.isArray(rows)?rows:[]})});
    const pages=[];let current=[],budget=0;
    const flush=()=>{if(!current.length)return;pages.push({section:"الأوائل حسب المادة",body:`${sectionTitle("07+","العشرة الأوائل حسب الدرجة","تظهر جميع حالات التعادل الواقعة داخل المركز العاشر")}<div class="rank-grid rank-grid-${current.length}">${current.map(block=>`<article class="rank-card"><h3>${esc(block.subject)}</h3><table><thead><tr><th>المركز</th><th>اسم الطالب</th><th>الدرجة</th><th>المستوى</th></tr></thead><tbody>${block.rows.map(row=>`<tr><td>${esc(row.rankLabel ?? "—")}</td><td>${esc(row.name ?? "—")}</td><td>${esc(row.scoreDisplay ?? "—")}</td><td>${esc(row.level ?? "—")}</td></tr>`).join("")}</tbody></table></article>`).join("")}</div>`});current=[];budget=0;};
    blocks.forEach(block=>{const cost=block.rows.length+3;if(current.length&&(current.length>=3||budget+cost>34))flush();current.push(block);budget+=cost;});flush();return pages;
  }
  function buildFullPages(data,context){
    const pages=[{section:"الخلاصة العامة",body:executivePage(data,context,"full")}];
    pages.push(...indicatorPages(data));
    pages.push(...diagnosticPages(data));
    pages.push(...findingPages(data));
    pages.push(...planPages(data));
    pages.push(...governancePages(data));
    const companionEntry=Object.entries(data.privateTables?.subjectTopTen || {}).map(([subject,rows])=>({subject,rows:Array.isArray(rows)?rows:[]})).find(block=>block.rows.length>0&&block.rows.length<=10) || null;
    const school=schoolRankingPage(data.privateTables,companionEntry);if(school)pages.push(school);
    pages.push(...subjectRankingPages(data.privateTables,companionEntry?.subject || ""));
    return pages;
  }
  function buildExecutivePages(data,context){
    const pages=[{section:"الملخص التنفيذي",body:executivePage(data,context,"executive")}];
    const indicators=indicatorPages(data);if(indicators[0])pages.push(indicators[0]);
    const diags=(data.diagnosticSections || []).slice(0,3), finds=(data.findings || []).slice(0,4);
    if(diags.length||finds.length){pages.push({section:"القراءة والقرار",body:`${sectionTitle("03","أهم القراءات والقرارات","ملخص تنفيذي للأدلة والأولويات")} ${diags.length?`<div class="diagnostic-list compact-list">${diags.map((item,i)=>diagnosticCard(item,i+1,data.analysis)).join("")}</div>`:""}${finds.length?`<table class="decision-table compact-decision"><thead><tr><th>#</th><th>الاستنتاج</th><th>الرتبة</th><th>القرار</th></tr></thead><tbody>${finds.map((item,i)=>{const c=claim(item.claimType);return `<tr><td>${i+1}</td><td>${esc(item.title)}</td><td><span class="badge ${c.cls}">${esc(c.label)}</span></td><td>${esc(item.action || item.impact || "—")}</td></tr>`;}).join("")}</tbody></table>`:""}`});}
    if(data.plan?.length||data.monitoring?.length){pages.push({section:"خطة التحسين والمتابعة",body:`${sectionTitle("04","خطة التحسين والمتابعة","أهم التدخلات ومؤشرات إعادة القياس")}${data.plan?.length?`<div class="plan-list executive-plan-list">${data.plan.slice(0,2).map((item,i)=>planRow(item,i+1)).join("")}</div>`:""}${data.monitoring?.length?`<div class="timeline executive-timeline">${data.monitoring.slice(0,3).map((item,index)=>`<article class="stage"><small>${esc(item.timing||"")}</small><h3>${esc(item.stage||"")}</h3><p>${esc(item.measure||"")}</p><strong>${esc(item.owner||"")}</strong></article>`).join("")}</div>`:""}`});}
    return pages.slice(0,5);
  }
  function reportCss(){return `
:root{--navy:#102E4A;--navy2:#173F63;--teal:#0F7C77;--teal2:#42A39A;--gold:#C59A45;--ink:#172536;--muted:#6B7888;--line:#D9E1E8;--soft:#F4F7F9;--soft2:#EDF3F5;--green-soft:#EAF6F3;--amber-soft:#FFF6E3;--red-soft:#FBEDEB;--white:#fff}
*{box-sizing:border-box}html,body{margin:0;background:#e9eef3;color:var(--ink);font-family:"Noto Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif}body{padding:14px}.toolbar{position:sticky;top:8px;z-index:20;display:flex;gap:8px;justify-content:center;align-items:center;margin-bottom:12px}.toolbar button,.toolbar span{border-radius:8px;padding:8px 13px;font-weight:800;font-size:8pt}.toolbar button{border:0;cursor:pointer}.toolbar .print{background:var(--navy);color:#fff}.toolbar .close{background:#fff;color:var(--navy);border:1px solid var(--line)}.toolbar span{background:#fff;border:1px solid var(--line);color:var(--muted)}
.sheet{width:210mm;height:297mm;margin:0 auto 12px;background:#fff;box-shadow:0 10px 28px rgba(24,48,78,.10);position:relative;overflow:hidden;break-after:page;page-break-after:always}.sheet:last-of-type{break-after:auto;page-break-after:auto}.page{height:100%;padding:9mm 12mm 8mm;display:flex;flex-direction:column}.header{height:13mm;display:flex;justify-content:space-between;align-items:center;border-bottom:1.4px solid var(--navy);padding-bottom:2.5mm;flex:none}.brand{display:flex;align-items:center;gap:2.5mm}.mark{width:9mm;height:9mm;border-radius:2.4mm;background:var(--navy);color:#fff;display:grid;place-items:center;font-family:"Noto Kufi Arabic";font-weight:800;font-size:12pt}.brand strong{display:block;color:var(--navy);font-family:"Noto Kufi Arabic";font-size:10.3pt}.brand small{display:block;color:var(--muted);font-size:6.6pt;margin-top:.5mm}.section-tag{text-align:left}.section-tag b{display:block;color:var(--navy);font-size:8pt}.section-tag small{display:block;color:var(--muted);font-size:6.2pt;margin-top:.5mm}.content{flex:1;min-height:0;padding-top:4.5mm;overflow:hidden}.footer{height:6mm;border-top:1px solid var(--line);display:flex;align-items:end;justify-content:space-between;color:var(--muted);font-size:6.3pt;flex:none;padding-top:1.7mm}.kicker{color:var(--teal);font-size:7pt;font-weight:800}.title{font-family:"Noto Kufi Arabic";font-size:18pt;line-height:1.45;color:var(--navy);margin:1.5mm 0 1mm}.subtitle{color:var(--muted);font-size:8pt;margin:0}.title-row{display:flex;justify-content:space-between;gap:8mm;align-items:start}.datebox{border-right:3px solid var(--teal);padding-right:3mm;min-width:36mm}.datebox small{color:var(--muted);font-size:6.3pt;display:block}.datebox strong{color:var(--navy);font-size:7pt;display:block;margin-top:1mm}.meta{display:grid;grid-template-columns:repeat(4,1fr);margin-top:4mm;border:1px solid var(--line);border-radius:2.2mm;overflow:hidden}.meta div{padding:2mm 2.4mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line);min-height:12mm}.meta div:nth-child(4n){border-left:0}.meta div:nth-last-child(-n+4){border-bottom:0}.meta span{display:block;color:var(--muted);font-size:5.9pt}.meta strong{display:block;color:var(--ink);font-size:7.3pt;margin-top:.7mm;line-height:1.35}.section-title{display:flex;align-items:center;justify-content:space-between;gap:6mm;margin:4.2mm 0 2.6mm}.section-title .left{display:flex;align-items:center;gap:2.5mm}.sec-no{width:7.5mm;height:7.5mm;border-radius:50%;background:var(--navy);color:#fff;display:grid;place-items:center;font-size:6.2pt;font-weight:900}.section-title h2{font-family:"Noto Kufi Arabic";font-size:12.6pt;color:var(--navy);margin:0}.section-title p{margin:0;color:var(--muted);font-size:6.4pt;text-align:left;max-width:78mm;line-height:1.45}.exec{display:grid;grid-template-columns:1fr 46mm;gap:3.2mm}.exec-main{border:1px solid var(--line);border-right:4px solid var(--navy);padding:3.2mm;border-radius:1.8mm}.exec-main small{color:var(--gold);font-size:6.5pt;font-weight:900}.exec-main h3{font-family:"Noto Kufi Arabic";font-size:10.8pt;color:var(--navy);margin:1.1mm 0}.exec-main p{font-size:7.4pt;line-height:1.6;margin:0;color:#33455a}.status{background:var(--green-soft);border:1px solid #cfe7e2;border-radius:1.8mm;padding:3mm}.status.review{background:var(--amber-soft);border-color:#ead8aa}.status small{font-size:6.2pt;color:var(--teal)}.status strong{display:block;color:var(--teal);font-family:"Noto Kufi Arabic";font-size:9.5pt;margin:1.4mm 0}.status p{font-size:6.5pt;color:#47645f;line-height:1.5;margin:0}.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:2mm;margin-top:3mm}.kpi{border-top:2.3px solid var(--navy);border-left:1px solid var(--line);border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:2.1mm;min-height:19mm}.kpi span{display:block;color:var(--muted);font-size:5.5pt}.kpi strong{display:block;color:var(--navy);font-size:12.5pt;line-height:1.1;margin:.9mm 0}.kpi small{display:block;color:var(--teal);font-size:5.5pt}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:3mm}.panel{border:1px solid var(--line);border-radius:1.8mm;padding:2.6mm;overflow:hidden}.panel-head{display:flex;justify-content:space-between;gap:3mm;align-items:start;margin-bottom:1.5mm}.panel-head small{color:var(--teal);font-size:5.8pt}.panel-head h3{font-family:"Noto Kufi Arabic";font-size:8.6pt;color:var(--navy);margin:.4mm 0 0}.panel-head span{font-size:5.6pt;color:var(--muted);max-width:36mm;text-align:left}.chart-panel{min-height:63mm}.chart-panel.compact{min-height:50mm}.stats-charts .chart-panel{min-height:79mm}.single-chart .chart-panel{min-height:140mm}.chart-note{font-size:5.8pt;color:var(--muted);margin:1.5mm 0 0}.metric-band{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:2mm;overflow:hidden}.metric-band div{padding:1.8mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line);text-align:center;min-height:15mm}.metric-band div:nth-child(4n){border-left:0}.metric-band small{display:block;font-size:5.4pt;color:var(--muted)}.metric-band strong{display:block;font-size:9.5pt;color:var(--navy);margin-top:.7mm}.metric-band em{display:block;font-size:5.1pt;color:var(--teal);font-style:normal}.profile-strip{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);background:var(--soft);margin-top:2.5mm}.profile-strip div{padding:2mm;border-left:1px solid var(--line)}.profile-strip div:last-child{border-left:0}.profile-strip span,.evidence-row span,.diag-foot span,.plan-body span{display:block;color:var(--muted);font-size:5.5pt}.profile-strip strong,.evidence-row strong,.plan-body strong{display:block;font-size:6.4pt;line-height:1.45;color:var(--ink);margin-top:.5mm}.note-strip{margin-top:2.5mm;padding:2mm 2.5mm;background:var(--amber-soft);border-right:3px solid var(--gold);font-size:6.2pt;line-height:1.5;color:#6d5720}.diagnostic-list{display:grid;gap:2.2mm}.diagnostic{display:grid;grid-template-columns:9mm 1fr;border:1px solid var(--line);border-radius:2mm;overflow:hidden}.diag-no{background:var(--navy);color:#fff;display:grid;place-items:center;font-size:8pt;font-weight:900}.diag-body{padding:2.5mm}.diag-body header{display:flex;justify-content:space-between;gap:3mm;align-items:center}.diag-body h3{font-family:"Noto Kufi Arabic";font-size:8.8pt;color:var(--navy);margin:0}.diag-body>p{font-size:6.6pt;line-height:1.5;margin:1.2mm 0}.badge{display:inline-flex;align-items:center;padding:.7mm 1.5mm;border-radius:5mm;font-size:5.4pt;font-weight:900;white-space:nowrap}.fact{background:var(--green-soft);color:var(--teal)}.infer{background:#EEF2FA;color:#37578F}.hyp{background:var(--amber-soft);color:#8C6417}.evidence-row{display:grid;grid-template-columns:1fr 1fr;gap:1.6mm}.evidence-row div{background:var(--soft);padding:1.5mm 1.8mm}.diag-foot{display:grid;grid-template-columns:1fr 1fr;gap:1.6mm;margin-top:1.5mm}.diag-foot div{border-top:1px dashed var(--line);padding-top:1.2mm}.diag-foot p{font-size:5.9pt;line-height:1.4;margin:.5mm 0 0}.decision-table,.ranking,.rank-card table{width:100%;border-collapse:collapse}.decision-table{font-size:6.2pt}.decision-table th,.decision-table td{border-bottom:1px solid var(--line);padding:2mm 1.6mm;text-align:right;vertical-align:top}.decision-table th{background:var(--navy);color:#fff;font-size:5.8pt}.decision-table td:first-child{color:var(--navy);width:7mm}.decision-table td small{display:block;color:var(--muted);font-size:5.5pt;margin-top:.6mm}.compact-decision{margin-top:3mm}.plan-list{display:grid;gap:2.5mm}.plan-row{border:1px solid var(--line);border-radius:2mm;overflow:hidden}.plan-head{display:grid;grid-template-columns:9mm 1fr 46mm 34mm;background:var(--soft);align-items:stretch}.plan-head>div{padding:1.7mm 2mm;border-left:1px solid var(--line)}.plan-head>div:last-child{border-left:0}.pnum{display:grid;place-items:center;background:var(--navy);color:#fff;font-size:8pt;font-weight:900!important}.plan-head small{display:block;color:var(--muted);font-size:5.4pt}.plan-head strong{display:block;color:var(--navy);font-size:6.7pt;line-height:1.35;margin-top:.5mm}.plan-head .badge{margin-top:1mm}.plan-body{display:grid;grid-template-columns:1.4fr .7fr 1fr 1fr}.plan-body>div{padding:2mm;border-left:1px solid var(--line)}.plan-body>div:last-child{border-left:0}.plan-body small{display:block;font-size:5.4pt;color:var(--muted);margin-top:.7mm}.plan-body ol{margin:1mm 4mm 0 0;padding:0}.plan-body li{font-size:5.8pt;line-height:1.35;margin:.4mm 0}.timeline{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm}.stage{border-top:3px solid var(--navy);background:var(--soft);padding:2.5mm;min-height:34mm}.stage small{font-size:5.6pt;color:var(--teal)}.stage h3{font-family:"Noto Kufi Arabic";font-size:8.2pt;color:var(--navy);margin:1mm 0}.stage p{font-size:6pt;line-height:1.45;margin:0}.stage strong{display:block;margin-top:1.2mm;font-size:5.7pt;color:var(--muted)}.tools-line{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm;margin-top:3mm}.tool-card{border:1px solid var(--line);padding:2.5mm}.tool-card small{color:var(--teal);font-size:5.5pt}.tool-card h3{font-family:"Noto Kufi Arabic";font-size:8pt;color:var(--navy);margin:.8mm 0}.tool-card p,.tool-card strong{font-size:5.9pt;line-height:1.45}.governance{display:grid;grid-template-columns:1.15fr .85fr;gap:3mm;margin-top:3mm}.gov-box{border:1px solid var(--line);padding:2.5mm}.gov-box h3{font-family:"Noto Kufi Arabic";font-size:8.5pt;color:var(--navy);margin:0 0 1.5mm}.gov-box ul{margin:0 4mm 0 0;padding:0}.gov-box li{font-size:5.8pt;line-height:1.45;margin:.7mm 0}.approval{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-top:4mm}.approval div{border-top:1px solid var(--navy);padding-top:2mm;text-align:center;font-size:5.8pt;color:var(--muted)}.ranking{font-size:6.3pt;border:1px solid var(--line)}.ranking th,.ranking td,.rank-card th,.rank-card td{padding:1.4mm 1.6mm;border-bottom:1px solid var(--line);text-align:right}.ranking th,.rank-card th{background:var(--soft);color:var(--navy);font-size:5.8pt}.ranking td:first-child,.rank-card td:first-child{font-weight:900;color:var(--teal)}.school-companion{margin-top:3mm;padding-top:2.5mm;border-top:1px dashed var(--line)}.companion-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2mm}.companion-head span{font-size:5.7pt;color:var(--muted)}.companion-head strong{font-family:"Noto Kufi Arabic";font-size:7.7pt;color:var(--navy)}.ranking-companion{font-size:5.45pt}.ranking-companion th,.ranking-companion td{padding:.85mm 1mm}.rank-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.rank-grid-1{grid-template-columns:1fr}.rank-grid-3{grid-template-columns:1fr 1fr 1fr;gap:2mm}.rank-card{border:1px solid var(--line);border-radius:2mm;overflow:hidden}.rank-card h3{font-family:"Noto Kufi Arabic";font-size:8pt;color:var(--navy);margin:0;padding:1.7mm 2mm;background:var(--soft)}.rank-card table{font-size:5.4pt}.rank-card th,.rank-card td{padding:.85mm 1mm}.compact-list .diagnostic{grid-template-columns:7mm 1fr}.executive-plan-list .plan-row{margin-bottom:1.5mm}.executive-timeline{margin-top:3mm}
/* Legacy chart primitives rendered from the same trusted chart data. */
.bar-chart,.bullet-list,.dumbbell-list,.stack-list{display:grid;gap:1.15mm}.bar-row,.bullet-row,.dumbbell-row{display:grid;grid-template-columns:28mm 1fr 18mm;gap:1.5mm;align-items:center}.bar-label,.bar-row strong,.bullet-row span,.bullet-row strong,.dumbbell-row span{font-size:5.6pt}.bar-track,.bullet-track,.dumbbell-track{height:3.4mm;background:#e7edf2;border-radius:3mm;position:relative;overflow:hidden}.bar-track i,.bullet-track i{display:block;height:100%;background:linear-gradient(90deg,var(--navy2),var(--teal));border-radius:3mm}.bullet-track b{position:absolute;top:-1mm;width:1px;height:5.4mm;background:var(--gold)}.hist-chart{height:47mm;display:flex;align-items:end;gap:2mm;padding-top:3mm}.hist-bin{flex:1;display:grid;grid-template-rows:auto 1fr auto;text-align:center;min-width:0}.hist-bin strong,.hist-bin small{font-size:5.3pt}.hist-column{height:37mm;display:flex;align-items:end;justify-content:center}.hist-column i{display:block;width:65%;background:linear-gradient(var(--teal2),var(--navy2));border-radius:1.5mm 1.5mm 0 0}.stack-track{height:5mm;display:flex;background:#e7edf2;border-radius:4mm;overflow:hidden}.stack-segment{display:block;height:100%}.seg-0{background:#173F63}.seg-1{background:#2D6E85}.seg-2{background:#42A39A}.seg-3{background:#89C6BE}.seg-4{background:#B9C6D0}.seg-5{background:#C59A45}.stack-legend{display:flex;flex-wrap:wrap;gap:1mm 3mm;margin-top:1.5mm}.stack-legend span{font-size:5.3pt;color:var(--muted)}.stack-legend i{display:inline-block;width:2mm;height:2mm;margin-left:.6mm}.stack-row strong{font-size:5.7pt}.stack-row small{font-size:5pt;color:var(--muted)}.line-svg,.radar-svg,.box-svg,.pareto-svg,.scatter-svg{width:100%;height:auto;max-height:58mm}.axis{stroke:#bcc8d3;stroke-width:1}.series{fill:none;stroke:var(--teal);stroke-width:3}.point{fill:var(--navy)}.line-svg text,.radar-svg text,.box-svg text,.pareto-svg text,.scatter-svg text{font-size:9px;fill:#556474}.box{fill:#d9efeb;stroke:var(--teal)}.median{stroke:var(--navy);stroke-width:2}.cap{stroke:var(--muted)}.radar-grid{fill:#f5f8fa;stroke:#c9d3dc}.radar-value{fill:rgba(15,124,119,.18);stroke:var(--teal);stroke-width:2}.heat-table,.data-table{width:100%;border-collapse:collapse;font-size:5.4pt}.heat-table th,.heat-table td,.data-table th,.data-table td{border:1px solid var(--line);padding:1mm;text-align:center}.heat-1{background:#f4f7f9}.heat-2{background:#e4f1ef}.heat-3{background:#cbe7e2}.heat-4{background:#98cfc7}.heat-5{background:#5eafa4;color:#fff}
@page{size:A4 portrait;margin:0}@media print{html,body{width:210mm;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{padding:0;margin:0}.toolbar{display:none!important}.sheet{width:210mm;height:297mm;margin:0;box-shadow:none;overflow:hidden}.page{width:210mm;height:297mm}}@media screen and (max-width:900px){body{padding:0}.sheet{width:100%;height:auto;min-height:100vh;margin:0;box-shadow:none}.page{height:auto;min-height:100vh;padding:20px}.grid2,.rank-grid,.timeline,.tools-line,.governance,.plan-body,.plan-head,.meta,.kpis,.metric-band,.profile-strip{grid-template-columns:1fr}.content{overflow:visible}.sheet{overflow:visible}}
`;}
  function integrityScript(expected){return `<script>(()=>{const expected=${JSON.stringify(expected)};function count(sel){return document.querySelectorAll(sel).length}function check(){const failures=[];document.querySelectorAll('.sheet').forEach((sheet,index)=>{const content=sheet.querySelector('.content'),footer=sheet.querySelector('.footer');if(content&&footer&&content.getBoundingClientRect().bottom>footer.getBoundingClientRect().top+1)failures.push('page-overflow:'+(index+1));});const actual={diagnostic:count('.diagnostic'),finding:count('.decision-table tbody tr'),plan:count('.plan-row'),monitoring:count('.stage'),ranking:count('.ranking tbody tr')+count('.rank-card tbody tr')};Object.entries(expected).forEach(([key,value])=>{if(Number.isFinite(value)&&actual[key]!==value)failures.push('count:'+key+':'+actual[key]+'/'+value)});document.documentElement.dataset.reportV2Integrity=failures.length?'fail':'pass';document.documentElement.dataset.reportV2IntegrityDetails=failures.join(',');document.documentElement.dataset.reportV2Ready='1';if(failures.length)console.error('Taqareer Print Report V2 integrity failed',failures)}window.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(check)));})();<\/script>`;}
  function buildReportHtml(context, options={}) {
    const data=legacy().buildReportData(context), mode=options.reportMode === "executive" ? "executive" : "full";
    const pages=mode === "executive" ? buildExecutivePages(data,context) : buildFullPages(data,context), total=pages.length, modeLabel=mode === "executive" ? "تقرير تنفيذي مختصر" : "تقرير تحليلي كامل";
    const expected=mode === "executive"
      ? {diagnostic:Math.min((data.diagnosticSections||[]).length,3),finding:Math.min((data.findings||[]).length,4),plan:Math.min((data.plan||[]).length,2),monitoring:Math.min((data.monitoring||[]).length,3),ranking:0}
      : {diagnostic:(data.diagnosticSections||[]).length,finding:(data.findings||[]).length,plan:(data.plan||[]).length,monitoring:Math.min((data.monitoring||[]).length,6),ranking:(data.privateTables?.schoolTopTen?.length||0)+Object.values(data.privateTables?.subjectTopTen||{}).reduce((sum,rows)=>sum+(Array.isArray(rows)?rows.length:0),0)};
    const body=pages.map((page,index)=>pageShell(page.section,page.body,index+1,total,modeLabel)).join("");
    const autoPrint=options.autoPrint===true?`<script>window.addEventListener('load',()=>{let tries=0;const run=()=>{if(document.documentElement.dataset.reportV2Ready==='1'||tries++>40){window.print();return}setTimeout(run,60)};setTimeout(run,120)});<\/script>`:"";
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(reportTitle(data,context))}</title><style>${reportCss()}</style></head><body><div class="toolbar"><span>Print Report V2</span><span>A4 · 210 × 297 مم</span><button class="print" onclick="window.print()">طباعة / حفظ PDF</button><button class="close" onclick="window.close()">إغلاق</button></div>${body}${integrityScript(expected)}${autoPrint}</body></html>`;
  }
  function openReport(context, options={}) {
    if (!context?.analysis) throw new Error("لا توجد نتيجة تحليل جاهزة لإنشاء التقرير.");
    const html=buildReportHtml(context,options);
    const popup=window.open("","taqareer-print-report-v2");
    if(!popup)throw new Error("منع المتصفح فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
    try{popup.opener=null}catch{}
    popup.document.open();popup.document.write(html);popup.document.close();return popup;
  }

  window.TaqareerPrintReportV2={VERSION,RENDERER_ID,buildReportHtml,openReport};
})();
