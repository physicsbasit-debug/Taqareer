(() => {
  "use strict";

  // Phase 2-A: الذكاء الاصطناعي هو مالك التحليل التربوي، بينما يبقى
  // المحرك المحلي مسؤولًا عن الحسابات والرسوم وحزمة الأدلة فقط.
  const VERSION = "1.0.1";
  const PROTOCOL_VERSION = "6.0.0";
  const LABELS = Object.freeze({ primary: "التحليل التربوي الذكي" });
  const TASK_LABELS = Object.freeze({ "analysis.primary": "التحليل التربوي الذكي" });

  function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
  }

  function uniqueStrings(items, limit = 160) {
    const seen = new Set();
    const output = [];
    for (const item of Array.isArray(items) ? items : []) {
      const text = String(item ?? "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      output.push(text);
      if (output.length >= limit) break;
    }
    return output;
  }

  function compactMetrics(items) {
    return (Array.isArray(items) ? items : []).slice(0, 24).map(item => ({
      id: String(item?.id || ""),
      label: String(item?.label || ""),
      value: item?.value,
      note: String(item?.note || "").slice(0, 320),
      format: item?.format,
      evidenceRef: String(item?.evidenceRef || (item?.id ? `metric:${item.id}` : "")),
    })).filter(item => item.id || item.label);
  }

  function compactCharts(items) {
    return (Array.isArray(items) ? items : []).slice(0, 6).map(chart => ({
      id: String(chart?.id || ""),
      type: String(chart?.type || ""),
      title: String(chart?.title || "").slice(0, 220),
      description: String(chart?.description || "").slice(0, 420),
      data: Array.isArray(chart?.data) ? chart.data.slice(0, 18) : chart?.data,
      xKey: chart?.xKey,
      yKey: chart?.yKey,
      valueSuffix: chart?.valueSuffix,
      series: Array.isArray(chart?.series) ? chart.series.slice(0, 12) : chart?.series,
    }));
  }

  function compactEvidenceAnalysis(analysis) {
    const source = analysis && typeof analysis === "object" ? analysis : {};
    return {
      version: source.version,
      kind: source.kind,
      typeId: source.typeId,
      metrics: compactMetrics(source.metrics),
      charts: compactCharts(source.charts),
      evidenceCatalog: (Array.isArray(source.evidenceCatalog) ? source.evidenceCatalog : [])
        .slice(0, 80)
        .map(item => ({ ref: String(item?.ref || ""), label: String(item?.label || item?.text || "").slice(0, 420) }))
        .filter(item => item.ref),
      calculationLimitations: (Array.isArray(source.limitations) ? source.limitations : []).slice(0, 12).map(String),
      calculationMetadata: {
        validRecordCount: source.n ?? source.total ?? source.rowCount ?? null,
        thresholdPct: source.thresholdPct ?? null,
        maxScore: source.maxScore ?? null,
      },
    };
  }

  function compactData(data) {
    const source = data && typeof data === "object" ? data : {};
    if (Array.isArray(source.lines)) {
      return {
        mode: "narrative",
        lines: source.lines.slice(0, 120).map(item => ({
          ref: String(item?.ref || ""),
          text: String(item?.text || "").slice(0, 1200),
        })).filter(item => item.ref && item.text),
        originalLineCount: Number(source.originalLineCount || source.lines.length || 0),
        sentLineCount: Math.min(120, Number(source.sentLineCount || source.lines.length || 0)),
      };
    }
    return {
      mode: "table",
      headers: (Array.isArray(source.headers) ? source.headers : []).slice(0, 20).map(String),
      sampleRows: (Array.isArray(source.sampleRows) ? source.sampleRows : []).slice(0, 60),
      rowCount: Number(source.rowCount || 0),
      sentRowCount: Math.min(60, Number(source.sentRowCount || source.sampleRows?.length || 0)),
      maskedHeaders: (Array.isArray(source.maskedHeaders) ? source.maskedHeaders : []).slice(0, 20).map(String),
      sampling: String(source.sampling || ""),
      truncated: Boolean(source.truncated),
    };
  }

  function compactPayload(basePayload) {
    const source = clone(basePayload || {});
    const evidenceAnalysis = compactEvidenceAnalysis(source.evidenceAnalysis || source.deterministicAnalysis || {});
    const availableEvidenceRefs = uniqueStrings([
      ...(source.availableEvidenceRefs || []),
      ...evidenceAnalysis.metrics.map(item => item.evidenceRef),
      ...evidenceAnalysis.evidenceCatalog.map(item => item.ref),
    ].filter(Boolean), 180);

    return {
      locale: source.locale || "ar-OM",
      appVersion: VERSION,
      protocolVersion: PROTOCOL_VERSION,
      pipeline: {
        mode: "ai-primary-analysis-v1",
        ownership: {
          calculationsAndCharts: "local-evidence-engine",
          diagnosisFindingsInterventions: "gemini-primary-analyst",
          validationAndEvidenceGates: "server-and-client",
        },
        goal: "إنتاج تحليل تربوي أصيل ومخصص للسياق من الأدلة، لا تحسين قوالب محلية سابقة.",
      },
      source: source.source || {},
      recognizedType: source.recognizedType || {},
      quality: {
        completeness: source.quality?.completeness,
        blockers: (source.quality?.blockers || []).slice(0, 10),
        warnings: (source.quality?.warnings || []).slice(0, 12),
        info: (source.quality?.info || []).slice(0, 8),
      },
      privacy: source.privacy || {},
      data: compactData(source.data || {}),
      evidenceAnalysis,
      availableEvidenceRefs,
      evidenceReferenceGuide: source.evidenceReferenceGuide || {
        rows: "row:N سجل سياقي مرسل",
        lines: "line:N سطر من النص المصدر",
        metrics: "metric:NAME مؤشر محسوب من كامل البيانات",
      },
      analysisCharter: {
        factsMustUseEvidenceRefs: true,
        separateFactInferenceHypothesis: true,
        doNotInventNumbersOrCauses: true,
        doNotRepeatFixedTemplateCounts: true,
        chooseDepthByEvidence: true,
        everyInterventionMustAddressAFinding: true,
        acknowledgeMissingData: true,
        outputLanguage: "العربية الواضحة المهنية",
      },
    };
  }

  async function run({ basePayload, ai, onProgress = () => {} } = {}) {
    if (!ai?.analyzePrimaryDetailed) throw new Error("عميل التحليل الذكي الأساسي غير محمل.");
    const payload = compactPayload(basePayload);
    const payloadChars = JSON.stringify(payload).length;
    onProgress({ status: "pending", stage: "analysis", payloadChars, cacheHit: false });

    // لا نعيد استخدام تحليل تربوي قديم لمجرد تطابق الملف. كل تشغيل يطلب قراءة
    // جديدة من المحلل الذكي، بينما تظل الأرقام نفسها ثابتة ومحكومة بالأدلة.
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const response = await ai.analyzePrimaryDetailed(payload);
    const durationMs = Number(response?.clientTiming?.durationMs)
      || Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - startedAt);
    const result = response?.result && typeof response.result === "object" ? response.result : null;
    if (!result) throw new Error("لم يرجع المحلل الذكي نتيجة قابلة للاستخدام.");

    onProgress({ status: "success", stage: "analysis", payloadChars, cacheHit: false, result });
    return {
      protocolVersion: PROTOCOL_VERSION,
      result,
      cacheHit: false,
      payloadChars,
      durationMs,
      model: response?.model || "Gemini",
      usage: response?.usage || null,
      serverTiming: response?.serverTiming || null,
    };
  }

  globalThis.TaqareerDeepOrchestrator = {
    VERSION,
    PROTOCOL_VERSION,
    SEGMENTS: Object.freeze(["primary"]),
    LABELS,
    TASK_LABELS,
    compactPayload,
    run,
  };
})();
