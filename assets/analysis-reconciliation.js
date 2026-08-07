(() => {
  "use strict";

  const VERSION = "1.2.10";
  const CONTRACT_VERSION = "6.6.0";

  const SCORE_TYPES = new Set(["student_results", "single_subject", "assessment_component", "level_distribution", "multi_subject_results", "cross_subject"]);
  const NUMERIC_SCORE_TYPES = new Set(["student_results", "single_subject", "assessment_component"]);
  const LOCKED_SCORE_COUNTS = Object.freeze({ diagnosticSections: 4, findings: 5, interventions: 4, monitoring: 4 });

  const PATCH_FIELD_POLICY = Object.freeze({
    executive: new Set(["executiveTitle", "executiveSummary"]),
    profile: new Set(["method", "dataAdequacy", "dimensions", "decisionUses"]),
    finding: new Set(["statement", "educationalImpact", "recommendedAction", "limitations", "confidence", "severity", "evidenceRefs"]),
    qualityTool: new Set(["reason", "interpretation", "requiredData"]),
    intervention: new Set(["action", "implementationSteps", "responsibleRole", "timeframe", "successIndicator", "monitoringMethod", "contingency", "resources", "evidenceRefs"]),
    monitoring: new Set(["measure", "owner"]),
  });

  const TEXT_LIMITS = Object.freeze({
    executiveTitle: 180,
    executiveSummary: 1400,
    method: 900,
    dataAdequacy: 700,
    statement: 900,
    educationalImpact: 900,
    recommendedAction: 900,
    reason: 700,
    interpretation: 900,
    action: 1200,
    responsibleRole: 300,
    timeframe: 220,
    successIndicator: 700,
    monitoringMethod: 650,
    contingency: 800,
    measure: 650,
    owner: 260,
  });

  const ARRAY_LIMITS = Object.freeze({
    dimensions: 8,
    decisionUses: 8,
    limitations: 4,
    requiredData: 5,
    implementationSteps: 5,
    resources: 5,
    evidenceRefs: 8,
  });

  function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function hash(value) {
    const text = normalize(value) || "item";
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function uniqueStrings(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map(item => String(item ?? "").trim()).filter(item => {
      const key = normalize(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function tokens(value) {
    const stop = new Set(["في", "من", "الى", "على", "عن", "مع", "او", "و", "ثم", "هذه", "هذا", "التي", "الذي", "جدا", "بين"]);
    return normalize(value).split(" ").filter(token => token.length > 2 && !stop.has(token));
  }

  function similarity(a, b) {
    const left = new Set(tokens(a));
    const right = new Set(tokens(b));
    if (!left.size || !right.size) return 0;
    let intersection = 0;
    left.forEach(token => { if (right.has(token)) intersection += 1; });
    return intersection / Math.max(1, new Set([...left, ...right]).size);
  }

  function familyOf(analysis) {
    const typeId = String(analysis?.typeId || "unknown");
    if (SCORE_TYPES.has(typeId)) return "scores";
    if (typeId === "supervision_narrative") return "supervision_narrative";
    if (typeId === "supervision_indicator") return "supervision_indicators";
    if (typeId === "student_work") return "student_work";
    if (typeId === "survey") return "survey";
    if (typeId === "training_needs") return "training_needs";
    if (typeId === "program_evaluation") return "program_evaluation";
    if (typeId === "behavior_attendance") return "behavior_attendance";
    return "adaptive";
  }

  function policyFor(analysis) {
    const family = familyOf(analysis);
    if (family === "scores") {
      return {
        family,
        lockedCounts: LOCKED_SCORE_COUNTS,
        maxDeepAnalysisUnits: 4,
        maxPatches: 24,
        maxAdditionalFindings: 0,
      };
    }
    if (family === "supervision_narrative" || family === "student_work" || family === "survey") {
      return {
        family,
        lockedCounts: null,
        maxDeepAnalysisUnits: 7,
        maxPatches: 32,
        maxAdditionalFindings: 1,
      };
    }
    if (family === "adaptive") {
      return {
        family,
        lockedCounts: null,
        maxDeepAnalysisUnits: 6,
        maxPatches: 30,
        maxAdditionalFindings: 2,
      };
    }
    return {
      family,
      lockedCounts: null,
      maxDeepAnalysisUnits: 6,
      maxPatches: 28,
      maxAdditionalFindings: 1,
    };
  }

  function diagnosticId(item, index) {
    const text = normalize(item?.title);
    if (/جوده القياس|حدود الاستدلال/.test(text)) return "diagnostic.measurement_quality";
    if (/مركز التوزيع|التشتت/.test(text)) return "diagnostic.distribution_center";
    if (/الاتقان|فئات التدخل/.test(text)) return "diagnostic.mastery_segments";
    if (/استقرار الحكم|القيم المتطرفه/.test(text)) return "diagnostic.judgement_stability";
    return `diagnostic.${index + 1}.${hash(item?.title)}`;
  }

  function findingId(item, index) {
    const text = normalize(item?.title);
    if (/انتشار الاتقان/.test(text)) return "finding.mastery_spread";
    if (/التفاوت/.test(text)) return "finding.variance";
    if (/قريب من التماثل|التماثل/.test(text)) return "finding.distribution_shape";
    if (/الربعين|الربيع/.test(text)) return "finding.interquartile_gap";
    if (/تدخلات متمايزه|الحاجه الى تدخلات/.test(text)) return "finding.segmented_intervention";
    return `finding.${index + 1}.${hash(item?.title)}`;
  }

  function interventionId(item, index) {
    const text = normalize(`${item?.issue || ""} ${item?.targetGroup || ""}`);
    if (/فجوه عميقه|تعثر شديد/.test(text)) return "intervention.deep_gap";
    if (/فجوه متوسطه|تعثر متوسط/.test(text)) return "intervention.moderate_gap";
    if (/قريب.*الاتقان|قرب.*الاتقان/.test(text)) return "intervention.near_mastery";
    if (/تثبيت|اثراء|حققوا.*الاتقان|متقن/.test(text)) return "intervention.mastery_enrichment";
    return `intervention.${index + 1}.${hash(item?.issue || item?.action)}`;
  }

  function monitoringId(item, index) {
    const text = normalize(`${item?.stage || ""} ${item?.timing || ""}`);
    if (/خط الاساس|الان/.test(text)) return "monitoring.baseline";
    if (/متابعه قصيره|اسبوع/.test(text)) return "monitoring.short_followup";
    if (/اعاده قياس/.test(text)) return "monitoring.remeasurement";
    if (/قرار الاستمرار|قرار/.test(text)) return "monitoring.decision";
    return `monitoring.${index + 1}.${hash(item?.stage)}`;
  }

  function canonicalize(localAnalysis) {
    const result = clone(localAnalysis || {});
    result.diagnosticSections = (result.diagnosticSections || []).map((item, index) => ({
      ...item,
      id: item.id || diagnosticId(item, index),
      source: item.source || "deterministic",
      implications: uniqueStrings(item.implications || []),
      limitations: uniqueStrings(item.limitations || []),
      alternativeExplanations: uniqueStrings(item.alternativeExplanations || []),
      dataRequests: uniqueStrings(item.dataRequests || []),
    }));
    result.findings = (result.findings || []).map((item, index) => ({
      ...item,
      id: item.id || findingId(item, index),
      source: item.source || "deterministic",
      statement: item.statement || item.title || "",
      educationalImpact: item.educationalImpact || item.impact || "",
      recommendedAction: item.recommendedAction || item.action || "",
      limitations: uniqueStrings(item.limitations || []),
    }));
    result.qualityTools = (result.qualityTools || []).map((item, index) => ({
      ...item,
      id: item.id || `tool.${index + 1}.${hash(item.name)}`,
      source: item.source || "deterministic",
      requiredData: uniqueStrings(item.requiredData || []),
    }));
    result.improvementPlan = (result.improvementPlan || []).map((item, index) => ({
      ...item,
      id: item.id || interventionId(item, index),
      source: item.source || "deterministic",
      implementationSteps: uniqueStrings(item.implementationSteps || []),
      resources: uniqueStrings(item.resources || []),
    }));
    result.monitoringPlan = (result.monitoringPlan || []).map((item, index) => ({
      ...item,
      id: item.id || monitoringId(item, index),
      source: item.source || "deterministic",
    }));
    result.analysisProfile = result.analysisProfile || {};
    result.limitations = uniqueStrings(result.limitations || []);
    result.cautions = uniqueStrings(result.cautions || []);
    result.dataRequests = uniqueStrings(result.dataRequests || []);
    result._reconciliation = {
      contractVersion: CONTRACT_VERSION,
      family: familyOf(result),
      aiApplied: false,
      appliedDeepAnalyses: 0,
      appliedPatches: 0,
      appliedEnhancements: 0,
      rejectedEnhancements: 0,
      rejectionReasons: [],
      addedFindings: 0,
      addedInterventions: 0,
      addedMonitoring: 0,
      addedTools: 0,
    };
    return result;
  }

  function trimText(value, limit) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1)).trim()}…`;
  }

  function compactTarget(item, type, fields) {
    const output = { id: item.id, targetType: type, allowedFields: [...(PATCH_FIELD_POLICY[type] || [])] };
    fields.forEach(field => {
      if (item[field] !== undefined) output[field] = item[field];
    });
    return output;
  }

  function buildContract(localAnalysis) {
    const analysis = canonicalize(localAnalysis);
    const policy = policyFor(analysis);
    return {
      version: CONTRACT_VERSION,
      mode: "deep-analysis-delta",
      family: policy.family,
      rules: {
        localCalculationsAreAuthoritative: true,
        deepInterpretationBelongsToGemini: true,
        doNotCreateParallelPlans: true,
        doNotCreateParallelMonitoringCycles: true,
        targetIdsAreMandatory: true,
        onePatchPerTargetField: true,
        lockedCounts: policy.lockedCounts,
        maxDeepAnalysisUnits: policy.maxDeepAnalysisUnits,
        maxPatches: policy.maxPatches,
        maxAdditionalFindings: policy.maxAdditionalFindings,
      },
      executive: {
        id: "executive",
        targetType: "executive",
        allowedFields: [...PATCH_FIELD_POLICY.executive],
        title: analysis.executiveTitle || "",
        summary: analysis.executiveSummary || "",
      },
      profile: {
        id: "profile",
        targetType: "profile",
        allowedFields: [...PATCH_FIELD_POLICY.profile],
        method: analysis.analysisProfile?.method || "",
        dataAdequacy: analysis.analysisProfile?.dataAdequacy || "",
        dimensions: analysis.analysisProfile?.dimensions || [],
        decisionUses: analysis.analysisProfile?.decisionUse || analysis.analysisProfile?.decisionUses || [],
      },
      deepAnalysisTargets: analysis.diagnosticSections.slice(0, policy.maxDeepAnalysisUnits).map(item => ({
        id: item.id,
        title: item.title,
        currentAnalysis: trimText(item.analysis, 1100),
        evidenceRefs: (item.evidenceRefs || []).slice(0, 8),
        currentImplications: (item.implications || []).slice(0, 4),
        currentLimitations: (item.limitations || []).slice(0, 4),
        confidence: item.confidence || "متوسطة",
      })),
      patchTargets: {
        findings: analysis.findings.map(item => compactTarget(item, "finding", ["title", "statement", "evidenceRefs", "confidence", "educationalImpact", "recommendedAction", "limitations", "severity"])),
        qualityTools: analysis.qualityTools.map(item => compactTarget(item, "qualityTool", ["name", "reason", "conditionsMet", "interpretation", "requiredData"])),
        interventions: analysis.improvementPlan.map(item => compactTarget(item, "intervention", ["priority", "issue", "targetGroup", "action", "responsibleRole", "timeframe", "successIndicator", "monitoringMethod", "contingency", "evidenceRefs"])),
        monitoring: analysis.monitoringPlan.map(item => compactTarget(item, "monitoring", ["stage", "timing", "measure", "owner"])),
      },
    };
  }

  function mergeEvidence(local, incoming, allowedEvidence) {
    return uniqueStrings([...(local || []), ...(incoming || [])]).filter(ref => !allowedEvidence || allowedEvidence.has(String(ref)));
  }

  function clampItems(items, limit, perItemLimit = 480) {
    return uniqueStrings(items || []).slice(0, limit).map(item => trimText(item, perItemLimit));
  }

  function buildTargetMaps(result) {
    return {
      executive: new Map([["executive", result]]),
      profile: new Map([["profile", result.analysisProfile]]),
      finding: new Map(result.findings.map(item => [item.id, item])),
      qualityTool: new Map(result.qualityTools.map(item => [item.id, item])),
      intervention: new Map(result.improvementPlan.map(item => [item.id, item])),
      monitoring: new Map(result.monitoringPlan.map(item => [item.id, item])),
    };
  }

  function patchValue(patch, field) {
    const arrayField = new Set(["dimensions", "decisionUses", "limitations", "requiredData", "implementationSteps", "resources", "evidenceRefs"]).has(field);
    if (arrayField) return Array.isArray(patch?.items) ? patch.items : [];
    return String(patch?.text ?? "").trim();
  }

  function applyPatch(target, targetType, field, patch, allowedEvidence) {
    const value = patchValue(patch, field);
    if (field === "evidenceRefs") {
      const refs = mergeEvidence(target.evidenceRefs, value, allowedEvidence);
      if (!refs.length) return false;
      target.evidenceRefs = refs.slice(0, ARRAY_LIMITS.evidenceRefs);
      target.source = "deterministic+gemini";
      return true;
    }
    if (["dimensions", "decisionUses", "limitations", "requiredData", "implementationSteps", "resources"].includes(field)) {
      const items = clampItems(value, ARRAY_LIMITS[field] || 4);
      if (!items.length) return false;
      const localKey = targetType === "profile" && field === "decisionUses" ? "decisionUse" : field;
      target[localKey] = uniqueStrings([...(target[localKey] || []), ...items]).slice(0, ARRAY_LIMITS[field] || 4);
      if (targetType !== "profile") target.source = "deterministic+gemini";
      return true;
    }
    if (field === "confidence") {
      if (!["مرتفعة", "متوسطة", "منخفضة"].includes(value)) return false;
      target.confidence = value;
      target.source = "deterministic+gemini";
      return true;
    }
    if (field === "severity") {
      if (!["high", "medium", "low"].includes(value)) return false;
      target.severity = value;
      target.source = "deterministic+gemini";
      return true;
    }
    const limit = TEXT_LIMITS[field] || 900;
    const text = trimText(value, limit);
    if (!text) return false;
    if (targetType === "executive") {
      if (field === "executiveTitle") target.executiveTitle = text;
      else if (field === "executiveSummary") target.executiveSummary = text;
      else return false;
    } else {
      target[field] = text;
      if (targetType !== "profile") target.source = "deterministic+gemini";
    }
    return true;
  }

  function applyDeepAnalyses(result, units, allowedEvidence, policy) {
    const byId = new Map(result.diagnosticSections.map(item => [item.id, item]));
    const seen = new Set();
    let applied = 0;
    let rejected = 0;
    const reasons = [];
    for (const unit of (Array.isArray(units) ? units : []).slice(0, policy.maxDeepAnalysisUnits)) {
      const targetId = String(unit?.targetId || "");
      if (!targetId || seen.has(targetId)) { rejected += 1; reasons.push("deep:duplicate-or-empty-target"); continue; }
      seen.add(targetId);
      const target = byId.get(targetId);
      if (!target) { rejected += 1; reasons.push(`deep:unknown:${targetId}`); continue; }
      const analysis = trimText(unit?.analysis, 2200);
      const evidenceRefs = mergeEvidence(target.evidenceRefs, unit?.evidenceRefs || [], allowedEvidence).slice(0, 8);
      if (!analysis || !evidenceRefs.length) { rejected += 1; reasons.push(`deep:missing-analysis-or-evidence:${targetId}`); continue; }
      target.analysis = analysis;
      target.evidenceRefs = evidenceRefs;
      target.confidence = ["مرتفعة", "متوسطة", "منخفضة"].includes(unit?.confidence) ? unit.confidence : target.confidence;
      target.implications = clampItems(unit?.implications, 4, 520);
      target.alternativeExplanations = clampItems(unit?.alternativeExplanations, 3, 520);
      target.limitations = clampItems(unit?.limitations, 4, 520);
      target.dataRequests = clampItems(unit?.dataRequests, 4, 520);
      target.source = "deterministic+gemini";
      applied += 1;
    }
    return { applied, rejected, reasons };
  }

  function applyPatches(result, patches, allowedEvidence, policy) {
    const maps = buildTargetMaps(result);
    const seen = new Set();
    let applied = 0;
    let rejected = 0;
    const reasons = [];
    for (const patch of (Array.isArray(patches) ? patches : []).slice(0, policy.maxPatches)) {
      const targetType = String(patch?.targetType || "");
      const targetId = String(patch?.targetId || "");
      const field = String(patch?.field || "");
      const key = `${targetType}:${targetId}:${field}`;
      if (!targetType || !targetId || !field || seen.has(key)) { rejected += 1; reasons.push(`patch:duplicate-or-empty:${key}`); continue; }
      seen.add(key);
      const allowedFields = PATCH_FIELD_POLICY[targetType];
      if (!allowedFields || !allowedFields.has(field)) { rejected += 1; reasons.push(`patch:forbidden-field:${key}`); continue; }
      const target = maps[targetType]?.get(targetId);
      if (!target) { rejected += 1; reasons.push(`patch:unknown-target:${key}`); continue; }
      const patchEvidence = Array.isArray(patch?.evidenceRefs) ? patch.evidenceRefs : [];
      if (patchEvidence.length && !patchEvidence.some(ref => allowedEvidence.has(String(ref)))) {
        rejected += 1; reasons.push(`patch:invalid-evidence:${key}`); continue;
      }
      if (applyPatch(target, targetType, field, patch, allowedEvidence)) applied += 1;
      else { rejected += 1; reasons.push(`patch:empty-or-invalid:${key}`); }
    }
    return { applied, rejected, reasons };
  }

  function reconcileV2(localAnalysis, delta, options = {}) {
    // توافق آمن مع نتائج v0.9.0 المخزنة سابقًا. لا يُستخدم في الطلبات الجديدة.
    const result = canonicalize(localAnalysis);
    const allowedEvidence = new Set((options.availableEvidenceRefs || []).map(String));
    const converted = { contractVersion: "2-compat", deepAnalysisUnits: [], patches: [], additionalCautions: delta.additionalCautions || [], missingDataRequests: delta.missingDataRequests || [] };
    (delta.diagnosticEnhancements || []).forEach(item => converted.deepAnalysisUnits.push({
      targetId: item.targetId,
      analysis: item.analysis,
      evidenceRefs: item.evidenceRefs || [],
      confidence: item.confidence,
      implications: item.implications || [],
      alternativeExplanations: [],
      limitations: item.limitations || [],
      dataRequests: [],
    }));
    const groups = [
      ["finding", delta.findingEnhancements || [], ["statement", "educationalImpact", "recommendedAction", "limitations", "confidence", "severity", "evidenceRefs"]],
      ["qualityTool", delta.qualityToolEnhancements || [], ["reason", "interpretation", "requiredData"]],
      ["intervention", delta.interventionEnhancements || [], ["action", "responsibleRole", "timeframe", "successIndicator", "monitoringMethod", "contingency", "evidenceRefs"]],
      ["monitoring", delta.monitoringEnhancements || [], ["measure", "owner"]],
    ];
    groups.forEach(([targetType, items, fields]) => items.forEach(item => fields.forEach(field => {
      const value = item[field];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return;
      converted.patches.push({ targetType, targetId: item.targetId, field, text: Array.isArray(value) ? "" : String(value), items: Array.isArray(value) ? value : [], evidenceRefs: item.evidenceRefs || [] });
    })));
    return reconcile(result, converted, { ...options, allowedEvidenceOverride: allowedEvidence });
  }

  function reconcile(localAnalysis, delta, options = {}) {
    if (delta && typeof delta === "object" && !Array.isArray(delta.deepAnalysisUnits) && !Array.isArray(delta.patches)) {
      return reconcileV2(localAnalysis, delta, options);
    }
    const result = canonicalize(localAnalysis);
    if (!delta || typeof delta !== "object") return result;
    const policy = policyFor(result);
    const allowedEvidence = options.allowedEvidenceOverride || new Set((options.availableEvidenceRefs || []).map(String));
    const deepOutcome = applyDeepAnalyses(result, delta.deepAnalysisUnits, allowedEvidence, policy);
    const patchOutcome = applyPatches(result, delta.patches, allowedEvidence, policy);

    result.limitations = uniqueStrings([
      ...(result.limitations || []),
      ...(delta.additionalCautions || []),
      ...(delta.missingDataRequests || []).map(item => `بيانات إضافية مطلوبة: ${item}`),
    ]);
    result.cautions = uniqueStrings([...(result.cautions || []), ...(delta.additionalCautions || [])]);
    result.dataRequests = uniqueStrings([...(result.dataRequests || []), ...(delta.missingDataRequests || [])]);

    if (result.improvementPlan[0]) {
      const first = result.improvementPlan[0];
      result.action = {
        title: first.action,
        text: `${first.responsibleRole} - ${first.timeframe}`,
        priority: first.priority,
        indicator: first.successIndicator,
      };
    }

    const appliedEnhancements = deepOutcome.applied + patchOutcome.applied;
    result._reconciliation = {
      contractVersion: CONTRACT_VERSION,
      responseContractVersion: String(delta.contractVersion || "unknown"),
      family: policy.family,
      aiApplied: appliedEnhancements > 0,
      appliedDeepAnalyses: deepOutcome.applied,
      appliedPatches: patchOutcome.applied,
      appliedEnhancements,
      rejectedEnhancements: deepOutcome.rejected + patchOutcome.rejected,
      rejectionReasons: [...deepOutcome.reasons, ...patchOutcome.reasons].slice(0, 20),
      addedFindings: 0,
      addedInterventions: 0,
      addedMonitoring: 0,
      addedTools: 0,
      lockedCounts: policy.lockedCounts,
    };
    return result;
  }

  function validateCounts(localAnalysis, reconciled) {
    const policy = policyFor(localAnalysis);
    if (!policy.lockedCounts) return { ok: true, errors: [] };
    const errors = [];
    const checks = [
      ["diagnosticSections", reconciled.diagnosticSections?.length],
      ["findings", reconciled.findings?.length],
      ["interventions", reconciled.improvementPlan?.length],
      ["monitoring", reconciled.monitoringPlan?.length],
    ];
    checks.forEach(([key, actual]) => {
      const expected = policy.lockedCounts[key];
      if (expected !== undefined && actual !== expected) errors.push(`${key}:${actual}/${expected}`);
    });
    return { ok: !errors.length, errors };
  }


  function cleanPrimaryRefs(items, allowedEvidence, limit = 10) {
    return uniqueStrings(items || []).filter(ref => allowedEvidence.has(String(ref))).slice(0, limit);
  }

  function requirePrimaryText(value, label) {
    const text = trimText(value, 2400);
    if (!text) throw new Error(`نتيجة التحليل الأساسية تفتقد ${label}.`);
    return text;
  }

  function publicAnalysisMethod(value) {
    const fallback = "تحليل تربوي مبني على حزمة أدلة محققة";
    if (window.TaqareerDisplayTerms?.analysisMethod) return window.TaqareerDisplayTerms.analysisMethod(value, fallback);
    const text = trimText(value, 900);
    if (!text || /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)+$/.test(text) || /Gemini|الذكاء\s*الاصطناعي|ذكاء\s*اصطناعي/i.test(text)) return fallback;
    return text;
  }

  const SCORE_GROUP_LABELS = Object.freeze({
    mastery: "حققوا حد الإتقان",
    near_mastery: "قريبون من الإتقان",
    moderate_gap: "دون الإتقان بفجوة متوسطة",
    deep_gap: "دون الإتقان بفجوة عميقة",
  });

  function roundDecimal(value, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }

  function localScoreInterventionContext(localEvidence) {
    const segments = (Array.isArray(localEvidence?.segments) ? localEvidence.segments : [])
      .map(item => ({
        id: String(item?.id || ""),
        label: String(item?.label || SCORE_GROUP_LABELS[String(item?.id || "")] || ""),
        count: Math.max(0, Math.trunc(Number(item?.count || 0))),
        percentage: Number(item?.percentage || 0),
      }))
      .filter(item => SCORE_GROUP_LABELS[item.id]);
    const totalCount = Math.max(0, Math.trunc(Number(localEvidence?.n || 0)));
    const baselineMasteryCount = Math.max(0, Math.trunc(Number(localEvidence?.masteryCount || 0)));
    const baselineMasteryRate = Number(localEvidence?.masteryPctDisplay ?? localEvidence?.masteryPct ?? 0);
    if (!segments.length || !totalCount || !Number.isFinite(baselineMasteryRate)) return null;
    return { segments, totalCount, baselineMasteryCount, baselineMasteryRate: roundDecimal(baselineMasteryRate, 1) };
  }

  function clientGuardScoreIntervention(item, context) {
    const guard = item?.numericGuard && typeof item.numericGuard === "object" ? item.numericGuard : null;
    if (!guard?.applied) throw new Error("رفض محرك التحقق تدخلًا رقميًا لم يمر بالحارس الحسابي الخادمي.");
    const groupMap = new Map(context.segments.map(group => [group.id, group]));
    const targetGroupIds = uniqueStrings(item?.targetGroupIds || []).filter(id => groupMap.has(id)).slice(0, 4);
    const groups = targetGroupIds.map(id => groupMap.get(id)).filter(Boolean);
    const targetGroup = groups.map(group => `${group.label} (${group.count} طالبًا)`).join("، ");
    const mode = String(guard.mode || item?.successMetric?.mode || "");
    let successIndicator = "";

    if (Number(guard.totalCount) !== context.totalCount) {
      throw new Error("رفض محرك التحقق تدخلًا بُني على إجمالي سجلات لا يطابق الحساب المحلي.");
    }

    if (mode === "mastery_gain") {
      const eligibleCount = groups.filter(group => group.id !== "mastery").reduce((sum, group) => sum + group.count, 0);
      const baselineCount = Math.trunc(Number(guard.baselineCount));
      const feasibleGain = Math.trunc(Number(guard.feasibleGain));
      const targetCount = Math.trunc(Number(guard.targetCount));
      const targetRate = roundDecimal((targetCount / context.totalCount) * 100, 1);
      if (baselineCount !== context.baselineMasteryCount || eligibleCount !== Math.trunc(Number(guard.eligibleCount)) || feasibleGain < 1 || feasibleGain > eligibleCount || targetCount !== baselineCount + feasibleGain || targetCount > baselineCount + eligibleCount || Math.abs(targetRate - Number(guard.targetRate)) > 0.11) {
        throw new Error("رفض محرك التحقق هدف إتقان غير متسق مع حجم الفئات المستهدفة.");
      }
      const conversionRate = roundDecimal((feasibleGain / eligibleCount) * 100, 1);
      successIndicator = `رفع عدد المتقنين من ${baselineCount} إلى ${targetCount} طالبًا على الأقل، عبر انتقال ${feasibleGain} من أصل ${eligibleCount} طالبًا مستهدفًا (${conversionRate}%) إلى الإتقان، بما يرفع النسبة من ${context.baselineMasteryRate}% إلى ${targetRate}% تقريبًا.`;
    } else if (mode === "segment_reduction") {
      const segment = groupMap.get(String(guard.segmentId || ""));
      const baselineSegmentCount = Math.trunc(Number(guard.baselineSegmentCount));
      const reductionCount = Math.trunc(Number(guard.reductionCount));
      const targetSegmentCount = Math.trunc(Number(guard.targetSegmentCount));
      if (!segment || segment.id === "mastery" || baselineSegmentCount !== segment.count || reductionCount < 1 || reductionCount > segment.count || targetSegmentCount !== segment.count - reductionCount) {
        throw new Error("رفض محرك التحقق هدف خفض فئة غير متسق مع التوزيع المحلي.");
      }
      const reductionRate = roundDecimal((reductionCount / segment.count) * 100, 1);
      successIndicator = `خفض عدد ${segment.label} من ${segment.count} إلى ${targetSegmentCount} طالبًا على الأكثر، أي انتقال ${reductionCount} طالبًا (${reductionRate}%) إلى فئة أعلى في القياس اللاحق.`;
    } else if (mode === "mastery_maintenance") {
      const mastery = groupMap.get("mastery") || { label: SCORE_GROUP_LABELS.mastery, count: context.baselineMasteryCount };
      const retainedCount = Math.trunc(Number(guard.retainedCount));
      if (Math.trunc(Number(guard.baselineMasteryCount)) !== mastery.count || retainedCount < 0 || retainedCount > mastery.count) {
        throw new Error("رفض محرك التحقق هدف تثبيت لا يطابق عدد المتقنين المحلي.");
      }
      const retentionRate = mastery.count ? roundDecimal((retainedCount / mastery.count) * 100, 1) : 0;
      successIndicator = mastery.count
        ? `الحفاظ على إتقان ما لا يقل عن ${retainedCount} من أصل ${mastery.count} طالبًا متقنًا (${retentionRate}%)، مع تحقق معيار المهمة الإثرائية المحدد في المتابعة.`
        : "لا توجد فئة متقنة حاليًا؛ يُستبدل هدف التثبيت بقياس كسب الإتقان بعد التدخل العلاجي.";
    } else {
      throw new Error("رفض محرك التحقق نمط مؤشر رقمي غير مدعوم لملف الدرجات.");
    }

    return {
      targetGroup: targetGroup || trimText(item?.targetGroup, 360),
      targetGroupIds,
      successIndicator,
      successMetric: clone(item?.successMetric || {}),
      numericGuard: clone(guard),
    };
  }

  function localMultiVisitScopeContext(localEvidence) {
    const source = localEvidence?.scopeContext && typeof localEvidence.scopeContext === "object" ? localEvidence.scopeContext : null;
    if (!source) return null;
    const populationLabel = trimText(source.populationLabel, 360);
    if (!populationLabel) return null;
    return {
      scopeType: trimText(source.scopeType, 100) || "sampled-multi-visit",
      sampleOnly: source.sampleOnly !== false,
      visitCount: Math.max(0, Math.trunc(Number(source.visitCount || 0))),
      populationLabel,
      subjects: clampItems(source.subjects, 12, 140),
      departmentLabel: trimText(source.departmentLabel, 260),
    };
  }

  function broadMultiVisitTarget(value) {
    const text = normalize(value);
    return /الهيئه التدريسيه|الهيئه التعليميه|جميع معلمي المدرسه|معلمو المدرسه|كافه المعلمين|جميع المعلمين|كل المعلمين/.test(text)
      || (/(بالمدرسه|في المدرسه)/.test(text) && !/المشمولين بالزيارات|قسم|ماده|الصف/.test(text));
  }

  function clientGuardMultiVisitScope(item, context) {
    const guard = item?.scopeGuard && typeof item.scopeGuard === "object" ? item.scopeGuard : null;
    if (!guard?.applied) throw new Error("رفض محرك التحقق تدخلًا إشرافيًا لم يمر بحارس نطاق العينة الخادمي.");
    if (Math.trunc(Number(guard.visitCount || 0)) !== context.visitCount) {
      throw new Error("رفض محرك التحقق تدخلًا بُني على عدد زيارات لا يطابق السجلات المحلية.");
    }
    if (normalize(guard.populationLabel) !== normalize(context.populationLabel)) {
      throw new Error("رفض محرك التحقق تدخلًا يستخدم نطاقًا مختلفًا عن عينة الزيارات المحلية.");
    }
    const finalTargetGroup = trimText(guard.finalTargetGroup || item?.targetGroup, 360);
    if (!finalTargetGroup || broadMultiVisitTarget(finalTargetGroup)) {
      throw new Error("رفض محرك التحقق تدخلًا يوسع الفئة المستهدفة خارج المعلمين المشمولين بالزيارات.");
    }
    if (guard.adjusted && normalize(finalTargetGroup) !== normalize(context.populationLabel)) {
      throw new Error("رفض محرك التحقق تضييق نطاق غير مطابق للفئة المحلية المعتمدة.");
    }
    return {
      targetGroup: finalTargetGroup,
      scopeGuard: clone(guard),
    };
  }

  function localLevelsDerivedFromScores(localEvidence) {
    const source = String(localEvidence?.scopeContext?.levelSource || "");
    if (source === "derived_from_score") return true;
    return (Array.isArray(localEvidence?.metrics) ? localEvidence.metrics : []).some(item =>
      ["levelSource", "selectedSubjectLevelSource"].includes(String(item?.id || ""))
      && /مشتقه|محسوبه محليا|derived/i.test(normalize(item?.value || item?.note || ""))
    );
  }

  function mentionsIndependentScoreLevelCheck(value) {
    const text = normalize(value);
    return /اتساق.*الدرجه.*المستوي|اختلافات.*الدرجه.*المستوي|تطابق.*الدرجه.*المستوي/.test(text);
  }

  function applyLevelProvenanceGuard(result, localEvidence) {
    if (!localLevelsDerivedFromScores(localEvidence)) return false;
    const dimensions = (result.analysisProfile?.dimensions || []).filter(item => !mentionsIndependentScoreLevelCheck(item));
    if (!dimensions.some(item => normalize(item).includes("مصدر المستويات"))) {
      dimensions.push("مصدر المستويات وحدود اشتقاقها");
    }
    result.analysisProfile.dimensions = dimensions;
    result.analysisProfile.decisionUse = (result.analysisProfile?.decisionUse || []).filter(item => !mentionsIndependentScoreLevelCheck(item));
    result.qualityTools = (result.qualityTools || []).filter(item =>
      !mentionsIndependentScoreLevelCheck([item?.name, item?.reason, item?.interpretation].filter(Boolean).join(" "))
    );
    result.limitations = uniqueStrings([
      ...(result.limitations || []),
      "المستويات أ-هـ مشتقة محليًا من الدرجات الرقمية؛ لذلك لا يُعرض فحص اتساق مستقل بين الدرجة والمستوى.",
    ]);
    return true;
  }

  function composePrimary(localEvidence, primaryResult, options = {}) {
    const result = canonicalize(localEvidence || {});
    if (!primaryResult || typeof primaryResult !== "object") throw new Error("لم تصل نتيجة التحليل الأساسية.");
    const allowedEvidence = new Set((options.availableEvidenceRefs || []).map(String));
    const executive = primaryResult.executive && typeof primaryResult.executive === "object" ? primaryResult.executive : {};
    const profile = primaryResult.analysisProfile && typeof primaryResult.analysisProfile === "object" ? primaryResult.analysisProfile : {};

    result.executiveTitle = requirePrimaryText(executive.title, "العنوان التنفيذي");
    result.executiveSummary = requirePrimaryText(executive.summary, "الملخص التنفيذي");
    result.executiveJudgement = trimText(executive.overallJudgement, 600);
    result.executiveConfidence = ["مرتفعة", "متوسطة", "منخفضة"].includes(executive.confidence) ? executive.confidence : "متوسطة";
    result.executiveEvidenceRefs = cleanPrimaryRefs(executive.evidenceRefs, allowedEvidence, 10);
    result.analysisProfile = {
      method: publicAnalysisMethod(profile.method),
      dataAdequacy: trimText(profile.dataAdequacy, 700) || "كفاية البيانات غير محددة",
      dimensions: clampItems(profile.dimensions, 10, 420),
      decisionUse: clampItems(profile.decisionUses, 10, 420),
    };

    result.diagnosticSections = (Array.isArray(primaryResult.diagnosticSections) ? primaryResult.diagnosticSections : [])
      .slice(0, 9)
      .map((item, index) => ({
        id: String(item?.id || `diagnostic.ai.${index + 1}`),
        title: trimText(item?.title, 240),
        analysis: trimText(item?.analysis, 2400),
        claimType: ["fact", "inference", "hypothesis"].includes(item?.claimType) ? item.claimType : "inference",
        evidenceRefs: cleanPrimaryRefs(item?.evidenceRefs, allowedEvidence, 10),
        confidence: ["مرتفعة", "متوسطة", "منخفضة"].includes(item?.confidence) ? item.confidence : "متوسطة",
        implications: clampItems(item?.implications, 5, 620),
        alternativeExplanations: clampItems(item?.alternativeExplanations, 4, 620),
        limitations: clampItems(item?.limitations, 5, 620),
        dataRequests: clampItems(item?.dataRequests, 5, 620),
        source: "gemini-primary",
      }))
      .filter(item => item.title && item.analysis && item.evidenceRefs.length);

    result.findings = (Array.isArray(primaryResult.findings) ? primaryResult.findings : [])
      .slice(0, 12)
      .map((item, index) => ({
        id: String(item?.id || `finding.ai.${index + 1}`),
        title: trimText(item?.title, 240),
        statement: trimText(item?.statement, 1100),
        claimType: ["fact", "inference", "hypothesis"].includes(item?.claimType) ? item.claimType : "inference",
        evidenceRefs: cleanPrimaryRefs(item?.evidenceRefs, allowedEvidence, 10),
        confidence: ["مرتفعة", "متوسطة", "منخفضة"].includes(item?.confidence) ? item.confidence : "متوسطة",
        severity: ["high", "medium", "low"].includes(item?.severity) ? item.severity : "medium",
        educationalImpact: trimText(item?.educationalImpact, 1100),
        recommendedAction: trimText(item?.recommendedAction, 1100),
        limitations: clampItems(item?.limitations, 5, 620),
        source: "gemini-primary",
      }))
      .filter(item => item.title && item.statement && item.evidenceRefs.length && item.educationalImpact && item.recommendedAction);

    result.qualityTools = (Array.isArray(primaryResult.qualityTools) ? primaryResult.qualityTools : [])
      .slice(0, 10)
      .map((item, index) => ({
        id: String(item?.id || `tool.ai.${index + 1}`),
        name: trimText(item?.name, 240),
        reason: trimText(item?.reason, 900),
        conditionsMet: item?.conditionsMet !== false,
        interpretation: trimText(item?.interpretation, 1100),
        requiredData: clampItems(item?.requiredData, 6, 520),
        evidenceRefs: cleanPrimaryRefs(item?.evidenceRefs, allowedEvidence, 10),
        source: "gemini-primary",
      }))
      .filter(item => item.name && item.reason);

    const numericScoreType = NUMERIC_SCORE_TYPES.has(String(result.typeId || ""));
    const multiVisitType = String(result.typeId || "") === "supervision_multi_visit";
    const scoreInterventionContext = numericScoreType ? localScoreInterventionContext(localEvidence) : null;
    const multiVisitScopeContext = multiVisitType ? localMultiVisitScopeContext(localEvidence) : null;
    if (numericScoreType && !scoreInterventionContext) {
      throw new Error("تعذر التحقق محليًا من فئات التدخل الرقمية.");
    }
    if (multiVisitType && !multiVisitScopeContext) {
      throw new Error("تعذر التحقق محليًا من نطاق عينة الزيارات الإشرافية.");
    }

    result.improvementPlan = (Array.isArray(primaryResult.interventions) ? primaryResult.interventions : [])
      .slice(0, 8)
      .map((item, index) => {
        const base = {
          id: String(item?.id || `intervention.ai.${index + 1}`),
          priority: trimText(item?.priority, 160) || `أولوية ${index + 1}`,
          issue: trimText(item?.issue, 360),
          targetGroup: trimText(item?.targetGroup, 360),
          targetGroupIds: clampItems(item?.targetGroupIds, 4, 80),
          action: trimText(item?.action, 1500),
          implementationSteps: clampItems(item?.implementationSteps, 6, 700),
          responsibleRole: trimText(item?.responsibleRole, 320),
          timeframe: trimText(item?.timeframe, 260),
          successIndicator: trimText(item?.successIndicator, 900),
          successMetric: clone(item?.successMetric || {}),
          numericGuard: clone(item?.numericGuard || null),
          scopeGuard: clone(item?.scopeGuard || null),
          monitoringMethod: trimText(item?.monitoringMethod, 820),
          contingency: trimText(item?.contingency, 900),
          resources: clampItems(item?.resources, 6, 540),
          evidenceRefs: cleanPrimaryRefs(item?.evidenceRefs, allowedEvidence, 10),
          source: "gemini-primary",
        };
        if (scoreInterventionContext) {
          const guarded = clientGuardScoreIntervention(item, scoreInterventionContext);
          base.targetGroup = guarded.targetGroup;
          base.targetGroupIds = guarded.targetGroupIds;
          base.successIndicator = guarded.successIndicator;
          base.successMetric = guarded.successMetric;
          base.numericGuard = guarded.numericGuard;
        }
        if (multiVisitScopeContext) {
          const scoped = clientGuardMultiVisitScope(item, multiVisitScopeContext);
          base.targetGroup = scoped.targetGroup;
          base.scopeGuard = scoped.scopeGuard;
        }
        return base;
      })
      .filter(item => item.issue && item.targetGroup && item.action && item.successIndicator && item.evidenceRefs.length);

    result.monitoringPlan = (Array.isArray(primaryResult.monitoringPlan) ? primaryResult.monitoringPlan : [])
      .slice(0, 8)
      .map((item, index) => ({
        id: String(item?.id || `monitoring.ai.${index + 1}`),
        stage: trimText(item?.stage, 240),
        timing: trimText(item?.timing, 240),
        measure: trimText(item?.measure, 850),
        owner: trimText(item?.owner, 320),
        evidenceRefs: cleanPrimaryRefs(item?.evidenceRefs, allowedEvidence, 10),
        source: "gemini-primary",
      }))
      .filter(item => item.stage && item.measure);

    if (result.diagnosticSections.length < 2 || result.findings.length < 2 || result.improvementPlan.length < 2 || result.monitoringPlan.length < 3) {
      throw new Error("رفض محرك التحقق تحليلًا لم يقدم وحدات قرار وتدخلين متمايزين وثلاث مراحل متابعة مرتبطة بالأدلة.");
    }

    result.limitations = uniqueStrings([
      ...(localEvidence?.limitations || []),
      ...(executive.limitations || []),
      ...(primaryResult.additionalCautions || []),
      ...(primaryResult.missingDataRequests || []).map(item => `بيانات إضافية مطلوبة: ${item}`),
    ]);
    result.cautions = uniqueStrings(primaryResult.additionalCautions || []);
    result.dataRequests = uniqueStrings(primaryResult.missingDataRequests || []);
    result.suggestedNewType = primaryResult.suggestedNewType || null;
    const levelProvenanceGuardApplied = applyLevelProvenanceGuard(result, localEvidence);

    const first = result.improvementPlan[0];
    result.action = first ? {
      title: first.action,
      text: `${first.responsibleRole || "فريق العمل"} - ${first.timeframe || "وفق الخطة"}`,
      priority: first.priority,
      indicator: first.successIndicator,
    } : null;

    result._reconciliation = {
      contractVersion: "6.6.0",
      responseContractVersion: String(primaryResult.contractVersion || "unknown"),
      family: familyOf(result),
      aiPrimary: true,
      aiApplied: true,
      appliedDeepAnalyses: result.diagnosticSections.length,
      appliedPatches: 0,
      appliedEnhancements: result.diagnosticSections.length + result.findings.length + result.improvementPlan.length,
      rejectedEnhancements: 0,
      rejectionReasons: [],
      addedFindings: result.findings.length,
      addedInterventions: result.improvementPlan.length,
      addedMonitoring: result.monitoringPlan.length,
      addedTools: result.qualityTools.length,
      levelProvenanceGuardApplied,
      lockedCounts: null,
    };
    return result;
  }

  function validatePrimaryResult(primaryResult, options = {}) {
    try {
      const probe = composePrimary({ metrics: [], charts: [], evidenceMap: {}, limitations: [] }, primaryResult, options);
      return { ok: true, errors: [], counts: {
        diagnostics: probe.diagnosticSections.length,
        findings: probe.findings.length,
        interventions: probe.improvementPlan.length,
        monitoring: probe.monitoringPlan.length,
      } };
    } catch (error) {
      return { ok: false, errors: [error?.message || "نتيجة غير صالحة"], counts: {} };
    }
  }

  window.TaqareerReconciliation = {
    VERSION,
    CONTRACT_VERSION,
    PATCH_FIELD_POLICY,
    canonicalize,
    buildContract,
    reconcile,
    composePrimary,
    validatePrimaryResult,
    validateCounts,
    familyOf,
    similarity,
  };
})();
