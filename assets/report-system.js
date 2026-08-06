(() => {
  "use strict";

  const VERSION = "1.2.3";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  }
  function normalize(value) {
    return String(value ?? "").trim().replace(/[إأآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[ًٌٍَُِّْـ]/g,"").replace(/\s+/g," ").toLowerCase();
  }
  function round(value, digits=1) {
    if (!Number.isFinite(Number(value))) return "—";
    const factor = 10 ** digits;
    return Math.round(Number(value) * factor) / factor;
  }
  function clampText(value, max=700) {
    const text=String(value??"").replace(/\s+/g," ").trim();
    return text.length<=max?text:`${text.slice(0,max-1)}…`;
  }
  function formatDate(date=new Date()) {
    try { return new Intl.DateTimeFormat("ar-OM",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(date); }
    catch { return new Date(date).toLocaleString("ar"); }
  }
  function uniqueBy(items,keyFn){const seen=new Set();return items.filter(item=>{const key=keyFn(item);if(!key||seen.has(key))return false;seen.add(key);return true});}
  function flattenStrings(input, output=[]) { if(Array.isArray(input))input.forEach(item=>flattenStrings(item,output));else if(input&&typeof input==="object")Object.values(input).forEach(item=>flattenStrings(item,output));else if(typeof input==="string"&&input.trim())output.push(input.trim());return output; }
  function chunkBalanced(items,maxPerPage){
    if(!items.length) return [];
    const pageCount=Math.ceil(items.length/maxPerPage);
    const base=Math.floor(items.length/pageCount);
    let extra=items.length%pageCount, cursor=0;
    return Array.from({length:pageCount},()=>{const size=base+(extra-->0?1:0);const result=items.slice(cursor,cursor+size);cursor+=size;return result;});
  }
  function extractMetadata(context){
    const meta=context.sourceMeta||{}, structured=meta.metadata&&typeof meta.metadata==="object"?meta.metadata:{}, scope=context.analysis?.scopeContext&&typeof context.analysis.scopeContext==="object"?context.analysis.scopeContext:{};
    const strings=flattenStrings([meta.reportTitle,structured.title,structured.preamble,meta.title,context.sourceName]);const joined=strings.join(" | ");
    const capture=patterns=>{for(const pattern of patterns){const match=joined.match(pattern);if(match?.[1])return match[1].trim().replace(/[|،؛]+$/g,"");}return"";};
    const pick=(...values)=>values.find(value=>String(value||"").trim())||"";
    return {
      title:pick(meta.reportTitle,structured.title,meta.title,`تقرير ${context.type?.name||"التحليل التربوي"}`),
      school:pick(structured.school,capture([/المدرسة\s*[:：-]?\s*([^|]{3,90})/i,/([^|]{3,70}الصفوف\s*\([^)]*\))/i,/مدرسة\s+([^|]{3,90})/i])),
      subject:context.type?.id==="multi_subject_results"
        ? pick(scope.analysisMode==="subject"?scope.selectedSubject:"",scope.analysisMode==="all"?"متعدد المواد":"",structured.subject,"متعدد المواد")
        : pick(structured.subject,capture([/مادة\s+دراسية\s*\(\s*([^)]+?)\s*\)/i,/المادة\s*[:：-]?\s*\(?\s*([^)|]{2,45})/i,/لمادة\s+\(?\s*([^)|]{2,45})/i])),
      grade:pick(structured.grade,scope.grade,capture([/الصف\s*[:：-]?\s*([^|\-]{1,35})/i])),
      academicYear:pick(structured.academicYear,scope.academicYear,capture([/(20\d{2}\s*[\/]\s*20\d{2})/,/العام\s*الدراس[يى]\s*[:：-]?\s*([^|\-]{4,15})/i])),
      period:pick(structured.period,scope.period,capture([/امتحان\s+نهاية\s+الفصل\s+الدراس[يى]\s+(الأول|الاول|الثاني)/i,/الفصل\s*الدراس[يى]\s*[:：-]?\s*(الأول|الاول|الثاني)/i,/الفترة\s*[:：-]?\s*([^|\-]{2,35})/i])),
      region:pick(structured.region),
      reportDate:pick(structured.reportDate),
      schoolCode:pick(structured.schoolCode),
      sourceName:context.sourceName||"—"
    };
  }
  function metricValue(item){if(item?.value===null||item?.value===undefined||item?.value==="")return"—";if(item.format==="percent")return`${round(item.value)}%`;return typeof item.value==="number"?round(item.value):String(item.value);}
  function evidenceLabel(ref,analysis){return analysis?.evidenceMap?.[ref]||(/^row:/.test(ref)?`السجل ${ref.slice(4)}`:/^line:/.test(ref)?`السطر ${ref.slice(5)}`:ref);}

  function normalizePlan(item){return{priority:item.priority||"متوسطة",issue:item.issue||"أولوية تحسين",targetGroup:item.targetGroup||"الفئة المستهدفة",action:item.action||"",implementationSteps:Array.isArray(item.implementationSteps)?item.implementationSteps:[],resources:Array.isArray(item.resources)?item.resources:[],responsibleRole:item.responsibleRole||"يحدد لاحقًا",timeframe:item.timeframe||"يحدد لاحقًا",successIndicator:item.successIndicator||"مؤشر قابل للقياس",monitoringMethod:item.monitoringMethod||"متابعة دورية",contingency:item.contingency||"مراجعة التدخل عند ضعف الاستجابة"};}

  function renderBar(chart){
    const data=Array.isArray(chart.data)?chart.data:[],xKey=chart.xKey||"label",yKey=chart.yKey||"count",max=Math.max(1,...data.map(item=>Number(item[yKey]||0))),total=data.reduce((sum,item)=>sum+Number(item[yKey]||0),0);
    if(data.length>20) throw new Error(`الرسم ${chart.title||chart.id||"الشريطي"} يحتوي ${data.length} فئة، بينما حد العرض الآمن 20. يجب تقسيمه بدل إسقاط الفئات.`);
    return `<div class="bar-chart" data-chart-id="${escapeHtml(chart.id||"")}" data-expected-rows="${data.length}">${data.map(item=>{const value=Number(item[yKey]||0),label=item[xKey]??item.label??"—",pct=total>0&&chart.valueSuffix!=="%"?` <em>${round(value/total*100)}%</em>`:"";return `<div class="bar-row"><span class="bar-label">${escapeHtml(label)}</span><div class="bar-track"><i style="width:${Math.max(2,value/max*100)}%"></i></div><strong>${round(value)}${escapeHtml(chart.valueSuffix||"")}${pct}</strong></div>`;}).join("")}</div>`;
  }
  function renderLine(chart){
    const data=Array.isArray(chart.data)?chart.data:[],xKey=chart.xKey||"label",yKey=chart.yKey||"value",values=data.map(item=>Number(item[yKey]||0)),min=Math.min(...values,0),max=Math.max(...values,1),w=680,h=180,p=34;
    const points=data.map((item,index)=>{const x=p+(data.length<=1?0:index/(data.length-1)*(w-p*2));const y=h-p-((Number(item[yKey]||0)-min)/Math.max(1e-9,max-min))*(h-p*2);return{x,y,label:item[xKey]??index+1,value:Number(item[yKey]||0)};});
    return `<svg class="line-svg" viewBox="0 0 ${w} ${h}"><line class="axis" x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}"/><line class="axis" x1="${p}" y1="${p}" x2="${p}" y2="${h-p}"/><polyline class="series" points="${points.map(pt=>`${pt.x},${pt.y}`).join(" ")}"/>${points.map(pt=>`<circle class="point" cx="${pt.x}" cy="${pt.y}" r="4"><title>${escapeHtml(pt.label)}: ${round(pt.value)}${escapeHtml(chart.valueSuffix||"")}</title></circle><text x="${pt.x}" y="${h-7}" text-anchor="middle">${escapeHtml(pt.label)}${escapeHtml(chart.xSuffix||"")}</text><text class="value-label" x="${pt.x}" y="${Math.max(13,pt.y-8)}" text-anchor="middle">${round(pt.value)}${escapeHtml(chart.valueSuffix||"")}</text>`).join("")}</svg>`;
  }
  function renderRadar(chart){const data=Array.isArray(chart.data)?chart.data:[],w=470,h=250,cx=w/2,cy=h/2+5,r=84,max=chart.max||100;if(data.length<3)return renderBar({...chart,xKey:"label",yKey:"value"});const ang=i=>-Math.PI/2+i*Math.PI*2/data.length;const pt=(value,i,rr=r)=>[cx+Math.cos(ang(i))*rr*(value/max),cy+Math.sin(ang(i))*rr*(value/max)];const outer=data.map((_,i)=>pt(max,i).join(",")).join(" "),values=data.map((item,i)=>pt(Number(item.value??item.mean??0),i).join(",")).join(" ");return `<svg class="radar-svg" viewBox="0 0 ${w} ${h}"><polygon class="radar-grid" points="${outer}"/><polygon class="radar-value" points="${values}"/>${data.map((item,i)=>{const end=pt(max,i),label=pt(max,i,r+24),value=pt(Number(item.value??item.mean??0),i);return `<line class="axis" x1="${cx}" y1="${cy}" x2="${end[0]}" y2="${end[1]}"/><circle class="point" cx="${value[0]}" cy="${value[1]}" r="3"/><text x="${label[0]}" y="${label[1]}" text-anchor="middle">${escapeHtml(item.label||item.domain||"")}</text>`;}).join("")}</svg>`;}
  function renderBox(chart){const item=Array.isArray(chart.data)?chart.data[0]:null;if(!item)return"";const vals=[item.min,item.q1,item.median,item.q3,item.max].map(Number),min=Math.min(...vals),max=Math.max(...vals),w=680,h=130,p=50,x=value=>p+(value-min)/Math.max(1e-9,max-min)*(w-p*2);return `<svg class="box-svg" viewBox="0 0 ${w} ${h}"><line class="axis" x1="${x(item.min)}" y1="55" x2="${x(item.max)}" y2="55"/><line class="cap" x1="${x(item.min)}" y1="39" x2="${x(item.min)}" y2="71"/><line class="cap" x1="${x(item.max)}" y1="39" x2="${x(item.max)}" y2="71"/><rect class="box" x="${x(item.q1)}" y="31" width="${Math.max(2,x(item.q3)-x(item.q1))}" height="48"/><line class="median" x1="${x(item.median)}" y1="31" x2="${x(item.median)}" y2="79"/>${[["الأدنى",item.min],["ر1",item.q1],["الوسيط",item.median],["ر3",item.q3],["الأعلى",item.max]].map(([label,value])=>`<text x="${x(value)}" y="108" text-anchor="middle">${label} ${round(value)}</text>`).join("")}</svg><p class="chart-note">القيم المتطرفة المكتشفة: ${Number(item.outlierCount||0)}</p>`;}
  function renderHeatmap(chart){const data=Array.isArray(chart.data)?chart.data:[],cols=chart.columns||["strengths","development","support","recommendations"],labels={strengths:"الإجادة",development:"التطوير",support:"الدعم",recommendations:"التوصيات"},max=Math.max(1,...data.flatMap(row=>cols.map(c=>Number(row[c]||0))));return `<table class="heat-table"><thead><tr><th>المجال</th>${cols.map(c=>`<th>${labels[c]||escapeHtml(c)}</th>`).join("")}<th>الاتساق</th></tr></thead><tbody>${data.map(row=>`<tr><th>${escapeHtml(row.theme||row.label||row.group||"")}</th>${cols.map(c=>{const v=Number(row[c]||0),level=Math.min(5,Math.ceil(v/max*5));return `<td class="heat-${level}">${v}</td>`;}).join("")}<td>${row.alignment!==undefined?`${round(row.alignment)}%`:"—"}</td></tr>`).join("")}</tbody></table>`;}
  function renderTable(chart){const data=Array.isArray(chart.data)?chart.data:[];if(!data.length)return"";const keys=Object.keys(data[0]).slice(0,6);return `<table class="data-table"><thead><tr>${keys.map(key=>`<th>${escapeHtml(key)}</th>`).join("")}</tr></thead><tbody>${data.slice(0,14).map(row=>`<tr>${keys.map(key=>`<td>${escapeHtml(row[key]??"—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;}
  function renderChart(chart){if(!chart)return"";if(chart.type==="line")return renderLine(chart);if(chart.type==="radar")return renderRadar(chart);if(chart.type==="box")return renderBox(chart);if(chart.type==="heatmap")return renderHeatmap(chart);if(chart.type==="table")return renderTable(chart);if(chart.type==="stacked")return renderHeatmap({...chart,columns:chart.series||[]});if(chart.type==="pareto")return renderBar({...chart,yKey:chart.yKey||"gap"});return renderBar(chart);}

  function buildReportData(context){
    const analysis=context.analysis||{},meta=extractMetadata(context);
    const findings=(analysis.findings||[]).map(item=>({
      ...item,
      evidence:item.evidence||((item.evidenceRefs||[]).map(ref=>evidenceLabel(ref,analysis)).join("، ")||"دليل يحتاج مراجعة"),
      impact:item.educationalImpact||item.impact||"",
      action:item.recommendedAction||item.action||""
    })).slice(0,18);
    const tools=(analysis.qualityTools||[]).filter(t=>t.conditionsMet!==false).slice(0,12);
    const plan=(analysis.improvementPlan||[]).map(normalizePlan).slice(0,10);
    const monitoring=(analysis.monitoringPlan||[]).slice(0,8);
    const metrics=(analysis.metrics||[]).slice(0,14),charts=(analysis.charts||[]).slice(0,12);
    const limitations=uniqueBy(analysis.limitations||[],item=>normalize(item));
    const diagnosticSections=(analysis.diagnosticSections||[]).slice(0,12).map(item=>({
      ...item,
      source:String(item.source||"").includes("gemini")?"Gemini محلل أساسي + محرك أدلة":"محرك أدلة"
    }));
    const localProfile=analysis.analysisProfile||{};
    const profile={
      purpose:localProfile.method||localProfile.purpose||analysis.kind,
      dataSufficiency:localProfile.dataAdequacy||localProfile.dataSufficiency||"غير محددة",
      dimensions:localProfile.dimensions||[],
      decisionUse:localProfile.decisionUse||localProfile.decisionUses||[],
      assumptions:localProfile.assumptions||[]
    };
    return{meta,analysis,findings,tools,plan,monitoring,metrics,charts,limitations,diagnosticSections,profile,privateTables:analysis.privateTables||null,aiUsed:Boolean(analysis?._reconciliation?.aiApplied),generatedAt:new Date(),type:context.type,quality:context.quality||{},recognitionStatus:context.recognitionStatus||""};
  }

  function familyOf(data){return data.analysis?.analysisProfile?.family||data.analysis?.family||"generic";}
  function reportTitle(data,context){
    const family=familyOf(data),subject=data.meta.subject?` لمادة ${data.meta.subject}`:"";
    if(family==="scores") return `تقرير التحليل التشخيصي لنتائج الدرجات${subject}`;
    if(family==="narrative") return `تقرير التحليل الإشرافي السردي${subject}`;
    return `تقرير التحليل التربوي - ${context.type?.name||"نموذج تعليمي"}`;
  }
  function selectMetricGroups(data){
    const family=familyOf(data),preferred=family==="scores"?["n","masteryCount","nonMasteryCount","masteryPct","mean","median"]:family==="narrative"?["sentenceCount","strongEvidencePct","actionablePct","alignmentPct","contradictionCount","dateAnomalies"]:[];
    const core=[];preferred.forEach(id=>{const found=data.metrics.find(item=>item.id===id);if(found&&!core.includes(found))core.push(found);});
    data.metrics.forEach(item=>{if(core.length<6&&!core.includes(item))core.push(item);});
    return{core:core.slice(0,6),advanced:data.metrics.filter(item=>!core.includes(item))};
  }
  function chartWeight(chart){return ["heatmap","table","stacked"].includes(chart.type)||chart.id==="supervision-indicator-performance"?2:1;}
  function packCharts(charts,capacity=2){
    const pages=[];let current=[],weight=0;
    charts.forEach(chart=>{const w=chartWeight(chart);if(current.length&&weight+w>capacity){pages.push(current);current=[];weight=0;}current.push(chart);weight+=w;if(weight>=capacity){pages.push(current);current=[];weight=0;}});
    if(current.length)pages.push(current);return pages;
  }
  function splitAdvancedCharts(charts){
    const first=[],rest=[];let capacity=2,locked=false;
    charts.forEach(chart=>{const w=chartWeight(chart);if(!locked&&w===1&&capacity>=1){first.push(chart);capacity-=1;}else{locked=true;rest.push(chart);}});
    return {first,restPages:packCharts(rest,3)};
  }
  function metricCard(item){return `<article class="metric-card"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(metricValue(item))}</strong><small>${escapeHtml(item.note||"")}</small></article>`;}
  function chartCard(chart,index){const wide=chartWeight(chart)>1,rowCount=chart.type==="bar"&&Array.isArray(chart.data)?chart.data.length:0,dense=rowCount>=7;return `<article class="chart-card${wide?" chart-wide":""}${dense?" chart-dense":""}" data-chart-id="${escapeHtml(chart.id||"")}"${rowCount?` data-expected-rows="${rowCount}"`:""}><header><div><span>الرسم ${index}</span><h3>${escapeHtml(chart.title)}</h3></div></header><p>${escapeHtml(chart.description||"")}</p><div class="chart-body">${renderChart(chart)}</div></article>`;}
  function diagnosticCard(item,index,analysis){const alternatives=item.alternativeExplanations||[],limits=item.limitations||[],requests=item.dataRequests||[];return `<article class="diagnostic-card"><header><span>${index}</span><div><h3>${escapeHtml(item.title||"قراءة تفسيرية")}</h3><small>${escapeHtml(item.source||"تحليل متخصص")} · ثقة ${escapeHtml(item.confidence||"متوسطة")}</small></div></header><p>${escapeHtml(item.analysis||"")}</p>${item.evidenceRefs?.length?`<div class="evidence"><strong>الأدلة</strong>${escapeHtml(item.evidenceRefs.map(ref=>evidenceLabel(ref,analysis)).join("، "))}</div>`:""}${item.implications?.length?`<div class="deep-list"><h4>الآثار العملية</h4><ul>${item.implications.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}${alternatives.length?`<div class="deep-list"><h4>تفسيرات بديلة محتملة</h4><ul>${alternatives.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}${limits.length?`<div class="deep-list"><h4>حدود الاستدلال</h4><ul>${limits.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}${requests.length?`<div class="deep-list"><h4>بيانات مطلوبة للتحقق</h4><ul>${requests.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}</article>`;}
  function findingCard(item,index){return `<article class="finding-card"><div class="finding-number">${index}</div><div><header><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.confidence||"متوسطة")}</span></header>${item.statement?`<p>${escapeHtml(item.statement)}</p>`:""}<dl><div><dt>الدليل</dt><dd>${escapeHtml(item.evidence||"")}</dd></div><div><dt>الأثر التربوي</dt><dd>${escapeHtml(item.impact||"")}</dd></div><div><dt>الإجراء المرتبط</dt><dd>${escapeHtml(item.action||"")}</dd></div>${item.limitations?.length?`<div><dt>حدود القراءة</dt><dd>${escapeHtml(item.limitations.join("، "))}</dd></div>`:""}</dl></div></article>`;}
  function toolCard(item){return `<article class="tool-card"><div class="tool-state">مطبقة الآن</div><h3>${escapeHtml(item.name||item.id||"أداة جودة")}</h3><p>${escapeHtml(item.reason||item.interpretation||"")}</p><strong>${escapeHtml(item.interpretation||"")}</strong></article>`;}
  function planCard(item,index){const high=normalize(item.priority).includes("عالي"),steps=item.implementationSteps||[],resources=item.resources||[];return `<article class="plan-card"><header><span class="plan-index">${index}</span><div><small>${escapeHtml(item.priority)}</small><h3>${escapeHtml(item.issue)}</h3></div><b class="priority${high?" high":""}">${escapeHtml(item.targetGroup)}</b></header><p class="plan-action">${escapeHtml(item.action)}</p>${steps.length?`<div class="implementation-steps"><span>خطوات التنفيذ</span><ol>${steps.map(step=>`<li>${escapeHtml(step)}</li>`).join("")}</ol></div>`:""}<div class="plan-grid"><div><span>المسؤول</span><strong>${escapeHtml(item.responsibleRole)}</strong></div><div><span>الإطار الزمني</span><strong>${escapeHtml(item.timeframe)}</strong></div><div><span>مؤشر النجاح</span><strong>${escapeHtml(item.successIndicator)}</strong></div><div><span>المتابعة</span><strong>${escapeHtml(item.monitoringMethod)}</strong></div></div>${resources.length?`<div class="resources"><span>الموارد</span>${escapeHtml(resources.join("، "))}</div>`:""}<div class="contingency"><span>الخطة البديلة</span>${escapeHtml(item.contingency)}</div></article>`;}
  function monitoringTimeline(items){return `<div class="timeline">${items.map((item,index)=>`<article><span>${index+1}</span><div><small>${escapeHtml(item.timing||"")}</small><h3>${escapeHtml(item.stage||"مرحلة متابعة")}</h3><p>${escapeHtml(item.measure||"")}</p><strong>${escapeHtml(item.owner||"")}</strong></div></article>`).join("")}</div>`;}
  function profileBlock(profile){return `<div class="analysis-profile"><div><span>منهج التحليل</span><strong>${escapeHtml(profile.purpose||"—")}</strong></div><div><span>كفاية البيانات</span><strong>${escapeHtml(profile.dataSufficiency||"—")}</strong></div><div><span>الأبعاد</span><strong>${escapeHtml((profile.dimensions||[]).join("، ")||"—")}</strong></div><div><span>الاستخدامات</span><strong>${escapeHtml((profile.decisionUse||[]).join("، ")||"—")}</strong></div></div>`;}

  function rankingTable(title,rows,columns,note=""){
    if(!Array.isArray(rows)||!rows.length)return"";
    return `<div class="ranking-report-block"><div class="ranking-report-head"><h3>${escapeHtml(title)}</h3>${note?`<span>${escapeHtml(note)}</span>`:""}</div><table class="ranking-report-table"><thead><tr>${columns.map(column=>`<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(column=>`<td>${escapeHtml(row[column.key]??"—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function rankingPages(privateTables){
    if(!privateTables)return[];
    const pages=[];
    if(privateTables.schoolTopTen?.length){
      pages.push({section:"الأوائل على مستوى المدرسة / الدفعة",content:`<div class="section-heading"><span>ترتيب محلي محمي</span><h2>العشرة الأوائل على مستوى المدرسة / الدفعة</h2><p>${escapeHtml(privateTables.rankingFormulaLabel||"")}</p></div>${rankingTable("الترتيب العام",privateTables.schoolTopTen,[{key:"rankLabel",label:"المركز"},{key:"name",label:"اسم الطالب"},{key:"coreMeanDisplay",label:"متوسط الأساسية"},{key:"allMeanDisplay",label:"متوسط جميع المواد"},{key:"rankingScoreDisplay",label:"درجة الترتيب"}])}${privateTables.incompleteRankingCount?`<div class="report-note">غير مكتمل للترتيب: ${privateTables.incompleteRankingCount} سجلًا بسبب نقص مادة أساسية.</div>`:""}`});
    }
    const entries=Object.entries(privateTables.subjectTopTen||{});
    let group=[],rowBudget=0;
    const flush=()=>{
      if(!group.length)return;
      pages.push({section:"الأوائل حسب المادة",content:`<div class="section-heading"><span>ترتيب المادة</span><h2>العشرة الأوائل حسب الدرجة</h2><p>تظهر جميع حالات التعادل التي تقع داخل المركز العاشر.</p></div>${group.map(([subject,rows])=>rankingTable(subject,rows,[{key:"rankLabel",label:"المركز"},{key:"name",label:"اسم الطالب"},{key:"scoreDisplay",label:"الدرجة"},{key:"level",label:"المستوى"}])).join("")}`});
      group=[];rowBudget=0;
    };
    entries.forEach(entry=>{
      const rows=Array.isArray(entry[1])?entry[1]:[];
      const nextBudget=rowBudget+rows.length;
      if(group.length&&(group.length>=2||nextBudget>18))flush();
      group.push(entry);rowBudget+=rows.length;
      if(rows.length>18)flush();
    });
    flush();
    return pages;
  }

  function pageShell(content,{section,pageNo,totalPages,code}){
    return `<section class="report-sheet"><div class="report-page"><header class="page-head"><div class="page-brand"><div class="mini-logo">ت</div><div><strong>تقارير</strong><span>منصة التحليل التربوي الذكي</span></div></div><div class="page-section"><small>${escapeHtml(section)}</small><b>${escapeHtml(code)}</b></div></header><div class="page-content">${content}</div><footer class="page-footer"><span>تقارير v${VERSION} - تحليل تربوي عميق قابل للمراجعة</span><strong>صفحة ${pageNo} من ${totalPages}</strong></footer></div></section>`;
  }

  function validateChartContract(data){
    const charts=Array.isArray(data.charts)?data.charts:[],expectedN=Number(data.analysis?.n||0);
    charts.forEach(chart=>{
      const rows=Array.isArray(chart.data)?chart.data:[];
      if(chart.type==="bar"&&rows.length>20) throw new Error(`الرسم ${chart.title||chart.id||"الشريطي"} يتجاوز حد 20 فئة ويجب تقسيمه.`);
      if(["score-histogram","intervention-segments"].includes(chart.id)&&expectedN>0){
        const sum=rows.reduce((total,item)=>total+Number(item.count||0),0);
        if(sum!==expectedN) throw new Error(`فشل عقد اكتمال الرسم ${chart.title}: مجموع الفئات ${sum} لا يساوي السجلات الصالحة ${expectedN}.`);
      }
    });
  }

  function buildReportHtml(context,options={}){
    const data=buildReportData(context),analysis=data.analysis,meta=data.meta,autoPrint=options.autoPrint===true,metricGroups=selectMetricGroups(data),title=reportTitle(data,context),subtitle=clampText(meta.title||context.sourceName,240),code=`TQR-${Date.now().toString(36).toUpperCase()}`;
    validateChartContract(data);
    const pages=[];
    const multiVisitReport=analysis.kind==="supervision_multi_visit"||analysis.typeId==="supervision_multi_visit"||context.type?.id==="supervision_multi_visit";
    const orderedCharts=multiVisitReport?([
      "supervision-level-distribution",
      "supervision-numeric-narrative-alignment",
      "supervision-indicator-performance",
      "supervision-visit-performance",
    ].map(id=>data.charts.find(chart=>chart.id===id)).filter(Boolean).concat(data.charts.filter(chart=>![
      "supervision-level-distribution",
      "supervision-numeric-narrative-alignment",
      "supervision-indicator-performance",
      "supervision-visit-performance",
    ].includes(chart.id)))):data.charts;
    const primaryCharts=multiVisitReport?[]:orderedCharts.slice(0,2),remainingCharts=multiVisitReport?orderedCharts:orderedCharts.slice(2),advancedChartSplit=splitAdvancedCharts(remainingCharts);

    const metaHtml=`<div class="meta-grid"><div><span>نوع الاستمارة</span><strong>${escapeHtml(context.type?.name||"—")}</strong></div><div><span>المدرسة</span><strong>${escapeHtml(meta.school||"غير محددة في الملف")}</strong></div><div><span>المادة</span><strong>${escapeHtml(meta.subject||"غير محددة")}</strong></div><div><span>الصف / الفئة</span><strong>${escapeHtml(meta.grade||"غير محدد")}</strong></div><div><span>العام / الفترة</span><strong>${escapeHtml([meta.academicYear,meta.period].filter(Boolean).join(" - ")||"غير محدد")}</strong></div><div><span>مصدر البيانات</span><strong>${escapeHtml(meta.sourceName)}</strong></div></div>`;
    const primaryRowCount=primaryCharts.reduce((sum,chart)=>sum+(chart.type==="bar"&&Array.isArray(chart.data)?chart.data.length:0),0);
    const exec=`<div class="executive-page-layout${primaryRowCount>=12?" executive-dense-charts":""}"><div class="report-title"><div><span>التقرير التحليلي الرسمي</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="report-code"><strong>${escapeHtml(code)}</strong><span>${escapeHtml(formatDate(data.generatedAt))}</span></div></div>${metaHtml}<div class="section-heading"><div><span>01</span><h2>الملخص التنفيذي</h2></div><p>القراءة العليا للقرار قبل الانتقال إلى الطبقات الإحصائية والتشخيصية.</p></div><div class="executive-grid"><article class="executive-summary"><small>الحكم التنفيذي</small><h2>${escapeHtml(analysis.executiveTitle||title)}</h2><p>${escapeHtml(analysis.executiveSummary||"")}</p></article><article class="analysis-status"><small>مستوى التحليل</small><strong>${data.aiUsed?"تحليل ذكاء اصطناعي موثق":"تحليل غير مكتمل"}</strong><p>${escapeHtml(data.profile.dataSufficiency||"كفاية البيانات غير محددة")}</p></article></div><div class="metric-grid core-metrics">${metricGroups.core.map(metricCard).join("")}</div>${primaryCharts.length?`<div class="chart-grid primary-charts">${primaryCharts.map((chart,i)=>chartCard(chart,i+1)).join("")}</div>`:""}</div>`;
    pages.push({section:"الملخص التنفيذي",content:exec});

    if(metricGroups.advanced.length||advancedChartSplit.first.length||advancedChartSplit.restPages.length){
      const firstAdvancedBody=`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>التحليل الإحصائي والبصري المتقدم</h2></div><p>مؤشرات التشتت والشكل والحساسية تفسر ما يخفيه المتوسط العام.</p></div>${metricGroups.advanced.length?`<div class="metric-grid advanced-metrics">${metricGroups.advanced.map(metricCard).join("")}</div>`:""}${profileBlock(data.profile)}${advancedChartSplit.first.length?`<div class="chart-grid analytical-charts">${advancedChartSplit.first.map((chart,i)=>chartCard(chart,primaryCharts.length+i+1)).join("")}</div>`:""}`;
      pages.push({section:"التحليل المتقدم",content:firstAdvancedBody});
      advancedChartSplit.restPages.forEach((group,pageIndex)=>pages.push({section:"الرسوم المتخصصة",content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>التحليل البصري المتخصص</h2></div><p>رسوم إضافية اختيرت وفق طبيعة الاستمارة والقرار المطلوب.</p></div><div class="chart-grid analytical-charts">${group.map((chart,i)=>chartCard(chart,primaryCharts.length+advancedChartSplit.first.length+pageIndex*3+i+1)).join("")}</div>`}));
    }

    const diagnosticCapacity=data.aiUsed?3:4;
    chunkBalanced(data.diagnosticSections,diagnosticCapacity).forEach((group,groupIndex)=>{
      const start=groupIndex*diagnosticCapacity;
      pages.push({section:"القراءة التفسيرية",content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>القراءة التفسيرية المتخصصة</h2></div><p>تفسير تربوي يربط المؤشرات بالدلالة والاستخدام والحدود.</p></div><div class="diagnostic-grid">${group.map((item,i)=>diagnosticCard(item,start+i+1,analysis)).join("")}</div>`});
    });

    chunkBalanced(data.findings,6).forEach((group,groupIndex)=>{
      const start=data.findings.slice(0,groupIndex===0?0:chunkBalanced(data.findings,6).slice(0,groupIndex).reduce((s,g)=>s+g.length,0)).length;
      pages.push({section:"الاستنتاجات التشخيصية",content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>الاستنتاجات التشخيصية</h2></div><p>لكل استنتاج دليل وأثر وإجراء مرتبط، دون تحويل الاحتمال إلى حقيقة.</p></div><div class="findings-grid">${group.map((item,i)=>findingCard(item,start+i+1)).join("")}</div>`});
    });

    if(data.plan.length){
      const hasDetailedPlans=data.plan.some(item=>(item.implementationSteps||[]).length||(item.resources||[]).length);
      const planChunks=chunkBalanced(data.plan,hasDetailedPlans?2:4);
      planChunks.forEach((group,idx)=>pages.push({section:"خطة التحسين والتدخل",content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>خطة التحسين والتدخل</h2></div><p>تدخلات متمايزة بخط أساس ومستهدف ومسؤول وزمن وخطة بديلة.</p></div><div class="plan-cards">${group.map((item,i)=>planCard(item,planChunks.slice(0,idx).reduce((sum,chunk)=>sum+chunk.length,0)+i+1)).join("")}</div>`}));
    }

    const governance=[];
    if(data.tools.length)governance.push(`<div class="section-heading compact"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>أدوات الجودة المطبقة</h2></div><p>الأداة تظهر لأنها أضافت تفسيرًا أو قرارًا فعليًا.</p></div><div class="tools-grid">${data.tools.map(toolCard).join("")}</div>`);
    if(data.monitoring.length)governance.push(`<div class="section-heading spaced"><div><span>↻</span><h2>خطة المتابعة وإعادة القياس</h2></div><p>دورة متابعة توضح متى نقيس، وماذا نقيس، ومن يملك القرار.</p></div>${monitoringTimeline(data.monitoring)}`);
    if(data.limitations.length)governance.push(`<div class="governance-grid"><article><h3>حدود التحليل</h3><ul>${data.limitations.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article><article><h3>ضوابط الاعتماد</h3><ul><li>تراجع الاستنتاجات منخفضة الثقة قبل الاعتماد.</li><li>تربط الخطط بمؤشرات قياس محددة ومواعيد متابعة.</li><li>لا تعمم النتائج خارج نطاق البيانات المرفوعة.</li></ul></article></div>`);
    governance.push(`<div class="approval"><div>إعداد التقرير</div><div>المراجعة والاعتماد</div><div>تاريخ المتابعة</div></div>`);
    pages.push({section:"المتابعة والحوكمة",content:governance.join("")});

    pages.push(...rankingPages(data.privateTables));
    const total=pages.length;
    const body=pages.map((page,index)=>pageShell(page.content,{section:page.section,pageNo:index+1,totalPages:total,code})).join("");
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
      :root{--navy:#142d5e;--royal:#244b98;--teal:#16877e;--teal-soft:#eaf6f4;--gold:#b88828;--ink:#16233d;--muted:#627088;--line:#d9e0ea;--soft:#f5f7fa;--danger:#9e3c34;--danger-soft:#fbebe8;--white:#fff}
      *{box-sizing:border-box}html,body{margin:0;background:#edf1f6;color:var(--ink);font-family:Tahoma,"Segoe UI",Arial,sans-serif}body{padding:18px}.toolbar{position:sticky;top:8px;z-index:10;display:flex;gap:8px;justify-content:center;margin-bottom:14px}.toolbar button{border:0;border-radius:9px;padding:10px 18px;font-weight:800;cursor:pointer}.toolbar .print{background:var(--navy);color:#fff}.toolbar .close{background:#fff;color:var(--navy);border:1px solid var(--line)}.report-sheet{position:relative;width:210mm;height:276mm;margin:0 auto 14px;background:#fff;box-shadow:0 10px 30px rgba(20,45,94,.10);overflow:hidden;break-after:page;page-break-after:always}.report-sheet:last-of-type{break-after:auto;page-break-after:auto}.report-page{position:absolute;top:0;left:50%;width:210mm;height:297mm;padding:10mm 13mm 9mm;background:#fff;display:flex;flex-direction:column;overflow:hidden;transform:translateX(-50%) scale(.929293);transform-origin:top center}.page-head{height:14mm;display:flex;align-items:center;justify-content:space-between;border-bottom:1.6px solid var(--navy);padding-bottom:3mm;flex:none}.page-brand{display:flex;gap:2.5mm;align-items:center}.mini-logo{width:9mm;height:9mm;display:grid;place-items:center;background:var(--navy);color:#fff;border-radius:2.2mm;font-weight:900;font-size:14px}.page-brand strong{display:block;font-size:10.5pt;color:var(--navy)}.page-brand span,.page-section small{display:block;font-size:7.2pt;color:var(--muted)}.page-section{text-align:left;direction:ltr}.page-section b{display:block;font-size:7pt;color:var(--navy);margin-top:1mm}.page-content{flex:1;min-height:0;padding-top:5mm}.page-footer{height:7mm;margin-top:auto;padding-top:2mm;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:7pt;color:var(--muted);flex:none}.report-title{display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:start}.report-title>div:first-child span{font-size:8pt;color:var(--teal);font-weight:800}.report-title h1{font-size:19pt;line-height:1.35;margin:1.5mm 0;color:var(--navy)}.report-title p{margin:0;color:var(--muted);font-size:8.2pt;line-height:1.55}.report-code{text-align:left;direction:ltr;border-right:3px solid var(--teal);padding-right:3mm}.report-code strong{display:block;font-size:8pt;color:var(--navy)}.report-code span{font-size:7pt;color:var(--muted)}.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);margin-top:4mm}.meta-grid div{padding:2.5mm 3mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line);min-height:15mm}.meta-grid div:nth-child(3n){border-left:0}.meta-grid div:nth-last-child(-n+3){border-bottom:0}.meta-grid span,.analysis-profile span,.plan-grid span,.contingency span{display:block;color:var(--muted);font-size:7pt}.meta-grid strong{display:block;margin-top:1.2mm;font-size:8.5pt;line-height:1.35;color:var(--ink)}.section-heading{display:flex;justify-content:space-between;gap:5mm;align-items:flex-end;border-bottom:2px solid var(--navy);padding-bottom:2mm;margin:4mm 0}.section-heading.compact{margin-top:0}.section-heading.spaced{margin-top:5mm}.section-heading>div{display:flex;align-items:center;gap:2.5mm}.section-heading span{display:grid;place-items:center;width:8mm;height:8mm;background:var(--navy);color:#fff;border-radius:50%;font-size:7pt;font-weight:900}.section-heading h2{margin:0;font-size:14pt;color:var(--navy)}.section-heading p{margin:0;max-width:90mm;text-align:left;font-size:7.4pt;color:var(--muted)}.executive-grid{display:grid;grid-template-columns:1fr 44mm;gap:4mm}.executive-summary{border:1px solid var(--line);border-right:4px solid var(--royal);padding:4mm}.executive-summary small,.analysis-status small{font-size:7pt;color:var(--gold);font-weight:800}.executive-summary h2{margin:1.5mm 0;font-size:13pt;color:var(--navy)}.executive-summary p{margin:0;font-size:9pt;line-height:1.65;color:#33415a}.analysis-status{padding:4mm;background:var(--teal-soft);border:1px solid #cde9e4}.analysis-status strong{display:block;margin:2mm 0;color:var(--teal);font-size:11pt}.analysis-status p{font-size:8pt;line-height:1.55;color:#3e5a59}.metric-grid{display:grid;gap:3mm;margin-top:4mm}.core-metrics{grid-template-columns:repeat(3,1fr)}.advanced-metrics{grid-template-columns:repeat(4,1fr)}.metric-card{min-height:24mm;border:1px solid var(--line);border-top:3px solid var(--royal);padding:3mm;background:#fff}.metric-card span{display:block;font-size:7pt;color:var(--muted)}.metric-card strong{display:block;margin:1.2mm 0;font-size:16pt;color:var(--navy)}.metric-card small{display:block;font-size:7pt;color:var(--teal);line-height:1.35}.analysis-profile{display:grid;grid-template-columns:1fr 1fr;margin:4mm 0;border:1px solid var(--line);background:var(--soft)}.analysis-profile div{padding:3mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line)}.analysis-profile div:nth-child(2n){border-left:0}.analysis-profile div:nth-last-child(-n+2){border-bottom:0}.analysis-profile strong{display:block;margin-top:1mm;font-size:8pt;line-height:1.55}.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:4mm}.chart-card{border:1px solid var(--line);padding:3.5mm;min-height:77mm;display:flex;flex-direction:column}.chart-card.chart-wide{grid-column:1/-1;min-height:145mm}.chart-grid>.chart-card:only-child{grid-column:1/-1;min-height:120mm}.chart-grid>.chart-wide+.chart-card:last-child{grid-column:1/-1;min-height:62mm}.chart-card header{display:flex;justify-content:space-between}.chart-card header span{font-size:7pt;color:var(--teal);font-weight:800}.chart-card h3{margin:1mm 0 0;font-size:11pt;color:var(--navy)}.chart-card>p{margin:1.5mm 0 2.5mm;font-size:7.4pt;line-height:1.45;color:var(--muted)}.chart-body{flex:1;display:flex;align-items:center}.bar-chart{width:100%}.bar-row{display:grid;grid-template-columns:30mm 1fr 25mm;gap:2mm;align-items:center;margin:2mm 0}.bar-label{font-size:7.5pt;font-weight:700;line-height:1.25}.bar-track{height:7px;background:#e7ebf1;overflow:hidden}.bar-track i{display:block;height:100%;background:linear-gradient(90deg,var(--royal),var(--teal))}.bar-row strong{font-size:7.3pt;text-align:left;direction:rtl}.bar-row em{font-style:normal;color:var(--teal);font-size:6.7pt}.chart-dense .chart-body,.chart-wide .chart-body{align-items:flex-start}.chart-dense .bar-row{margin:.75mm 0;grid-template-columns:27mm 1fr 25mm}.chart-dense .bar-label{font-size:7pt;line-height:1.12}.chart-dense .bar-track{height:6px}.chart-dense .bar-row strong{font-size:6.9pt}.executive-dense-charts .report-title h1{font-size:17pt;margin:1mm 0}.executive-dense-charts .report-title p{font-size:7.7pt;line-height:1.4}.executive-dense-charts .meta-grid{margin-top:2.5mm}.executive-dense-charts .meta-grid div{padding:1.8mm 2.4mm;min-height:12.5mm}.executive-dense-charts .meta-grid strong{margin-top:.7mm;font-size:8pt}.executive-dense-charts .section-heading{margin:2.7mm 0;padding-bottom:1.5mm}.executive-dense-charts .section-heading h2{font-size:13pt}.executive-dense-charts .executive-grid{gap:3mm}.executive-dense-charts .executive-summary,.executive-dense-charts .analysis-status{padding:2.8mm}.executive-dense-charts .executive-summary h2{font-size:11.7pt;margin:1mm 0}.executive-dense-charts .executive-summary p{font-size:8.2pt;line-height:1.48}.executive-dense-charts .analysis-status strong{font-size:10pt;margin:1.2mm 0}.executive-dense-charts .analysis-status p{font-size:7.3pt;line-height:1.35;margin:0}.executive-dense-charts .metric-grid{gap:2mm;margin-top:2.6mm}.executive-dense-charts .metric-card{min-height:19mm;padding:2mm}.executive-dense-charts .metric-card strong{font-size:13.5pt;margin:.6mm 0}.executive-dense-charts .metric-card small{font-size:6.6pt}.executive-dense-charts .chart-grid{gap:3mm;margin-top:2.8mm}.executive-dense-charts .chart-card{min-height:66mm;padding:2.5mm}.executive-dense-charts .chart-card h3{font-size:10.3pt;margin:.5mm 0 0}.executive-dense-charts .chart-card>p{font-size:6.8pt;line-height:1.25;margin:.8mm 0 1.2mm}.executive-dense-charts .chart-body{align-items:flex-start}.line-svg,.radar-svg,.box-svg{width:100%;height:auto;max-height:60mm}.axis{stroke:#c8d0dd;stroke-width:1}.series{fill:none;stroke:var(--royal);stroke-width:3}.point{fill:var(--teal)}svg text{font-size:9px;fill:#43506a}.value-label{font-size:10px;font-weight:700;fill:var(--navy)}.radar-grid{fill:none;stroke:#cbd2df}.radar-value{fill:rgba(36,75,152,.18);stroke:var(--royal);stroke-width:2}.box{fill:rgba(22,135,126,.18);stroke:var(--teal);stroke-width:2}.median,.cap{stroke:var(--royal);stroke-width:3}.chart-note{margin:1mm 0 0;font-size:7.3pt;color:var(--muted)}.heat-table,.data-table{width:100%;border-collapse:collapse;font-size:7.2pt}.heat-table th,.heat-table td,.data-table th,.data-table td{padding:2mm;border:1px solid var(--line);text-align:center}.heat-table th:first-child,.data-table th,.data-table td{text-align:right}.heat-0{background:#f7f8fa}.heat-1{background:#eaf3f1}.heat-2{background:#d0e8e4}.heat-3{background:#99cec7}.heat-4{background:#4ca49b;color:#fff}.heat-5{background:#176f69;color:#fff}.diagnostic-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.diagnostic-grid>.diagnostic-card:last-child:nth-child(odd){grid-column:1/-1;min-height:62mm}.diagnostic-card{border:1px solid var(--line);border-right:4px solid var(--royal);padding:4mm;min-height:105mm}.diagnostic-card header{display:flex;gap:3mm;align-items:start}.diagnostic-card header>span{display:grid;place-items:center;width:8mm;height:8mm;background:var(--navy);color:#fff;font-weight:900;font-size:8pt}.diagnostic-card h3{margin:0;font-size:11pt;color:var(--navy)}.diagnostic-card small{display:block;margin-top:1mm;font-size:7pt;color:var(--teal)}.diagnostic-card>p{font-size:8.5pt;line-height:1.75;color:#35435c}.evidence{padding:2.5mm;background:var(--soft);font-size:7.7pt;line-height:1.55}.evidence strong{color:var(--gold);margin-left:2mm}.diagnostic-card ul{padding-right:5mm;margin:3mm 0 0}.diagnostic-card li{font-size:8pt;line-height:1.6;margin-bottom:1.5mm}.deep-list{border-top:1px solid #edf0f4;margin-top:2mm;padding-top:1.5mm}.deep-list h4{font-size:7.2pt;color:var(--gold);margin:0 0 1mm}.deep-list ul{margin:0;padding-right:5mm}.findings-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.findings-grid>.finding-card:last-child:nth-child(odd){grid-column:1/-1;min-height:58mm}.finding-card{display:grid;grid-template-columns:9mm 1fr;border:1px solid var(--line);min-height:73mm}.finding-number{display:grid;place-items:center;background:var(--navy);color:#fff;font-size:13pt;font-weight:900}.finding-card>div:last-child{padding:3.5mm}.finding-card header{display:flex;justify-content:space-between;gap:3mm}.finding-card h3{margin:0;font-size:10.5pt;color:var(--navy)}.finding-card header span{flex:none;padding:1mm 2mm;background:var(--teal-soft);color:var(--teal);font-size:7pt;font-weight:800}.finding-card>div>p{margin:2mm 0;font-size:8pt;line-height:1.55;color:#3b4860}.finding-card dl{margin:0}.finding-card dl div{border-top:1px solid #edf0f4;padding-top:1.5mm;margin-top:1.5mm}.finding-card dt{font-size:7pt;color:var(--gold);font-weight:900}.finding-card dd{margin:.8mm 0 0;font-size:7.6pt;line-height:1.5;color:#435069}.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.tools-grid>.tool-card:only-child{grid-column:1/-1;min-height:28mm}.tools-grid:has(.tool-card:nth-child(2):last-child){grid-template-columns:repeat(2,1fr)}.tool-card{border:1px solid var(--line);border-right:4px solid var(--teal);padding:3mm;min-height:33mm}.tool-state{font-size:6.6pt;color:var(--teal);font-weight:900}.tool-card h3{font-size:9.5pt;color:var(--navy);margin:1mm 0}.tool-card p{font-size:7.2pt;line-height:1.45;color:#4b576d;margin:0}.tool-card strong{display:block;margin-top:1.5mm;color:var(--teal);font-size:7pt}.plan-cards{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.plan-card{border:1px solid var(--line);padding:3.5mm;min-height:109mm}.plan-card header{display:grid;grid-template-columns:8mm 1fr auto;gap:2.5mm;align-items:start}.plan-index{display:grid;place-items:center;width:8mm;height:8mm;background:var(--navy);color:#fff;font-weight:900}.plan-card header small{font-size:7pt;color:var(--gold);font-weight:900}.plan-card h3{margin:1mm 0;font-size:10.5pt;color:var(--navy)}.priority{max-width:35mm;padding:1mm 1.5mm;background:#fff1cb;color:#7a5917;font-size:6.6pt;font-weight:900;line-height:1.3}.priority.high{background:var(--danger-soft);color:var(--danger)}.plan-action{font-size:8.3pt;line-height:1.65;margin:3mm 0;color:#35435b}.plan-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line)}.plan-grid div{padding:2.2mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line)}.plan-grid div:nth-child(2n){border-left:0}.plan-grid div:nth-last-child(-n+2){border-bottom:0}.plan-grid strong{display:block;margin-top:1mm;font-size:7.3pt;line-height:1.4}.implementation-steps,.resources{margin:2mm 0;padding:2mm;background:#f7f9fb;font-size:7.2pt;line-height:1.45}.implementation-steps>span,.resources>span,.contingency>span{display:block;color:var(--gold);font-weight:900;margin-bottom:1mm}.implementation-steps ol{margin:0;padding-right:5mm}.implementation-steps li{margin-bottom:.8mm}.contingency{margin-top:2.5mm;padding:2mm;background:var(--soft);font-size:7.2pt;line-height:1.45}.timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.timeline article{display:flex;gap:2mm;border:1px solid var(--line);border-top:4px solid var(--royal);padding:3mm;min-height:48mm}.timeline article>span{display:grid;place-items:center;flex:none;width:7mm;height:7mm;background:var(--navy);color:#fff;font-size:7pt;font-weight:900}.timeline small{font-size:6.8pt;color:var(--teal);font-weight:800}.timeline h3{margin:1mm 0;font-size:9.5pt;color:var(--navy)}.timeline p{margin:0;font-size:7.2pt;line-height:1.5;color:#455269}.timeline strong{display:block;margin-top:1.5mm;font-size:7pt}.governance-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:5mm}.governance-grid article{border:1px solid var(--line);padding:4mm;min-height:62mm}.governance-grid h3{margin:0 0 2mm;font-size:11pt;color:var(--navy)}.governance-grid ul{padding-right:5mm}.governance-grid li{font-size:8.2pt;line-height:1.65;margin-bottom:2mm}.approval{display:grid;grid-template-columns:repeat(3,1fr);gap:9mm;margin-top:8mm}.approval div{padding-top:7mm;border-top:1px solid #6e7b91;text-align:center;color:var(--muted);font-size:8pt}
.ranking-report-block{margin:4mm 0;border:1px solid var(--line);border-radius:3mm;overflow:hidden}.ranking-report-head{display:flex;justify-content:space-between;gap:3mm;padding:2.5mm 3mm;background:#f4f7fb}.ranking-report-head h3{margin:0;color:var(--navy);font-size:10pt}.ranking-report-head span{font-size:7pt;color:var(--muted)}.ranking-report-table{width:100%;border-collapse:collapse;font-size:7.3pt}.ranking-report-table th,.ranking-report-table td{padding:1.8mm 2mm;border-bottom:1px solid var(--line);text-align:right}.ranking-report-table th{background:#fafbfc;color:var(--navy)}.ranking-report-table td:first-child{font-weight:900;color:var(--royal)}.report-note{margin-top:3mm;padding:2.5mm;background:#fff8e9;border:1px solid #ecd9a4;font-size:7.5pt;color:#6d520f}
      @page{size:A4 portrait;margin:0}@media print{html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{padding:0}.toolbar{display:none!important}.report-sheet{margin:0;box-shadow:none}.report-page{box-shadow:none}}@media screen and (max-width:900px){body{padding:0}.report-sheet{width:100%;height:auto;min-height:100vh;margin:0;box-shadow:none;overflow:visible}.report-page{position:relative;left:auto;transform:none;width:100%;height:auto;min-height:100vh;margin:0;padding:20px;overflow:visible}.chart-grid,.diagnostic-grid,.findings-grid,.plan-cards,.tools-grid,.timeline,.core-metrics,.advanced-metrics,.meta-grid,.executive-grid,.analysis-profile,.governance-grid{grid-template-columns:1fr}.page-head,.page-footer{height:auto;padding:12px 0}.meta-grid div,.analysis-profile div,.plan-grid div{border-left:0}.chart-card.chart-wide{grid-column:auto;min-height:0}}
    </style></head><body><div class="toolbar"><button class="print" onclick="window.print()">طباعة التقرير أو حفظه PDF - متوافق A4 وLetter</button><button class="close" onclick="window.close()">إغلاق</button></div>${body}<script>window.addEventListener("load",()=>setTimeout(()=>{const failures=[];document.querySelectorAll(".chart-card[data-expected-rows]").forEach(card=>{const expected=Number(card.dataset.expectedRows||0),rows=[...card.querySelectorAll(".bar-row")],cardBox=card.getBoundingClientRect(),page=card.closest(".report-page"),footer=page?.querySelector(".page-footer"),limit=footer?footer.getBoundingClientRect().top:cardBox.bottom;if(rows.length!==expected)failures.push("count:"+(card.dataset.chartId||"")+":"+rows.length+"/"+expected);const last=rows.at(-1);if(last&&last.getBoundingClientRect().bottom>Math.min(cardBox.bottom,limit)+1)failures.push("clip:"+(card.dataset.chartId||""));});document.documentElement.dataset.chartIntegrity=failures.length?"fail":"pass";document.documentElement.dataset.chartIntegrityDetails=failures.join(",");if(failures.length)console.error("Taqareer chart integrity failed",failures);},80));<\/script>${autoPrint?`<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350));<\/script>`:""}</body></html>`;
  }

  function openReport(context,options={}){if(!context?.analysis)throw new Error("لا توجد نتيجة تحليل جاهزة لإنشاء التقرير.");const popup=window.open("","taqareer-deep-report");if(!popup)throw new Error("منع المتصفح فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");try{popup.opener=null}catch{}popup.document.open();popup.document.write(buildReportHtml(context,options));popup.document.close();return popup;}
  window.TaqareerReports={VERSION,buildReportData,buildReportHtml,openReport};
})();
