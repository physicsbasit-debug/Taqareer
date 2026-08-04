(() => {
  "use strict";

  const VERSION = "0.9.5";
  const PROTOCOL_VERSION = "4.2.0";
  const QUALITY_MICROTASK_VERSION = "1.0.0";
  const ISOLATION_VERSION = "1.0.0";
  const SEGMENTS = Object.freeze(["diagnostic", "findings", "interventions", "governance"]);
  const LABELS = Object.freeze({
    diagnostic: "القراءة التشخيصية",
    findings: "الاستنتاجات التربوية",
    interventions: "التدخلات التنفيذية",
    governance: "الجودة والمتابعة",
  });
  const TASK_LABELS = Object.freeze({
    "diagnostic.full": "القراءة التشخيصية",
    "findings.full": "الاستنتاجات التربوية",
    "interventions.full": "التدخلات التنفيذية",
    "governance.quality": "أدوات الجودة (توافق قديم)",
    "governance.monitoring": "المتابعة والحوكمة",
  });
  const DEFAULT_POLICY = Object.freeze({
    concurrency: 3,
    transientRetries: 1,
    transientDelayMs: 1200,
    jitterMs: 250,
    qualityConcurrency: 2,
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

  function mergeDeltas(values) {
    const merged = emptyDelta();
    for (const value of values || []) {
      if (!value) continue;
      const normalized = normalizeSegmentResult(value.segment || "", value.result || value);
      merged.deepAnalysisUnits.push(...normalized.deepAnalysisUnits);
      merged.patches.push(...normalized.patches);
      merged.additionalCautions.push(...normalized.additionalCautions);
      merged.missingDataRequests.push(...normalized.missingDataRequests);
    }
    merged.additionalCautions = uniqueStrings(merged.additionalCautions).slice(0, 12);
    merged.missingDataRequests = uniqueStrings(merged.missingDataRequests).slice(0, 16);
    return merged;
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
        isolated: Boolean(statuses?.[segment]?.isolated),
        acceptedDeepAnalysisUnits: Number(normalized.validation?.acceptedDeepAnalysisUnits || normalized.deepAnalysisUnits.length || 0),
        acceptedPatches: Number(normalized.validation?.acceptedPatches || normalized.patches.length || 0),
      });
    }
    merged.additionalCautions = uniqueStrings(merged.additionalCautions).slice(0, 12);
    merged.missingDataRequests = uniqueStrings(merged.missingDataRequests).slice(0, 16);
    return merged;
  }

  function targetArray(contract, key) {
    const patchTargets = contract?.patchTargets && typeof contract.patchTargets === "object" ? contract.patchTargets : {};
    return Array.isArray(patchTargets[key]) ? patchTargets[key] : [];
  }

  function batch(items, size) {
    const result = [];
    for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
    return result;
  }

  function safeTaskToken(value, fallback = "tool") {
    const token = String(value || fallback).trim().toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return token || fallback;
  }

  function qualityTasks(contract) {
    return targetArray(contract, "qualityTools").map((item, index) => {
      const targetId = String(item?.id || `tool-${index + 1}`);
      return taskDefinition(
        `quality.${safeTaskToken(targetId, `tool-${index + 1}`)}`,
        "governance",
        "quality-tool",
        {
          label: `أداة الجودة: ${String(item?.name || targetId)}`,
          targetIds: [targetId],
          qualityToolId: targetId,
          recoveryMode: "quality-microtask",
        },
      );
    });
  }

  function isQualityMicrotask(task) {
    return task?.segment === "governance" && task?.scope === "quality-tool";
  }

  function taskDefinition(id, segment, scope = "full", options = {}) {
    return {
      id,
      segment,
      scope,
      label: options.label || TASK_LABELS[id] || LABELS[segment] || id,
      targetIds: Array.isArray(options.targetIds) ? options.targetIds : null,
      splitDepth: Number(options.splitDepth || 0),
      parentTaskId: options.parentTaskId || "",
      recoveryMode: options.recoveryMode || "normal",
      qualityToolId: options.qualityToolId || "",
    };
  }

  function initialTasks(segments = SEGMENTS, contract = {}) {
    const tasks = [];
    for (const segment of segments) {
      if (segment === "governance") {
        tasks.push(...qualityTasks(contract));
        tasks.push(taskDefinition("governance.monitoring", "governance", "monitoring", { label: "المتابعة والحوكمة" }));
      } else {
        tasks.push(taskDefinition(`${segment}.full`, segment));
      }
    }
    return tasks;
  }

  function selectedTargets(contract, task) {
    if (task.segment === "diagnostic") return Array.isArray(contract?.deepAnalysisTargets) ? contract.deepAnalysisTargets : [];
    if (task.segment === "findings") return targetArray(contract, "findings");
    if (task.segment === "interventions") return targetArray(contract, "interventions");
    if (task.scope === "quality" || task.scope === "quality-tool") return targetArray(contract, "qualityTools");
    if (task.scope === "monitoring") return targetArray(contract, "monitoring");
    return [...targetArray(contract, "qualityTools"), ...targetArray(contract, "monitoring")];
  }

  function filterTargets(items, targetIds) {
    if (!Array.isArray(targetIds) || !targetIds.length) return items;
    const allowed = new Set(targetIds.map(String));
    return items.filter(item => allowed.has(String(item?.id || "")));
  }

  function trimContract(contract, task) {
    const source = clone(contract || {});
    const rules = source.rules && typeof source.rules === "object" ? source.rules : {};
    const selected = filterTargets(selectedTargets(source, task), task.targetIds);
    const maxPatches = Math.max(2, Math.min(12, selected.length * 2 + 2));
    const qualityRules = isQualityMicrotask(task) ? {
      localCalculationsAreAuthoritative: true,
      targetIdsAreMandatory: true,
      onePatchPerTargetField: true,
      maxDeepAnalysisUnits: 0,
      maxPatches: 3,
    } : {
      ...rules,
      maxDeepAnalysisUnits: task.segment === "diagnostic" ? Math.max(1, selected.length) : 0,
      maxPatches: task.segment === "diagnostic" ? 0 : maxPatches,
    };
    return {
      version: source.version || "3.0.0",
      mode: isQualityMicrotask(task) ? "quality-microtask" : "isolated-segment-analysis",
      family: source.family || "adaptive",
      task: { id: task.id, segment: task.segment, scope: task.scope, splitDepth: task.splitDepth },
      rules: qualityRules,
      executive: task.segment === "findings" ? source.executive : null,
      profile: task.segment === "findings" ? source.profile : null,
      deepAnalysisTargets: task.segment === "diagnostic" ? selected : [],
      patchTargets: {
        findings: task.segment === "findings" ? selected : [],
        qualityTools: (task.scope === "quality" || task.scope === "quality-tool") ? selected : [],
        interventions: task.segment === "interventions" ? selected : [],
        monitoring: task.scope === "monitoring" ? selected : [],
      },
    };
  }

  function evidenceRefsFromTargets(items) {
    return uniqueStrings((items || []).flatMap(item => item?.evidenceRefs || []));
  }

  const QUALITY_METRIC_HINTS = Object.freeze({
    distribution: ["n", "mean", "median", "med", "sd", "cv", "skewness", "kurtosis"],
    boxplot: ["n", "q1", "q3", "iqr", "outlierCount", "min", "max"],
    gap: ["n", "masteryPct", "thresholdPct", "masteryCount", "additionalStudentsNeeded", "singleStudentImpact"],
    segmentation: ["n", "masteryPct", "masteryCount", "nonMasteryCount", "nearMasteryPct", "deepGapPct"],
    sensitivity: ["n", "masteryPct", "thresholdPct", "masteryCutoffScore"],
    priority: ["n", "masteryPct", "nearMasteryPct", "deepGapPct"],
  });

  function metricId(item) {
    return String(item?.id || item?.key || item?.name || "");
  }

  function qualityMetricHints(tool) {
    const id = String(tool?.id || "").toLowerCase();
    const direct = QUALITY_METRIC_HINTS[id];
    if (direct) return direct;
    const text = `${tool?.name || ""} ${tool?.reason || ""} ${tool?.interpretation || ""}`.toLowerCase();
    const hints = [];
    const map = [
      [/توزيع|مدرج|انحراف|التواء|تفرطح/, ["n", "mean", "med", "sd", "skewness", "kurtosis"]],
      [/ربيع|صندوق|متطرف/, ["q1", "q3", "iqr", "outlierCount", "min", "max"]],
      [/إتقان|فجوة|مستوى/, ["masteryPct", "thresholdPct", "masteryCount", "additionalStudentsNeeded", "nearMasteryPct", "deepGapPct"]],
      [/أولوية|تدخل/, ["n", "nearMasteryPct", "deepGapPct", "masteryPct"]],
    ];
    for (const [pattern, values] of map) if (pattern.test(text)) hints.push(...values);
    return uniqueStrings(hints);
  }

  function compactQualityOutput(value, depth = 0) {
    if (depth > 3) return null;
    if (Array.isArray(value)) return value.slice(0, 12).map(item => compactQualityOutput(item, depth + 1));
    if (!value || typeof value !== "object") return value;
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 16)) output[key] = compactQualityOutput(item, depth + 1);
    return output;
  }

  function selectedQualityTool(deterministic, task) {
    const tools = Array.isArray(deterministic?.qualityTools) ? deterministic.qualityTools : [];
    const allowed = new Set((task.targetIds || []).map(String));
    return tools.find(item => allowed.has(String(item?.id || ""))) || null;
  }

  function qualityEvidenceRefs(tool, allRefs) {
    const hints = new Set(qualityMetricHints(tool));
    const metricRefs = (allRefs || []).filter(ref => String(ref).startsWith("metric:"));
    const selected = metricRefs.filter(ref => hints.has(String(ref).slice(7)));
    return uniqueStrings(selected.length ? selected : metricRefs.slice(0, 10));
  }

  function compactDeterministic(deterministic, task) {
    const source = deterministic && typeof deterministic === "object" ? deterministic : {};
    const qualityTool = isQualityMicrotask(task) ? selectedQualityTool(source, task) : null;
    const hints = new Set(qualityMetricHints(qualityTool));
    const metrics = Array.isArray(source.metrics) ? source.metrics : [];
    const selectedMetrics = qualityTool
      ? metrics.filter(item => hints.has(metricId(item))).slice(0, 12)
      : metrics.slice(0, 30);
    const evidenceCatalog = Array.isArray(source.evidenceCatalog) ? source.evidenceCatalog : [];
    const base = {
      kind: source.kind,
      executiveTitle: task.segment === "findings" ? source.executiveTitle : "",
      executiveSummary: task.segment === "findings" ? source.executiveSummary : "",
      analysisProfile: (task.segment === "diagnostic" || task.segment === "findings") ? source.analysisProfile : null,
      metrics: selectedMetrics,
      evidenceCatalog: qualityTool
        ? evidenceCatalog.filter(item => {
            const ref = String(item?.ref || item?.id || "");
            return !ref.startsWith("metric:") || hints.has(ref.slice(7));
          }).slice(0, 18)
        : evidenceCatalog.slice(0, 100),
    };
    if (task.segment === "diagnostic") {
      base.charts = Array.isArray(source.charts) ? source.charts.slice(0, 8) : [];
      base.diagnosticSections = Array.isArray(source.diagnosticSections) ? source.diagnosticSections.slice(0, 8) : [];
    } else if (task.segment === "findings") {
      base.findings = Array.isArray(source.findings) ? source.findings.slice(0, 10) : [];
      base.charts = Array.isArray(source.charts) ? source.charts.slice(0, 5) : [];
    } else if (task.segment === "interventions") {
      base.findings = Array.isArray(source.findings) ? source.findings.slice(0, 6).map(item => ({ id: item.id, title: item.title, statement: item.statement, educationalImpact: item.educationalImpact, evidenceRefs: item.evidenceRefs })) : [];
      base.improvementPlan = Array.isArray(source.improvementPlan) ? source.improvementPlan.slice(0, 6).map(item => ({ id: item.id, issue: item.issue, targetGroup: item.targetGroup, action: item.action, successIndicator: item.successIndicator, evidenceRefs: item.evidenceRefs })) : [];
    } else if (isQualityMicrotask(task)) {
      base.qualityTools = qualityTool ? [{ id: qualityTool.id, output: compactQualityOutput(qualityTool.output) }] : [];
      base.charts = Array.isArray(source.charts)
        ? source.charts.filter(chart => {
            const id = String(qualityTool?.id || "").toLowerCase();
            const text = `${chart?.id || ""} ${chart?.title || ""}`.toLowerCase();
            return id && (text.includes(id) || qualityMetricHints(qualityTool).some(hint => text.includes(String(hint).toLowerCase())));
          }).slice(0, 1)
        : [];
    } else if (task.scope === "quality") {
      base.qualityTools = Array.isArray(source.qualityTools) ? source.qualityTools.slice(0, 10) : [];
      base.charts = Array.isArray(source.charts) ? source.charts.slice(0, 5) : [];
    } else if (task.scope === "monitoring") {
      base.improvementPlan = Array.isArray(source.improvementPlan) ? source.improvementPlan.slice(0, 6).map(item => ({ id: item.id, issue: item.issue, action: item.action, timeframe: item.timeframe, successIndicator: item.successIndicator })) : [];
      base.monitoringPlan = Array.isArray(source.monitoringPlan) ? source.monitoringPlan.slice(0, 6) : [];
      base.cautions = Array.isArray(source.cautions) ? source.cautions.slice(0, 8) : [];
      base.dataRequests = Array.isArray(source.dataRequests) ? source.dataRequests.slice(0, 8) : [];
    }
    return base;
  }

  function compactData(data, task) {
    const source = data && typeof data === "object" ? data : {};
    if (task.segment === "diagnostic") {
      if (Array.isArray(source.lines)) return { ...source, lines: source.lines.slice(0, task.splitDepth ? 90 : 180) };
      return { ...source, sampleRows: Array.isArray(source.sampleRows) ? source.sampleRows.slice(0, task.splitDepth ? 4 : 6) : [] };
    }
    if (task.segment === "findings") {
      if (Array.isArray(source.lines)) return { ...source, lines: source.lines.slice(0, 90) };
      return { ...source, sampleRows: Array.isArray(source.sampleRows) ? source.sampleRows.slice(0, 4) : [] };
    }
    return {
      mode: "derived-evidence-only",
      rowCount: source.rowCount || 0,
      originalLineCount: source.originalLineCount || 0,
      note: "يعتمد هذا الجزء على المؤشرات والأدلة والعقد المحلي فقط.",
    };
  }

  function essentialMetricRefs(task) {
    const map = {
      diagnostic: ["n", "mean", "median", "sd", "cv", "q1", "q3", "masteryPct", "thresholdPct", "deepGapPct"],
      findings: ["n", "mean", "median", "sd", "masteryPct", "thresholdPct", "masteryCount", "nonMasteryCount", "deepGapPct"],
      interventions: ["n", "masteryPct", "thresholdPct", "masteryCount", "nearMasteryPct", "deepGapPct", "additionalStudentsNeeded"],
      monitoring: ["n", "mean", "masteryPct", "thresholdPct", "masteryCount", "additionalStudentsNeeded"],
    };
    const key = task.scope === "monitoring" ? "monitoring" : task.segment;
    return (map[key] || ["n"]).map(id => `metric:${id}`);
  }

  function pruneDeterministicForRefs(value, refs, task) {
    const output = value && typeof value === "object" ? value : {};
    const allowedRefs = new Set(uniqueStrings(refs));
    const allowedMetricIds = new Set([...allowedRefs].filter(ref => ref.startsWith("metric:")).map(ref => ref.slice(7)));
    if (Array.isArray(output.metrics)) {
      const selected = output.metrics.filter(item => allowedMetricIds.has(metricId(item)));
      output.metrics = (selected.length ? selected : output.metrics.slice(0, isQualityMicrotask(task) ? 8 : 12));
    }
    if (Array.isArray(output.evidenceCatalog)) {
      const selected = output.evidenceCatalog.filter(item => allowedRefs.has(String(item?.ref || item?.id || "")));
      output.evidenceCatalog = (selected.length ? selected : output.evidenceCatalog.slice(0, isQualityMicrotask(task) ? 8 : 18));
    }
    if (task.segment === "findings" && Array.isArray(output.charts)) output.charts = output.charts.slice(0, 1);
    if (task.segment === "diagnostic" && Array.isArray(output.charts)) output.charts = output.charts.slice(0, 4);
    if (task.segment === "interventions" || task.scope === "monitoring") output.charts = [];
    return output;
  }

  function buildTaskPayload(basePayload, task) {
    const base = clone(basePayload || {});
    const fullContract = base.reconciliationContract || {};
    const trimmedContract = trimContract(fullContract, task);
    const targets = selectedTargets(trimmedContract, task);
    const targetRefs = evidenceRefsFromTargets(targets);
    const allRefs = uniqueStrings(base.availableEvidenceRefs || []);
    const qualityTool = isQualityMicrotask(task) ? selectedQualityTool(base.deterministicAnalysis || {}, task) : null;
    const relevantRefs = isQualityMicrotask(task)
      ? qualityEvidenceRefs(qualityTool, allRefs)
      : uniqueStrings([...(targetRefs || []), ...essentialMetricRefs(task)]).filter(ref => allRefs.includes(ref) || String(ref).startsWith("metric:"));
    const deterministicAnalysis = pruneDeterministicForRefs(compactDeterministic(base.deterministicAnalysis, task), relevantRefs, task);
    return {
      locale: base.locale || "ar-OM",
      appVersion: VERSION,
      protocolVersion: PROTOCOL_VERSION,
      isolationVersion: ISOLATION_VERSION,
      qualityMicrotaskVersion: QUALITY_MICROTASK_VERSION,
      segment: task.segment,
      segmentLabel: LABELS[task.segment],
      taskId: task.id,
      taskLabel: task.label,
      scope: task.scope,
      recoveryMode: task.recoveryMode,
      splitDepth: task.splitDepth,
      pipeline: {
        mode: isQualityMicrotask(task) ? "quality-microtask-v1" : "segment-failure-isolation-v1",
        purpose: task.scope,
        instruction: "حلل المهمة المحددة فقط، ولا تعيد عناصر أو حقولًا خارج العقد المرسل.",
      },
      source: isQualityMicrotask(task) ? { name: base.source?.name || "" } : base.source,
      recognizedType: base.recognizedType,
      quality: isQualityMicrotask(task) ? undefined : base.quality,
      privacy: isQualityMicrotask(task) ? undefined : base.privacy,
      deterministicAnalysis,
      reconciliationContract: trimmedContract,
      availableEvidenceRefs: relevantRefs.slice(0, 120),
      evidenceReferenceGuide: isQualityMicrotask(task) ? undefined : (base.evidenceReferenceGuide || {}),
      data: compactData(base.data, task),
    };
  }

  function splitTask(task, basePayload) {
    if (task.splitDepth >= 1 || task.scope !== "full") return [];
    const contract = basePayload?.reconciliationContract || {};
    const targets = selectedTargets(contract, task);
    const size = task.segment === "diagnostic" ? 2 : task.segment === "findings" ? 3 : task.segment === "interventions" ? 2 : 0;
    if (!size || targets.length <= size) return [];
    return batch(targets, size).map((items, index, groups) => taskDefinition(
      `${task.segment}.batch${index + 1}`,
      task.segment,
      `batch-${index + 1}`,
      {
        label: `${LABELS[task.segment]} (${index + 1}/${groups.length})`,
        targetIds: items.map(item => String(item?.id || "")).filter(Boolean),
        splitDepth: 1,
        parentTaskId: task.id,
        recoveryMode: "isolated",
      },
    ));
  }

  function normalizePolicy(value = {}) {
    return {
      concurrency: Math.max(1, Math.min(3, Number(value.concurrency ?? DEFAULT_POLICY.concurrency) || DEFAULT_POLICY.concurrency)),
      transientRetries: Math.max(0, Math.min(1, Number(value.transientRetries ?? DEFAULT_POLICY.transientRetries) || 0)),
      transientDelayMs: Math.max(0, Number(value.transientDelayMs ?? DEFAULT_POLICY.transientDelayMs) || 0),
      jitterMs: Math.max(0, Math.min(1000, Number(value.jitterMs ?? DEFAULT_POLICY.jitterMs) || 0)),
      qualityConcurrency: Math.max(1, Math.min(2, Number(value.qualityConcurrency ?? DEFAULT_POLICY.qualityConcurrency) || DEFAULT_POLICY.qualityConcurrency)),
    };
  }

  function classifyFailure(error) {
    const status = Number(error?.status || 0);
    const code = String(error?.code || error?.errorCode || "").trim();
    const message = String(error?.message || error || "تعذر إكمال المهمة.").trim();
    const details = error?.details && typeof error.details === "object" ? clone(error.details) : {};
    const failureType = String(details?.failureType || error?.failureType || "").trim();
    const lowered = message.toLowerCase();
    const nonRetryable = [400, 401, 403, 404, 405, 413].includes(status)
      || /(رمز الوصول غير صحيح|النطاق غير مسموح|أكبر من الحد المسموح|العملية المطلوبة غير مدعومة|مفتاح supabase|جزء التحليل غير صالح)/i.test(message);
    const contentFailure = ["output_exhausted", "json_invalid", "validation_empty"].includes(failureType)
      || /(حد الإخراج|max_tokens|json غير صالح|json المتوقع|المحاولة المختصرة)/i.test(lowered);
    const transient = !nonRetryable && !contentFailure && (
      status === 0 || status === 408 || status === 425 || status === 429 || status >= 500
      || /(timeout|network|failed to fetch|تعذر الاتصال|مؤقت|rate limit|quota|overload|unavailable|internal)/i.test(lowered)
    );
    return {
      retryable: !nonRetryable && (contentFailure || transient),
      transient,
      contentFailure,
      status,
      code,
      message,
      details,
      failureType: failureType || (contentFailure ? "content_failure" : transient ? "transient" : "non_retryable"),
      retryAfterMs: Math.max(0, Number(error?.retryAfterMs || details?.retryAfterMs || 0) || 0),
    };
  }

  async function wait(ms) {
    if (ms <= 0) return;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async function runPool(items, concurrency, worker) {
    const queue = [...items];
    const workers = Array.from({ length: Math.min(concurrency, Math.max(1, queue.length)) }, async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item) await worker(item);
      }
    });
    await Promise.all(workers);
  }

  function aggregateUsage(taskItems) {
    const output = {};
    for (const item of taskItems) {
      const usage = item?.usage;
      if (!usage || typeof usage !== "object") continue;
      for (const [key, value] of Object.entries(usage)) {
        if (typeof value === "number") output[key] = Number(output[key] || 0) + value;
      }
    }
    return Object.keys(output).length ? output : null;
  }

  function parentTaskIds(taskPlan, segment) {
    return taskPlan.filter(task => task.segment === segment).map(task => task.id);
  }

  function buildParentArtifacts(taskPlan, taskResults, taskStatuses, taskFailures) {
    const results = {};
    const statuses = {};
    const failures = {};
    for (const segment of SEGMENTS) {
      const ids = parentTaskIds(taskPlan, segment);
      if (!ids.length) continue;
      const successful = ids.filter(id => taskResults[id]);
      const fallback = successful.filter(id => taskStatuses[id]?.status === "fallback" || taskResults[id]?.localFallback);
      const failed = ids.filter(id => taskFailures[id]);
      const pending = ids.filter(id => !taskResults[id] && !taskFailures[id]);
      const values = successful.map(id => taskResults[id]);
      if (values.length) {
        const delta = mergeDeltas(values);
        const timings = values.map(value => value?.serverTiming).filter(Boolean);
        results[segment] = {
          result: { ...delta, segment, validation: {
            acceptedDeepAnalysisUnits: delta.deepAnalysisUnits.length,
            acceptedPatches: delta.patches.length,
          } },
          model: values.find(value => value?.model)?.model || "Gemini",
          usage: aggregateUsage(values),
          cacheHit: values.every(value => value?.cacheHit),
          serverTiming: { segment, tasks: timings },
        };
      }
      const taskStates = ids.map(id => taskStatuses[id]).filter(Boolean);
      const attempts = taskStates.reduce((sum, item) => sum + Number(item?.attempts || 0), 0);
      const durationMs = taskStates.reduce((sum, item) => sum + Number(item?.durationMs || 0), 0);
      const payloadChars = taskStates.reduce((sum, item) => sum + Number(item?.payloadChars || 0), 0);
      const status = failed.length
        ? (successful.length ? "partial" : "failed")
        : pending.length ? (taskStates.some(item => item?.status === "isolating") ? "isolating" : "pending")
        : "success";
      statuses[segment] = {
        status,
        completedTasks: successful.length,
        totalTasks: ids.length,
        failedTasks: failed.length,
        fallbackTasks: fallback.length,
        attempts,
        durationMs,
        payloadChars,
        cacheHit: successful.length > 0 && successful.length === ids.length && values.every(value => value?.cacheHit),
        isolated: ids.some(id => id.includes(".batch")) || segment === "governance",
        taskIds: ids,
        error: failed.map(id => taskFailures[id]?.message || String(taskFailures[id])).join(" | "),
      };
      if (failed.length) failures[segment] = taskFailures[failed[0]];
    }
    return { results, statuses, failures };
  }

  async function run(options = {}) {
    const basePayload = options.basePayload || {};
    const ai = options.ai || globalThis.TaqareerAI;
    const performanceApi = options.performanceApi || globalThis.TaqareerPerformance;
    const force = Boolean(options.force);
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    const policy = normalizePolicy(options.isolationPolicy || options.recoveryPolicy || {});
    if (!ai?.enrichSegmentDetailed) throw new Error("عميل التحليل المقسّم غير محمل.");

    const retrySegments = Array.isArray(options.retrySegments) && options.retrySegments.length
      ? options.retrySegments.filter(segment => SEGMENTS.includes(segment))
      : SEGMENTS;
    const previousTaskResults = { ...(options.previousTaskResults || {}) };
    const previousResults = { ...(options.previousResults || {}) };
    const taskResults = { ...previousTaskResults };
    const taskStatuses = {};
    const taskFailures = {};
    const isolationHistory = [];
    const requestedTaskIds = Array.isArray(options.retryTaskIds) && options.retryTaskIds.length
      ? new Set(options.retryTaskIds.map(String))
      : null;
    let taskPlan = requestedTaskIds && Array.isArray(options.previousTaskPlan) && options.previousTaskPlan.length
      ? clone(options.previousTaskPlan)
      : initialTasks(retrySegments, basePayload?.reconciliationContract || {});
    taskPlan = taskPlan.filter(task => retrySegments.includes(task.segment));

    for (const [segment, result] of Object.entries(previousResults)) {
      if (!retrySegments.includes(segment)) continue;
      if (segment === "governance") continue;
      const id = `${segment}.full`;
      if (!taskResults[id] && result) taskResults[id] = result;
    }

    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    let totalPayloadChars = 0;
    let transientRetriesUsed = 0;

    const publish = (activeTaskId = "") => {
      const parent = buildParentArtifacts(taskPlan, taskResults, taskStatuses, taskFailures);
      onProgress({
        activeTaskId,
        taskPlan: clone(taskPlan),
        taskResults: clone(taskResults),
        taskStatuses: clone(taskStatuses),
        taskFailures: clone(taskFailures),
        results: clone(parent.results),
        statuses: clone(parent.statuses),
        failures: clone(parent.failures),
        delta: mergeSegmentResults(parent.results, parent.statuses),
        isolation: {
          version: ISOLATION_VERSION,
          history: clone(isolationHistory),
          transientRetriesUsed,
        },
      });
    };

    const invokeTask = async (task, context = {}) => {
      const payload = buildTaskPayload(basePayload, task);
      const payloadChars = JSON.stringify(payload).length;
      totalPayloadChars += payloadChars;
      const cacheKey = performanceApi?.makeKey ? await performanceApi.makeKey(`deep-task-v4.2:${task.id}`, payload) : "";
      const cached = !force && !context.forceNetwork && cacheKey && performanceApi?.cacheGet ? performanceApi.cacheGet(cacheKey) : null;
      const attempts = Number(taskStatuses[task.id]?.attempts || 0) + 1;
      taskStatuses[task.id] = {
        ...taskStatuses[task.id],
        taskId: task.id,
        segment: task.segment,
        scope: task.scope,
        label: task.label,
        status: context.retry ? "recovering" : "pending",
        payloadChars,
        attempts,
        error: "",
        errorCode: "",
        failureType: "",
      };
      publish(task.id);
      if (cached?.result) {
        taskResults[task.id] = { ...cached, cacheHit: true };
        delete taskFailures[task.id];
        taskStatuses[task.id] = { ...taskStatuses[task.id], status: "success", cacheHit: true, durationMs: 0 };
        publish(task.id);
        return true;
      }
      const taskStarted = globalThis.performance?.now?.() ?? Date.now();
      try {
        const response = await ai.enrichSegmentDetailed(payload);
        const durationMs = Number(response.clientTiming?.durationMs) || Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - taskStarted);
        taskResults[task.id] = {
          result: response.result,
          usage: response.usage || null,
          model: response.model || "Gemini",
          serverTiming: response.serverTiming || null,
          clientTiming: response.clientTiming || null,
          cacheHit: false,
        };
        delete taskFailures[task.id];
        taskStatuses[task.id] = {
          ...taskStatuses[task.id],
          status: "success",
          durationMs,
          cacheHit: false,
          finishReason: response.serverTiming?.finishReason || "STOP",
        };
        if (cacheKey && performanceApi?.cacheSet) performanceApi.cacheSet(cacheKey, taskResults[task.id]);
        publish(task.id);
        return true;
      } catch (error) {
        const failure = classifyFailure(error);
        if (isQualityMicrotask(task) && failure.contentFailure) {
          const durationMs = Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - taskStarted);
          taskResults[task.id] = {
            result: { ...emptyDelta(), segment: "governance", validation: { acceptedDeepAnalysisUnits: 0, acceptedPatches: 0 } },
            usage: null,
            model: "local-deterministic-fallback",
            serverTiming: { taskId: task.id, scope: task.scope, localFallback: true, failureType: failure.failureType, payloadChars },
            cacheHit: false,
            localFallback: true,
          };
          delete taskFailures[task.id];
          taskStatuses[task.id] = {
            ...taskStatuses[task.id],
            status: "fallback",
            durationMs,
            localFallback: true,
            fallbackReason: failure.message,
            failureType: failure.failureType,
            retryable: false,
          };
          publish(task.id);
          return true;
        }
        taskFailures[task.id] = error;
        taskStatuses[task.id] = {
          ...taskStatuses[task.id],
          status: "failed",
          durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - taskStarted),
          retryable: failure.retryable,
          transient: failure.transient,
          contentFailure: failure.contentFailure,
          error: failure.message,
          errorStatus: failure.status,
          errorCode: failure.code,
          failureType: failure.failureType,
          details: failure.details,
          retryAfterMs: failure.retryAfterMs,
        };
        publish(task.id);
        return false;
      }
    };

    const initialQueue = taskPlan.filter(task => !taskResults[task.id] && (!requestedTaskIds || requestedTaskIds.has(task.id)));
    const coreQueue = initialQueue.filter(task => task.segment !== "governance");
    const monitoringQueue = initialQueue.filter(task => task.scope === "monitoring");
    const qualityQueue = initialQueue.filter(task => isQualityMicrotask(task) || task.scope === "quality");
    await runPool(coreQueue, policy.concurrency, task => invokeTask(task));
    await Promise.all([
      runPool(monitoringQueue, 1, task => invokeTask(task)),
      runPool(qualityQueue, policy.qualityConcurrency, task => invokeTask(task)),
    ]);

    const failedFullTasks = taskPlan.filter(task => taskFailures[task.id] && task.scope === "full" && taskStatuses[task.id]?.contentFailure);
    for (const task of failedFullTasks) {
      const replacements = splitTask(task, basePayload);
      if (!replacements.length) continue;
      isolationHistory.push({
        segment: task.segment,
        failedTaskId: task.id,
        reason: taskStatuses[task.id]?.failureType || "content_failure",
        replacementTaskIds: replacements.map(item => item.id),
        at: Date.now(),
      });
      taskPlan = taskPlan.filter(item => item.id !== task.id).concat(replacements);
      delete taskFailures[task.id];
      delete taskStatuses[task.id];
      publish(replacements[0]?.id || "");
      await runPool(replacements, Math.min(policy.concurrency, 2), replacement => invokeTask(replacement));
    }

    const transientCandidates = taskPlan.filter(task => taskFailures[task.id] && taskStatuses[task.id]?.transient && Number(taskStatuses[task.id]?.attempts || 0) <= policy.transientRetries);
    if (transientCandidates.length && policy.transientRetries > 0) {
      transientRetriesUsed = transientCandidates.length;
      const requested = Math.max(0, ...transientCandidates.map(task => Number(taskStatuses[task.id]?.retryAfterMs || 0)));
      const jitter = policy.jitterMs ? Math.floor(Math.random() * (policy.jitterMs + 1)) : 0;
      await wait(Math.max(requested, policy.transientDelayMs + jitter));
      await runPool(transientCandidates, Math.min(policy.concurrency, 2), task => invokeTask({ ...task, recoveryMode: "transient-retry" }, { retry: true, forceNetwork: true }));
    }

    const parent = buildParentArtifacts(taskPlan, taskResults, taskStatuses, taskFailures);
    const succeededSegments = SEGMENTS.filter(segment => parent.statuses[segment]?.status === "success");
    const failedSegments = SEGMENTS.filter(segment => ["failed", "partial"].includes(parent.statuses[segment]?.status));
    const succeededTasks = taskPlan.filter(task => taskResults[task.id]).map(task => task.id);
    const failedTaskIds = taskPlan.filter(task => taskFailures[task.id]).map(task => task.id);
    const localFallbackTasks = taskPlan.filter(task => taskStatuses[task.id]?.status === "fallback").map(task => task.id);
    const qualityTaskIds = taskPlan.filter(task => isQualityMicrotask(task)).map(task => task.id);
    const enhancedQualityTasks = qualityTaskIds.filter(id => taskStatuses[id]?.status === "success");
    if (!succeededTasks.length) {
      const message = failedTaskIds.map(id => `${taskStatuses[id]?.label || id}: ${taskStatuses[id]?.error || "تعذر التحليل"}`).join(" | ");
      throw new Error(message || "تعذرت مهام التحليل الذكي كلها.");
    }

    return {
      protocolVersion: PROTOCOL_VERSION,
      isolationVersion: ISOLATION_VERSION,
      qualityMicrotaskVersion: QUALITY_MICROTASK_VERSION,
      delta: mergeSegmentResults(parent.results, parent.statuses),
      results: parent.results,
      statuses: parent.statuses,
      failures: parent.failures,
      taskPlan,
      taskResults,
      taskStatuses,
      taskFailures,
      succeededSegments,
      failedSegments,
      succeededTasks,
      failedTaskIds,
      allSucceeded: failedTaskIds.length === 0,
      partialSuccess: failedTaskIds.length > 0,
      payloadChars: totalPayloadChars,
      durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - startedAt),
      cacheHits: succeededTasks.filter(id => taskResults[id]?.cacheHit).length,
      qualityMicrotasks: { total: qualityTaskIds.length, enhanced: enhancedQualityTasks.length, localFallback: localFallbackTasks.length, taskIds: qualityTaskIds },
      automaticRecovery: {
        enabled: true,
        mode: "adaptive-isolation-not-identical-retry",
        isolatedSegments: uniqueStrings(isolationHistory.map(item => item.segment)),
        isolationHistory,
        transientRetriesUsed,
        recoveredSegments: uniqueStrings(isolationHistory.map(item => item.segment).filter(segment => parent.statuses[segment]?.status === "success")),
        exhaustedSegments: failedSegments,
        failedTaskIds,
        localFallbackTasks,
      },
    };
  }

  globalThis.TaqareerDeepOrchestrator = {
    VERSION,
    PROTOCOL_VERSION,
    ISOLATION_VERSION,
    QUALITY_MICROTASK_VERSION,
    SEGMENTS,
    LABELS,
    TASK_LABELS,
    DEFAULT_POLICY,
    initialTasks,
    qualityTasks,
    isQualityMicrotask,
    buildTaskPayload,
    splitTask,
    classifyFailure,
    mergeSegmentResults,
    run,
  };
})();
