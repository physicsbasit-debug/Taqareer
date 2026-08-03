(() => {
  "use strict";

  const VERSION = "0.9.0";
  const CONTRACT_VERSION = "2.0.0";

  const SCORE_TYPES = new Set(["student_results", "assessment_component", "cross_subject"]);
  const LOCKED_SCORE_COUNTS = Object.freeze({ diagnosticSections: 4, findings: 5, interventions: 4, monitoring: 4 });

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
    return (Array.isArray(items) ? items : []).filter(item => {
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
        allowAdditionalFindings: 0,
        allowAdditionalInterventions: 0,
        allowAdditionalMonitoring: 0,
        allowAdditionalTools: 0,
      };
    }
    if (family === "adaptive") {
      return {
        family,
        lockedCounts: null,
        allowAdditionalFindings: 2,
        allowAdditionalInterventions: 2,
        allowAdditionalMonitoring: 1,
        allowAdditionalTools: 1,
      };
    }
    return {
      family,
      lockedCounts: null,
      allowAdditionalFindings: 1,
      allowAdditionalInterventions: 0,
      allowAdditionalMonitoring: 0,
      allowAdditionalTools: 1,
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
    }));
    result.findings = (result.findings || []).map((item, index) => ({
      ...item,
      id: item.id || findingId(item, index),
      source: item.source || "deterministic",
      statement: item.statement || item.title || "",
      educationalImpact: item.educationalImpact || item.impact || "",
      recommendedAction: item.recommendedAction || item.action || "",
      limitations: Array.isArray(item.limitations) ? item.limitations : [],
    }));
    result.qualityTools = (result.qualityTools || []).map((item, index) => ({
      ...item,
      id: item.id || `tool.${index + 1}.${hash(item.name)}`,
      source: item.source || "deterministic",
    }));
    result.improvementPlan = (result.improvementPlan || []).map((item, index) => ({
      ...item,
      id: item.id || interventionId(item, index),
      source: item.source || "deterministic",
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
      appliedEnhancements: 0,
      rejectedEnhancements: 0,
      addedFindings: 0,
      addedInterventions: 0,
      addedMonitoring: 0,
      addedTools: 0,
    };
    return result;
  }

  function targetSummary(item, fields) {
    const output = { id: item.id };
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
      mode: "delta-only",
      family: policy.family,
      rules: {
        localCalculationsAreAuthoritative: true,
        doNotCreateParallelPlans: true,
        doNotCreateParallelMonitoringCycles: true,
        targetIdsAreMandatory: true,
        lockedCounts: policy.lockedCounts,
        additionalLimits: {
          findings: policy.allowAdditionalFindings,
          interventions: policy.allowAdditionalInterventions,
          monitoring: policy.allowAdditionalMonitoring,
          tools: policy.allowAdditionalTools,
        },
      },
      executive: {
        title: analysis.executiveTitle || "",
        summary: analysis.executiveSummary || "",
      },
      analysisProfile: analysis.analysisProfile || {},
      targets: {
        diagnosticSections: analysis.diagnosticSections.map(item => targetSummary(item, ["title", "analysis", "evidenceRefs", "implications", "limitations", "confidence"])),
        findings: analysis.findings.map(item => targetSummary(item, ["title", "statement", "evidenceRefs", "confidence", "educationalImpact", "recommendedAction", "limitations", "severity"])),
        qualityTools: analysis.qualityTools.map(item => targetSummary(item, ["name", "reason", "conditionsMet", "interpretation"])),
        interventions: analysis.improvementPlan.map(item => targetSummary(item, ["priority", "issue", "targetGroup", "action", "responsibleRole", "timeframe", "successIndicator", "monitoringMethod", "contingency", "evidenceRefs"])),
        monitoring: analysis.monitoringPlan.map(item => targetSummary(item, ["stage", "timing", "measure", "owner"])),
      },
    };
  }

  function mergeEvidence(local, incoming, allowedEvidence) {
    return uniqueStrings([...(local || []), ...(incoming || [])]).filter(ref => !allowedEvidence || allowedEvidence.has(String(ref)));
  }

  function mergeArrayField(target, patch, field) {
    if (Array.isArray(patch?.[field]) && patch[field].length) {
      target[field] = uniqueStrings([...(target[field] || []), ...patch[field]]);
    }
  }

  function applyText(target, patch, fields) {
    let applied = 0;
    fields.forEach(field => {
      const value = String(patch?.[field] ?? "").trim();
      if (value) {
        target[field] = value;
        applied += 1;
      }
    });
    if (applied) target.source = "deterministic+gemini";
    return applied;
  }

  function applyEnhancements(items, enhancements, config) {
    const byId = new Map(items.map(item => [item.id, item]));
    let applied = 0;
    let rejected = 0;
    (Array.isArray(enhancements) ? enhancements : []).forEach(patch => {
      const target = byId.get(String(patch?.targetId || ""));
      if (!target) { rejected += 1; return; }
      applied += applyText(target, patch, config.textFields || []);
      (config.arrayFields || []).forEach(field => mergeArrayField(target, patch, field));
      if (patch?.evidenceRefs) target.evidenceRefs = mergeEvidence(target.evidenceRefs, patch.evidenceRefs, config.allowedEvidence);
      if (patch?.confidence) target.confidence = patch.confidence;
      if (patch?.severity) target.severity = patch.severity;
    });
    return { applied, rejected };
  }

  function addNovelFindings(result, additional, limit, allowedEvidence) {
    if (!limit) return 0;
    let added = 0;
    for (const item of Array.isArray(additional) ? additional : []) {
      if (added >= limit) break;
      const title = String(item?.title || "").trim();
      if (!title) continue;
      const duplicate = result.findings.some(existing => similarity(`${existing.title} ${existing.statement}`, `${title} ${item.statement || ""}`) >= 0.48);
      if (duplicate) continue;
      const evidenceRefs = mergeEvidence([], item.evidenceRefs || [], allowedEvidence);
      if (!evidenceRefs.length) continue;
      result.findings.push({
        id: `finding.ai.${hash(title)}`,
        title,
        statement: String(item.statement || title),
        evidenceRefs,
        confidence: item.confidence || "متوسطة",
        educationalImpact: String(item.educationalImpact || ""),
        recommendedAction: String(item.recommendedAction || ""),
        limitations: uniqueStrings(item.limitations || []),
        severity: item.severity || "medium",
        source: "gemini-novel",
      });
      added += 1;
    }
    return added;
  }

  function reconcile(localAnalysis, delta, options = {}) {
    const result = canonicalize(localAnalysis);
    if (!delta || typeof delta !== "object") return result;
    const policy = policyFor(result);
    const allowedEvidence = new Set((options.availableEvidenceRefs || []).map(String));
    let applied = 0;
    let rejected = 0;

    const executive = delta.executiveEnhancement || {};
    if (String(executive.title || "").trim()) { result.executiveTitle = String(executive.title).trim(); applied += 1; }
    if (String(executive.summary || "").trim()) { result.executiveSummary = String(executive.summary).trim(); applied += 1; }

    const profile = delta.profileEnhancement || {};
    result.analysisProfile = { ...(result.analysisProfile || {}) };
    if (String(profile.method || "").trim()) { result.analysisProfile.method = String(profile.method).trim(); applied += 1; }
    if (String(profile.dataAdequacy || "").trim()) { result.analysisProfile.dataAdequacy = String(profile.dataAdequacy).trim(); applied += 1; }
    if (Array.isArray(profile.dimensions)) result.analysisProfile.dimensions = uniqueStrings([...(result.analysisProfile.dimensions || []), ...profile.dimensions]).slice(0, 10);
    if (Array.isArray(profile.decisionUses)) result.analysisProfile.decisionUse = uniqueStrings([...(result.analysisProfile.decisionUse || result.analysisProfile.decisionUses || []), ...profile.decisionUses]).slice(0, 10);

    for (const outcome of [
      applyEnhancements(result.diagnosticSections, delta.diagnosticEnhancements, { textFields: ["analysis"], arrayFields: ["implications", "limitations"], allowedEvidence }),
      applyEnhancements(result.findings, delta.findingEnhancements, { textFields: ["statement", "educationalImpact", "recommendedAction"], arrayFields: ["limitations"], allowedEvidence }),
      applyEnhancements(result.qualityTools, delta.qualityToolEnhancements, { textFields: ["reason", "interpretation"], arrayFields: ["requiredData"], allowedEvidence }),
      applyEnhancements(result.improvementPlan, delta.interventionEnhancements, { textFields: ["action", "responsibleRole", "timeframe", "successIndicator", "monitoringMethod", "contingency"], arrayFields: [], allowedEvidence }),
      applyEnhancements(result.monitoringPlan, delta.monitoringEnhancements, { textFields: ["measure", "owner"], arrayFields: [], allowedEvidence }),
    ]) {
      applied += outcome.applied;
      rejected += outcome.rejected;
    }

    const addedFindings = addNovelFindings(result, delta.additionalFindings, policy.allowAdditionalFindings, allowedEvidence);

    result.limitations = uniqueStrings([
      ...(result.limitations || []),
      ...(delta.additionalCautions || []),
      ...(delta.missingDataRequests || []).map(item => `بيانات إضافية مطلوبة: ${item}`),
    ]);
    result.cautions = uniqueStrings([...(result.cautions || []), ...(delta.additionalCautions || [])]);
    result.dataRequests = uniqueStrings([...(result.dataRequests || []), ...(delta.missingDataRequests || [])]);
    result.suggestedNewType = delta.suggestedNewType || result.suggestedNewType;

    if (result.improvementPlan[0]) {
      const first = result.improvementPlan[0];
      result.action = {
        title: first.action,
        text: `${first.responsibleRole} - ${first.timeframe}`,
        priority: first.priority,
        indicator: first.successIndicator,
      };
    }

    result._reconciliation = {
      contractVersion: CONTRACT_VERSION,
      family: policy.family,
      aiApplied: applied > 0 || addedFindings > 0,
      appliedEnhancements: applied,
      rejectedEnhancements: rejected,
      addedFindings,
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

  window.TaqareerReconciliation = {
    VERSION,
    CONTRACT_VERSION,
    canonicalize,
    buildContract,
    reconcile,
    validateCounts,
    familyOf,
    similarity,
  };
})();
