(() => {
  "use strict";

  const VERSION = "1.2.22";

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
  function displayTerms(){ return window.TaqareerDisplayTerms || null; }
  function safeAnalysisMethod(value,fallback="تحليل تربوي متخصص"){ return displayTerms()?.analysisMethod?.(value,fallback) || (()=>{const text=String(value??"").trim();return /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)+$/.test(text)||/^(?:TQR-)/i.test(text)?fallback:(text||fallback);})(); }
  function safePublicLabel(value,fallback="بيان تحليلي"){ return displayTerms()?.publicLabel?.(value,fallback) || (()=>{const text=String(value??"").trim();return /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)+$/.test(text)||/^(?:TQR-)/i.test(text)?fallback:(text||fallback);})(); }
  function safePublicText(value,fallback=""){ return displayTerms()?.publicText?.(value,fallback) || (()=>{let text=String(value??"").replace(/\s+/g," ").trim();text=text.replace(/\blevel\s+distribution\b/gi,"توزيع مستويات الأداء").replace(/\bsemanas?\b/gi,"أسابيع").replace(/\bweeks?\b/gi,"أسابيع").replace(/\bmonths?\b/gi,"أشهر").replace(/\bundefined\b/gi,"").replace(/\s+([،؛:.])/g,"$1").replace(/\s+/g," ").trim();return text||fallback;})(); }
  function safeTextList(items){ return Array.isArray(items)?items.map(item=>safePublicText(item,"")).filter(Boolean):[]; }
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
  function evidenceLabel(ref,analysis){
    const mapped=analysis?.evidenceMap?.[ref];
    if(mapped)return mapped;
    if(/^row:/.test(ref))return `السجل ${ref.slice(4)}`;
    if(/^line:/.test(ref))return `السطر ${ref.slice(5)}`;
    if(/^metric:/.test(ref)){const id=String(ref).slice(7),metric=(analysis?.metrics||[]).find(item=>item?.id===id||item?.evidenceRef===ref);return metric?.label?`المؤشر: ${metric.label}`:"مؤشر محسوب";}
    if(/^chart:/.test(ref))return "رسم تحليلي";
    return safePublicLabel(ref,"مرجع تحليلي موثق");
  }

  function normalizePlan(item){return{priority:safePublicText(item.priority,"متوسطة"),issue:safePublicText(item.issue,"أولوية تحسين"),targetGroup:safePublicText(item.targetGroup,"الفئة المستهدفة"),action:safePublicText(item.action,""),implementationSteps:safeTextList(item.implementationSteps),resources:safeTextList(item.resources),responsibleRole:safePublicText(item.responsibleRole,"يحدد لاحقًا"),timeframe:safePublicText(item.timeframe,"يحدد لاحقًا"),successIndicator:safePublicText(item.successIndicator,"مؤشر قابل للقياس"),monitoringMethod:safePublicText(item.monitoringMethod,"متابعة دورية"),contingency:safePublicText(item.contingency,"مراجعة التدخل عند ضعف الاستجابة")};}

  function renderBar(chart){
    const data=Array.isArray(chart.data)?chart.data:[],xKey=chart.xKey||"label",yKey=chart.yKey||"count",max=Math.max(1,...data.map(item=>Number(item[yKey]||0))),total=data.reduce((sum,item)=>sum+Number(item[yKey]||0),0);
    if(data.length>20) throw new Error(`الرسم ${chart.title||chart.id||"الشريطي"} يحتوي ${data.length} فئة، بينما حد العرض الآمن 20. يجب تقسيمه بدل إسقاط الفئات.`);
    return `<div class="bar-chart" data-chart-id="${escapeHtml(chart.id||"")}" data-expected-rows="${data.length}">${data.map(item=>{const value=Number(item[yKey]||0),label=item[xKey]??item.label??"—",pct=total>0&&chart.valueSuffix!=="%"?` <em>${round(value/total*100)}%</em>`:"";return `<div class="bar-row"><span class="bar-label">${escapeHtml(label)}</span><div class="bar-track"><i style="width:${Math.max(2,value/max*100)}%"></i></div><strong>${round(value)}${escapeHtml(chart.valueSuffix||"")}${pct}</strong></div>`;}).join("")}</div>`;
  }

  function renderHistogram(chart){
    const data=Array.isArray(chart.data)?chart.data:[],xKey=chart.xKey||"label",yKey=chart.yKey||"count",max=Math.max(1,...data.map(item=>Number(item[yKey]||0)));
    return `<div class="hist-chart" data-chart-id="${escapeHtml(chart.id||"")}" data-expected-rows="${data.length}">${data.map(item=>{const value=Number(item[yKey]||0),label=item[xKey]??item.label??"—";return `<div class="hist-bin"><strong>${round(value)}</strong><div class="hist-column"><i style="height:${Math.max(3,value/max*100)}%"></i></div><small>${escapeHtml(label)}</small></div>`;}).join("")}</div>`;
  }
  function renderStacked100(chart){
    const data=Array.isArray(chart.data)?chart.data:[],xKey=chart.xKey||"label",series=Array.isArray(chart.series)?chart.series:[];
    const seg=(label,value,total,index)=>{const pct=total>0?value/total*100:0;return value>0?`<i class="stack-segment seg-${index%6}" style="width:${pct}%" title="${escapeHtml(label)}: ${round(value)} (${round(pct)}%)"></i>`:"";};
    if(series.length)return `<div class="stack-list">${data.map(row=>{const values=series.map(key=>Math.max(0,Number(row[key]||0))),total=values.reduce((a,b)=>a+b,0)||1;return `<div class="stack-row"><strong>${escapeHtml(row[xKey]??"—")}</strong><div class="stack-track">${series.map((key,i)=>seg(key,values[i],total,i)).join("")}</div><small>${series.map((key,i)=>`${escapeHtml(key)} ${round(values[i]/total*100)}%`).join(" · ")}</small></div>`;}).join("")}</div>`;
    const yKey=chart.yKey||"count",values=data.map(row=>Math.max(0,Number(row[yKey]||0))),total=values.reduce((a,b)=>a+b,0)||1;
    return `<div class="stack-single" data-chart-id="${escapeHtml(chart.id||"")}"><div class="stack-track">${data.map((row,i)=>seg(row[xKey]??row.label??`فئة ${i+1}`,values[i],total,i)).join("")}</div><div class="stack-legend">${data.map((row,i)=>`<span><i class="seg-${i%6}"></i>${escapeHtml(row[xKey]??row.label??`فئة ${i+1}`)} <strong>${round(values[i]/total*100)}%</strong></span>`).join("")}</div></div>`;
  }
  function renderBullet(chart){
    const data=Array.isArray(chart.data)?chart.data:[],labelKey=chart.xKey||"label",currentKey=chart.currentKey||chart.yKey||"current",targetKey=chart.targetKey||"target",targetValue=Number(chart.targetValue),values=data.flatMap(row=>[Number(row[currentKey]||0),Number.isFinite(targetValue)?targetValue:Number(row[targetKey]||0)]),max=Math.max(1,Number(chart.max)||0,...values);
    return `<div class="bullet-list">${data.slice(0,16).map(row=>{const current=Number(row[currentKey]||0),target=Number.isFinite(targetValue)?targetValue:Number(row[targetKey]||0),cp=Math.max(0,Math.min(100,current/max*100)),tp=Math.max(0,Math.min(100,target/max*100));return `<div class="bullet-row"><span>${escapeHtml(row[labelKey]??row.label??"—")}</span><div class="bullet-track"><i style="width:${cp}%"></i><b style="right:${tp}%"></b></div><strong>${round(current)} / ${round(target)}</strong></div>`;}).join("")}</div>`;
  }
  function renderDumbbell(chart){
    const data=Array.isArray(chart.data)?chart.data:[],labelKey=chart.xKey||"label",beforeKey=chart.beforeKey||"before",afterKey=chart.afterKey||"after",vals=data.flatMap(row=>[Number(row[beforeKey]||0),Number(row[afterKey]||0)]),min=Math.min(...vals,0),max=Math.max(...vals,1),span=Math.max(1e-9,max-min);
    return `<div class="dumbbell-list">${data.slice(0,14).map(row=>{const before=Number(row[beforeKey]||0),after=Number(row[afterKey]||0),bp=(before-min)/span*100,ap=(after-min)/span*100,left=Math.min(bp,ap),width=Math.max(1,Math.abs(ap-bp));return `<div class="dumbbell-row"><span>${escapeHtml(row[labelKey]??"—")}</span><div class="dumbbell-track"><i style="right:${left}%;width:${width}%"></i><b class="before" style="right:${bp}%"></b><b class="after" style="right:${ap}%"></b></div><strong>${round(before)} ← ${round(after)}</strong></div>`;}).join("")}</div>`;
  }
  function renderPareto(chart){
    const data=Array.isArray(chart.data)?chart.data:[],xKey=chart.xKey||"label",yKey=chart.yKey||"gap",max=Math.max(1,...data.map(row=>Number(row[yKey]||0))),total=data.reduce((sum,row)=>sum+Math.max(0,Number(row[yKey]||0)),0)||1;let running=0;
    return `<div class="pareto-list">${data.slice(0,20).map(row=>{const value=Math.max(0,Number(row[yKey]||0));running+=value;const explicit=Number(row[chart.cumulativeKey]),cumulative=Number.isFinite(explicit)?explicit:running/total*100;return `<div class="pareto-row"><span>${escapeHtml(row[xKey]??"—")}</span><div class="pareto-track"><i style="width:${Math.max(2,value/max*100)}%"></i></div><strong>${round(value)}${escapeHtml(chart.valueSuffix||"")} <em>${round(cumulative)}%</em></strong></div>`;}).join("")}</div>`;
  }
  function renderScatter(chart){
    const data=Array.isArray(chart.data)?chart.data:[],xKey=chart.xKey||"x",yKey=chart.yKey||"y";if(!data.length)return"";const xs=data.map(row=>Number(row[xKey]||0)),ys=data.map(row=>Number(row[yKey]||0)),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=680,h=190,pad=30,x=xv=>pad+(xv-minX)/Math.max(1e-9,maxX-minX)*(w-pad*2),y=yv=>h-pad-(yv-minY)/Math.max(1e-9,maxY-minY)*(h-pad*2);
    return `<svg class="scatter-svg" viewBox="0 0 ${w} ${h}"><line class="axis" x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}"/><line class="axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}"/>${data.slice(0,40).map((row,i)=>`<circle class="point" cx="${x(xs[i])}" cy="${y(ys[i])}" r="4"><title>${round(xs[i])}, ${round(ys[i])}</title></circle>`).join("")}</svg>`;
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
  function renderChart(chart){if(!chart)return"";if(chart.type==="histogram")return renderHistogram(chart);if(chart.type==="stacked100"||chart.type==="stacked")return renderStacked100(chart);if(chart.type==="bullet")return renderBullet(chart);if(chart.type==="dumbbell")return renderDumbbell(chart);if(chart.type==="pareto")return renderPareto(chart);if(chart.type==="scatter")return renderScatter(chart);if(chart.type==="line")return renderLine(chart);if(chart.type==="radar")return renderRadar(chart);if(chart.type==="box")return renderBox(chart);if(chart.type==="heatmap")return renderHeatmap(chart);if(chart.type==="table")return renderTable(chart);return renderBar(chart);}

  function buildReportData(context){
    const analysis=context.analysis||{},meta=extractMetadata(context);
    const findings=(analysis.findings||[]).map(item=>({
      ...item,
      title:safePublicText(item.title,"استنتاج تشخيصي"),
      statement:safePublicText(item.statement,""),
      confidence:safePublicText(item.confidence,"متوسطة"),
      evidence:safePublicText(item.evidence||((item.evidenceRefs||[]).map(ref=>evidenceLabel(ref,analysis)).join("، ")||"دليل يحتاج مراجعة"),"دليل يحتاج مراجعة"),
      impact:safePublicText(item.educationalImpact||item.impact||"",""),
      action:safePublicText(item.recommendedAction||item.action||"",""),
      limitations:safeTextList(item.limitations)
    })).slice(0,18);
    const tools=(analysis.qualityTools||[]).filter(t=>t.conditionsMet!==false).slice(0,12).map(item=>({
      ...item,
      name:safePublicLabel(item.name||item.id,"أداة جودة"),
      reason:safePublicText(item.reason,""),
      interpretation:safePublicText(item.interpretation,"")
    }));
    const plan=(analysis.improvementPlan||[]).map(normalizePlan).slice(0,10);
    const monitoring=(analysis.monitoringPlan||[]).slice(0,8).map(item=>({
      ...item,
      timing:safePublicText(item.timing,""),
      stage:safePublicText(item.stage,"مرحلة متابعة"),
      measure:safePublicText(item.measure,""),
      owner:safePublicText(item.owner,"")
    }));
    const metrics=(analysis.metrics||[]).slice(0,14),charts=(analysis.charts||[]).slice(0,12);
    const limitations=uniqueBy(safeTextList(analysis.limitations),item=>normalize(item));
    const diagnosticSections=(analysis.diagnosticSections||[]).slice(0,12).map(item=>({
      ...item,
      title:safePublicText(item.title,"قراءة تفسيرية"),
      analysis:safePublicText(item.analysis,""),
      source:"قراءة موثقة بالأدلة",
      confidence:safePublicText(item.confidence,"متوسطة"),
      implications:safeTextList(item.implications),
      alternativeExplanations:safeTextList(item.alternativeExplanations),
      limitations:safeTextList(item.limitations),
      dataRequests:safeTextList(item.dataRequests)
    }));
    const localProfile=analysis.analysisProfile||{};
    const profile={
      purpose:safeAnalysisMethod(localProfile.method||localProfile.purpose||analysis.kind,"تحليل تربوي متخصص"),
      dataSufficiency:safePublicLabel(localProfile.dataAdequacy||localProfile.dataSufficiency||"غير محددة","غير محددة"),
      dimensions:(localProfile.dimensions||[]).map(item=>safePublicLabel(item,"بعد تحليلي")),
      decisionUse:(localProfile.decisionUse||localProfile.decisionUses||[]).map(item=>safePublicLabel(item,"استخدام تحليلي")),
      assumptions:(localProfile.assumptions||[]).map(item=>safePublicLabel(item,"افتراض تحليلي"))
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
  function chartWeight(chart){const count=Array.isArray(chart?.data)?chart.data.length:0;if(["heatmap","table"].includes(chart?.type)||chart?.id==="supervision-indicator-performance")return 2;if(chart?.type==="stacked100"&&Array.isArray(chart?.series)&&count>4)return 2;if(["bullet","dumbbell"].includes(chart?.type)&&count>8)return 2;return 1;}
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
  function chartRowContract(chart){const map={bar:"bar-row",pareto:"pareto-row",bullet:"bullet-row",dumbbell:"dumbbell-row",histogram:"hist-bin"};if(chart?.type==="stacked100"&&Array.isArray(chart?.series))return{count:Array.isArray(chart.data)?chart.data.length:0,rowClass:"stack-row"};const rowClass=map[chart?.type]||"";return{count:rowClass&&Array.isArray(chart?.data)?chart.data.length:0,rowClass};}
  function chartCard(chart,index){const wide=chartWeight(chart)>1,contract=chartRowContract(chart),rowCount=contract.count,dense=rowCount>=7;return `<article class="chart-card${wide?" chart-wide":""}${dense?" chart-dense":""}" data-chart-id="${escapeHtml(chart.id||"")}" data-chart-type="${escapeHtml(chart.type||"bar")}"${rowCount?` data-expected-rows="${rowCount}" data-row-class="${contract.rowClass}"`:""}><header><div><span>الرسم ${index}</span><h3>${escapeHtml(chart.title)}</h3></div></header><p>${escapeHtml(chart.description||"")}</p><div class="chart-body">${renderChart(chart)}</div></article>`;}
  function diagnosticCard(item,index,analysis){const alternatives=item.alternativeExplanations||[],limits=item.limitations||[],requests=item.dataRequests||[];return `<article class="diagnostic-card"><header><span>${index}</span><div><h3>${escapeHtml(item.title||"قراءة تفسيرية")}</h3><small>${escapeHtml(item.source||"تحليل متخصص")} · ثقة ${escapeHtml(item.confidence||"متوسطة")}</small></div></header><p>${escapeHtml(item.analysis||"")}</p>${item.evidenceRefs?.length?`<div class="evidence"><strong>الأدلة</strong>${escapeHtml(item.evidenceRefs.map(ref=>evidenceLabel(ref,analysis)).join("، "))}</div>`:""}${item.implications?.length?`<div class="deep-list"><h4>الآثار العملية</h4><ul>${item.implications.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}${alternatives.length?`<div class="deep-list"><h4>تفسيرات بديلة محتملة</h4><ul>${alternatives.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}${limits.length?`<div class="deep-list"><h4>حدود الاستدلال</h4><ul>${limits.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}${requests.length?`<div class="deep-list"><h4>بيانات مطلوبة للتحقق</h4><ul>${requests.map(value=>`<li>${escapeHtml(value)}</li>`).join("")}</ul></div>`:""}</article>`;}
  function findingCard(item,index){return `<article class="finding-card"><div class="finding-number">${index}</div><div><header><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.confidence||"متوسطة")}</span></header>${item.statement?`<p>${escapeHtml(item.statement)}</p>`:""}<dl><div><dt>الدليل</dt><dd>${escapeHtml(item.evidence||"")}</dd></div><div><dt>الأثر التربوي</dt><dd>${escapeHtml(item.impact||"")}</dd></div><div><dt>الإجراء المرتبط</dt><dd>${escapeHtml(item.action||"")}</dd></div>${item.limitations?.length?`<div><dt>حدود القراءة</dt><dd>${escapeHtml(item.limitations.join("، "))}</dd></div>`:""}</dl></div></article>`;}
  function toolCard(item){const name=safePublicLabel(item.name,"أداة جودة");return `<article class="tool-card"><div class="tool-state">مطبقة الآن</div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(item.reason||item.interpretation||"")}</p><strong>${escapeHtml(item.interpretation||"")}</strong></article>`;}
  function planCard(item,index){const high=normalize(item.priority).includes("عالي"),steps=item.implementationSteps||[],resources=item.resources||[];return `<article class="plan-card"><header><span class="plan-index">${index}</span><div><small>${escapeHtml(item.priority)}</small><h3>${escapeHtml(item.issue)}</h3></div><b class="priority${high?" high":""}">${escapeHtml(item.targetGroup)}</b></header><p class="plan-action">${escapeHtml(item.action)}</p>${steps.length?`<div class="implementation-steps"><span>خطوات التنفيذ</span><ol>${steps.map(step=>`<li>${escapeHtml(step)}</li>`).join("")}</ol></div>`:""}<div class="plan-grid"><div><span>المسؤول</span><strong>${escapeHtml(item.responsibleRole)}</strong></div><div><span>الإطار الزمني</span><strong>${escapeHtml(item.timeframe)}</strong></div><div><span>مؤشر النجاح</span><strong>${escapeHtml(item.successIndicator)}</strong></div><div><span>المتابعة</span><strong>${escapeHtml(item.monitoringMethod)}</strong></div></div>${resources.length?`<div class="resources"><span>الموارد</span>${escapeHtml(resources.join("، "))}</div>`:""}<div class="contingency"><span>الخطة البديلة</span>${escapeHtml(item.contingency)}</div></article>`;}
  function planCardCost(item){
    const steps=Array.isArray(item?.implementationSteps)?item.implementationSteps:[],resources=Array.isArray(item?.resources)?item.resources:[];
    const mainText=[item?.issue,item?.action,item?.successIndicator,item?.monitoringMethod,item?.contingency].filter(Boolean).join(" ");
    const stepText=steps.join(" "),resourceText=resources.join(" ");
    return 10+(steps.length*2)+Math.ceil(mainText.length/180)*2+Math.ceil(stepText.length/140)+(resourceText?1+Math.ceil(resourceText.length/180):0);
  }
  function packPlanPages(items,{capacity=72,maxCards=3}={}){
    const pages=[];let current=[],budget=0;
    (Array.isArray(items)?items:[]).forEach(item=>{
      const cost=planCardCost(item);
      if(current.length&&(current.length>=maxCards||budget+cost>capacity)){pages.push({items:current,budget});current=[];budget=0;}
      current.push(item);budget+=cost;
    });
    if(current.length)pages.push({items:current,budget});
    return pages;
  }
  function monitoringTimeline(items){return `<div class="timeline">${items.map((item,index)=>`<article><span>${index+1}</span><div><small>${escapeHtml(item.timing||"")}</small><h3>${escapeHtml(item.stage||"مرحلة متابعة")}</h3><p>${escapeHtml(item.measure||"")}</p><strong>${escapeHtml(item.owner||"")}</strong></div></article>`).join("")}</div>`;}
  function profileBlock(profile){return `<div class="analysis-profile"><div><span>منهج التحليل</span><strong>${escapeHtml(profile.purpose||"—")}</strong></div><div><span>كفاية البيانات</span><strong>${escapeHtml(profile.dataSufficiency||"—")}</strong></div><div><span>الأبعاد</span><strong>${escapeHtml((profile.dimensions||[]).join("، ")||"—")}</strong></div><div><span>الاستخدامات</span><strong>${escapeHtml((profile.decisionUse||[]).join("، ")||"—")}</strong></div></div>`;}

  function rankingTable(title,rows,columns,note=""){
    if(!Array.isArray(rows)||!rows.length)return"";
    const dense=rows.length>=22;
    return `<div class="ranking-report-block${dense?" ranking-dense":""}"><div class="ranking-report-head"><h3>${escapeHtml(title)}</h3>${note?`<span>${escapeHtml(note)}</span>`:""}</div><table class="ranking-report-table"><thead><tr>${columns.map(column=>`<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(column=>`<td>${escapeHtml(row[column.key]??"—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function splitRankingRows(rows,maxRows=38){
    const safeRows=Array.isArray(rows)?rows:[];
    if(!safeRows.length)return[];
    const chunks=[];
    for(let start=0;start<safeRows.length;start+=maxRows)chunks.push(safeRows.slice(start,start+maxRows));
    return chunks;
  }
  function rankingBlockCost(block){return (block?.rows?.length||0)+3;}
  function packRankingBlocks(blocks,{capacity=55,maxTables=3}={}){
    const bins=[];
    blocks.forEach(block=>{
      const cost=rankingBlockCost(block);
      let best=-1,bestRemaining=Infinity;
      bins.forEach((bin,index)=>{
        if(bin.blocks.length>=maxTables||bin.budget+cost>capacity)return;
        const remaining=capacity-(bin.budget+cost);
        if(remaining<bestRemaining){best=index;bestRemaining=remaining;}
      });
      if(best<0)bins.push({blocks:[block],budget:cost});
      else{bins[best].blocks.push(block);bins[best].budget+=cost;}
    });
    return bins.sort((a,b)=>Math.min(...a.blocks.map(block=>block.order))-Math.min(...b.blocks.map(block=>block.order)));
  }
  function chooseSchoolCompanion(blocks){
    const candidates=blocks.filter(block=>block.totalParts===1&&rankingBlockCost(block)<=19);
    if(!candidates.length)return null;
    let best=null;
    candidates.forEach(candidate=>{
      const remaining=blocks.filter(block=>block!==candidate);
      const bins=packRankingBlocks(remaining);
      const score=bins.length*100-rankingBlockCost(candidate);
      if(!best||score<best.score)best={candidate,score};
    });
    return best?.candidate||null;
  }
  function subjectRankingHeading(compact=false){
    return `<div class="section-heading${compact?" compact ranking-appendix-heading":""}"><span>ترتيب المادة</span><h2>العشرة الأوائل حسب الدرجة</h2><p>تظهر جميع حالات التعادل التي تقع داخل المركز العاشر، وتُقسم الجداول الطويلة تلقائيًا دون إسقاط أي اسم.</p></div>`;
  }
  function rankingPages(privateTables,options={}){
    if(!privateTables)return[];
    const combineSchoolSubject=options.combineSchoolSubject===true;
    const pages=[];
    const columns=[{key:"rankLabel",label:"المركز"},{key:"name",label:"اسم الطالب"},{key:"scoreDisplay",label:"الدرجة"},{key:"level",label:"المستوى"}];
    const blocks=[];
    let order=0;
    Object.entries(privateTables.subjectTopTen||{}).forEach(([subject,rows])=>{
      const chunks=splitRankingRows(rows,38);
      chunks.forEach((chunk,index)=>blocks.push({subject,rows:chunk,part:index+1,totalParts:chunks.length,order:order++}));
    });
    const splitBlocks=blocks.filter(block=>block.totalParts>1);
    let normalBlocks=blocks.filter(block=>block.totalParts===1);
    const companion=combineSchoolSubject&&privateTables.schoolTopTen?.length?chooseSchoolCompanion(normalBlocks):null;
    if(companion)normalBlocks=normalBlocks.filter(block=>block!==companion);

    if(privateTables.schoolTopTen?.length){
      const companionHtml=companion?`<div class="ranking-companion"><div class="ranking-companion-title"><span>ملحق الأوائل حسب المادة</span><strong>${escapeHtml(companion.subject)}</strong></div><div class="ranking-stack ranking-stack-1 ranking-stack-companion">${rankingTable(companion.subject,companion.rows,columns)}</div></div>`:"";
      pages.push({kind:"school-ranking",section:companion?"الأوائل العام وبداية ترتيب المواد":"الأوائل على مستوى المدرسة / الدفعة",content:`<div class="section-heading"><span>ترتيب محلي محمي</span><h2>العشرة الأوائل على مستوى المدرسة / الدفعة</h2><p>${escapeHtml(privateTables.rankingFormulaLabel||"")}</p></div>${rankingTable("الترتيب العام",privateTables.schoolTopTen,[{key:"rankLabel",label:"المركز"},{key:"name",label:"اسم الطالب"},{key:"coreMeanDisplay",label:"متوسط الأساسية"},{key:"allMeanDisplay",label:"متوسط جميع المواد"},{key:"rankingScoreDisplay",label:"درجة الترتيب"}])}${privateTables.incompleteRankingCount?`<div class="report-note">غير مكتمل للترتيب: ${privateTables.incompleteRankingCount} سجلًا بسبب نقص مادة أساسية.</div>`:""}${companionHtml}`});
    }

    splitBlocks.forEach(block=>{
      pages.push({kind:"subject-ranking",section:"الأوائل حسب المادة",content:`${subjectRankingHeading()}<div class="ranking-stack ranking-stack-1 ranking-stack-split">${rankingTable(`${block.subject} - متابعة ${block.part}/${block.totalParts}`,block.rows,columns,`الجزء ${block.part} من ${block.totalParts}`)}</div>`});
    });

    packRankingBlocks(normalBlocks).forEach(bin=>{
      const group=bin.blocks;
      const packed=bin.budget>=50?" ranking-stack-packed":"";
      pages.push({kind:"subject-ranking",section:"الأوائل حسب المادة",content:`${subjectRankingHeading()}<div class="ranking-stack ranking-stack-${group.length}${packed}" data-ranking-budget="${bin.budget}">${group.map(block=>rankingTable(block.subject,block.rows,columns)).join("")}</div>`});
    });
    return pages;
  }

  function pageShell(content,{section,pageNo,totalPages,reportMode,packable=false}){
    const modeLabel=reportMode==="executive"?"تقرير تنفيذي مختصر":"تقرير تحليلي كامل";
    return `<section class="report-sheet" data-packable="${packable?"1":"0"}" data-section="${escapeHtml(section)}"><div class="report-page"><header class="page-head"><div class="page-brand"><div class="mini-logo">ت</div><div><strong>تقارير</strong><span>منصة التحليل التربوي والبيانات التعليمية</span></div></div><div class="page-section"><small>${escapeHtml(section)}</small></div></header><div class="page-content">${content}</div><footer class="page-footer"><span>تقارير v${VERSION} - ${modeLabel} قابل للمراجعة</span><strong>صفحة ${pageNo} من ${totalPages}</strong></footer></div></section>`;
  }

  function validateChartContract(data){
    const charts=Array.isArray(data.charts)?data.charts:[],expectedN=Number(data.analysis?.n||0);
    charts.forEach(chart=>{
      const rows=Array.isArray(chart.data)?chart.data:[];
      if(["bar","histogram","pareto"].includes(chart.type)&&rows.length>20) throw new Error(`الرسم ${chart.title||chart.id||"الشريطي"} يتجاوز حد 20 فئة ويجب تقسيمه.`);
      if(["score-histogram","intervention-segments"].includes(chart.id)&&expectedN>0){
        const sum=rows.reduce((total,item)=>total+Number(item.count||0),0);
        if(sum!==expectedN) throw new Error(`فشل عقد اكتمال الرسم ${chart.title}: مجموع الفئات ${sum} لا يساوي السجلات الصالحة ${expectedN}.`);
      }
    });
  }

  function buildReportHtml(context,options={}){
    const data=buildReportData(context),analysis=data.analysis,meta=data.meta,autoPrint=options.autoPrint===true,reportMode=options.reportMode==="executive"?"executive":"full",metricGroups=selectMetricGroups(data),title=reportTitle(data,context),subtitle=clampText(meta.title||context.sourceName,240);
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
    let compactSupplementalChart=null;
    if(advancedChartSplit.restPages.length===1&&advancedChartSplit.restPages[0].length===1){
      const candidate=advancedChartSplit.restPages[0][0],candidateRows=Array.isArray(candidate?.data)?candidate.data.length:0;
      if(chartWeight(candidate)===1&&candidateRows<=6){compactSupplementalChart=candidate;advancedChartSplit.restPages.length=0;}
    }

    const metaHtml=`<div class="meta-grid"><div><span>نوع الاستمارة</span><strong>${escapeHtml(context.type?.name||"—")}</strong></div><div><span>المدرسة</span><strong>${escapeHtml(meta.school||"غير محددة في الملف")}</strong></div><div><span>المادة</span><strong>${escapeHtml(meta.subject||"غير محددة")}</strong></div><div><span>الصف / الفئة</span><strong>${escapeHtml(meta.grade||"غير محدد")}</strong></div><div><span>العام / الفترة</span><strong>${escapeHtml([meta.academicYear,meta.period].filter(Boolean).join(" - ")||"غير محدد")}</strong></div><div><span>مصدر البيانات</span><strong>${escapeHtml(meta.sourceName)}</strong></div></div>`;
    const primaryRowCount=primaryCharts.reduce((sum,chart)=>sum+(chart.type==="bar"&&Array.isArray(chart.data)?chart.data.length:0),0);
    const exec=`<div class="executive-page-layout${primaryRowCount>=12?" executive-dense-charts":""}"><div class="report-title"><div><span>التقرير التحليلي الرسمي</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="report-date"><small>تاريخ التقرير</small><strong>${escapeHtml(formatDate(data.generatedAt))}</strong></div></div>${metaHtml}<div class="section-heading"><div><span>01</span><h2>الملخص التنفيذي</h2></div><p>القراءة العليا للقرار قبل الانتقال إلى الطبقات الإحصائية والتشخيصية.</p></div><div class="executive-grid"><article class="executive-summary"><small>الحكم التنفيذي</small><h2>${escapeHtml(analysis.executiveTitle||title)}</h2><p>${escapeHtml(analysis.executiveSummary||"")}</p></article><article class="analysis-status"><small>حالة التحليل</small><strong>${data.aiUsed?"تحليل تربوي موثق":"تحليل غير مكتمل"}</strong><p>${escapeHtml(data.profile.dataSufficiency||"كفاية البيانات غير محددة")}</p></article></div><div class="metric-grid core-metrics">${metricGroups.core.map(metricCard).join("")}</div>${primaryCharts.length?`<div class="chart-grid primary-charts">${primaryCharts.map((chart,i)=>chartCard(chart,i+1)).join("")}</div>`:""}</div>`;
    pages.push({section:"الملخص التنفيذي",content:exec});

    if(metricGroups.advanced.length||advancedChartSplit.first.length||advancedChartSplit.restPages.length){
      const firstAdvancedBody=`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>التحليل الإحصائي والبصري المتقدم</h2></div><p>مؤشرات التشتت والشكل والحساسية تفسر ما يخفيه المتوسط العام.</p></div>${metricGroups.advanced.length?`<div class="metric-grid advanced-metrics">${metricGroups.advanced.map(metricCard).join("")}</div>`:""}${profileBlock(data.profile)}${advancedChartSplit.first.length?`<div class="chart-grid analytical-charts">${advancedChartSplit.first.map((chart,i)=>chartCard(chart,primaryCharts.length+i+1)).join("")}</div>`:""}`;
      pages.push({section:"التحليل المتقدم",packable:true,content:firstAdvancedBody});
      advancedChartSplit.restPages.forEach((group,pageIndex)=>pages.push({section:"الرسوم المتخصصة",packable:true,content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>التحليل البصري المتخصص</h2></div><p>رسوم إضافية اختيرت وفق طبيعة الاستمارة والقرار المطلوب.</p></div><div class="chart-grid analytical-charts">${group.map((chart,i)=>chartCard(chart,primaryCharts.length+advancedChartSplit.first.length+pageIndex*3+i+1)).join("")}</div>`}));
    }

    const diagnosticCapacity=data.aiUsed?3:4;
    const diagnosticGroups=chunkBalanced(data.diagnosticSections,diagnosticCapacity);
    if(compactSupplementalChart&&!diagnosticGroups.length){
      pages.push({section:"التحليل البصري المكمل",packable:true,content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>مؤشر بصري مكمل</h2></div><p>مؤشر قصير مكمّل للقراءة الإحصائية دون إنشاء صفحة فارغة حوله.</p></div><div class="supplemental-analysis">${chartCard(compactSupplementalChart,primaryCharts.length+advancedChartSplit.first.length+1)}</div>`});
    }
    diagnosticGroups.forEach((group,groupIndex)=>{
      const start=groupIndex*diagnosticCapacity;
      const supplemental=groupIndex===0&&compactSupplementalChart?`<div class="supplemental-analysis"><div class="mini-section-title"><span>مؤشر بصري مكمل</span><small>استكمال موجز للرسوم قبل القراءة التفسيرية</small></div>${chartCard(compactSupplementalChart,primaryCharts.length+advancedChartSplit.first.length+1)}</div>`:"";
      pages.push({section:"القراءة التفسيرية",packable:true,content:`${supplemental}<div class="section-heading${supplemental?" compact-after-supplement":""}"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>القراءة التفسيرية المتخصصة</h2></div><p>تفسير تربوي يربط المؤشرات بالدلالة والاستخدام والحدود.</p></div><div class="diagnostic-grid${supplemental?" diagnostic-grid-compact":""}">${group.map((item,i)=>diagnosticCard(item,start+i+1,analysis)).join("")}</div>`});
    });

    chunkBalanced(data.findings,6).forEach((group,groupIndex)=>{
      const start=data.findings.slice(0,groupIndex===0?0:chunkBalanced(data.findings,6).slice(0,groupIndex).reduce((s,g)=>s+g.length,0)).length;
      pages.push({section:"الاستنتاجات التشخيصية",packable:true,content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>الاستنتاجات التشخيصية</h2></div><p>لكل استنتاج دليل وأثر وإجراء مرتبط، دون تحويل الاحتمال إلى حقيقة.</p></div><div class="findings-grid">${group.map((item,i)=>findingCard(item,start+i+1)).join("")}</div>`});
    });

    if(data.plan.length){
      const planPages=packPlanPages(data.plan);
      let renderedPlans=0;
      planPages.forEach(({items:group,budget})=>{
        const count=group.length,layoutClass=` plan-cards-${count}${budget>=58?" plan-cards-dense":""}`;
        pages.push({section:"خطة التحسين والتدخل",packable:true,content:`<div class="section-heading"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>خطة التحسين والتدخل</h2></div><p>تدخلات متمايزة بخط أساس ومستهدف ومسؤول وزمن وخطة بديلة.</p></div><div class="plan-cards${layoutClass}" data-plan-budget="${budget}">${group.map((item,i)=>planCard(item,renderedPlans+i+1)).join("")}</div>`});
        renderedPlans+=group.length;
      });
    }

    const governance=[];
    if(data.tools.length)governance.push(`<div class="section-heading compact"><div><span>${String(pages.length+1).padStart(2,"0")}</span><h2>أدوات الجودة المطبقة</h2></div><p>الأداة تظهر لأنها أضافت تفسيرًا أو قرارًا فعليًا.</p></div><div class="tools-grid">${data.tools.map(toolCard).join("")}</div>`);
    if(data.monitoring.length)governance.push(`<div class="section-heading spaced"><div><span>↻</span><h2>خطة المتابعة وإعادة القياس</h2></div><p>دورة متابعة توضح متى نقيس، وماذا نقيس، ومن يملك القرار.</p></div>${monitoringTimeline(data.monitoring)}`);
    if(data.limitations.length)governance.push(`<div class="governance-grid"><article><h3>حدود التحليل</h3><ul>${data.limitations.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article><article><h3>ضوابط الاعتماد</h3><ul><li>تراجع الاستنتاجات منخفضة الثقة قبل الاعتماد.</li><li>تربط الخطط بمؤشرات قياس محددة ومواعيد متابعة.</li><li>لا تعمم النتائج خارج نطاق البيانات المرفوعة.</li></ul></article></div>`);
    governance.push(`<div class="approval"><div>إعداد التقرير</div><div>المراجعة والاعتماد</div><div>تاريخ المتابعة</div></div>`);
    pages.push({section:"المتابعة والحوكمة",packable:true,content:governance.join("")});

    pages.push(...rankingPages(data.privateTables,{combineSchoolSubject:reportMode==="full"&&analysis.scopeContext?.analysisMode!=="subject"}));
    let outputPages=pages;
    if(reportMode==="executive"){
      const firstSections=new Set();
      const allowedSections=new Set(["الملخص التنفيذي","التحليل المتقدم","القراءة التفسيرية","الاستنتاجات التشخيصية","خطة التحسين والتدخل","المتابعة والحوكمة"]);
      const subjectOnly=analysis.scopeContext?.analysisMode==="subject";
      outputPages=pages.filter(page=>{
        if(page.kind==="school-ranking")return !subjectOnly;
        if(page.kind==="subject-ranking")return subjectOnly;
        if(!allowedSections.has(page.section)||firstSections.has(page.section))return false;
        firstSections.add(page.section);
        return true;
      });
    }
    const total=outputPages.length;
    const body=outputPages.map((page,index)=>pageShell(page.content,{section:page.section,pageNo:index+1,totalPages:total,reportMode,packable:Boolean(page.packable)})).join("");
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
      :root{--navy:#142d5e;--royal:#244b98;--teal:#16877e;--teal-soft:#eaf6f4;--gold:#b88828;--ink:#16233d;--muted:#627088;--line:#d9e0ea;--soft:#f5f7fa;--danger:#9e3c34;--danger-soft:#fbebe8;--white:#fff}
      *{box-sizing:border-box}html,body{margin:0;background:#edf1f6;color:var(--ink);font-family:Tahoma,"Segoe UI",Arial,sans-serif}body{padding:18px}.toolbar{position:sticky;top:8px;z-index:10;display:flex;gap:8px;justify-content:center;margin-bottom:14px}.toolbar button{border:0;border-radius:9px;padding:10px 18px;font-weight:800;cursor:pointer}.toolbar .print{background:var(--navy);color:#fff}.toolbar .close{background:#fff;color:var(--navy);border:1px solid var(--line)}.report-mode-badge{display:inline-flex;align-items:center;padding:8px 12px;border-radius:9px;background:#eaf6f4;color:var(--teal);font-size:8pt;font-weight:900;border:1px solid #c9e7e2}.report-print-hint{display:inline-flex;align-items:center;padding:8px 10px;border-radius:9px;background:#fff8e9;color:#735412;font-size:7.2pt;border:1px solid #ead9ab}.report-sheet{position:relative;width:210mm;height:297mm;margin:0 auto 14px;background:#fff;box-shadow:0 10px 30px rgba(20,45,94,.10);overflow:hidden;break-after:page;page-break-after:always}.report-sheet:last-of-type{break-after:auto;page-break-after:auto}.report-page{position:relative;top:auto;left:auto;width:210mm;height:297mm;padding:10mm 13mm 9mm;background:#fff;display:flex;flex-direction:column;overflow:hidden;transform:none;transform-origin:top center}.page-head{height:14mm;display:flex;align-items:center;justify-content:space-between;border-bottom:1.6px solid var(--navy);padding-bottom:3mm;flex:none}.page-brand{display:flex;gap:2.5mm;align-items:center}.mini-logo{width:9mm;height:9mm;display:grid;place-items:center;background:var(--navy);color:#fff;border-radius:2.2mm;font-weight:900;font-size:14px}.page-brand strong{display:block;font-size:10.5pt;color:var(--navy)}.page-brand span,.page-section small{display:block;font-size:7.2pt;color:var(--muted)}.page-section{text-align:left;direction:rtl;max-width:72mm}.page-section small{font-size:7.6pt;color:var(--navy);font-weight:800;line-height:1.35}.page-content{flex:1;min-height:0;padding-top:5mm}.page-footer{height:7mm;margin-top:auto;padding-top:2mm;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:7pt;color:var(--muted);flex:none}.report-title{display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:start}.report-title>div:first-child span{font-size:8pt;color:var(--teal);font-weight:800}.report-title h1{font-size:19pt;line-height:1.35;margin:1.5mm 0;color:var(--navy)}.report-title p{margin:0;color:var(--muted);font-size:8.2pt;line-height:1.55}.report-date{text-align:left;min-width:37mm;border-right:3px solid var(--teal);padding-right:3mm}.report-date small{display:block;font-size:6.7pt;color:var(--muted);font-weight:800}.report-date strong{display:block;margin-top:1mm;font-size:7.3pt;color:var(--navy);line-height:1.35}.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);margin-top:4mm}.meta-grid div{padding:2.5mm 3mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line);min-height:15mm}.meta-grid div:nth-child(3n){border-left:0}.meta-grid div:nth-last-child(-n+3){border-bottom:0}.meta-grid span,.analysis-profile span,.plan-grid span,.contingency span{display:block;color:var(--muted);font-size:7pt}.meta-grid strong{display:block;margin-top:1.2mm;font-size:8.5pt;line-height:1.35;color:var(--ink)}.section-heading{display:flex;justify-content:space-between;gap:5mm;align-items:flex-end;border-bottom:2px solid var(--navy);padding-bottom:2mm;margin:4mm 0}.section-heading.compact{margin-top:0}.section-heading.spaced{margin-top:5mm}.section-heading>div{display:flex;align-items:center;gap:2.5mm}.section-heading span{display:grid;place-items:center;width:8mm;height:8mm;background:var(--navy);color:#fff;border-radius:50%;font-size:7pt;font-weight:900}.section-heading h2{margin:0;font-size:14pt;color:var(--navy)}.section-heading p{margin:0;max-width:90mm;text-align:left;font-size:7.4pt;color:var(--muted)}.executive-grid{display:grid;grid-template-columns:1fr 44mm;gap:4mm}.executive-summary{border:1px solid var(--line);border-right:4px solid var(--royal);padding:4mm}.executive-summary small,.analysis-status small{font-size:7pt;color:var(--gold);font-weight:800}.executive-summary h2{margin:1.5mm 0;font-size:13pt;color:var(--navy)}.executive-summary p{margin:0;font-size:9pt;line-height:1.65;color:#33415a}.analysis-status{padding:4mm;background:var(--teal-soft);border:1px solid #cde9e4}.analysis-status strong{display:block;margin:2mm 0;color:var(--teal);font-size:11pt}.analysis-status p{font-size:8pt;line-height:1.55;color:#3e5a59}.metric-grid{display:grid;gap:3mm;margin-top:4mm}.core-metrics{grid-template-columns:repeat(3,1fr)}.advanced-metrics{grid-template-columns:repeat(4,1fr)}.metric-card{min-height:24mm;border:1px solid var(--line);border-top:3px solid var(--royal);padding:3mm;background:#fff}.metric-card span{display:block;font-size:7pt;color:var(--muted)}.metric-card strong{display:block;margin:1.2mm 0;font-size:16pt;color:var(--navy)}.metric-card small{display:block;font-size:7pt;color:var(--teal);line-height:1.35}.analysis-profile{display:grid;grid-template-columns:1fr 1fr;margin:4mm 0;border:1px solid var(--line);background:var(--soft)}.analysis-profile div{padding:3mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line)}.analysis-profile div:nth-child(2n){border-left:0}.analysis-profile div:nth-last-child(-n+2){border-bottom:0}.analysis-profile strong{display:block;margin-top:1mm;font-size:8pt;line-height:1.55}.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:4mm}.chart-card{border:1px solid var(--line);padding:3.5mm;min-height:77mm;display:flex;flex-direction:column}.chart-card.chart-wide{grid-column:1/-1;min-height:145mm}.chart-grid>.chart-card:only-child{grid-column:1/-1;min-height:120mm}.chart-grid>.chart-wide+.chart-card:last-child{grid-column:1/-1;min-height:62mm}.chart-card header{display:flex;justify-content:space-between}.chart-card header span{font-size:7pt;color:var(--teal);font-weight:800}.chart-card h3{margin:1mm 0 0;font-size:11pt;color:var(--navy)}.chart-card>p{margin:1.5mm 0 2.5mm;font-size:7.4pt;line-height:1.45;color:var(--muted)}.chart-body{flex:1;display:flex;align-items:center}.bar-chart{width:100%}.bar-row{display:grid;grid-template-columns:30mm 1fr 25mm;gap:2mm;align-items:center;margin:2mm 0}.bar-label{font-size:7.5pt;font-weight:700;line-height:1.25}.bar-track{height:7px;background:#e7ebf1;overflow:hidden}.bar-track i{display:block;height:100%;background:linear-gradient(90deg,var(--royal),var(--teal))}.bar-row strong{font-size:7.3pt;text-align:left;direction:rtl}.bar-row em{font-style:normal;color:var(--teal);font-size:6.7pt}.hist-chart{display:flex;align-items:end;gap:1.5mm;width:100%;min-height:48mm}.hist-bin{display:grid;grid-template-rows:auto 34mm auto;gap:1mm;align-items:end;min-width:9mm;flex:1;text-align:center}.hist-bin strong{font-size:6.8pt;color:var(--navy)}.hist-column{height:34mm;display:flex;align-items:end;justify-content:center;border-bottom:1px solid var(--line)}.hist-column i{display:block;width:72%;min-height:1mm;background:linear-gradient(180deg,var(--royal),var(--teal));border-radius:2mm 2mm 0 0}.hist-bin small{font-size:6pt;line-height:1.15;color:var(--muted)}.stack-single,.stack-list{display:grid;gap:2mm;width:100%}.stack-row{display:grid;grid-template-columns:28mm 1fr;gap:1.5mm 2mm;align-items:center}.stack-row>strong{font-size:7pt}.stack-row>small{grid-column:1/-1;font-size:5.8pt;color:var(--muted)}.stack-track{display:flex;width:100%;height:5mm;border-radius:4mm;background:#edf1f6;overflow:hidden;direction:rtl}.stack-segment{display:block;height:100%}.stack-legend{display:flex;flex-wrap:wrap;gap:1.3mm 3mm;margin-top:2mm}.stack-legend span{display:inline-flex;align-items:center;gap:1mm;font-size:6.2pt;color:#44516a}.stack-legend i{width:2.3mm;height:2.3mm;border-radius:50%}.seg-0{background:#244796}.seg-1{background:#16877e}.seg-2{background:#5c75bb}.seg-3{background:#53a99f}.seg-4{background:#9da9c9}.seg-5{background:#8ccbc4}.bullet-list,.dumbbell-list,.pareto-list{display:grid;gap:1.8mm;width:100%}.bullet-row,.dumbbell-row,.pareto-row{display:grid;grid-template-columns:30mm 1fr 24mm;gap:2mm;align-items:center}.bullet-row>span,.dumbbell-row>span,.pareto-row>span{font-size:6.8pt;font-weight:700;line-height:1.2}.bullet-row>strong,.dumbbell-row>strong,.pareto-row>strong{font-size:6.3pt;text-align:left}.bullet-track,.dumbbell-track,.pareto-track{position:relative;height:3.2mm;border-radius:3mm;background:#e9edf4}.bullet-track i,.pareto-track i{position:absolute;right:0;top:0;bottom:0;border-radius:3mm;background:linear-gradient(90deg,var(--royal),var(--teal))}.bullet-track b{position:absolute;top:-1mm;bottom:-1mm;width:.7mm;background:#b07a17}.dumbbell-track i{position:absolute;top:1.5mm;height:.5mm;background:#8493ad}.dumbbell-track b{position:absolute;top:.5mm;width:2.4mm;height:2.4mm;border-radius:50%}.dumbbell-track .before{background:var(--royal)}.dumbbell-track .after{background:var(--teal)}.pareto-row em{font-style:normal;color:var(--teal);margin-right:1mm}.scatter-svg{width:100%;height:auto;max-height:55mm}.chart-dense .chart-body,.chart-wide .chart-body{align-items:flex-start}.chart-dense .bar-row{margin:.75mm 0;grid-template-columns:27mm 1fr 25mm}.chart-dense .bar-label{font-size:7pt;line-height:1.12}.chart-dense .bar-track{height:6px}.chart-dense .bar-row strong{font-size:6.9pt}.executive-dense-charts .report-title h1{font-size:17pt;margin:1mm 0}.executive-dense-charts .report-title p{font-size:7.7pt;line-height:1.4}.executive-dense-charts .meta-grid{margin-top:2.5mm}.executive-dense-charts .meta-grid div{padding:1.8mm 2.4mm;min-height:12.5mm}.executive-dense-charts .meta-grid strong{margin-top:.7mm;font-size:8pt}.executive-dense-charts .section-heading{margin:2.7mm 0;padding-bottom:1.5mm}.executive-dense-charts .section-heading h2{font-size:13pt}.executive-dense-charts .executive-grid{gap:3mm}.executive-dense-charts .executive-summary,.executive-dense-charts .analysis-status{padding:2.8mm}.executive-dense-charts .executive-summary h2{font-size:11.7pt;margin:1mm 0}.executive-dense-charts .executive-summary p{font-size:8.2pt;line-height:1.48}.executive-dense-charts .analysis-status strong{font-size:10pt;margin:1.2mm 0}.executive-dense-charts .analysis-status p{font-size:7.3pt;line-height:1.35;margin:0}.executive-dense-charts .metric-grid{gap:2mm;margin-top:2.6mm}.executive-dense-charts .metric-card{min-height:19mm;padding:2mm}.executive-dense-charts .metric-card strong{font-size:13.5pt;margin:.6mm 0}.executive-dense-charts .metric-card small{font-size:6.6pt}.executive-dense-charts .chart-grid{gap:3mm;margin-top:2.8mm}.executive-dense-charts .chart-card{min-height:66mm;padding:2.5mm}.executive-dense-charts .chart-card h3{font-size:10.3pt;margin:.5mm 0 0}.executive-dense-charts .chart-card>p{font-size:6.8pt;line-height:1.25;margin:.8mm 0 1.2mm}.executive-dense-charts .chart-body{align-items:flex-start}.supplemental-analysis{margin:0 0 3mm;padding:2.5mm;border:1px solid var(--line);background:#fbfcfe}.supplemental-analysis .mini-section-title{display:flex;justify-content:space-between;gap:3mm;align-items:center;margin-bottom:1.5mm}.supplemental-analysis .mini-section-title span{font-size:8pt;font-weight:900;color:var(--navy)}.supplemental-analysis .mini-section-title small{font-size:6.7pt;color:var(--muted)}.supplemental-analysis .chart-card{min-height:46mm;padding:2.5mm}.supplemental-analysis .chart-card>p{margin:.7mm 0 1.2mm}.supplemental-analysis .bar-row{margin:.55mm 0}.section-heading.compact-after-supplement{margin-top:2mm}.diagnostic-grid-compact .diagnostic-card{min-height:82mm;padding:3mm}.diagnostic-grid-compact .diagnostic-card>p{font-size:8pt;line-height:1.55}.diagnostic-grid-compact .diagnostic-card li{font-size:7.5pt;line-height:1.45}.diagnostic-grid-compact .deep-list{margin-top:1.2mm;padding-top:1mm}.line-svg,.radar-svg,.box-svg{width:100%;height:auto;max-height:60mm}.axis{stroke:#c8d0dd;stroke-width:1}.series{fill:none;stroke:var(--royal);stroke-width:3}.point{fill:var(--teal)}svg text{font-size:9px;fill:#43506a}.value-label{font-size:10px;font-weight:700;fill:var(--navy)}.radar-grid{fill:none;stroke:#cbd2df}.radar-value{fill:rgba(36,75,152,.18);stroke:var(--royal);stroke-width:2}.box{fill:rgba(22,135,126,.18);stroke:var(--teal);stroke-width:2}.median,.cap{stroke:var(--royal);stroke-width:3}.chart-note{margin:1mm 0 0;font-size:7.3pt;color:var(--muted)}.heat-table,.data-table{width:100%;border-collapse:collapse;font-size:7.2pt}.heat-table th,.heat-table td,.data-table th,.data-table td{padding:2mm;border:1px solid var(--line);text-align:center}.heat-table th:first-child,.data-table th,.data-table td{text-align:right}.heat-0{background:#f7f8fa}.heat-1{background:#eaf3f1}.heat-2{background:#d0e8e4}.heat-3{background:#99cec7}.heat-4{background:#4ca49b;color:#fff}.heat-5{background:#176f69;color:#fff}.diagnostic-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.diagnostic-grid>.diagnostic-card:last-child:nth-child(odd){grid-column:1/-1;min-height:62mm}.diagnostic-card{border:1px solid var(--line);border-right:4px solid var(--royal);padding:4mm;min-height:105mm}.diagnostic-card header{display:flex;gap:3mm;align-items:start}.diagnostic-card header>span{display:grid;place-items:center;width:8mm;height:8mm;background:var(--navy);color:#fff;font-weight:900;font-size:8pt}.diagnostic-card h3{margin:0;font-size:11pt;color:var(--navy)}.diagnostic-card small{display:block;margin-top:1mm;font-size:7pt;color:var(--teal)}.diagnostic-card>p{font-size:8.5pt;line-height:1.75;color:#35435c}.evidence{padding:2.5mm;background:var(--soft);font-size:7.7pt;line-height:1.55}.evidence strong{color:var(--gold);margin-left:2mm}.diagnostic-card ul{padding-right:5mm;margin:3mm 0 0}.diagnostic-card li{font-size:8pt;line-height:1.6;margin-bottom:1.5mm}.deep-list{border-top:1px solid #edf0f4;margin-top:2mm;padding-top:1.5mm}.deep-list h4{font-size:7.2pt;color:var(--gold);margin:0 0 1mm}.deep-list ul{margin:0;padding-right:5mm}.findings-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.findings-grid>.finding-card:last-child:nth-child(odd){grid-column:1/-1;min-height:58mm}.finding-card{display:grid;grid-template-columns:9mm 1fr;border:1px solid var(--line);min-height:73mm}.finding-number{display:grid;place-items:center;background:var(--navy);color:#fff;font-size:13pt;font-weight:900}.finding-card>div:last-child{padding:3.5mm}.finding-card header{display:flex;justify-content:space-between;gap:3mm}.finding-card h3{margin:0;font-size:10.5pt;color:var(--navy)}.finding-card header span{flex:none;padding:1mm 2mm;background:var(--teal-soft);color:var(--teal);font-size:7pt;font-weight:800}.finding-card>div>p{margin:2mm 0;font-size:8pt;line-height:1.55;color:#3b4860}.finding-card dl{margin:0}.finding-card dl div{border-top:1px solid #edf0f4;padding-top:1.5mm;margin-top:1.5mm}.finding-card dt{font-size:7pt;color:var(--gold);font-weight:900}.finding-card dd{margin:.8mm 0 0;font-size:7.6pt;line-height:1.5;color:#435069}.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.tools-grid>.tool-card:only-child{grid-column:1/-1;min-height:28mm}.tools-grid:has(.tool-card:nth-child(2):last-child){grid-template-columns:repeat(2,1fr)}.tool-card{border:1px solid var(--line);border-right:4px solid var(--teal);padding:3mm;min-height:33mm}.tool-state{font-size:6.6pt;color:var(--teal);font-weight:900}.tool-card h3{font-size:9.5pt;color:var(--navy);margin:1mm 0}.tool-card p{font-size:7.2pt;line-height:1.45;color:#4b576d;margin:0}.tool-card strong{display:block;margin-top:1.5mm;color:var(--teal);font-size:7pt}.plan-cards{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.plan-cards-1{grid-template-columns:1fr}.plan-card{border:1px solid var(--line);padding:3.5mm;min-height:109mm;break-inside:avoid}.plan-cards-1 .plan-card{min-height:0}.plan-cards-3{gap:3mm}.plan-cards-3 .plan-card{min-height:96mm;padding:3mm}.plan-cards-3 .plan-card:nth-child(3){grid-column:1/-1;min-height:0}.plan-cards-3 .plan-card:nth-child(3) .plan-action{margin:1.8mm 0}.plan-cards-3 .plan-card:nth-child(3) .implementation-steps{margin:1.5mm 0}.plan-cards-3 .plan-card:nth-child(3) .implementation-steps ol{columns:2;column-gap:8mm}.plan-cards-3 .plan-card:nth-child(3) .plan-grid{grid-template-columns:repeat(4,1fr)}.plan-cards-3 .plan-card:nth-child(3) .plan-grid div{border-left:1px solid var(--line);border-bottom:0}.plan-cards-3 .plan-card:nth-child(3) .plan-grid div:last-child{border-left:0}.plan-cards-dense .plan-card{padding:2.6mm}.plan-cards-dense .plan-action{font-size:7.9pt;line-height:1.5;margin:2mm 0}.plan-cards-dense .implementation-steps,.plan-cards-dense .resources,.plan-cards-dense .contingency{font-size:6.9pt;line-height:1.35}.plan-card header{display:grid;grid-template-columns:8mm 1fr auto;gap:2.5mm;align-items:start}.plan-index{display:grid;place-items:center;width:8mm;height:8mm;background:var(--navy);color:#fff;font-weight:900}.plan-card header small{font-size:7pt;color:var(--gold);font-weight:900}.plan-card h3{margin:1mm 0;font-size:10.5pt;color:var(--navy)}.priority{max-width:35mm;padding:1mm 1.5mm;background:#fff1cb;color:#7a5917;font-size:6.6pt;font-weight:900;line-height:1.3}.priority.high{background:var(--danger-soft);color:var(--danger)}.plan-action{font-size:8.3pt;line-height:1.65;margin:3mm 0;color:#35435b}.plan-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line)}.plan-grid div{padding:2.2mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line)}.plan-grid div:nth-child(2n){border-left:0}.plan-grid div:nth-last-child(-n+2){border-bottom:0}.plan-grid strong{display:block;margin-top:1mm;font-size:7.3pt;line-height:1.4}.implementation-steps,.resources{margin:2mm 0;padding:2mm;background:#f7f9fb;font-size:7.2pt;line-height:1.45}.implementation-steps>span,.resources>span,.contingency>span{display:block;color:var(--gold);font-weight:900;margin-bottom:1mm}.implementation-steps ol{margin:0;padding-right:5mm}.implementation-steps li{margin-bottom:.8mm}.contingency{margin-top:2.5mm;padding:2mm;background:var(--soft);font-size:7.2pt;line-height:1.45}.timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.timeline article{display:flex;gap:2mm;border:1px solid var(--line);border-top:4px solid var(--royal);padding:3mm;min-height:48mm}.timeline article>span{display:grid;place-items:center;flex:none;width:7mm;height:7mm;background:var(--navy);color:#fff;font-size:7pt;font-weight:900}.timeline small{font-size:6.8pt;color:var(--teal);font-weight:800}.timeline h3{margin:1mm 0;font-size:9.5pt;color:var(--navy)}.timeline p{margin:0;font-size:7.2pt;line-height:1.5;color:#455269}.timeline strong{display:block;margin-top:1.5mm;font-size:7pt}.governance-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:5mm}.governance-grid article{border:1px solid var(--line);padding:4mm;min-height:62mm}.governance-grid h3{margin:0 0 2mm;font-size:11pt;color:var(--navy)}.governance-grid ul{padding-right:5mm}.governance-grid li{font-size:8.2pt;line-height:1.65;margin-bottom:2mm}.approval{display:grid;grid-template-columns:repeat(3,1fr);gap:9mm;margin-top:8mm}.approval div{padding-top:7mm;border-top:1px solid #6e7b91;text-align:center;color:var(--muted);font-size:8pt}
.report-sheet-flow-packed .section-heading{margin-top:2mm;margin-bottom:2mm}.report-sheet-flow-packed.cross-section-bridge .page-content{padding-top:4mm}.report-sheet-flow-packed.cross-section-bridge .section-heading{margin-top:1.2mm;margin-bottom:1.2mm;padding-bottom:1.4mm}.report-sheet-flow-packed.cross-section-bridge .section-heading.spaced{margin-top:2.4mm}.report-sheet-flow-packed.cross-section-bridge .chart-card{padding:2.5mm}.report-sheet-flow-packed.cross-section-bridge .analytical-charts:not(:has(.chart-wide)) .chart-card{min-height:76mm}.report-sheet-flow-packed.cross-section-bridge .flow-fragment.chart-grid>.chart-card:only-child{min-height:76mm}.report-sheet-flow-packed.cross-section-bridge .diagnostic-card{padding:2.5mm}.report-sheet-flow-packed.cross-section-bridge .finding-card>div:last-child{padding:2.3mm}.report-sheet-flow-packed.cross-section-bridge .plan-card{padding:2.4mm}.report-sheet-flow-packed.cross-section-bridge .implementation-steps,.report-sheet-flow-packed.cross-section-bridge .resources,.report-sheet-flow-packed.cross-section-bridge .contingency{margin:1mm 0;padding:1.2mm}.report-sheet-flow-packed.cross-section-bridge .plan-grid div{padding:1.4mm}.report-sheet-flow-packed.cross-section-bridge .tools-grid,.report-sheet-flow-packed.cross-section-bridge .timeline,.report-sheet-flow-packed.cross-section-bridge .governance-grid{gap:2.2mm}.report-sheet-flow-packed .diagnostic-card,.report-sheet-flow-packed .finding-card,.report-sheet-flow-packed .plan-card,.report-sheet-flow-packed .governance-grid article{min-height:0}.report-sheet-flow-packed .diagnostic-grid>.diagnostic-card:last-child:nth-child(odd),.report-sheet-flow-packed .findings-grid>.finding-card:last-child:nth-child(odd){min-height:0}.report-sheet-flow-packed .finding-card>div:last-child{padding:2.8mm}.report-sheet-flow-packed .finding-card>div>p{margin:1.3mm 0;line-height:1.4}.report-sheet-flow-packed .finding-card dl div{padding-top:1mm;margin-top:1mm}.report-sheet-flow-packed .finding-card dd{line-height:1.35}.report-sheet-flow-packed .plan-card{padding:2.8mm}.report-sheet-flow-packed .plan-action{margin:1.6mm 0;line-height:1.4}.report-sheet-flow-packed .implementation-steps,.report-sheet-flow-packed .resources,.report-sheet-flow-packed .contingency{margin:1.3mm 0;padding:1.5mm;line-height:1.3}.report-sheet-flow-packed .plan-grid div{padding:1.7mm}.report-sheet-flow-packed .plan-cards{gap:2.8mm}.report-sheet-flow-packed .plan-card h3,.report-sheet-flow-packed .finding-card h3{font-size:9.9pt}.report-sheet-flow-packed .analytical-charts:not(:has(.chart-wide)) .chart-card{min-height:86mm}.report-sheet-flow-packed .flow-fragment.chart-grid>.chart-card:only-child{min-height:86mm}.report-sheet-flow-packed .flow-fragment.governance-grid:has(>article:only-child),.report-sheet-flow-packed .flow-fragment.timeline:has(>article:only-child){grid-template-columns:1fr}.report-sheet-flow-packed .flow-fragment.metric-grid:has(>:only-child){grid-template-columns:1fr}.report-sheet-flow-packed .flow-fragment.metric-grid:has(>:nth-child(2):last-child){grid-template-columns:repeat(2,1fr)}.report-sheet-flow-packed .flow-fragment.metric-grid:has(>:nth-child(3):last-child){grid-template-columns:repeat(3,1fr)}.flow-fragment{margin-top:1.6mm}.flow-continuation-label{display:flex;align-items:center;gap:2mm;margin:1.8mm 0 1.2mm;padding-top:1.5mm;border-top:1px dashed #cbd4e2;color:var(--navy)}.flow-continuation-label span{padding:.7mm 1.5mm;border-radius:2mm;background:#eef3fb;color:var(--royal);font-size:6.4pt;font-weight:900}.flow-continuation-label strong{font-size:8.2pt}.report-sheet-flow-packed[data-flow-oversize="1"] .page-section small::after{content:" · يحتاج مراجعة تخطيط";color:var(--danger)}.analytical-charts:not(:has(.chart-wide)) .chart-card{min-height:104mm}.ranking-stack{display:block}.ranking-companion{margin-top:4mm;padding-top:3mm;border-top:1px dashed #cbd4e2}.ranking-companion-title{display:flex;justify-content:space-between;align-items:center;gap:3mm;margin-bottom:1.5mm}.ranking-companion-title span{font-size:7pt;color:var(--muted);font-weight:800}.ranking-companion-title strong{font-size:8.6pt;color:var(--navy)}.ranking-stack-companion .ranking-report-block{margin:0}.ranking-report-block{margin:2.4mm 0;border:1px solid var(--line);border-radius:2mm;overflow:hidden;break-inside:avoid}.ranking-report-head{display:flex;justify-content:space-between;gap:3mm;padding:1.7mm 2.3mm;background:#f4f7fb}.ranking-report-head h3{margin:0;color:var(--navy);font-size:8.8pt}.ranking-report-head span{font-size:6.4pt;color:var(--muted)}.ranking-report-table{width:100%;border-collapse:collapse;font-size:6.7pt;line-height:1.14}.ranking-report-table th,.ranking-report-table td{padding:1.05mm 1.5mm;border-bottom:1px solid var(--line);text-align:right;vertical-align:middle}.ranking-report-table th{background:#fafbfc;color:var(--navy);font-size:6.5pt}.ranking-report-table td:first-child{font-weight:900;color:var(--royal)}.ranking-dense .ranking-report-head{padding:1.35mm 2mm}.ranking-dense .ranking-report-head h3{font-size:8.2pt}.ranking-dense .ranking-report-table{font-size:6.15pt;line-height:1.05}.ranking-dense .ranking-report-table th,.ranking-dense .ranking-report-table td{padding:.72mm 1.25mm}.ranking-stack-3 .ranking-report-block{margin:1.8mm 0}.ranking-stack-3 .ranking-report-head{padding:1.3mm 2mm}.ranking-stack-3 .ranking-report-table th,.ranking-stack-3 .ranking-report-table td{padding:.82mm 1.35mm}.ranking-stack-packed .ranking-report-block{margin:1.35mm 0}.ranking-stack-packed .ranking-report-head{padding:1.05mm 1.8mm}.ranking-stack-packed .ranking-report-head h3{font-size:8pt}.ranking-stack-packed .ranking-report-table{font-size:6pt;line-height:1.02}.ranking-stack-packed .ranking-report-table th,.ranking-stack-packed .ranking-report-table td{padding:.62mm 1.1mm}.ranking-stack-split .ranking-report-block{margin-top:1.4mm}.report-note{margin-top:2mm;padding:2mm;background:#fff8e9;border:1px solid #ecd9a4;font-size:7pt;color:#6d520f}
      @page{size:A4 portrait;margin:0}@media print{html,body{width:210mm;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{padding:0;margin:0}.toolbar{display:none!important}.report-sheet{width:210mm;height:297mm;margin:0;box-shadow:none;overflow:hidden}.report-page{position:relative;left:auto;top:auto;width:210mm;height:297mm;transform:none;box-shadow:none}}@media screen and (max-width:900px){body{padding:0}.report-sheet{width:100%;height:auto;min-height:100vh;margin:0;box-shadow:none;overflow:visible}.report-page{position:relative;left:auto;transform:none;width:100%;height:auto;min-height:100vh;margin:0;padding:20px;overflow:visible}.chart-grid,.diagnostic-grid,.findings-grid,.plan-cards,.tools-grid,.timeline,.core-metrics,.advanced-metrics,.meta-grid,.executive-grid,.analysis-profile,.governance-grid{grid-template-columns:1fr}.page-head,.page-footer{height:auto;padding:12px 0}.meta-grid div,.analysis-profile div,.plan-grid div{border-left:0}.chart-card.chart-wide{grid-column:auto;min-height:0}}
    </style></head><body><div class="toolbar"><span class="report-mode-badge">${reportMode==="executive"?"التقرير التنفيذي المختصر":"التقرير الكامل مع الجداول"}</span><span class="report-mode-badge">A4 · 210 × 297 مم</span><span class="report-print-hint">عند استخدام طابعة PDF اختر حجم الورق A4</span><button class="print" onclick="window.print()">طباعة التقرير أو حفظه PDF - A4</button><button class="close" onclick="window.close()">إغلاق</button></div>${body}<script>(()=>{
function sectionName(sheet){return sheet?.dataset.section||sheet?.querySelector(".page-section small")?.textContent?.trim()||""}
function pageFits(sheet){const content=sheet?.querySelector(".page-content"),footer=sheet?.querySelector(".page-footer");if(!content||!footer)return false;const footerTop=footer.getBoundingClientRect().top-2,children=[...content.children];if(!children.length)return true;const maxBottom=Math.max(...children.map(node=>node.getBoundingClientRect().bottom));return maxBottom<=footerTop}
function updatePagination(){const sheets=[...document.querySelectorAll(".report-sheet")],total=sheets.length;sheets.forEach((sheet,index)=>{const label=sheet.querySelector(".page-footer strong");if(label)label.textContent="صفحة "+(index+1)+" من "+total})}
const SPLITTABLE_SELECTOR=".chart-grid,.diagnostic-grid,.findings-grid,.plan-cards,.tools-grid,.timeline,.governance-grid,.metric-grid";
function isSplittableContainer(node){return Boolean(node?.matches?.(SPLITTABLE_SELECTOR)&&node.children.length)}
function refreshFragment(container){container.classList.add("flow-fragment");if(container.classList.contains("plan-cards")){[...container.classList].filter(name=>/^plan-cards-[123]$/.test(name)).forEach(name=>container.classList.remove(name));container.classList.add("plan-cards-"+Math.min(3,Math.max(1,container.children.length)))}return container}
function setSheetSections(sheet,section){const values=(sheet.dataset.flowSections||"").split("|").map(value=>value.trim()).filter(Boolean);if(section&&!values.includes(section))values.push(section);sheet.dataset.flowSections=values.join("|");sheet.dataset.section=values.join(" / ");const label=sheet.querySelector(".page-section small");if(label)label.textContent=values.length>2?values[0]+" + "+(values.length-1)+" أقسام":(values.join(" / ")||sectionName(sheet))}
function createFlowSheet(template,anchor,section){const sheet=template.cloneNode(true),content=sheet.querySelector(".page-content");sheet.classList.add("report-sheet-flow-packed");sheet.dataset.packable="1";sheet.dataset.flowSections="";content.replaceChildren();anchor.parentNode.insertBefore(sheet,anchor);setSheetSections(sheet,section);return sheet}
function continuationLabel(heading,section){const box=document.createElement("div");box.className="flow-continuation-label";const tag=document.createElement("span"),title=document.createElement("strong");tag.textContent="متابعة";title.textContent=heading?.querySelector("h2")?.textContent?.trim()||section||"استكمال التحليل";box.append(tag,title);return box}
function tryAppend(sheet,nodes){const content=sheet.querySelector(".page-content");nodes.filter(Boolean).forEach(node=>content.appendChild(node));void sheet.offsetHeight;if(pageFits(sheet))return true;nodes.filter(Boolean).forEach(node=>node.remove());return false}
function flowSections(sheet){return (sheet?.dataset.flowSections||"").split("|").map(value=>value.trim()).filter(Boolean)}
function isSectionTransition(sheet,section){const values=flowSections(sheet);return Boolean(section&&values.length&&values.at(-1)!==section)}
function tryCrossSectionAppend(sheet,nodes,section){if(!isSectionTransition(sheet,section))return false;const alreadyBridged=sheet.classList.contains("cross-section-bridge");if(!alreadyBridged)sheet.classList.add("cross-section-bridge");const accepted=tryAppend(sheet,nodes);if(accepted){sheet.dataset.crossSectionBridge="1";return true}if(!alreadyBridged)sheet.classList.remove("cross-section-bridge");return false}
function paginatePackableRun(run){if(!run.length)return;const anchor=run[0],template=run[0],source=[];run.forEach(sheet=>{const section=sectionName(sheet),content=sheet.querySelector(".page-content");[...content.children].forEach(node=>source.push({section,node:node.cloneNode(true)}))});let current=null,pendingHeading=null,pendingSection="";
  function fresh(section){current=createFlowSheet(template,anchor,section);return current}
  function hasContent(){return Boolean(current?.querySelector(".page-content")?.children.length)}
  function forceAppend(nodes,section){if(!current)fresh(section);const content=current.querySelector(".page-content");nodes.filter(Boolean).forEach(node=>content.appendChild(node));current.dataset.flowOversize="1";setSheetSections(current,section)}
  function appendAtomic(node,section,heading=null){if(!current)fresh(section);const nodes=[heading?.cloneNode(true),node.cloneNode(true)].filter(Boolean);if(tryAppend(current,nodes)){setSheetSections(current,section);return}if(hasContent()){const bridge=[heading?.cloneNode(true),node.cloneNode(true)].filter(Boolean);if(tryCrossSectionAppend(current,bridge,section)){setSheetSections(current,section);return}fresh(section)}const retry=[heading?.cloneNode(true),node.cloneNode(true)].filter(Boolean);if(!tryAppend(current,retry))forceAppend(retry,section);else setSheetSections(current,section)}
  function splitContainer(container,section,heading=null){const items=[...container.children];let fragment=null,headingUsed=false;items.forEach(item=>{if(!current)fresh(section);const child=item.cloneNode(true);if(!fragment){fragment=refreshFragment(container.cloneNode(false));fragment.replaceChildren(child);const label=!headingUsed&&heading?heading.cloneNode(true):continuationLabel(heading,section);if(tryAppend(current,[label,fragment])){headingUsed=true;setSheetSections(current,section);return}if(hasContent()){const bridgeFragment=refreshFragment(container.cloneNode(false));bridgeFragment.replaceChildren(item.cloneNode(true));const bridgeLabel=!headingUsed&&heading?heading.cloneNode(true):continuationLabel(heading,section);if(tryCrossSectionAppend(current,[bridgeLabel,bridgeFragment],section)){fragment=bridgeFragment;headingUsed=true;setSheetSections(current,section);return}fresh(section)}fragment=refreshFragment(container.cloneNode(false));fragment.replaceChildren(item.cloneNode(true));const retryLabel=!headingUsed&&heading?heading.cloneNode(true):continuationLabel(heading,section);if(!tryAppend(current,[retryLabel,fragment]))forceAppend([retryLabel,fragment],section);headingUsed=true;setSheetSections(current,section);return}fragment.appendChild(child);refreshFragment(fragment);void current.offsetHeight;if(pageFits(current)){setSheetSections(current,section);return}child.remove();refreshFragment(fragment);fresh(section);fragment=refreshFragment(container.cloneNode(false));fragment.replaceChildren(item.cloneNode(true));const retryLabel=continuationLabel(heading,section);if(!tryAppend(current,[retryLabel,fragment]))forceAppend([retryLabel,fragment],section);setSheetSections(current,section)})}
  function appendContainer(container,section,heading=null){if(!current)fresh(section);const whole=[heading?.cloneNode(true),container.cloneNode(true)].filter(Boolean);if(tryAppend(current,whole)){setSheetSections(current,section);return}const hadContent=hasContent();if(hadContent){const bridgeWhole=[heading?.cloneNode(true),container.cloneNode(true)].filter(Boolean);if(tryCrossSectionAppend(current,bridgeWhole,section)){setSheetSections(current,section);return}}if(hadContent&&isSplittableContainer(container)){splitContainer(container,section,heading);return}if(hadContent)fresh(section);const retryWhole=[heading?.cloneNode(true),container.cloneNode(true)].filter(Boolean);if(tryAppend(current,retryWhole)){setSheetSections(current,section);return}if(isSplittableContainer(container)){splitContainer(container,section,heading);return}forceAppend(retryWhole,section)}
  source.forEach(({section,node})=>{if(node.classList?.contains("section-heading")){if(pendingHeading)appendAtomic(pendingHeading,pendingSection||section);pendingHeading=node;pendingSection=section;return}if(isSplittableContainer(node))appendContainer(node,section,pendingHeading);else appendAtomic(node,section,pendingHeading);pendingHeading=null;pendingSection=""});if(pendingHeading)appendAtomic(pendingHeading,pendingSection||sectionName(run.at(-1)));run.forEach(sheet=>sheet.remove())}
function flowPaginateA4(){const sheets=[...document.querySelectorAll(".report-sheet")],runs=[];let run=[];sheets.forEach(sheet=>{if(sheet.dataset.packable==="1")run.push(sheet);else if(run.length){runs.push(run);run=[]}});if(run.length)runs.push(run);runs.forEach(paginatePackableRun);updatePagination();document.documentElement.dataset.a4Pagination="ready";document.documentElement.dataset.flowPagination="ready"}
function integrity(){const failures=[];document.querySelectorAll(".report-sheet").forEach((sheet,index)=>{if(!pageFits(sheet))failures.push("page-overflow:"+(index+1))});document.querySelectorAll(".chart-card[data-expected-rows]").forEach(card=>{const expected=Number(card.dataset.expectedRows||0),rowClass=card.dataset.rowClass||"bar-row",rows=[...card.querySelectorAll("."+rowClass)],cardBox=card.getBoundingClientRect(),page=card.closest(".report-page"),footer=page?.querySelector(".page-footer"),limit=footer?footer.getBoundingClientRect().top:cardBox.bottom;if(rows.length!==expected)failures.push("count:"+(card.dataset.chartId||"")+":"+rows.length+"/"+expected);const last=rows.at(-1);if(last&&last.getBoundingClientRect().bottom>Math.min(cardBox.bottom,limit)+1)failures.push("clip:"+(card.dataset.chartId||""))});document.querySelectorAll(".ranking-report-block").forEach((block,index)=>{const page=block.closest(".report-page"),footer=page?.querySelector(".page-footer");if(footer&&block.getBoundingClientRect().bottom>footer.getBoundingClientRect().top-1)failures.push("ranking-clip:"+(index+1))});document.querySelectorAll(".plan-card").forEach((card,index)=>{const page=card.closest(".report-page"),footer=page?.querySelector(".page-footer");if(footer&&card.getBoundingClientRect().bottom>footer.getBoundingClientRect().top-1)failures.push("plan-clip:"+(index+1))});document.documentElement.dataset.chartIntegrity=failures.length?"fail":"pass";document.documentElement.dataset.chartIntegrityDetails=failures.join(",");if(failures.length)console.error("Taqareer chart integrity failed",failures)}
window.addEventListener("load",()=>setTimeout(()=>{flowPaginateA4();requestAnimationFrame(()=>requestAnimationFrame(integrity))},90))})();<\/script>${autoPrint?`<script>window.addEventListener("load",()=>{let tries=0;const printWhenReady=()=>{if(document.documentElement.dataset.flowPagination==="ready"||tries++>30){window.print();return}setTimeout(printWhenReady,60)};setTimeout(printWhenReady,120)});<\/script>`:""}</body></html>`;
  }

  function openReport(context,options={}){if(!context?.analysis)throw new Error("لا توجد نتيجة تحليل جاهزة لإنشاء التقرير.");const popup=window.open("","taqareer-deep-report");if(!popup)throw new Error("منع المتصفح فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");try{popup.opener=null}catch{}popup.document.open();popup.document.write(buildReportHtml(context,options));popup.document.close();return popup;}
  window.TaqareerReports={VERSION,buildReportData,buildReportHtml,openReport};
})();
