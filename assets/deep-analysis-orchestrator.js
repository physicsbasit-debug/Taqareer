(() => {
  "use strict";

  const VERSION = "0.9.2";
  const PROTOCOL_VERSION = "4.0.0";
  const SEGMENTS = Object.freeze(["diagnostic", "findings", "interventions", "governance"]);
  const LABELS = Object.freeze({
    diagnostic: "القراءة التشخيصية",
    findings: "الاستنتاجات التربوية",
    interventions: "التدخلات التنفيذية",
    governance: "الجودة والمتابعة",
  });

  function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
  }

  function uniqueStrings(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map(item => String(item ?? "").trim()).filter(item => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  }

  function emptyDelta() {
    return {
      contractVersion: PROTOCOL_VERSION,
      deepAnalysisUnits: [],
      patches: [],
      additionalCautions: [],
      missingDataRequests: [],
      segmentAudit: [],
    };
  }

  function normalizeSegmentResult(segment, value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      contractVersion: String(source.contractVersion || PROTOCOL_VERSION),
      segment: String(source.segment || segment),
      deepAnalysisUnits: Array.isArray(source.deepAnalysisUnits) ? source.deepAnalysisUnits : [],
      patches: Array.isArray(source.patches) ? source.patches : [],
      additionalCautions: uniqueStrings(source.additionalCautions || []),
      missingDataRequests: uniqueStrings(source.missingDataRequests || []),
      validation: source.validation && typeof source.validation === "object" ? source.validation : {},
    };
  }

  function mergeSegmentResults(results, statuses = {}) {
    const merged = emptyDelta();
    for (const segment of SEGMENTS) {
      const current = results?.[segment];
      if (!current) continue;
      const normalized = normalizeSegmentResult(segment, current.result || current);
      merged.deepAnalysisUnits.push(...normalized.deepAnalysisUnits);
      merged.patches.push(...normalized.patches);
      merged.additionalCautions.push(...normalized.additionalCautions);
      merged.missingDataRequests.push(...normalized.missingDataRequests);
      merged.segmentAudit.push({
        segment,
        label: LABELS[segment],
        status: statuses?.[segment]?.status || "success",
        cacheHit: Boolean(statuses?.[segment]?.cacheHit),
        acceptedDeepAnalysisUnits: Number(normalized.validation?.acceptedDeepAnalysisUnits || normalized.deepAnalysisUnits.length || 0),
        acceptedPatches: Number(normalized.validation?.acceptedPatches || normalized.patches.length || 0),
      });
    }
    merged.additionalCautions = uniqueStrings(merged.additionalCautions).slice(0, 12);
    merged.missingDataRequests = uniqueStrings(merged.missingDataRequests).slice(0, 16);
    return merged;
  }

  function trimContract(contract, segment) {
    const source = clone(contract || {});
    const patchTargets = source.patchTargets && typeof source.patchTargets === "object" ? source.patchTargets : {};
    const rules = source.rules && typeof source.rules === "object" ? source.rules : {};
    const common = {
      version: source.version || "3.0.0",
      mode: "segmented-deep-analysis",
      family: source.family || "adaptive",
      rules: {
        ...rules,
        maxDeepAnalysisUnits: segment === "diagnostic" ? Number(rules.maxDeepAnalysisUnits || 6) : 0,
        maxPatches: segment === "diagnostic" ? 0
          : segment === "findings" ? Math.min(14, Number(rules.maxPatches || 30))
          : segment === "interventions" ? Math.min(18, Number(rules.maxPatches || 30))
          : Math.min(18, Number(rules.maxPatches || 30)),
      },
      executive: segment === "findings" ? source.executive : null,
      profile: segment === "findings" ? source.profile : null,
      deepAnalysisTargets: segment === "diagnostic" ? (source.deepAnalysisTargets || []) : [],
      patchTargets: {
        findings: segment === "findings" ? (patchTargets.findings || []) : [],
        qualityTools: segment === "governance" ? (patchTargets.qualityTools || []) : [],
        interventions: segment === "interventions" ? (patchTargets.interventions || []) : [],
        monitoring: segment === "governance" ? (patchTargets.monitoring || []) : [],
      },
    };
    return common;
  }

  function compactFindingContext(contract) {
    const findings = contract?.patchTargets?.findings || [];
    return findings.map(item => ({
      id: item.id,
      title: item.title,
      statement: item.statement,
      evidenceRefs: item.evidenceRefs || [],
      confidence: item.confidence,
      severity: item.severity,
    }));
  }

  function compactDiagnosticContext(contract) {
    return (contract?.deepAnalysisTargets || []).map(item => ({
      id: item.id,
      title: item.title,
      currentAnalysis: item.currentAnalysis,
      evidenceRefs: item.evidenceRefs || [],
      confidence: item.confidence,
    }));
  }

  function buildSegmentPayload(basePayload, segment) {
    if (!SEGMENTS.includes(segment)) throw new Error(`جزء التحليل غير معروف: ${segment}`);
    const base = clone(basePayload || {});
    const fullContract = base.reconciliationContract || {};
    const data = base.data && typeof base.data === "object" ? base.data : {};
    const deterministic = base.deterministicAnalysis && typeof base.deterministicAnalysis === "object"
      ? base.deterministicAnalysis
      : {};

    const payload = {
      locale: base.locale || "ar-OM",
      appVersion: VERSION,
      protocolVersion: PROTOCOL_VERSION,
      segment,
      segmentLabel: LABELS[segment],
      pipeline: {
        mode: "segmented-deep-analysis-v4",
        purpose: segment,
        instruction: "حلل الجزء المحدد فقط، وأعد تحسينات مرتبطة بالعقد المحلي دون إنشاء عناصر موازية أو تغيير الحسابات.",
      },
      source: base.source,
      recognizedType: base.recognizedType,
      quality: base.quality,
      privacy: base.privacy,
      deterministicAnalysis: deterministic,
      reconciliationContract: trimContract(fullContract, segment),
      availableEvidenceRefs: base.availableEvidenceRefs || [],
      evidenceReferenceGuide: base.evidenceReferenceGuide || {},
      contextSnapshot: {
        diagnosticTargets: compactDiagnosticContext(fullContract),
        findings: compactFindingContext(fullContract),
      },
    };

    if (segment === "diagnostic") {
      payload.data = data;
    } else if (segment === "findings") {
      payload.data = Array.isArray(data.lines)
        ? { ...data, lines: data.lines.slice(0, 120) }
        : { ...data, sampleRows: Array.isArray(data.sampleRows) ? data.sampleRows.slice(0, 8) : [] };
    } else {
      payload.data = {
        mode: "derived-evidence-only",
        rowCount: data.rowCount || 0,
        originalLineCount: data.originalLineCount || 0,
        note: "يعتمد هذا الجزء على المؤشرات والأدلة والعقد المحلي، ولا يحتاج البيانات الخام الكاملة.",
      };
    }

    return payload;
  }

  function failureMessage(failures) {
    const items = Object.entries(failures || {}).map(([segment, error]) => `${LABELS[segment] || segment}: ${error?.message || error}`);
    return items.join(" | ");
  }

  async function run(options = {}) {
    const basePayload = options.basePayload || {};
    const ai = options.ai || globalThis.TaqareerAI;
    const performanceApi = options.performanceApi || globalThis.TaqareerPerformance;
    const previousResults = { ...(options.previousResults || {}) };
    const retrySegments = Array.isArray(options.retrySegments) && options.retrySegments.length
      ? options.retrySegments.filter(segment => SEGMENTS.includes(segment))
      : SEGMENTS;
    const force = Boolean(options.force);
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    if (!ai?.enrichSegmentDetailed) throw new Error("عميل التحليل المقسّم غير محمل.");

    const results = { ...previousResults };
    const statuses = {};
    const failures = {};
    let totalPayloadChars = 0;
    const startedAt = globalThis.performance?.now?.() ?? Date.now();

    const invokeOne = async segment => {
      const payload = buildSegmentPayload(basePayload, segment);
      const payloadChars = JSON.stringify(payload).length;
      totalPayloadChars += payloadChars;
      const cacheKey = performanceApi?.makeKey
        ? await performanceApi.makeKey(`deep-segment-v4:${segment}`, payload)
        : "";
      const cached = !force && cacheKey && performanceApi?.cacheGet ? performanceApi.cacheGet(cacheKey) : null;
      statuses[segment] = { status: "pending", cacheHit: false, payloadChars };
      onProgress({ segment, statuses: clone(statuses), results: clone(results), delta: mergeSegmentResults(results, statuses) });

      if (cached?.result) {
        results[segment] = cached;
        statuses[segment] = { status: "success", cacheHit: true, payloadChars, durationMs: 0 };
        onProgress({ segment, statuses: clone(statuses), results: clone(results), delta: mergeSegmentResults(results, statuses) });
        return;
      }

      const segmentStarted = globalThis.performance?.now?.() ?? Date.now();
      try {
        const response = await ai.enrichSegmentDetailed(payload);
        results[segment] = {
          result: response.result,
          usage: response.usage || null,
          model: response.model || "Gemini",
          serverTiming: response.serverTiming || null,
          clientTiming: response.clientTiming || null,
        };
        const durationMs = Number(response.clientTiming?.durationMs) || Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - segmentStarted);
        statuses[segment] = { status: "success", cacheHit: false, payloadChars, durationMs };
        if (cacheKey && performanceApi?.cacheSet) performanceApi.cacheSet(cacheKey, results[segment]);
      } catch (error) {
        failures[segment] = error;
        statuses[segment] = {
          status: "failed",
          cacheHit: false,
          payloadChars,
          durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - segmentStarted),
          error: error?.message || String(error),
        };
      }
      onProgress({ segment, statuses: clone(statuses), results: clone(results), delta: mergeSegmentResults(results, statuses), failures: clone(failures) });
    };

    await Promise.all(retrySegments.map(invokeOne));

    const succeededSegments = SEGMENTS.filter(segment => results[segment]);
    const failedSegments = retrySegments.filter(segment => failures[segment]);
    if (!succeededSegments.length) {
      throw new Error(failureMessage(failures) || "تعذرت أجزاء التحليل الذكي كلها.");
    }

    return {
      protocolVersion: PROTOCOL_VERSION,
      delta: mergeSegmentResults(results, statuses),
      results,
      statuses,
      failures,
      succeededSegments,
      failedSegments,
      allSucceeded: failedSegments.length === 0,
      partialSuccess: failedSegments.length > 0,
      payloadChars: totalPayloadChars,
      durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - startedAt),
      cacheHits: SEGMENTS.filter(segment => statuses[segment]?.cacheHit).length,
    };
  }

  globalThis.TaqareerDeepOrchestrator = {
    VERSION,
    PROTOCOL_VERSION,
    SEGMENTS,
    LABELS,
    buildSegmentPayload,
    mergeSegmentResults,
    run,
  };
})();
