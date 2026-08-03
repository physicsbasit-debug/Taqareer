(() => {
  "use strict";

  const APP_NAME = "تقارير";
  const VERSION = "0.6.0";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function clampText(value, maxLength = 420) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  function round(value) {
    return Number.isFinite(value) ? Math.round(value * 10) / 10 : "—";
  }

  function formatDate(value = new Date()) {
    try {
      return new Intl.DateTimeFormat("ar-OM", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      }).format(value);
    } catch {
      return new Date(value).toLocaleString("ar");
    }
  }

  function flattenStrings(input, output = []) {
    if (Array.isArray(input)) input.forEach(item => flattenStrings(item, output));
    else if (input && typeof input === "object") Object.values(input).forEach(item => flattenStrings(item, output));
    else if (typeof input === "string" && input.trim()) output.push(input.trim());
    return output;
  }

  function extractDocumentMetadata(context) {
    const sourceMeta = context.sourceMeta || {};
    const strings = flattenStrings([
      sourceMeta.reportTitle,
      sourceMeta.metadata?.title,
      sourceMeta.metadata?.preamble,
      sourceMeta.title,
      context.sourceName
    ]);
    const joined = strings.join(" | ");

    const capture = (patterns) => {
      for (const pattern of patterns) {
        const match = joined.match(pattern);
        if (match?.[1]) return match[1].trim().replace(/[|،؛]+$/g, "");
      }
      return "";
    };

    const title = sourceMeta.reportTitle || sourceMeta.metadata?.title || sourceMeta.title || "";
    return {
      title: clampText(title || `تقرير التحليل التربوي - ${context.type?.name || "نموذج تربوي"}`, 180),
      school: capture([/المدرسة\s*[:：-]?\s*([^|]{3,90})/i, /مدرسة\s+([^|]{3,90})/i]),
      subject: capture([/المادة\s*[:：-]?\s*([^|]{2,60})/i, /لمادة\s+([^|]{2,60})/i]),
      grade: capture([/الصف\s*[:：-]?\s*([^|\-]{1,35})/i]),
      academicYear: capture([/(20\d{2}\s*[\/]\s*20\d{2})/, /العام\s*الدراس[يى]\s*[:：-]?\s*([^|\-]{4,15})/i]),
      period: capture([/الفصل\s*الدراس[يى]\s*[:：-]?\s*(الأول|الاول|الثاني)/i, /الفترة\s*[:：-]?\s*([^|\-]{2,35})/i]),
      sourceName: context.sourceName || "—"
    };
  }

  const METRIC_LABELS = {
    n: "عدد السجلات الصالحة",
    mean: "المتوسط الحسابي",
    med: "الوسيط",
    min: "أدنى قيمة",
    max: "أعلى قيمة",
    sd: "الانحراف المعياري",
    maxScore: "الدرجة الكلية المعتمدة",
    thresholdPct: "حد الإتقان المعتمد",
    masteryPct: "نسبة الإتقان",
    total: "إجمالي الحالات",
    evidenceRatio: "نسبة الجمل المدعومة بمؤشرات دليل",
    sentenceCount: "عدد الجمل المحللة",
    recommendationCount: "عدد التوصيات المكتشفة",
    developmentCount: "عدد جوانب التطوير"
  };

  function metricValue(key, analysis) {
    const value = analysis?.[key];
    if (!Number.isFinite(value)) return value ?? "—";
    if (/Pct|Ratio/.test(key)) return `${round(value)}%`;
    return round(value);
  }

  function humanizeEvidenceRefs(refs, analysis) {
    const items = (Array.isArray(refs) ? refs : [])
      .map(ref => {
        const value = String(ref || "");
        if (value.startsWith("metric:")) {
          const key = value.slice(7);
          const label = METRIC_LABELS[key] || "مؤشر محسوب";
          return `${label}: ${metricValue(key, analysis)}`;
        }
        if (value.startsWith("row:")) return `السجل رقم ${value.slice(4)} من البيانات المحللة`;
        if (value.startsWith("line:")) return `السطر رقم ${value.slice(5)} من النص المصدر`;
        return "";
      })
      .filter(Boolean);
    return [...new Set(items)].join("، ");
  }

  function metricCards(analysis) {
    if (!analysis) return [];
    if (analysis.kind === "scores") {
      return [
        { label: "السجلات الصالحة", value: analysis.n, note: "سجلًا دخل التحليل" },
        { label: "المتوسط", value: round(analysis.mean), note: analysis.hasMax ? `من ${analysis.maxScore}` : "قيمة خام" },
        { label: "الوسيط", value: round(analysis.med), note: "منتصف التوزيع" },
        analysis.hasMax
          ? { label: "الإتقان", value: `${round(analysis.masteryPct)}%`, note: `حد الإتقان ${analysis.thresholdPct}%` }
          : { label: "المدى", value: round(analysis.max - analysis.min), note: "الفرق بين أعلى وأدنى قيمة" }
      ];
    }
    if (analysis.kind === "narrative") {
      return [
        { label: "الجمل المحللة", value: analysis.sentenceCount, note: "جملة ذات معنى" },
        { label: "مؤشرات الأدلة", value: analysis.evidenceCount, note: `${round(analysis.evidenceRatio)}% من النص` },
        { label: "التوصيات", value: analysis.recommendationCount, note: "توصية أو إجراء مكتشف" },
        { label: "جوانب التطوير", value: analysis.developmentCount, note: "حاجة أو فرصة تحسين" }
      ];
    }
    const top = [...(analysis.entries || [])].sort((a, b) => b.count - a.count)[0];
    return [
      { label: "إجمالي الطلبة", value: analysis.total, note: "جميع مستويات الأداء" },
      { label: "عدد المستويات", value: analysis.entries?.length || 0, note: "فئات مكتشفة" },
      { label: "الفئة الأكبر", value: top?.label || "—", note: `${top?.count || 0} طالبًا` },
      { label: "نسبة الفئة الأكبر", value: `${round(top?.pct || 0)}%`, note: "من الإجمالي" }
    ];
  }

  function judgmentFor(analysis) {
    if (!analysis) return { label: "تحليل غير مكتمل", tone: "neutral", note: "لا توجد نتائج جاهزة للاعتماد." };
    if (analysis.kind === "scores") {
      if (!analysis.hasMax) return { label: "قراءة وصفية أولية", tone: "neutral", note: "لم تُؤكّد الدرجة الكلية، لذلك لم يصدر حكم إتقان." };
      const mastery = Number(analysis.masteryPct || 0);
      if (mastery < 40) return { label: "حاجة إلى تدخل عاجل", tone: "danger", note: "نسبة الإتقان منخفضة بصورة تستدعي تدخلًا منظمًا وإعادة قياس قريبة." };
      if (mastery < 60) return { label: "مستوى منخفض", tone: "warning", note: "توجد فجوة واضحة عن مستوى الإتقان المستهدف." };
      if (mastery < 75) return { label: "مستوى متوسط يحتاج دعمًا", tone: "warning", note: "الأداء قابل للتحسن من خلال تدخلات موجهة للفئات الأقل أداءً." };
      return { label: "مستوى إتقان جيد", tone: "positive", note: "الغالبية بلغت الحد المعتمد مع بقاء حالات تحتاج متابعة." };
    }
    if (analysis.kind === "narrative") {
      const ratio = Number(analysis.evidenceRatio || 0);
      if (ratio < 25) return { label: "توثيق ضعيف للأدلة", tone: "danger", note: "تحتاج الأحكام إلى أدلة مباشرة ومحددة قبل اعتمادها." };
      if (ratio < 45) return { label: "توثيق يحتاج تعزيزًا", tone: "warning", note: "توجد أدلة في أجزاء من التقرير، لكنها لا تغطي الأحكام الرئيسة بصورة كافية." };
      return { label: "توثيق جيد نسبيًا", tone: "positive", note: "يحتوي التقرير على قدر مناسب من الأدلة مع بقاء الحاجة إلى مراجعة نوعيتها." };
    }
    const lower = (analysis.entries || [])
      .filter(item => ["د", "ه", "هـ"].includes(normalize(item.label)))
      .reduce((sum, item) => sum + Number(item.pct || 0), 0);
    if (lower >= 30) return { label: "أولوية تدخل جماعي", tone: "danger", note: "تمثل المستويات الدنيا نسبة تستحق خطة علاجية منظمة." };
    return { label: "متابعة موجهة", tone: "positive", note: "المستويات الدنيا محدودة نسبيًا، وتناسبها تدخلات فردية أو مجموعات صغيرة." };
  }

  function chartItems(analysis) {
    if (!analysis) return [];
    if (analysis.kind === "scores") return (analysis.bins || []).map(item => ({ label: item.label, value: item.count }));
    if (analysis.kind === "narrative") return (analysis.themes || []).map(item => ({ label: item.label, value: item.count }));
    return (analysis.entries || []).map(item => ({ label: item.label, value: item.count }));
  }

  function chartTitle(analysis) {
    if (analysis?.kind === "narrative") return "الموضوعات التربوية الأكثر حضورًا";
    if (analysis?.kind === "levels") return "توزيع مستويات الأداء";
    return "توزيع الدرجات";
  }

  function normalizedFindings(context) {
    const analysis = context.analysis || {};
    const ai = context.aiResult || {};
    const aiFindings = (ai.findings || []).map(item => ({
      title: item.title || "استنتاج تربوي",
      statement: item.statement || "",
      evidence: humanizeEvidenceRefs(item.evidenceRefs || [], analysis),
      confidence: item.confidence || "متوسطة",
      impact: item.educationalImpact || "أثر تربوي يحتاج مراجعة.",
      action: item.recommendedAction || "مراجعة الاستنتاج وربطه بإجراء قابل للقياس.",
      limitations: item.limitations || [],
      source: "ai"
    }));
    const localFindings = (analysis.findings || []).map(item => ({
      title: item.title || "استنتاج تحليلي",
      statement: "",
      evidence: item.evidence || "",
      confidence: item.confidence || "متوسطة",
      impact: item.impact || "",
      action: item.action || "",
      limitations: [],
      source: "deterministic"
    }));

    const seen = new Set();
    return [...aiFindings, ...localFindings]
      .filter(item => {
        const key = normalize(item.title);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }

  function translateQualityTool(name) {
    const value = normalize(name);
    if (/histogram|frequency|distribution|تكرار|توزيع/.test(value)) return "توزيع الدرجات والتكرارات";
    if (/gap|فجوه/.test(value)) return "تحليل الفجوة";
    if (/pareto|باريتو/.test(value)) return "مخطط باريتو";
    if (/radar|رادار/.test(value)) return "مخطط المجالات";
    if (/heat|حراري/.test(value)) return "الخريطة الحرارية";
    if (/trend|اتجاه/.test(value)) return "تحليل الاتجاه";
    if (/priority|اولوي/.test(value)) return "مصفوفة الأولوية";
    if (/root|fishbone|سبب/.test(value)) return "تحليل السبب الجذري";
    if (/pdca|تحسين مستمر/.test(value)) return "دورة التحسين المستمر";
    return String(name || "أداة جودة").replace(/\([^)]*\)/g, "").replace(/[A-Za-z/]+/g, "").trim() || "أداة جودة";
  }

  function improvementPlan(context) {
    const plan = Array.isArray(context.aiResult?.improvementPlan) ? context.aiResult.improvementPlan : [];
    if (plan.length) return plan.slice(0, 5).map(item => ({
      priority: item.priority || "متوسطة",
      action: clampText(item.action, 280),
      responsibleRole: item.responsibleRole || "المعلم أو الفريق المختص",
      timeframe: item.timeframe || "يحدد عند الاعتماد",
      successIndicator: clampText(item.successIndicator, 210)
    }));
    const action = context.analysis?.action;
    if (!action) return [];
    return [{
      priority: action.priority || "متوسطة",
      action: clampText(action.title || action.text, 280),
      responsibleRole: "المعلم أو الفريق المختص",
      timeframe: "خلال أسبوعين من تاريخ التقرير",
      successIndicator: clampText(action.indicator || "تحسن المؤشر المستهدف في القياس اللاحق", 210)
    }];
  }

  function reportCautions(context) {
    const cautions = Array.isArray(context.aiResult?.cautions) ? context.aiResult.cautions : [];
    const derived = [];
    if (context.analysis?.kind === "scores") derived.push("يمثل التحليل أداء مجموعة محددة في مكوّن تقويمي واحد، ولا يحدد أسباب الضعف دون بيانات مهارية أو أدلة نوعية إضافية.");
    if (context.analysis?.kind === "narrative") derived.push("تعتمد القراءة على النص المدخل، وتحتاج قوة الحكم إلى مراجعة بشرية لجودة الأدلة والسياق الإشرافي.");
    if (context.quality?.completeness < 90) derived.push(`بلغ اكتمال البيانات ${context.quality.completeness}%؛ لذلك يجب قراءة النتائج بحذر.`);
    return [...new Set([...cautions, ...derived])].slice(0, 4).map(item => clampText(item, 260));
  }

  function qualityTools(context) {
    return (context.aiResult?.qualityTools || []).slice(0, 4).map(tool => ({
      name: translateQualityTool(tool.name),
      reason: clampText(tool.reason || "اختيرت لملاءمتها لطبيعة البيانات.", 210),
      conditionsMet: tool.conditionsMet !== false
    }));
  }

  function buildReportData(context) {
    const analysis = context.analysis || {};
    const meta = extractDocumentMetadata(context);
    return {
      appName: APP_NAME,
      version: VERSION,
      reportId: `TQR-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: formatDate(new Date()),
      meta,
      typeName: context.type?.name || "تحليل تربوي",
      recognitionConfidence: context.confidence || 0,
      executiveTitle: context.aiResult?.executiveTitle || analysis.executiveTitle || "الخلاصة التنفيذية",
      executiveSummary: clampText(context.aiResult?.executiveSummary || analysis.executiveSummary || "لا توجد خلاصة تنفيذية متاحة.", 900),
      metrics: metricCards(analysis),
      judgment: judgmentFor(analysis),
      chartTitle: chartTitle(analysis),
      chartItems: chartItems(analysis),
      findings: normalizedFindings(context),
      qualityTools: qualityTools(context),
      plan: improvementPlan(context),
      cautions: reportCautions(context),
      analysisMode: context.aiResult ? "تحليل هجين: حسابات حتمية وقراءة تربوية ذكية" : "تحليل حتمي محلي",
      completeness: context.quality?.completeness ?? 0,
      sourceName: context.sourceName || "—"
    };
  }

  function renderMeta(meta, data) {
    const rows = [
      ["نوع التقرير", data.typeName],
      ["مصدر البيانات", meta.sourceName || data.sourceName],
      ["المدرسة", meta.school || "غير محددة في الملف"],
      ["المادة", meta.subject || "غير محددة في الملف"],
      ["الصف / الفئة", meta.grade || "غير محدد"],
      ["العام / الفترة", [meta.academicYear, meta.period].filter(Boolean).join(" - ") || "غير محدد"]
    ];
    return rows.map(([label, value]) => `<div class="meta-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function renderMetrics(metrics) {
    return metrics.map(item => `
      <div class="metric-card">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <small>${escapeHtml(item.note)}</small>
      </div>`).join("");
  }

  function renderChart(items) {
    if (!items.length) return `<div class="empty-state">لا توجد بيانات كافية لإنشاء رسم مناسب.</div>`;
    const max = Math.max(1, ...items.map(item => Number(item.value || 0)));
    return items.map(item => {
      const percent = Math.max(2, Math.round(Number(item.value || 0) / max * 100));
      return `<div class="chart-row">
        <div class="chart-label">${escapeHtml(item.label)}</div>
        <div class="chart-track"><span style="width:${percent}%"></span></div>
        <div class="chart-value">${escapeHtml(item.value)}</div>
      </div>`;
    }).join("");
  }

  function renderFindings(findings) {
    if (!findings.length) return `<div class="empty-state">لم تُنتج استنتاجات قابلة للإدراج في التقرير الرسمي.</div>`;
    return findings.map((item, index) => {
      const evidence = item.evidence || item.statement || "يحتاج الدليل إلى مراجعة قبل الاعتماد.";
      return `<article class="finding-row">
        <div class="finding-index">${index + 1}</div>
        <div class="finding-content">
          <div class="finding-heading"><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.confidence)}</span></div>
          ${item.statement ? `<p class="finding-statement">${escapeHtml(clampText(item.statement, 360))}</p>` : ""}
          <dl>
            <div><dt>الدليل</dt><dd>${escapeHtml(clampText(evidence, 340))}</dd></div>
            <div><dt>الأثر التربوي</dt><dd>${escapeHtml(clampText(item.impact, 300))}</dd></div>
          </dl>
        </div>
      </article>`;
    }).join("");
  }

  function renderPlan(plan) {
    if (!plan.length) return `<tr><td colspan="5">لا توجد خطة تحسين جاهزة للاعتماد.</td></tr>`;
    return plan.map(item => `<tr>
      <td><span class="priority ${normalize(item.priority).includes("عالي") ? "high" : "medium"}">${escapeHtml(item.priority)}</span></td>
      <td>${escapeHtml(item.action)}</td>
      <td>${escapeHtml(item.responsibleRole)}</td>
      <td>${escapeHtml(item.timeframe)}</td>
      <td>${escapeHtml(item.successIndicator)}</td>
    </tr>`).join("");
  }

  function renderTools(tools) {
    if (!tools.length) return `<div class="empty-state compact">لم تُعتمد أداة جودة إضافية لهذا التحليل.</div>`;
    return tools.map(tool => `<div class="tool-item">
      <strong>${escapeHtml(tool.name)}</strong>
      <p>${escapeHtml(tool.reason)}</p>
    </div>`).join("");
  }

  function renderCautions(cautions) {
    if (!cautions.length) return `<li>تُقرأ النتائج في حدود البيانات المتاحة ولا تُستخدم لإثبات السببية دون أدلة إضافية.</li>`;
    return cautions.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function buildReportHtml(context, options = {}) {
    const data = buildReportData(context);
    const autoPrint = options.autoPrint === true;
    const totalPages = 3;
    const chartTotal = data.chartItems.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const reportTitle = data.meta.title || `تقرير التحليل التربوي - ${data.typeName}`;

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)} | ${APP_NAME}</title>
  <style>
    :root{--navy:#172a55;--royal:#294897;--teal:#15796f;--gold:#b8862d;--ink:#182238;--muted:#5e687b;--line:#d9dee7;--soft:#f5f7fa;--danger:#a33a31;--warning:#8a620e;--positive:#12675f}
    *{box-sizing:border-box}
    html,body{margin:0;background:#eef1f5;color:var(--ink);font-family:Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{direction:rtl}
    .report-toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:10px;padding:12px;background:rgba(23,42,85,.95);box-shadow:0 5px 18px rgba(0,0,0,.15)}
    .report-toolbar button{border:0;border-radius:8px;padding:10px 18px;font-weight:800;cursor:pointer}
    .report-toolbar .print{background:#fff;color:var(--navy)}
    .report-toolbar .close{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3)}
    .report-document{width:210mm;margin:16px auto;background:#fff;box-shadow:0 12px 36px rgba(18,30,55,.15)}
    .report-page{position:relative;width:210mm;height:297mm;padding:13mm 13mm 14mm;overflow:hidden;background:#fff;page-break-after:always}
    .report-page:last-child{page-break-after:auto}
    .page-accent{height:4px;background:linear-gradient(90deg,var(--navy),var(--royal),var(--teal));margin:-13mm -13mm 8mm}
    .report-header{display:grid;grid-template-columns:1fr auto;align-items:start;gap:15px;padding-bottom:5mm;border-bottom:1.5px solid var(--navy)}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-mark{width:40px;height:40px;display:grid;place-items:center;border-radius:8px;color:#fff;background:var(--navy);font-size:23px;font-weight:900}
    .brand strong{display:block;font-size:19px;color:var(--navy)}
    .brand span{display:block;margin-top:2px;color:var(--muted);font-size:10px}
    .report-code{text-align:left;direction:ltr;color:var(--muted);font-size:9px;line-height:1.7}
    .report-title{margin:6mm 0 3mm;font-size:22px;line-height:1.45;color:var(--navy)}
    .report-subtitle{margin:0;color:var(--muted);font-size:11px;line-height:1.7}
    .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:5mm 0;border:1px solid var(--line);background:#fff}
    .meta-item{min-height:15mm;padding:3mm 4mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line)}
    .meta-item:nth-child(3n){border-left:0}.meta-item:nth-last-child(-n+3){border-bottom:0}
    .meta-item span{display:block;color:var(--muted);font-size:9px}.meta-item strong{display:block;margin-top:2px;font-size:10.5px;line-height:1.5}
    .section-title{display:flex;align-items:center;gap:8px;margin:0 0 3mm;color:var(--navy);font-size:15px}
    .section-title:before{content:"";width:4px;height:18px;background:var(--gold);border-radius:2px}
    .executive{display:grid;grid-template-columns:1fr 47mm;gap:5mm;margin-bottom:5mm}
    .executive-copy{padding:5mm;border:1px solid var(--line);border-right:4px solid var(--royal);background:#fbfcfe}
    .executive-copy h2{margin:0 0 2mm;font-size:15px;color:var(--navy)}
    .executive-copy p{margin:0;font-size:10.5px;line-height:1.85;color:#3f4a5d}
    .judgment{display:flex;flex-direction:column;justify-content:center;padding:5mm;color:#fff;background:var(--navy)}
    .judgment.positive{background:var(--positive)}.judgment.warning{background:var(--warning)}.judgment.danger{background:var(--danger)}
    .judgment span{font-size:9px;opacity:.8}.judgment strong{margin:2mm 0;font-size:16px;line-height:1.45}.judgment small{font-size:9px;line-height:1.6;opacity:.9}
    .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:0 0 5mm}
    .metric-card{padding:4mm;border:1px solid var(--line);border-top:3px solid var(--royal);background:#fff}
    .metric-card span{display:block;color:var(--muted);font-size:9px}.metric-card strong{display:block;margin:2mm 0 1mm;color:var(--navy);font-size:19px}.metric-card small{display:block;color:var(--teal);font-size:8.5px}
    .chart-box{padding:4mm 5mm;border:1px solid var(--line);background:#fff}
    .chart-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:3mm}
    .chart-heading strong{color:var(--navy);font-size:12px}.chart-heading span{color:var(--muted);font-size:9px}
    .chart{display:grid;gap:2.3mm}
    .chart-row{display:grid;grid-template-columns:34mm 1fr 14mm;align-items:center;gap:3mm}
    .chart-label{font-size:9px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chart-track{height:8px;background:#e8ebf0;overflow:hidden}.chart-track span{display:block;height:100%;background:linear-gradient(90deg,var(--royal),var(--teal))}.chart-value{text-align:left;font-size:9px;font-weight:800;color:var(--navy)}
    .method-note{margin-top:4mm;padding:3mm 4mm;border-right:3px solid var(--teal);background:#f2f8f7;color:#43505d;font-size:8.8px;line-height:1.7}
    .finding-list{display:grid;gap:3mm}
    .finding-row{display:grid;grid-template-columns:9mm 1fr;border:1px solid var(--line);background:#fff;break-inside:avoid}
    .finding-index{display:grid;place-items:center;color:#fff;background:var(--navy);font-size:12px;font-weight:900}
    .finding-content{padding:3.5mm 4mm}
    .finding-heading{display:flex;justify-content:space-between;gap:10px;align-items:start}.finding-heading h3{margin:0;color:var(--navy);font-size:11.5px;line-height:1.5}.finding-heading span{flex:none;padding:1mm 2mm;background:#e9f5f2;color:var(--teal);font-size:8px;font-weight:800}
    .finding-statement{margin:1.8mm 0 2mm;color:#333e52;font-size:9.2px;line-height:1.65}
    .finding-content dl{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:0}.finding-content dl div{padding-top:2mm;border-top:1px solid #edf0f4}.finding-content dt{color:var(--gold);font-size:8px;font-weight:800}.finding-content dd{margin:1mm 0 0;color:#4b5669;font-size:8.7px;line-height:1.55}
    .plan-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.2px}
    .plan-table th{padding:2.5mm 2mm;color:#fff;background:var(--navy);text-align:right}.plan-table td{padding:2.6mm 2mm;border:1px solid var(--line);vertical-align:top;line-height:1.55;overflow-wrap:anywhere}.plan-table th:nth-child(1){width:13mm}.plan-table th:nth-child(2){width:64mm}.plan-table th:nth-child(3){width:29mm}.plan-table th:nth-child(4){width:25mm}.plan-table th:nth-child(5){width:auto}
    .priority{display:inline-block;padding:1mm 2mm;font-size:7.8px;font-weight:800;color:#75520a;background:#fff2c9}.priority.high{color:#8c2c26;background:#fde5e2}
    .two-columns{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:5mm}.info-box{padding:4mm;border:1px solid var(--line);background:#fbfcfe}.info-box h3{margin:0 0 2mm;color:var(--navy);font-size:11px}.tool-list{display:grid;gap:2mm}.tool-item{padding:2.5mm;border-right:3px solid var(--teal);background:#f2f8f7}.tool-item strong{display:block;color:var(--navy);font-size:9.3px}.tool-item p{margin:1mm 0 0;color:#4d586a;font-size:8.3px;line-height:1.5}.caution-list{margin:0;padding:0 5mm 0 0}.caution-list li{margin:0 0 1.8mm;color:#4b5669;font-size:8.5px;line-height:1.55}
    .approval{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;margin-top:6mm}.approval div{padding-top:8mm;border-top:1px solid #788397;color:#596477;text-align:center;font-size:8.5px}
    .page-footer{position:absolute;right:13mm;left:13mm;bottom:6mm;display:flex;justify-content:space-between;padding-top:2mm;border-top:1px solid var(--line);color:#727c8d;font-size:8px}
    .empty-state{padding:8mm;border:1px dashed var(--line);color:var(--muted);text-align:center;font-size:10px}.empty-state.compact{padding:4mm;font-size:8.5px}
    @page{size:A4;margin:0}
    @media print{
      html,body{background:#fff}.report-toolbar{display:none!important}.report-document{width:210mm;margin:0;box-shadow:none}.report-page{margin:0}
    }
    @media screen and (max-width:860px){.report-document{width:100%;margin:0}.report-page{width:100%;height:auto;min-height:297mm;padding:24px}.page-accent{margin:-24px -24px 25px}.meta-grid{grid-template-columns:1fr 1fr}.meta-item:nth-child(n){border:1px solid var(--line)}.executive{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}.two-columns{grid-template-columns:1fr}.report-page{overflow:visible}.page-footer{position:static;margin-top:20px}}
  </style>
</head>
<body>
  <div class="report-toolbar">
    <button class="print" onclick="window.print()">طباعة التقرير أو حفظه PDF</button>
    <button class="close" onclick="window.close()">إغلاق</button>
  </div>
  <main class="report-document">
    <section class="report-page">
      <div class="page-accent"></div>
      <header class="report-header">
        <div class="brand"><div class="brand-mark">ت</div><div><strong>${APP_NAME}</strong><span>منصة التحليل التربوي الذكي</span></div></div>
        <div class="report-code">${escapeHtml(data.reportId)}<br>${escapeHtml(data.generatedAt)}</div>
      </header>
      <h1 class="report-title">${escapeHtml(reportTitle)}</h1>
      <p class="report-subtitle">تقرير تحليلي رسمي مبني على البيانات المرفوعة، مع فصل الحسابات الحتمية عن القراءة التربوية الذكية وإبقاء النتائج قابلة للمراجعة.</p>
      <div class="meta-grid">${renderMeta(data.meta, data)}</div>
      <h2 class="section-title">الملخص التنفيذي</h2>
      <div class="executive">
        <div class="executive-copy"><h2>${escapeHtml(data.executiveTitle)}</h2><p>${escapeHtml(data.executiveSummary)}</p></div>
        <div class="judgment ${escapeHtml(data.judgment.tone)}"><span>الحكم العام</span><strong>${escapeHtml(data.judgment.label)}</strong><small>${escapeHtml(data.judgment.note)}</small></div>
      </div>
      <div class="metrics">${renderMetrics(data.metrics)}</div>
      <div class="chart-box">
        <div class="chart-heading"><strong>${escapeHtml(data.chartTitle)}</strong><span>${escapeHtml(chartTotal)} سجلًا أو تكرارًا</span></div>
        <div class="chart">${renderChart(data.chartItems)}</div>
      </div>
      <div class="method-note"><strong>منهجية القراءة:</strong> ${escapeHtml(data.analysisMode)}. بلغت جودة اكتمال البيانات الأساسية ${escapeHtml(data.completeness)}%. لا تُستنتج الأسباب الجذرية من الدرجات وحدها ما لم تتوفر أدلة نوعية أو تحليل مهاري إضافي.</div>
      <footer class="page-footer"><span>${APP_NAME} - تقرير تحليلي رسمي</span><span>صفحة 1 من ${totalPages}</span></footer>
    </section>

    <section class="report-page">
      <div class="page-accent"></div>
      <header class="report-header">
        <div class="brand"><div class="brand-mark">ت</div><div><strong>الاستنتاجات الرئيسة</strong><span>${escapeHtml(data.typeName)}</span></div></div>
        <div class="report-code">${escapeHtml(data.reportId)}</div>
      </header>
      <h1 class="report-title">النتائج ذات الأولوية</h1>
      <p class="report-subtitle">اختيرت النتائج الأعلى قيمة لاتخاذ القرار، وحُذفت الرموز التقنية والتكرارات التي لا تضيف معنى تربويًا للتقرير الرسمي.</p>
      <div class="finding-list">${renderFindings(data.findings)}</div>
      <div class="method-note"><strong>تنبيه مهني:</strong> درجة الثقة تعبّر عن قوة الإسناد داخل البيانات المتاحة، ولا تعني إثبات علاقة سببية أو تشخيص حالة فردية دون أدلة إضافية.</div>
      <footer class="page-footer"><span>${APP_NAME} - النتائج والاستنتاجات</span><span>صفحة 2 من ${totalPages}</span></footer>
    </section>

    <section class="report-page">
      <div class="page-accent"></div>
      <header class="report-header">
        <div class="brand"><div class="brand-mark">ت</div><div><strong>خطة التحسين والمتابعة</strong><span>إجراءات قابلة للتنفيذ والقياس</span></div></div>
        <div class="report-code">${escapeHtml(data.reportId)}</div>
      </header>
      <h1 class="report-title">الخطة المقترحة</h1>
      <table class="plan-table">
        <thead><tr><th>الأولوية</th><th>الإجراء</th><th>المسؤول</th><th>الإطار الزمني</th><th>مؤشر النجاح</th></tr></thead>
        <tbody>${renderPlan(data.plan)}</tbody>
      </table>
      <div class="two-columns">
        <section class="info-box"><h3>أدوات الجودة المستخدمة</h3><div class="tool-list">${renderTools(data.qualityTools)}</div></section>
        <section class="info-box"><h3>حدود التحليل وضوابط الاعتماد</h3><ul class="caution-list">${renderCautions(data.cautions)}</ul></section>
      </div>
      <section class="info-box" style="margin-top:5mm"><h3>توصية إعادة القياس</h3><p style="margin:0;color:#4b5669;font-size:9px;line-height:1.7">يُعاد القياس بعد تنفيذ الإجراءات ذات الأولوية وفي مدة تتناسب مع طبيعة التدخل، مع استخدام الأداة نفسها أو أداة مكافئة، ومقارنة المؤشرات قبل التدخل وبعده بدل الاكتفاء بوصف التنفيذ.</p></section>
      <div class="approval"><div>إعداد التقرير</div><div>مراجعة واعتماد</div><div>تاريخ المتابعة</div></div>
      <footer class="page-footer"><span>${APP_NAME} - خطة التحسين</span><span>صفحة 3 من ${totalPages}</span></footer>
    </section>
  </main>
  ${autoPrint ? `<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\/script>` : ""}
</body>
</html>`;
  }

  function openReport(context, options = {}) {
    if (!context?.analysis) throw new Error("لا توجد نتيجة تحليل جاهزة لإنشاء التقرير الرسمي.");
    const popup = window.open("", "taqareer-official-report");
    if (!popup) throw new Error("منع المتصفح فتح نافذة التقرير. اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.");
    try { popup.opener = null; } catch {}
    popup.document.open();
    popup.document.write(buildReportHtml(context, options));
    popup.document.close();
    return popup;
  }

  window.TaqareerReports = { buildReportData, buildReportHtml, openReport };
})();
