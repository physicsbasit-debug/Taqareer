(() => {
  "use strict";

  // اسم الملف محفوظ للتوافق مع ترتيب التحميل القديم، لكن التنفيذ جديد بالكامل:
  // طلب Gemini واحد، غير حاجب للواجهة، مع ذاكرة مؤقتة وفشل آمن.
  const VERSION = "0.9.6";
  const PROTOCOL_VERSION = "5.0.0";
  const LABELS = Object.freeze({ enhancement: "التحسين التربوي الذكي" });
  const TASK_LABELS = Object.freeze({ "enhancement.single": "التحسين التربوي الذكي" });

  function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
  }

  function uniqueStrings(items, limit = 32) {
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

  function emptyDelta() {
    return {
      contractVersion: PROTOCOL_VERSION,
      deepAnalysisUnits: [],
      patches: [],
      additionalCautions: [],
      missingDataRequests: [],
    };
  }

  function compactMetrics(items) {
    return (Array.isArray(items) ? items : []).slice(0, 20).map(item => ({
      id: item?.id,
      label: item?.label,
      value: item?.value,
      note: item?.note,
      evidenceRef: item?.evidenceRef || (item?.id ? `metric:${item.id}` : ""),
    }));
  }

  function compactCharts(items) {
    return (Array.isArray(items) ? items : []).slice(0, 4).map(chart => ({
      id: chart?.id,
      type: chart?.type,
      title: chart?.title,
      description: chart?.description,
      data: Array.isArray(chart?.data) ? chart.data.slice(0, 16) : chart?.data,
      xKey: chart?.xKey,
      yKey: chart?.yKey,
      series: Array.isArray(chart?.series) ? chart.series.slice(0, 8) : chart?.series,
    }));
  }

  function reduceTarget(item, fields) {
    if (!item || typeof item !== "object") return null;
    const output = {
      id: String(item.id || ""),
      title: String(item.title || item.name || item.issue || ""),
      evidenceRefs: uniqueStrings(item.evidenceRefs || [], 6),
      allowedFields: fields,
    };
    if (item.statement) output.statement = String(item.statement).slice(0, 700);
    if (item.educationalImpact) output.educationalImpact = String(item.educationalImpact).slice(0, 600);
    if (item.recommendedAction) output.recommendedAction = String(item.recommendedAction).slice(0, 600);
    if (item.action) output.action = String(item.action).slice(0, 700);
    if (item.targetGroup) output.targetGroup = String(item.targetGroup).slice(0, 260);
    if (item.successIndicator) output.successIndicator = String(item.successIndicator).slice(0, 420);
    return output.id ? output : null;
  }

  function compactContract(contract) {
    const source = contract && typeof contract === "object" ? contract : {};
    const patchTargets = source.patchTargets && typeof source.patchTargets === "object" ? source.patchTargets : {};
    const diagnostics = (Array.isArray(source.deepAnalysisTargets) ? source.deepAnalysisTargets : [])
      .slice(0, 4)
      .map(item => ({
        id: String(item?.id || ""),
        title: String(item?.title || ""),
        currentAnalysis: String(item?.currentAnalysis || item?.analysis || "").slice(0, 800),
        evidenceRefs: uniqueStrings(item?.evidenceRefs || [], 6),
      }))
      .filter(item => item.id);
    const findings = (Array.isArray(patchTargets.findings) ? patchTargets.findings : [])
      .slice(0, 5)
      .map(item => reduceTarget(item, ["educationalImpact", "recommendedAction", "limitations"]))
      .filter(Boolean);
    const interventions = (Array.isArray(patchTargets.interventions) ? patchTargets.interventions : [])
      .slice(0, 4)
      .map(item => reduceTarget(item, ["action", "successIndicator", "monitoringMethod", "contingency"]))
      .filter(Boolean);
    return {
      version: String(source.version || "3.0.0"),
      mode: "single-fast-enhancement",
      family: String(source.family || "adaptive"),
      rules: {
        localCalculationsAreAuthoritative: true,
        targetIdsAreMandatory: true,
        maxDeepAnalysisUnits: diagnostics.length,
        maxPatches: Math.min(14, findings.length * 2 + interventions.length),
      },
      executive: source.executive ? {
        id: String(source.executive.id || "executive"),
        allowedFields: ["executiveSummary"],
      } : null,
      profile: null,
      deepAnalysisTargets: diagnostics,
      patchTargets: {
        findings,
        qualityTools: [],
        interventions,
        monitoring: [],
      },
    };
  }

  function compactPayload(basePayload) {
    const source = clone(basePayload || {});
    const deterministic = source.deterministicAnalysis && typeof source.deterministicAnalysis === "object"
      ? source.deterministicAnalysis
      : {};
    const data = source.data && typeof source.data === "object" ? source.data : {};
    const tableRows = Array.isArray(data.sampleRows) ? data.sampleRows.slice(0, 6) : [];
    const narrativeLines = Array.isArray(data.lines) ? data.lines.slice(0, 100) : [];
    const contract = compactContract(source.reconciliationContract || {});
    const allowedEvidence = new Set();
    for (const target of contract.deepAnalysisTargets) for (const ref of target.evidenceRefs || []) allowedEvidence.add(ref);
    for (const group of [contract.patchTargets.findings, contract.patchTargets.interventions]) {
      for (const target of group) for (const ref of target.evidenceRefs || []) allowedEvidence.add(ref);
    }
    for (const metric of compactMetrics(deterministic.metrics)) if (metric.evidenceRef) allowedEvidence.add(metric.evidenceRef);

    return {
      locale: source.locale || "ar-OM",
      appVersion: "0.9.6",
      pipeline: {
        mode: "single-fast-ai-enhancement-v1",
        goal: "تحسين تربوي عميق ومركز في طلب واحد دون إعادة الحسابات أو إنشاء عناصر جديدة.",
      },
      source: source.source || {},
      recognizedType: source.recognizedType || {},
      quality: {
        completeness: source.quality?.completeness,
        warnings: (source.quality?.warnings || []).slice(0, 6),
      },
      privacy: source.privacy || {},
      data: narrativeLines.length
        ? { lines: narrativeLines, sentLineCount: narrativeLines.length }
        : { headers: (data.headers || []).slice(0, 12), sampleRows: tableRows, sentRowCount: tableRows.length },
      deterministicAnalysis: {
        kind: deterministic.kind,
        typeId: deterministic.typeId,
        analysisProfile: deterministic.analysisProfile,
        executiveTitle: deterministic.executiveTitle,
        executiveSummary: deterministic.executiveSummary,
        metrics: compactMetrics(deterministic.metrics),
        charts: compactCharts(deterministic.charts),
        limitations: (deterministic.limitations || []).slice(0, 6),
        evidenceCatalog: (deterministic.evidenceCatalog || []).slice(0, 40),
      },
      reconciliationContract: contract,
      availableEvidenceRefs: uniqueStrings([
        ...(source.availableEvidenceRefs || []).filter(ref => allowedEvidence.has(String(ref))),
        ...allowedEvidence,
      ], 48),
    };
  }

  async function run({ basePayload, ai, performanceApi, force = false, onProgress = () => {} } = {}) {
    if (!ai?.enhanceFastDetailed) throw new Error("عميل التحسين الذكي السريع غير محمل.");
    const payload = compactPayload(basePayload);
    const payloadChars = JSON.stringify(payload).length;
    const cacheKey = performanceApi?.makeKey
      ? await performanceApi.makeKey("single-fast-enhancement-v1", payload)
      : "";
    const cached = !force && cacheKey && performanceApi?.cacheGet ? performanceApi.cacheGet(cacheKey) : null;
    onProgress({ status: "pending", payloadChars, cacheHit: false });
    if (cached?.result) {
      onProgress({ status: "success", payloadChars, cacheHit: true, result: cached.result });
      return {
        protocolVersion: PROTOCOL_VERSION,
        delta: cached.result,
        result: cached.result,
        cacheHit: true,
        payloadChars,
        durationMs: 0,
        model: cached.model || "Gemini",
        usage: cached.usage || null,
        serverTiming: cached.serverTiming || { fastSingle: true, cacheHit: true },
      };
    }

    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const response = await ai.enhanceFastDetailed(payload);
    const durationMs = Number(response?.clientTiming?.durationMs)
      || Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - startedAt);
    const result = response?.result && typeof response.result === "object" ? response.result : emptyDelta();
    const record = {
      result,
      model: response?.model || "Gemini",
      usage: response?.usage || null,
      serverTiming: response?.serverTiming || null,
    };
    if (cacheKey && performanceApi?.cacheSet) performanceApi.cacheSet(cacheKey, record);
    onProgress({ status: "success", payloadChars, cacheHit: false, result });
    return {
      protocolVersion: PROTOCOL_VERSION,
      delta: result,
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
    SEGMENTS: Object.freeze(["enhancement"]),
    LABELS,
    TASK_LABELS,
    compactPayload,
    run,
  };
})();
