(() => {
  "use strict";

  const VERSION = "0.9.4";
  const PROTOCOL_VERSION = "4.1.0";
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
    "governance.quality": "أدوات الجودة",
    "governance.monitoring": "المتابعة والحوكمة",
  });
  const DEFAULT_POLICY = Object.freeze({
    concurrency: 3,
    transientRetries: 1,
    transientDelayMs: 1200,
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
    };
  }

  function initialTasks(segments = SEGMENTS) {
    const tasks = [];
    for (const segment of segments) {
      if (segment === "governance") {
        tasks.push(taskDefinition("governance.quality", "governance", "quality", { label: "أدوات الجودة" }));
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
    if (task.scope === "quality") return targetArray(contract, "qualityTools");
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
    return {
      version: source.version || "3.0.0",
      mode: "isolated-segment-analysis",
      family: source.family || "adaptive",
      task: { id: task.id, segment: task.segment, scope: task.scope, splitDepth: task.splitDepth },
      rules: {
        ...rules,
        maxDeepAnalysisUnits: task.segment === "diagnostic" ? Math.max(1, selected.length) : 0,
        maxPatches: task.segment === "diagnostic" ? 0 : maxPatches,
      },
      executive: task.segment === "findings" ? source.executive : null,
      profile: task.segment === "findings" ? source.profile : null,
      deepAnalysisTargets: task.segment === "diagnostic" ? selected : [],
      patchTargets: {
        findings: task.segment === "findings" ? selected : [],
        qualityTools: task.scope === "quality" ? selected : [],
        interventions: task.segment === "interventions" ? selected : [],
        monitoring: task.scope === "monitoring" ? selected : [],
      },
    };
  }

  function evidenceRefsFromTargets(items) {
    return uniqueStrings((items || []).flatMap(item => item?.evidenceRefs || []));
  }

  function compactDeterministic(deterministic, task) {
    const source = deterministic && typeof deterministic === "object" ? deterministic : {};
    const base = {
      kind: source.kind,
      executiveTitle: source.executiveTitle,
      executiveSummary: source.executiveSummary,
      analysisProfile: source.analysisProfile,
      metrics: Array.isArray(source.metrics) ? source.metrics.slice(0, 30) : [],
      evidenceCatalog: Array.isArray(source.evidenceCatalog) ? source.evidenceCatalog.slice(0, 100) : [],
    };
    if (task.segment === "diagnostic") {
      base.charts = Array.isArray(source.charts) ? source.charts.slice(0, 8) : [];
      base.diagnosticSections = Array.isArray(source.diagnosticSections) ? source.diagnosticSections.slice(0, 8) : [];
    } else if (task.segment === "findings") {
      base.findings = Array.isArray(source.findings) ? source.findings.slice(0, 10) : [];
      base.charts = Array.isArray(source.charts) ? source.charts.slice(0, 5) : [];
    } else if (task.segment === "interventions") {
      base.findings = Array.isArray(source.findings) ? source.findings.slice(0, 8) : [];
      base.improvementPlan = Array.isArray(source.improvementPlan) ? source.improvementPlan.slice(0, 8) : [];
    } else if (task.scope === "quality") {
      base.qualityTools = Array.isArray(source.qualityTools) ? source.qualityTools.slice(0, 10) : [];
      base.charts = Array.isArray(source.charts) ? source.charts.slice(0, 5) : [];
    } else if (task.scope === "monitoring") {
      base.improvementPlan = Array.isArray(source.improvementPlan) ? source.improvementPlan.slice(0, 8) : [];
      base.monitoringPlan = Array.isArray(source.monitoringPlan) ? source.monitoringPlan.slice(0, 8) : [];
      base.cautions = Array.isArray(source.cautions) ? source.cautions.slice(0, 8) : [];
      base.dataRequests = Array.isArray(source.dataRequests) ? source.dataRequests.slice(0, 8) : [];
    }
    return base;
  }

  function compactData(data, task) {
    const source = data && typeof data === "object" ? data : {};
    if (task.segment === "diagnostic") {
      if (Array.isArray(source.lines)) return { ...source, lines: source.lines.slice(0, task.splitDepth ? 90 : 180) };
      return { ...source, sampleRows: Array.isArray(source.sampleRows) ? source.sampleRows.slice(0, task.splitDepth ? 6 : 12) : [] };
    }
    if (task.segment === "findings") {
      if (Array.isArray(source.lines)) return { ...source, lines: source.lines.slice(0, 90) };
      return { ...source, sampleRows: Array.isArray(source.sampleRows) ? source.sampleRows.slice(0, 6) : [] };
    }
    return {
      mode: "derived-evidence-only",
      rowCount: source.rowCount || 0,
      originalLineCount: source.originalLineCount || 0,
      note: "يعتمد هذا الجزء على المؤشرات والأدلة والعقد المحلي فقط.",
    };
  }

  function buildTaskPayload(basePayload, task) {
    const base = clone(basePayload || {});
    const fullContract = base.reconciliationContract || {};
    const trimmedContract = trimContract(fullContract, task);
    const targets = selectedTargets(trimmedContract, task);
    const targetRefs = evidenceRefsFromTargets(targets);
    const allRefs = uniqueStrings(base.availableEvidenceRefs || []);
    const relevantRefs = targetRefs.length ? uniqueStrings([...targetRefs, ...allRefs.filter(ref => String(ref).startsWith("metric:"))]) : allRefs;
    return {
      locale: base.locale || "ar-OM",
      appVersion: VERSION,
      protocolVersion: PROTOCOL_VERSION,
      isolationVersion: ISOLATION_VERSION,
      segment: task.segment,
      segmentLabel: LABELS[task.segment],
      taskId: task.id,
      taskLabel: task.label,
      scope: task.scope,
      recoveryMode: task.recoveryMode,
      splitDepth: task.splitDepth,
      pipeline: {
        mode: "segment-failure-isolation-v1",
        purpose: task.scope,
        instruction: "حلل المهمة المحددة فقط، ولا تعيد عناصر أو حقولًا خارج العقد المرسل.",
      },
      source: base.source,
      recognizedType: base.recognizedType,
      quality: base.quality,
      privacy: base.privacy,
      deterministicAnalysis: compactDeterministic(base.deterministicAnalysis, task),
      reconciliationContract: trimmedContract,
      availableEvidenceRefs: relevantRefs.slice(0, 120),
      evidenceReferenceGuide: base.evidenceReferenceGuide || {},
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
      : initialTasks(retrySegments);
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
      const cacheKey = performanceApi?.makeKey ? await performanceApi.makeKey(`deep-task-v4.1:${task.id}`, payload) : "";
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
    await runPool(initialQueue, policy.concurrency, task => invokeTask(task));

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
    if (!succeededTasks.length) {
      const message = failedTaskIds.map(id => `${taskStatuses[id]?.label || id}: ${taskStatuses[id]?.error || "تعذر التحليل"}`).join(" | ");
      throw new Error(message || "تعذرت مهام التحليل الذكي كلها.");
    }

    return {
      protocolVersion: PROTOCOL_VERSION,
      isolationVersion: ISOLATION_VERSION,
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
      automaticRecovery: {
        enabled: true,
        mode: "adaptive-isolation-not-identical-retry",
        isolatedSegments: uniqueStrings(isolationHistory.map(item => item.segment)),
        isolationHistory,
        transientRetriesUsed,
        recoveredSegments: uniqueStrings(isolationHistory.map(item => item.segment).filter(segment => parent.statuses[segment]?.status === "success")),
        exhaustedSegments: failedSegments,
        failedTaskIds,
      },
    };
  }

  globalThis.TaqareerDeepOrchestrator = {
    VERSION,
    PROTOCOL_VERSION,
    ISOLATION_VERSION,
    SEGMENTS,
    LABELS,
    TASK_LABELS,
    DEFAULT_POLICY,
    initialTasks,
    buildTaskPayload,
    splitTask,
    classifyFailure,
    mergeSegmentResults,
    run,
  };
})();
