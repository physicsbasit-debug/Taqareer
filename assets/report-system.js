(() => {
  "use strict";

  const APP_NAME = "تقارير";
  const VERSION = "0.6.1";

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
      school: capture([/المدرسة\s*[:：-]?\s*([^|]{3,90})/i, /([^|]{3,70}الصفوف\s*\([^)]*\))/i, /مدرسة\s+([^|]{3,90})/i]),
      subject: capture([/مادة\s+دراسية\s*\(\s*([^)]+?)\s*\)/i, /المادة\s*[:：-]?\s*\(?\s*([^)|]{2,45})/i, /لمادة\s+\(?\s*([^)|]{2,45})/i]),
      grade: capture([/الصف\s*[:：-]?\s*([^|\-]{1,35})/i]),
      academicYear: capture([/(20\d{2}\s*[\/]\s*20\d{2})/, /العام\s*الدراس[يى]\s*[:：-]?\s*([^|\-]{4,15})/i]),
      period: capture([/امتحان\s+نهاية\s+الفصل\s+الدراس[يى]\s+(الأول|الاول|الثاني)/i, /الفصل\s*الدراس[يى]\s*[:：-]?\s*(الأول|الاول|الثاني)/i, /الفترة\s*[:：-]?\s*([^|\-]{2,35})/i]),
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
      sourceName: context.sourceName || "—",
      analysisKind: analysis.kind || "unknown"
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

  function shortReportTitle(data) {
    const subject = data.meta.subject && !/غير محدد/.test(data.meta.subject) ? data.meta.subject : "";
    const grade = data.meta.grade && !/غير محدد/.test(data.meta.grade) ? data.meta.grade : "";
    if (data.analysisKind === "scores") return ["تقرير تحليل نتائج", subject ? `مادة ${subject}` : "مكوّن تقويمي", grade ? `- الصف ${grade}` : ""].filter(Boolean).join(" ");
    if (data.analysisKind === "narrative") return ["تقرير التحليل الإشرافي السردي", subject ? `- ${subject}` : ""].filter(Boolean).join(" ");
    if (data.analysisKind === "levels") return ["تقرير توزيع مستويات الأداء", subject ? `- ${subject}` : ""].filter(Boolean).join(" ");
    return `تقرير التحليل التربوي - ${data.typeName}`;
  }

  function reportLayout(data) {
    const findingsChars = data.findings.reduce((sum, item) => sum + String(item.title || "").length + String(item.statement || "").length + String(item.evidence || "").length + String(item.impact || "").length, 0);
    const planChars = data.plan.reduce((sum, item) => sum + String(item.action || "").length + String(item.successIndicator || "").length, 0);
    const single = data.findings.length <= 2 && data.plan.length <= 1 && data.qualityTools.length <= 1 && findingsChars <= 1500 && planChars <= 800 && data.executiveSummary.length <= 950;
    const mode = single ? "single" : "double";
    return { mode, single, extended: false, totalPages: single ? 1 : 2 };
  }

  function renderCompactFindings(findings, startIndex = 0) {
    if (!findings.length) return `<div class="empty-state">لم تُنتج استنتاجات قابلة للإدراج في التقرير الرسمي.</div>`;
    return findings.map((item, index) => {
      const evidence = item.evidence || item.statement || "يحتاج الدليل إلى مراجعة قبل الاعتماد.";
      return `<article class="insight-card">
        <div class="insight-number">${startIndex + index + 1}</div>
        <div class="insight-body">
          <div class="insight-head"><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.confidence)}</span></div>
          ${item.statement ? `<p>${escapeHtml(clampText(item.statement, 260))}</p>` : ""}
          <div class="insight-evidence"><strong>الدليل:</strong> ${escapeHtml(clampText(evidence, 260))}</div>
          ${item.impact ? `<div class="insight-impact"><strong>الأثر:</strong> ${escapeHtml(clampText(item.impact, 220))}</div>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function renderPlanBlock(plan) {
    if (!plan.length) return `<div class="empty-state compact">لا توجد خطة تحسين جاهزة للاعتماد.</div>`;
    if (plan.length === 1) {
      const item = plan[0];
      return `<article class="single-action">
        <div class="single-action-top"><span class="priority ${normalize(item.priority).includes("عالي") ? "high" : "medium"}">${escapeHtml(item.priority)}</span><h3>${escapeHtml(item.action)}</h3></div>
        <div class="single-action-meta">
          <div><span>المسؤول</span><strong>${escapeHtml(item.responsibleRole)}</strong></div>
          <div><span>الإطار الزمني</span><strong>${escapeHtml(item.timeframe)}</strong></div>
          <div><span>مؤشر النجاح</span><strong>${escapeHtml(item.successIndicator)}</strong></div>
        </div>
      </article>`;
    }
    return `<table class="plan-table"><thead><tr><th>الأولوية</th><th>الإجراء</th><th>المسؤول</th><th>الزمن</th><th>مؤشر النجاح</th></tr></thead><tbody>${renderPlan(plan)}</tbody></table>`;
  }

  function renderDecisionSupport(data) {
    const tools = data.qualityTools.length ? `<section class="support-box"><h3>أدوات الجودة</h3><div class="tool-list">${renderTools(data.qualityTools)}</div></section>` : "";
    const cautions = `<section class="support-box"><h3>حدود التحليل</h3><ul class="caution-list">${renderCautions(data.cautions)}</ul></section>`;
    return `<div class="support-grid ${data.qualityTools.length ? "" : "single"}">${tools}${cautions}</div>`;
  }

  function reportHeader(data, title, subtitle = "") {
    return `<div class="page-accent"></div>
      <header class="report-header">
        <div class="brand"><div class="brand-mark">ت</div><div><strong>${APP_NAME}</strong><span>منصة التحليل التربوي الذكي</span></div></div>
        <div class="header-title"><h2>${escapeHtml(title)}</h2>${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}</div>
        <div class="report-code">${escapeHtml(data.reportId)}<br>${escapeHtml(data.generatedAt)}</div>
      </header>`;
  }

  function pageFooter(data, page, total) {
    return `<footer class="page-footer"><span>${APP_NAME} - تقرير رسمي قابل للمراجعة</span><span>صفحة ${page} من ${total}</span></footer>`;
  }

  function buildReportHtml(context, options = {}) {
    const data = buildReportData(context);
    const autoPrint = options.autoPrint === true;
    const layout = reportLayout(data);
    const totalPages = layout.totalPages;
    const chartTotal = data.chartItems.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const reportTitle = shortReportTitle(data);
    const sourceTitle = data.meta.title && normalize(data.meta.title) !== normalize(reportTitle) ? data.meta.title : "";
    const overviewFindings = layout.single ? [] : data.findings.slice(0, 2);
    const detailFindings = layout.single ? data.findings : data.findings.slice(2);

    const overviewCore = `
      ${reportHeader(data, "التقرير التحليلي", data.typeName)}
      <div class="title-zone"><h1>${escapeHtml(reportTitle)}</h1>${sourceTitle ? `<p>${escapeHtml(clampText(sourceTitle, 220))}</p>` : ""}</div>
      <div class="meta-grid">${renderMeta(data.meta, data)}</div>
      <div class="executive-row">
        <div class="executive-copy"><div class="mini-title">الملخص التنفيذي</div><h2>${escapeHtml(data.executiveTitle)}</h2><p>${escapeHtml(data.executiveSummary)}</p></div>
        <div class="judgment ${escapeHtml(data.judgment.tone)}"><span>الحكم العام</span><strong>${escapeHtml(data.judgment.label)}</strong><small>${escapeHtml(data.judgment.note)}</small></div>
      </div>
      <div class="metrics">${renderMetrics(data.metrics)}</div>
      <div class="chart-box"><div class="chart-heading"><strong>${escapeHtml(data.chartTitle)}</strong><span>${escapeHtml(chartTotal)} سجلًا أو تكرارًا</span></div><div class="chart">${renderChart(data.chartItems)}</div></div>
      <div class="method-note"><strong>منهجية القراءة:</strong> ${escapeHtml(data.analysisMode)}. اكتمال البيانات الأساسية ${escapeHtml(data.completeness)}%. لا تُنسب الأسباب الجذرية إلى الدرجات وحدها دون أدلة إضافية.</div>
      ${overviewFindings.length ? `<div class="section-divider overview-divider"><span>أبرز النتائج</span></div><div class="insights-grid overview-insights">${renderCompactFindings(overviewFindings, 0)}</div>` : ""}`;

    const compactDecisionCore = `
      <div class="section-divider"><span>النتائج ذات الأولوية وخطة التحسين</span></div>
      <div class="insights-grid compact-insights">${renderCompactFindings(data.findings)}</div>
      ${renderPlanBlock(data.plan)}
      ${renderDecisionSupport(data)}
      <div class="followup-strip"><strong>إعادة القياس:</strong> ينفذ بعد التدخل باستخدام الأداة نفسها أو أداة مكافئة، مع مقارنة المؤشرات قبل التنفيذ وبعده.</div>
      <div class="approval"><div>إعداد التقرير</div><div>مراجعة واعتماد</div><div>تاريخ المتابعة</div></div>`;

    const pageOne = layout.single
      ? `<section class="report-sheet single-sheet">${overviewCore}${compactDecisionCore}${pageFooter(data, 1, totalPages)}</section>`
      : `<section class="report-sheet">${overviewCore}${pageFooter(data, 1, totalPages)}</section>`;

    const findingsPage = layout.single ? "" : `<section class="report-sheet">
      ${reportHeader(data, "القراءة التربوية واتخاذ القرار", data.typeName)}
      <div class="section-heading"><div><span>النتائج الرئيسة</span><h1>الاستنتاجات ذات الأولوية</h1></div><p>مختصرة، مسندة، ومهيأة لاتخاذ إجراء واضح.</p></div>
      <div class="insights-grid">${renderCompactFindings(detailFindings, overviewFindings.length)}</div>
      ${layout.extended ? `<div class="professional-note"><strong>تنبيه مهني:</strong> الثقة تعبّر عن قوة الإسناد داخل البيانات المتاحة، ولا تعني إثبات السببية أو تشخيص حالة فردية.</div>` : `
      <div class="section-divider"><span>خطة التحسين والمتابعة</span></div>
      ${renderPlanBlock(data.plan)}
      ${renderDecisionSupport(data)}
      <div class="followup-strip"><strong>إعادة القياس:</strong> ينفذ بعد التدخل باستخدام الأداة نفسها أو أداة مكافئة، مع مقارنة المؤشرات قبل التنفيذ وبعده.</div>
      <div class="approval"><div>إعداد التقرير</div><div>مراجعة واعتماد</div><div>تاريخ المتابعة</div></div>`}
      ${pageFooter(data, 2, totalPages)}
    </section>`;

    const planPage = layout.extended ? `<section class="report-sheet">
      ${reportHeader(data, "خطة التحسين والمتابعة", "إجراءات قابلة للتنفيذ والقياس")}
      <div class="section-heading compact"><div><span>الخطة المقترحة</span><h1>من النتائج إلى التنفيذ</h1></div><p>ترتيب عملي للأولوية والمسؤول والزمن ومؤشر النجاح.</p></div>
      ${renderPlanBlock(data.plan)}
      ${renderDecisionSupport(data)}
      <div class="followup-strip"><strong>إعادة القياس:</strong> ينفذ بعد التدخل باستخدام الأداة نفسها أو أداة مكافئة، مع مقارنة المؤشرات قبل التنفيذ وبعده.</div>
      <div class="approval"><div>إعداد التقرير</div><div>مراجعة واعتماد</div><div>تاريخ المتابعة</div></div>
      ${pageFooter(data, 3, totalPages)}
    </section>` : "";

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)} | ${APP_NAME}</title>
  <style>
    :root{--navy:#14284f;--royal:#27499a;--teal:#14796f;--gold:#bb8a2c;--ink:#182238;--muted:#5f697b;--line:#d8dee8;--soft:#f5f7fa;--danger:#a33b33;--warning:#8a620e;--positive:#12675f}
    *{box-sizing:border-box}
    html,body{margin:0;background:#edf1f6;color:var(--ink);font-family:Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{direction:rtl}
    .report-toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:10px;padding:10px;background:rgba(20,40,79,.96);box-shadow:0 4px 16px rgba(0,0,0,.14)}
    .report-toolbar button{border:0;border-radius:7px;padding:9px 16px;font-weight:800;cursor:pointer}.report-toolbar .print{background:#fff;color:var(--navy)}.report-toolbar .close{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3)}
    .report-document{width:210mm;margin:14px auto}
    .report-sheet{width:210mm;margin:0 auto 14px;padding:9mm 11mm 8mm;background:#fff;box-shadow:0 10px 30px rgba(20,40,79,.12);break-after:page;page-break-after:always}
    .report-sheet:last-child{break-after:auto;page-break-after:auto}
    .page-accent{height:3px;background:linear-gradient(90deg,var(--navy),var(--royal),var(--teal));margin:-9mm -11mm 5mm}
    .report-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:4mm;padding-bottom:3mm;border-bottom:1px solid var(--navy)}
    .brand{display:flex;align-items:center;gap:2mm}.brand-mark{width:9mm;height:9mm;display:grid;place-items:center;border-radius:2mm;color:#fff;background:var(--navy);font-size:16px;font-weight:900}.brand strong{display:block;font-size:13px;color:var(--navy)}.brand span{display:block;color:var(--muted);font-size:7.5px}
    .header-title{text-align:center}.header-title h2{margin:0;color:var(--navy);font-size:13px}.header-title span{display:block;margin-top:1mm;color:var(--muted);font-size:8px}.report-code{text-align:left;direction:ltr;color:var(--muted);font-size:7.5px;line-height:1.55}
    .title-zone{padding:4mm 0 3mm}.title-zone h1{margin:0;color:var(--navy);font-size:18px;line-height:1.35}.title-zone p{margin:1.5mm 0 0;color:var(--muted);font-size:8.5px;line-height:1.55}
    .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);margin-bottom:3.5mm}.meta-item{padding:2.2mm 3mm;border-left:1px solid var(--line);border-bottom:1px solid var(--line);min-height:10mm}.meta-item:nth-child(3n){border-left:0}.meta-item:nth-last-child(-n+3){border-bottom:0}.meta-item span{display:block;color:var(--muted);font-size:7.5px}.meta-item strong{display:block;margin-top:.8mm;font-size:8.7px;line-height:1.35}
    .executive-row{display:grid;grid-template-columns:1fr 41mm;gap:3mm;margin-bottom:3mm}.executive-copy{padding:3.2mm 4mm;border:1px solid var(--line);border-right:3px solid var(--royal);background:#fbfcfe}.mini-title{color:var(--gold);font-size:8px;font-weight:800}.executive-copy h2{margin:1mm 0 1.2mm;color:var(--navy);font-size:12px}.executive-copy p{margin:0;color:#404b5e;font-size:8.8px;line-height:1.6}.judgment{display:flex;flex-direction:column;justify-content:center;padding:3.2mm;color:#fff;background:var(--navy)}.judgment.positive{background:var(--positive)}.judgment.warning{background:var(--warning)}.judgment.danger{background:var(--danger)}.judgment span{font-size:7.5px;opacity:.82}.judgment strong{margin:1.2mm 0;font-size:13px;line-height:1.35}.judgment small{font-size:7.5px;line-height:1.45;opacity:.92}
    .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin-bottom:3mm}.metric-card{padding:2.4mm 3mm;border:1px solid var(--line);border-top:2px solid var(--royal)}.metric-card span{display:block;color:var(--muted);font-size:7.5px}.metric-card strong{display:block;margin:1mm 0 .5mm;color:var(--navy);font-size:15px}.metric-card small{display:block;color:var(--teal);font-size:7.2px}
    .chart-box{padding:3mm 4mm;border:1px solid var(--line)}.chart-heading{display:flex;justify-content:space-between;margin-bottom:2mm}.chart-heading strong{color:var(--navy);font-size:10px}.chart-heading span{color:var(--muted);font-size:7.5px}.chart{display:grid;gap:1.5mm}.chart-row{display:grid;grid-template-columns:29mm 1fr 12mm;align-items:center;gap:2mm}.chart-label{font-size:7.8px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chart-track{height:6px;background:#e8ebf0;overflow:hidden}.chart-track span{display:block;height:100%;background:linear-gradient(90deg,var(--royal),var(--teal))}.chart-value{text-align:left;font-size:7.8px;font-weight:800;color:var(--navy)}
    .method-note,.professional-note{margin-top:2.5mm;padding:2.2mm 3mm;border-right:3px solid var(--teal);background:#f2f8f7;color:#43505d;font-size:7.6px;line-height:1.55}
    .section-heading{display:flex;justify-content:space-between;align-items:end;gap:6mm;padding:4mm 0 3mm}.section-heading.compact{padding-bottom:2mm}.section-heading span{color:var(--gold);font-size:8px;font-weight:800}.section-heading h1{margin:1mm 0 0;color:var(--navy);font-size:17px}.section-heading p{margin:0;color:var(--muted);font-size:8px;max-width:65mm;text-align:left}
    .insights-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm}.insight-card{display:grid;grid-template-columns:7mm 1fr;border:1px solid var(--line);break-inside:avoid;background:#fff}.insight-number{display:grid;place-items:center;color:#fff;background:var(--navy);font-size:10px;font-weight:900}.insight-body{padding:2.7mm 3mm}.insight-head{display:flex;justify-content:space-between;gap:2mm;align-items:start}.insight-head h3{margin:0;color:var(--navy);font-size:9.5px;line-height:1.4}.insight-head span{flex:none;padding:.6mm 1.5mm;background:#e9f5f2;color:var(--teal);font-size:6.8px;font-weight:800}.insight-body p{margin:1mm 0;color:#3f4a5d;font-size:7.7px;line-height:1.5}.insight-evidence,.insight-impact{margin-top:1mm;padding-top:1mm;border-top:1px solid #edf0f4;color:#4b5669;font-size:7.4px;line-height:1.45}.insight-evidence strong,.insight-impact strong{color:var(--gold)}
    .section-divider{display:flex;align-items:center;gap:3mm;margin:4mm 0 2.5mm;color:var(--navy);font-size:11px;font-weight:800}.section-divider:after{content:"";height:1px;flex:1;background:var(--line)}
    .single-action{border:1px solid var(--line);border-right:4px solid var(--gold);padding:3mm 4mm;break-inside:avoid}.single-action-top{display:flex;align-items:start;gap:3mm}.single-action-top h3{margin:0;color:var(--navy);font-size:10px;line-height:1.5}.single-action-meta{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:2mm;margin-top:2.5mm}.single-action-meta div{padding:2mm;background:var(--soft)}.single-action-meta span{display:block;color:var(--muted);font-size:6.8px}.single-action-meta strong{display:block;margin-top:.7mm;font-size:7.6px;line-height:1.4}
    .plan-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.5px}.plan-table th{padding:2mm 1.7mm;color:#fff;background:var(--navy);text-align:right}.plan-table td{padding:2mm 1.7mm;border:1px solid var(--line);vertical-align:top;line-height:1.42;overflow-wrap:anywhere}.plan-table th:nth-child(1){width:12mm}.plan-table th:nth-child(2){width:62mm}.plan-table th:nth-child(3){width:27mm}.plan-table th:nth-child(4){width:23mm}.plan-table th:nth-child(5){width:auto}.priority{display:inline-block;padding:.7mm 1.5mm;font-size:6.8px;font-weight:800;color:#75520a;background:#fff2c9}.priority.high{color:#8c2c26;background:#fde5e2}
    .support-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:3mm}.support-grid.single{grid-template-columns:1fr}.support-box{padding:2.8mm 3mm;border:1px solid var(--line);background:#fbfcfe}.support-box h3{margin:0 0 1.5mm;color:var(--navy);font-size:9px}.tool-list{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm}.tool-item{padding:1.8mm;border-right:2px solid var(--teal);background:#f2f8f7}.tool-item strong{display:block;color:var(--navy);font-size:7.5px}.tool-item p{margin:.7mm 0 0;color:#4d586a;font-size:6.8px;line-height:1.4}.caution-list{margin:0;padding:0 4mm 0 0}.caution-list li{margin:0 0 1mm;color:#4b5669;font-size:7.2px;line-height:1.45}
    .followup-strip{margin-top:3mm;padding:2.5mm 3mm;border:1px solid #d8caa3;background:#fffaf0;color:#4b5669;font-size:7.6px;line-height:1.5}.followup-strip strong{color:var(--navy)}
    .approval{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm;margin-top:4mm}.approval div{padding-top:5mm;border-top:1px solid #788397;color:#596477;text-align:center;font-size:7.2px}.page-footer{display:flex;justify-content:space-between;margin-top:4mm;padding-top:1.8mm;border-top:1px solid var(--line);color:#727c8d;font-size:7px}.empty-state{padding:5mm;border:1px dashed var(--line);color:var(--muted);text-align:center;font-size:8px}.empty-state.compact{padding:2.5mm;font-size:7.5px}
    .single-sheet .title-zone{padding-top:3mm;padding-bottom:2mm}.single-sheet .meta-grid{margin-bottom:2.5mm}.single-sheet .executive-row{margin-bottom:2.5mm}.single-sheet .metrics{margin-bottom:2.5mm}.single-sheet .chart-box{padding-top:2.5mm;padding-bottom:2.5mm}.single-sheet .method-note{margin-top:2mm}.single-sheet .section-divider{margin-top:3mm;margin-bottom:2mm}.single-sheet .compact-insights{gap:2mm}.single-sheet .insight-body{padding:2.2mm 2.6mm}.single-sheet .insight-body p{display:none}.single-sheet .single-action{margin-top:2mm;padding:2.5mm 3mm}.single-sheet .support-grid{margin-top:2mm}.single-sheet .support-box{padding:2.2mm 2.6mm}.single-sheet .followup-strip{margin-top:2mm;padding:2mm 2.5mm}.single-sheet .approval{margin-top:3mm}.single-sheet .approval div{padding-top:3.5mm}.single-sheet .page-footer{margin-top:3mm}
    .overview-divider{margin-top:2.5mm;margin-bottom:1.8mm}.overview-insights{gap:2mm}.overview-insights .insight-body{padding:2.1mm 2.5mm}.overview-insights .insight-body p{display:none}.overview-insights .insight-evidence,.overview-insights .insight-impact{font-size:7px}
    @page{size:A4;margin:9mm 10mm 10mm}
    @media print{html,body{background:#fff}.report-toolbar{display:none!important}.report-document{width:auto;margin:0}.report-sheet{width:auto;margin:0;padding:0;box-shadow:none}.page-accent{margin:0 0 5mm}.report-sheet{break-after:page;page-break-after:always}.report-sheet:last-child{break-after:auto;page-break-after:auto}}
    @media screen and (max-width:860px){.report-document,.report-sheet{width:100%}.report-sheet{padding:22px;margin:0 0 10px}.page-accent{margin:-22px -22px 18px}.report-header{grid-template-columns:auto 1fr}.report-code{display:none}.header-title{text-align:right}.meta-grid,.metrics,.insights-grid,.support-grid,.single-action-meta{grid-template-columns:1fr 1fr}.executive-row{grid-template-columns:1fr}.tool-list{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="report-toolbar"><button class="print" onclick="window.print()">طباعة التقرير أو حفظه PDF</button><button class="close" onclick="window.close()">إغلاق</button></div>
  <main class="report-document">${pageOne}${findingsPage}${planPage}</main>
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
