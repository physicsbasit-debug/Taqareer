(() => {
  "use strict";

  // Phase 2-A: الذكاء الاصطناعي هو مالك التحليل التربوي، بينما يبقى
  // المحرك المحلي مسؤولًا عن الحسابات والرسوم وحزمة الأدلة فقط.
  const VERSION = "1.4.1";
  const PROTOCOL_VERSION = "6.8.0";
  const CACHE_KEY = "taqareer-ai-decision-core-cache-v1";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const CACHE_MAX_ITEMS = 6;
  const LABELS = Object.freeze({ primary: "التحليل التربوي المتقدم" });
  const TASK_LABELS = Object.freeze({ "analysis.primary": "التحليل التربوي المتقدم" });

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
      scopeContext: source.scopeContext && typeof source.scopeContext === "object"
        ? {
            scopeType: String(source.scopeContext.scopeType || ""),
            sampleOnly: Boolean(source.scopeContext.sampleOnly),
            visitCount: Number(source.scopeContext.visitCount || 0),
            school: String(source.scopeContext.school || "").slice(0, 220),
            gradeRange: String(source.scopeContext.gradeRange || "").slice(0, 120),
            subjects: (Array.isArray(source.scopeContext.subjects) ? source.scopeContext.subjects : []).slice(0, 12).map(item => String(item).slice(0, 120)),
            departmentLabel: String(source.scopeContext.departmentLabel || "").slice(0, 220),
            populationLabel: String(source.scopeContext.populationLabel || "").slice(0, 260),
            analysisMode: String(source.scopeContext.analysisMode || ""),
            selectedSubject: String(source.scopeContext.selectedSubject || "").slice(0, 160),
            grade: String(source.scopeContext.grade || "").slice(0, 80),
            period: String(source.scopeContext.period || "").slice(0, 120),
            academicYear: String(source.scopeContext.academicYear || "").slice(0, 80),
            rankingPolicy: source.scopeContext.rankingPolicy && typeof source.scopeContext.rankingPolicy === "object" ? clone(source.scopeContext.rankingPolicy) : null,
            forbiddenBroaderPopulations: (Array.isArray(source.scopeContext.forbiddenBroaderPopulations) ? source.scopeContext.forbiddenBroaderPopulations : []).slice(0, 8).map(item => String(item).slice(0, 180)),
          }
        : null,
      interventionMathContext: source.interventionMathContext && typeof source.interventionMathContext === "object"
        ? {
            totalCount: Number(source.interventionMathContext.totalCount || 0),
            baselineMasteryCount: Number(source.interventionMathContext.baselineMasteryCount || 0),
            baselineMasteryRate: Number(source.interventionMathContext.baselineMasteryRate || 0),
            groups: (Array.isArray(source.interventionMathContext.groups) ? source.interventionMathContext.groups : [])
              .slice(0, 4)
              .map(item => ({
                id: String(item?.id || ""),
                label: String(item?.label || "").slice(0, 180),
                count: Number(item?.count || 0),
                percentage: Number(item?.percentage || 0),
              }))
              .filter(item => item.id),
          }
        : null,
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

  function scoreLikeType(typeId) {
    return ["student_results", "single_subject", "assessment_component", "level_distribution", "multi_subject_results", "cross_subject"].includes(String(typeId || ""));
  }

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function cacheFingerprint(payload) {
    const material = clone(payload || {});
    delete material.appVersion;
    if (material.source && typeof material.source === "object") delete material.source.name;
    return `${PROTOCOL_VERSION}:${fnv1a(JSON.stringify(material))}`;
  }

  function cacheStorage() {
    try { return globalThis.localStorage || null; } catch { return null; }
  }

  function readCachedAnalysis(key) {
    const storage = cacheStorage();
    if (!storage) return null;
    try {
      const parsed = JSON.parse(storage.getItem(CACHE_KEY) || "[]");
      const items = Array.isArray(parsed) ? parsed : [];
      const now = Date.now();
      const match = items.find(item => item?.key === key && Number(item?.createdAt || 0) > now - CACHE_TTL_MS && item?.result);
      return match || null;
    } catch { return null; }
  }

  function writeCachedAnalysis(key, outcome) {
    const storage = cacheStorage();
    if (!storage || !outcome?.result || outcome?.serverTiming?.localFallbackUsed) return;
    try {
      const now = Date.now();
      const parsed = JSON.parse(storage.getItem(CACHE_KEY) || "[]");
      const items = (Array.isArray(parsed) ? parsed : [])
        .filter(item => item?.key !== key && Number(item?.createdAt || 0) > now - CACHE_TTL_MS)
        .slice(0, CACHE_MAX_ITEMS - 1);
      items.unshift({
        key,
        createdAt: now,
        result: clone(outcome.result),
        model: String(outcome.model || "Gemini"),
        usage: clone(outcome.usage || null),
        serverTiming: clone(outcome.serverTiming || null),
      });
      storage.setItem(CACHE_KEY, JSON.stringify(items));
    } catch {}
  }

  function compactPayload(basePayload) {
    const source = clone(basePayload || {});
    const evidenceAnalysis = compactEvidenceAnalysis(source.evidenceAnalysis || source.deterministicAnalysis || {});
    const typeId = String(source.recognizedType?.id || evidenceAnalysis.typeId || "");
    const compactedData = compactData(source.data || {});
    if (scoreLikeType(typeId) && compactedData.mode === "table") {
      compactedData.headers = [];
      compactedData.sampleRows = [];
      compactedData.sentRowCount = 0;
      compactedData.sampling = "metrics-and-charts-only";
      compactedData.truncated = true;
    }
    const availableEvidenceRefs = uniqueStrings([
      ...(source.availableEvidenceRefs || []),
      ...evidenceAnalysis.metrics.map(item => item.evidenceRef),
      ...evidenceAnalysis.evidenceCatalog.map(item => item.ref),
    ].filter(Boolean), 180).filter(ref => !(scoreLikeType(typeId) && ref.startsWith("row:")));

    return {
      locale: source.locale || "ar-OM",
      appVersion: VERSION,
      protocolVersion: PROTOCOL_VERSION,
      pipeline: {
        mode: "ai-decision-core-v1",
        ownership: {
          calculationsAndCharts: "local-evidence-engine",
          diagnosisFindingsInterventions: "gemini-primary-with-local-evidence-fallback",
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
      data: compactedData,
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
        diagnosticAndDecisionTextMustDiffer: true,
        interventionsMustCoverDistinctGroupsOrIssues: true,
        interventionTargetsAndIndicatorsAreServerCalculatedForScores: true,
        impossibleNumericTargetsMustBeAdjustedOrRejected: true,
        monitoringMustIncludeBaselineCheckpointAndImpact: true,
        aggregateScoresCannotNameSpecificSkillsWithoutEvidence: true,
        interventionsCannotExceedObservedSampleScope: true,
        acknowledgeMissingData: true,
        outputLanguage: "العربية الواضحة المهنية",
      },
    };
  }

  async function run({ basePayload, ai, onProgress = () => {}, force = false } = {}) {
    if (!ai?.analyzePrimaryDetailed) throw new Error("عميل التحليل الذكي الأساسي غير محمل.");
    const payload = compactPayload(basePayload);
    const payloadChars = JSON.stringify(payload).length;
    const cacheKey = cacheFingerprint(payload);
    const cached = force ? null : readCachedAnalysis(cacheKey);
    if (cached) {
      onProgress({ status: "success", stage: "analysis", payloadChars, cacheHit: true, result: cached.result });
      return {
        protocolVersion: PROTOCOL_VERSION,
        result: clone(cached.result),
        cacheHit: true,
        payloadChars,
        durationMs: 0,
        model: cached.model || "Gemini",
        usage: clone(cached.usage || null),
        serverTiming: { ...(cached.serverTiming || {}), cacheHit: true },
      };
    }
    onProgress({ status: "pending", stage: "analysis", payloadChars, cacheHit: false });

    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const response = await ai.analyzePrimaryDetailed(payload);
    const durationMs = Number(response?.clientTiming?.durationMs)
      || Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - startedAt);
    const result = response?.result && typeof response.result === "object" ? response.result : null;
    if (!result) throw new Error("لم يرجع المحلل الذكي نتيجة قابلة للاستخدام.");
    writeCachedAnalysis(cacheKey, response);

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
