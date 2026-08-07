(() => {
  "use strict";

  const VERSION = "1.1.0";

  const ANALYSIS_LABELS = Object.freeze({
    multi_subject_individual_analysis: "تحليل نتائج طلاب فردية متعددة المواد",
    multi_subject_individual_results: "تحليل نتائج طلاب فردية متعددة المواد",
    multi_subject_results: "تحليل نتائج طلاب فردية متعددة المواد",
    student_results: "تحليل نتائج الطلبة",
    single_subject: "تحليل نتائج مادة واحدة",
    assessment_component: "تحليل درجات وتقويم",
    level_distribution: "تحليل توزيع مستويات الأداء",
    "level distribution": "تحليل توزيع مستويات الأداء",
    level_distribution_analysis: "تحليل توزيع مستويات الأداء",
    cross_subject: "تحليل مقارن بين المواد",
    cross_subject_analysis: "تحليل مقارن بين المواد",
    supervision_multi_visit: "تحليل زيارات إشرافية متعددة",
    supervision_indicator: "تحليل مؤشرات إشرافية",
    supervision_narrative: "تحليل إشرافي سردي",
    student_work: "تحليل أعمال الطلبة",
    survey: "تحليل استبانة",
    training_needs: "تحليل احتياجات تدريبية",
    program_evaluation: "تحليل تقويم برنامج",
    behavior_attendance: "تحليل السلوك والمواظبة",
    scores: "تحليل الدرجات",
    levels: "تحليل مستويات الأداء",
    narrative: "تحليل تربوي سردي",
    adaptive_generic: "تحليل تربوي تكيفي",
    unknown: "تحليل تربوي تكيفي",
  });

  const INTERNAL_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)+$/;
  const REPORT_TOKEN_PATTERN = /^TQR-[A-Z0-9-]+$/i;
  const PROVIDER_PATTERN = /\b(?:gemini|openai|anthropic|claude)\b/i;
  const AI_AR_PATTERN = /(?:الذكاء\s*الاصطناعي|ذكاء\s*اصطناعي)/i;

  const TEXT_REPLACEMENTS = Object.freeze([
    [/\blevel\s+distribution\b/gi, "توزيع مستويات الأداء"],
    [/\bsemanas?\b/gi, "أسابيع"],
    [/\bweeks?\b/gi, "أسابيع"],
    [/\bmonths?\b/gi, "أشهر"],
    [/\bundefined\b/gi, ""],
  ]);

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function mapped(value) {
    const text = clean(value);
    if (!text) return "";
    return ANALYSIS_LABELS[text] || ANALYSIS_LABELS[text.toLowerCase()] || "";
  }

  function looksInternal(value) {
    const text = clean(value);
    return Boolean(text && (INTERNAL_ID_PATTERN.test(text) || REPORT_TOKEN_PATTERN.test(text)));
  }

  function neutralizeProviderWording(value, fallback = "تحليل تربوي مبني على أدلة محققة") {
    const text = clean(value);
    if (!text) return fallback;
    if (PROVIDER_PATTERN.test(text) || AI_AR_PATTERN.test(text)) return fallback;
    return text;
  }

  function analysisMethod(value, fallback = "تحليل تربوي متخصص") {
    const text = clean(value);
    if (!text) return fallback;
    const label = mapped(text);
    if (label) return label;
    if (looksInternal(text)) return fallback;
    return neutralizeProviderWording(text, fallback);
  }

  function publicLabel(value, fallback = "بيان تحليلي") {
    const text = clean(value);
    if (!text) return fallback;
    const label = mapped(text);
    if (label) return label;
    if (looksInternal(text)) return fallback;
    return text;
  }

  function publicText(value, fallback = "") {
    let text = clean(value);
    if (!text) return fallback;
    for (const [pattern, replacement] of TEXT_REPLACEMENTS) text = text.replace(pattern, replacement);
    text = clean(text).replace(/\s+([،؛:.])/g, "$1");
    return text || fallback;
  }

  window.TaqareerDisplayTerms = Object.freeze({
    VERSION,
    ANALYSIS_LABELS,
    analysisMethod,
    publicLabel,
    publicText,
    looksInternal,
    neutralizeProviderWording,
  });
})();
