(() => {
  "use strict";

  const VERSION = "1.0.0";
  const COMPOSITION_PATTERNS = /(?:توزيع|فئات التدخل|حالة القيد|حالة النتيجة|التصنيف الأساسي|أنماط الطلبة|أنماط الاحتياج|جودة الأدلة|قابلية التوصيات)/i;
  const HISTOGRAM_PATTERNS = /(?:histogram|توزيع الدرجات|شرائح درجات|فئات درجية)/i;
  const PROFILE_PATTERNS = /(?:ملف المجالات|الملف العام|profile)/i;
  const GAP_PATTERNS = /(?:فجوة|المستهدف|target)/i;
  const BEFORE_AFTER_PATTERNS = /(?:قبل وبعد|قبلي.*بعدي|before.*after|التغير قبل وبعد)/i;
  const TREND_PATTERNS = /(?:اتجاه زمني|عبر الفترات|تغير .* عبر|trend)/i;
  const RELATIONSHIP_PATTERNS = /(?:علاقة|ارتباط|correlation|relationship)/i;
  const ACHIEVEMENT_PATTERNS = /(?:تحقق|تحقيق|انجاز|إنجاز|achievement)/i;

  function normalize(value) {
    return String(value ?? "").trim().replace(/[إأآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[ًٌٍَُِّْـ]/g,"").replace(/\s+/g," ").toLowerCase();
  }
  function rows(chart) { return Array.isArray(chart?.data) ? chart.data : []; }
  function finite(value) { return Number.isFinite(Number(value)); }
  function hasNumeric(rowsValue, key) { return Boolean(key) && rowsValue.some(row => finite(row?.[key])); }
  function detectKey(rowsValue, candidates) { return candidates.find(key => hasNumeric(rowsValue, key)) || ""; }
  function numericKeys(rowsValue) {
    const keys = new Set();
    rowsValue.slice(0, 20).forEach(row => Object.entries(row || {}).forEach(([key, value]) => { if (finite(value)) keys.add(key); }));
    return [...keys];
  }

  function inferIntent(chart) {
    const declared = String(chart?.intent || chart?.visualIntent || "").trim();
    if (declared) return declared;
    const type = String(chart?.type || "bar");
    const text = normalize([chart?.id, chart?.title, chart?.description].filter(Boolean).join(" "));
    const data = rows(chart);

    if (type === "line") return "trend";
    if (type === "radar") return "profile";
    if (type === "box") return "distribution-summary";
    if (type === "heatmap") return "matrix";
    if (type === "table") return RELATIONSHIP_PATTERNS.test(text) ? "relationship" : "table";
    if (type === "stacked") return "composition-comparison";
    if (type === "pareto") return "priority-gap";
    if (BEFORE_AFTER_PATTERNS.test(text) || (hasNumeric(data,"before") && hasNumeric(data,"after"))) return "before-after";
    const labelKey = chart?.xKey || "label";
    const histogramLikeLabels = data.length >= 3 && data.every(row => /(?:\d\s*[-–—]\s*\d|اقل من|أقل من|فاكثر|فأكثر|\d+\s*\+)/i.test(String(row?.[labelKey] ?? row?.label ?? "")));
    if (HISTOGRAM_PATTERNS.test(text) || histogramLikeLabels) return "histogram";
    if (TREND_PATTERNS.test(text)) return "trend";
    if (data.length >= 3 && data.every(row => String(row?.date || row?.period || row?.time || "").trim()) && /(?:زيار|فتر|زمن)/i.test(text)) return "trend";
    if (PROFILE_PATTERNS.test(text)) return "profile";
    if (RELATIONSHIP_PATTERNS.test(text)) return "relationship";
    if ((GAP_PATTERNS.test(text) || ACHIEVEMENT_PATTERNS.test(text)) && (detectKey(data,["target","المستهدف"]) || detectKey(data,["current","outcome","actual","achievement","الحالي","المتحقق"]))) return "target-gap";
    if (GAP_PATTERNS.test(text)) return "priority-gap";
    if (COMPOSITION_PATTERNS.test(text)) return "composition";
    return "comparison";
  }

  function selectChart(chart) {
    if (!chart || typeof chart !== "object") return chart;
    const data = rows(chart);
    const intent = inferIntent(chart);
    const selected = { ...chart, intent, originalType: chart.originalType || chart.type || "bar", visualizationPolicyVersion: VERSION };

    if (["heatmap","table","box"].includes(chart.type)) return selected;
    if (intent === "trend") return { ...selected, type: data.length >= 2 ? "line" : "bar" };
    if (intent === "histogram") return { ...selected, type: data.length >= 3 && data.length <= 18 ? "histogram" : "bar" };
    if (intent === "profile") return { ...selected, type: data.length >= 3 && data.length <= 8 ? "radar" : "bar", max: chart.max || 100 };
    if (intent === "composition-comparison") return { ...selected, type: "stacked100" };
    if (intent === "composition") {
      const yKey = chart.yKey || detectKey(data,["count","value","percentage","pct"]);
      const valid = data.length >= 2 && data.length <= 8 && yKey && data.every(row => finite(row?.[yKey]) && Number(row[yKey]) >= 0);
      return valid ? { ...selected, type: "stacked100", yKey } : { ...selected, type: "bar" };
    }
    if (intent === "before-after") {
      const beforeKey = chart.beforeKey || detectKey(data,["before","قبلي","قبل"]);
      const afterKey = chart.afterKey || detectKey(data,["after","بعدي","بعد"]);
      return beforeKey && afterKey ? { ...selected, type: "dumbbell", beforeKey, afterKey } : { ...selected, type: "bar" };
    }
    if (intent === "target-gap") {
      const targetKey = chart.targetKey || detectKey(data,["target","المستهدف"]);
      const currentKey = chart.currentKey || detectKey(data,["current","outcome","actual","achievement","الحالي","المتحقق"]);
      if (currentKey && (targetKey || finite(chart.targetValue))) return { ...selected, type: "bullet", currentKey, targetKey, targetValue: finite(chart.targetValue) ? Number(chart.targetValue) : undefined };
      return { ...selected, type: "pareto" };
    }
    if (intent === "priority-gap") return { ...selected, type: "pareto" };
    if (intent === "relationship") {
      const keys = numericKeys(data);
      const xKey = chart.xKey && hasNumeric(data, chart.xKey) ? chart.xKey : keys[0];
      const yKey = chart.yKey && hasNumeric(data, chart.yKey) ? chart.yKey : keys.find(key => key !== xKey);
      return xKey && yKey ? { ...selected, type: "scatter", xKey, yKey } : { ...selected, type: chart.type === "table" ? "table" : "bar" };
    }
    if (chart.type === "stacked") return { ...selected, type: "stacked100" };
    if (chart.type === "pareto") return { ...selected, type: "pareto" };
    return selected;
  }

  function applyToCharts(charts) {
    return Array.isArray(charts) ? charts.map(selectChart) : [];
  }
  function applyToAnalysis(analysis) {
    if (!analysis || typeof analysis !== "object") return analysis;
    analysis.charts = applyToCharts(analysis.charts);
    analysis.visualizationPolicy = {
      version: VERSION,
      rule: "semantic-intent-first",
      supportedTypes: ["bar","histogram","stacked100","line","radar","bullet","dumbbell","scatter","pareto","box","heatmap","table"]
    };
    return analysis;
  }

  window.TaqareerVisualizationEngine = { VERSION, inferIntent, selectChart, applyToCharts, applyToAnalysis };
})();
