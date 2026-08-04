(() => {
  "use strict";

  const VERSION = "0.9.3";
  const PROTOCOL_VERSION = "4.0.0";
  const RECOVERY_VERSION = "1.0.0";
  const SEGMENTS = Object.freeze(["diagnostic", "findings", "interventions", "governance"]);
  const LABELS = Object.freeze({
    diagnostic: "القراءة التشخيصية",
    findings: "الاستنتاجات التربوية",
    interventions: "التدخلات التنفيذية",
    governance: "الجودة والمتابعة",
  });
  const DEFAULT_RECOVERY_POLICY = Object.freeze({
    enabled: true,
    maxAutomaticRetries: 2,
    delaysMs: Object.freeze([900, 2400]),
    jitterMs: 250,
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
        attempts: Number(statuses?.[segment]?.attempts || 1),
        automaticRetries: Number(statuses?.[segment]?.automaticRetries || 0),
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
    return {
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
  }

  function compactFindingContext(contract) {
    return (contract?.patchTargets?.findings || []).map(item => ({
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
      recoveryVersion: RECOVERY_VERSION,
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

  function normalizeRecoveryPolicy(value = {}) {
    const delays = Array.isArray(value.delaysMs) && value.delaysMs.length
      ? value.delaysMs.map(item => Math.max(0, Number(item) || 0))
      : [...DEFAULT_RECOVERY_POLICY.delaysMs];
    return {
      enabled: value.enabled !== undefined ? Boolean(value.enabled) : DEFAULT_RECOVERY_POLICY.enabled,
      maxAutomaticRetries: Math.max(0, Math.min(4, Number(value.maxAutomaticRetries ?? DEFAULT_RECOVERY_POLICY.maxAutomaticRetries) || 0)),
      delaysMs: delays,
      jitterMs: Math.max(0, Math.min(1000, Number(value.jitterMs ?? DEFAULT_RECOVERY_POLICY.jitterMs) || 0)),
    };
  }

  function classifyFailure(error) {
    const status = Number(error?.status || 0);
    const code = String(error?.code || error?.errorCode || "").trim();
    const message = String(error?.message || error || "تعذر إكمال الجزء.").trim();
    const lowered = message.toLowerCase();
    const nonRetryableStatus = [400, 401, 403, 404, 405, 413].includes(status);
    const nonRetryableMessage = /(رمز الوصول غير صحيح|النطاق غير مسموح|أكبر من الحد المسموح|العملية المطلوبة غير مدعومة|لم يُضبط رابط|مفتاح supabase|جزء التحليل المطلوب غير مدعوم|جزء التحليل غير صالح)/i.test(message);
    const retryableStatus = status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
    const retryableMessage = /(timeout|timed out|network|failed to fetch|انتهت مهلة|تعذر الاتصال|مؤقت|حد الإخراج|max_tokens|json غير صالح|المحاولة المختصرة|gemini|rate limit|quota|overload|unavailable|internal)/i.test(lowered);
    const explicitRetryable = typeof error?.retryable === "boolean" ? error.retryable : null;
    const retryable = explicitRetryable === null
      ? (!nonRetryableStatus && !nonRetryableMessage && (retryableStatus || retryableMessage))
      : (!nonRetryableStatus && !nonRetryableMessage && explicitRetryable);
    const retryAfterMs = Math.max(0, Number(error?.retryAfterMs || 0) || 0);
    return { retryable, status, code, message, retryAfterMs };
  }

  function recoveryDelayMs(round, policy) {
    const index = Math.max(0, round - 1);
    const configured = policy.delaysMs[index];
    const fallbackBase = policy.delaysMs.at(-1) ?? 900;
    const base = configured !== undefined ? configured : fallbackBase * Math.max(1, 2 ** (index - policy.delaysMs.length + 1));
    const jitter = policy.jitterMs ? Math.floor(Math.random() * (policy.jitterMs + 1)) : 0;
    return Math.max(0, Math.round(base + jitter));
  }

  async function wait(ms) {
    if (ms <= 0) return;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  function failureMessage(failures) {
    return Object.entries(failures || {})
      .map(([segment, error]) => `${LABELS[segment] || segment}: ${error?.message || error}`)
      .join(" | ");
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
    const recoveryPolicy = normalizeRecoveryPolicy(options.recoveryPolicy || {});
    if (!ai?.enrichSegmentDetailed) throw new Error("عميل التحليل المقسّم غير محمل.");

    const results = { ...previousResults };
    const statuses = {};
    const failures = {};
    const firstFailedSegments = new Set();
    const recoveredSegments = new Set();
    const recoveryHistory = [];
    let totalPayloadChars = 0;
    let automaticRetriesUsed = 0;
    const startedAt = globalThis.performance?.now?.() ?? Date.now();

    for (const segment of SEGMENTS) {
      if (!results[segment]) continue;
      statuses[segment] = {
        status: "success",
        cacheHit: Boolean(results[segment]?.cacheHit),
        payloadChars: 0,
        durationMs: 0,
        attempts: 1,
        automaticRetries: 0,
        preserved: true,
      };
    }

    const publish = (segment = "") => {
      onProgress({
        segment,
        statuses: clone(statuses),
        results: clone(results),
        delta: mergeSegmentResults(results, statuses),
        failures: clone(failures),
        recovery: {
          version: RECOVERY_VERSION,
          automaticRetriesUsed,
          maxAutomaticRetries: recoveryPolicy.maxAutomaticRetries,
          recoveredSegments: [...recoveredSegments],
          history: clone(recoveryHistory),
        },
      });
    };

    const invokeOne = async (segment, context = {}) => {
      const automaticRetryRound = Number(context.automaticRetryRound || 0);
      const payload = buildSegmentPayload(basePayload, segment);
      const payloadChars = JSON.stringify(payload).length;
      totalPayloadChars += payloadChars;
      const cacheKey = performanceApi?.makeKey
        ? await performanceApi.makeKey(`deep-segment-v4:${segment}`, payload)
        : "";
      const cached = !force && automaticRetryRound === 0 && cacheKey && performanceApi?.cacheGet
        ? performanceApi.cacheGet(cacheKey)
        : null;
      const attempts = Number(statuses[segment]?.attempts || 0) + 1;
      statuses[segment] = {
        ...statuses[segment],
        status: automaticRetryRound > 0 ? "recovering" : "pending",
        cacheHit: false,
        payloadChars,
        attempts,
        automaticRetries: automaticRetryRound,
        retryable: undefined,
        error: "",
      };
      publish(segment);

      if (cached?.result) {
        results[segment] = { ...cached, cacheHit: true };
        delete failures[segment];
        statuses[segment] = {
          ...statuses[segment],
          status: "success",
          cacheHit: true,
          durationMs: 0,
        };
        publish(segment);
        return true;
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
          cacheHit: false,
        };
        const durationMs = Number(response.clientTiming?.durationMs)
          || Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - segmentStarted);
        if (firstFailedSegments.has(segment)) recoveredSegments.add(segment);
        delete failures[segment];
        statuses[segment] = {
          ...statuses[segment],
          status: "success",
          cacheHit: false,
          durationMs,
          retryable: undefined,
          error: "",
        };
        if (cacheKey && performanceApi?.cacheSet) performanceApi.cacheSet(cacheKey, results[segment]);
        publish(segment);
        return true;
      } catch (error) {
        const classification = classifyFailure(error);
        firstFailedSegments.add(segment);
        failures[segment] = error;
        statuses[segment] = {
          ...statuses[segment],
          status: "failed",
          cacheHit: false,
          durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - segmentStarted),
          retryable: classification.retryable,
          error: classification.message,
          errorStatus: classification.status,
          errorCode: classification.code,
          retryAfterMs: classification.retryAfterMs,
        };
        publish(segment);
        return false;
      }
    };

    await Promise.all(retrySegments.map(segment => invokeOne(segment)));

    if (recoveryPolicy.enabled && recoveryPolicy.maxAutomaticRetries > 0) {
      for (let round = 1; round <= recoveryPolicy.maxAutomaticRetries; round++) {
        const candidates = retrySegments.filter(segment => failures[segment] && statuses[segment]?.retryable !== false);
        if (!candidates.length) break;
        automaticRetriesUsed = round;
        const requestedRetryAfterMs = Math.max(0, ...candidates.map(segment => Number(statuses[segment]?.retryAfterMs || 0)));
        const delayMs = Math.max(recoveryDelayMs(round, recoveryPolicy), requestedRetryAfterMs);
        for (const segment of candidates) {
          statuses[segment] = {
            ...statuses[segment],
            status: "recovery_wait",
            automaticRetries: round,
            nextRetryMs: delayMs,
            maxAutomaticRetries: recoveryPolicy.maxAutomaticRetries,
          };
        }
        recoveryHistory.push({
          round,
          segments: [...candidates],
          delayMs,
          startedAt: Date.now(),
        });
        publish(candidates[0] || "");
        await wait(delayMs);
        await Promise.all(candidates.map(segment => invokeOne(segment, { automaticRetryRound: round })));
        const historyItem = recoveryHistory.at(-1);
        if (historyItem) {
          historyItem.completedAt = Date.now();
          historyItem.succeeded = candidates.filter(segment => !failures[segment]);
          historyItem.failed = candidates.filter(segment => failures[segment]);
        }
      }
    }

    const succeededSegments = SEGMENTS.filter(segment => results[segment]);
    const failedSegments = retrySegments.filter(segment => failures[segment]);
    if (!succeededSegments.length) {
      throw new Error(failureMessage(failures) || "تعذرت أجزاء التحليل الذكي كلها.");
    }

    return {
      protocolVersion: PROTOCOL_VERSION,
      recoveryVersion: RECOVERY_VERSION,
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
      automaticRecovery: {
        enabled: recoveryPolicy.enabled,
        maxAutomaticRetries: recoveryPolicy.maxAutomaticRetries,
        automaticRetriesUsed,
        initiallyFailedSegments: [...firstFailedSegments],
        recoveredSegments: [...recoveredSegments],
        exhaustedSegments: failedSegments.filter(segment => statuses[segment]?.retryable !== false),
        nonRetryableSegments: failedSegments.filter(segment => statuses[segment]?.retryable === false),
        history: recoveryHistory,
      },
    };
  }

  globalThis.TaqareerDeepOrchestrator = {
    VERSION,
    PROTOCOL_VERSION,
    RECOVERY_VERSION,
    SEGMENTS,
    LABELS,
    DEFAULT_RECOVERY_POLICY,
    buildSegmentPayload,
    mergeSegmentResults,
    classifyFailure,
    normalizeRecoveryPolicy,
    recoveryDelayMs,
    run,
  };
})();
