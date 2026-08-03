(() => {
  "use strict";

  const VERSION = "0.8.0";

  function masteryEngine() {
    const engine = window.TaqareerMasteryMetrics;
    if (!engine?.calculate) throw new Error("محرك معادلات بوصلة الإتقان غير محمل.");
    return engine;
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function parseNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return NaN;
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    const text = String(value).replace(/[٠-٩٫٬]/g, ch => map[ch]).replace(/[%،]/g, m => m === "%" ? "" : ",").trim();
    const n = Number(text.replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }

  function round(value, digits = 1) {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function sum(values) { return values.reduce((total, value) => total + value, 0); }
  function mean(values) { return values.length ? sum(values) / values.length : NaN; }
  function sorted(values) { return [...values].sort((a, b) => a - b); }
  function quantile(values, q) {
    if (!values.length) return NaN;
    const a = sorted(values);
    const pos = (a.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return a[base + 1] !== undefined ? a[base] + rest * (a[base + 1] - a[base]) : a[base];
  }
  function median(values) { return quantile(values, 0.5); }
  function variance(values, sample = false) {
    if (!values.length || (sample && values.length < 2)) return NaN;
    const avg = mean(values);
    return values.reduce((total, value) => total + (value - avg) ** 2, 0) / (values.length - (sample ? 1 : 0));
  }
  function sd(values, sample = false) { const v = variance(values, sample); return Number.isFinite(v) ? Math.sqrt(v) : NaN; }
  function mode(values) {
    if (!values.length) return [];
    const counts = new Map();
    values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    const top = Math.max(...counts.values());
    if (top <= 1) return [];
    return [...counts.entries()].filter(([, count]) => count === top).map(([value]) => value).sort((a, b) => a - b);
  }
  function skewness(values) {
    if (values.length < 3) return NaN;
    const avg = mean(values), sigma = sd(values);
    if (!sigma) return 0;
    return values.reduce((total, value) => total + ((value - avg) / sigma) ** 3, 0) / values.length;
  }
  function excessKurtosis(values) {
    if (values.length < 4) return NaN;
    const avg = mean(values), sigma = sd(values);
    if (!sigma) return 0;
    return values.reduce((total, value) => total + ((value - avg) / sigma) ** 4, 0) / values.length - 3;
  }
  function coefficientOfVariation(values) {
    const avg = mean(values);
    return avg ? sd(values) / Math.abs(avg) * 100 : NaN;
  }
  function frequency(values) {
    const counts = new Map();
    values.forEach(value => {
      const key = String(value ?? "").trim();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }
  function pearson(xs, ys) {
    const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    if (pairs.length < 3) return NaN;
    const a = pairs.map(pair => pair[0]), b = pairs.map(pair => pair[1]);
    const ma = mean(a), mb = mean(b);
    const numerator = pairs.reduce((total, [x, y]) => total + (x - ma) * (y - mb), 0);
    const denominator = Math.sqrt(a.reduce((total, x) => total + (x - ma) ** 2, 0) * b.reduce((total, y) => total + (y - mb) ** 2, 0));
    return denominator ? numerator / denominator : NaN;
  }
  function entropy(counts) {
    const total = sum(counts);
    if (!total) return 0;
    return -counts.reduce((acc, count) => {
      if (!count) return acc;
      const p = count / total;
      return acc + p * Math.log2(p);
    }, 0);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function pct(count, total) { return total ? count / total * 100 : 0; }
  function unique(values) { return [...new Set(values.filter(value => value !== null && value !== undefined && value !== ""))]; }
  function words(value) {
    return normalize(value).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(token => token.length >= 3);
  }
  function jaccard(a, b) {
    const left = new Set(words(a)), right = new Set(words(b));
    if (!left.size || !right.size) return 0;
    const intersection = [...left].filter(token => right.has(token)).length;
    return intersection / (left.size + right.size - intersection);
  }

  function findHeader(headers, aliases) {
    const normalized = headers.map(header => ({ original: header, value: normalize(header) }));
    const keys = aliases.map(normalize);
    return normalized.find(item => keys.some(key => item.value === key || item.value.includes(key)))?.original || "";
  }

  function numericColumns(headers, rows, minimumRatio = 0.5) {
    return headers.map(header => {
      const values = rows.map(row => parseNumber(row[header])).filter(Number.isFinite);
      return { header, values, ratio: values.length / Math.max(1, rows.length) };
    }).filter(column => column.ratio >= minimumRatio);
  }

  function metric(id, label, value, note = "", format = "number", evidenceRef = "") {
    return { id, label, value, note, format, evidenceRef: evidenceRef || `metric:${id}` };
  }
  function finding(title, evidence, confidence, impact, action, severity = "medium", evidenceRefs = [], limitations = []) {
    return { title, evidence, confidence, impact, action, severity, evidenceRefs, limitations, source: "deterministic" };
  }
  function qualityTool(id, name, conditionsMet, reason, output = null, interpretation = "") {
    return { id, name, conditionsMet, reason, output, interpretation };
  }
  function intervention(priority, issue, targetGroup, action, responsibleRole, timeframe, successIndicator, monitoringMethod, contingency, evidenceRefs = []) {
    return { priority, issue, targetGroup, action, responsibleRole, timeframe, successIndicator, monitoringMethod, contingency, evidenceRefs };
  }
  function chart(id, type, title, description, data, options = {}) {
    return { id, type, title, description, data, ...options };
  }

  function evidenceMapFromMetrics(metrics) {
    const map = {};
    metrics.forEach(item => { map[item.evidenceRef || `metric:${item.id}`] = `${item.label}: ${item.value}${item.note ? ` (${item.note})` : ""}`; });
    return map;
  }

  function createBase(context, family, purpose) {
    return {
      version: VERSION,
      kind: family,
      typeId: context.typeId,
      analysisProfile: {
        family,
        purpose,
        dataSufficiency: "متوسطة",
        dimensions: [],
        assumptions: [],
        decisionUse: []
      },
      metrics: [],
      charts: [],
      findings: [],
      qualityTools: [],
      improvementPlan: [],
      monitoringPlan: [],
      limitations: [],
      evidenceMap: {},
      executiveTitle: "تحليل تربوي عميق",
      executiveSummary: "",
      action: { title: "مراجعة النتائج", text: "مراجعة النتائج وربطها بخطة قابلة للقياس.", priority: "متوسطة", indicator: "تحديد خط أساس ومستهدف ومتابعة دورية" }
    };
  }

  function buildHistogram(values, maxScore = null, count = 8) {
    if (!values.length) return [];
    const lower = Number.isFinite(maxScore) ? 0 : Math.min(...values);
    const upper = Number.isFinite(maxScore) ? maxScore : Math.max(...values);
    const width = (upper - lower) / count || 1;
    return Array.from({ length: count }, (_, index) => {
      const start = lower + index * width;
      const end = index === count - 1 ? upper : lower + (index + 1) * width;
      const entries = values.filter(value => value >= start && (index === count - 1 ? value <= end : value < end));
      return {
        label: `${round(start)}-${round(end)}`,
        count: entries.length,
        percentage: round(pct(entries.length, values.length))
      };
    });
  }

  function outlierSummary(values) {
    const q1 = quantile(values, 0.25), q3 = quantile(values, 0.75), iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr, upperFence = q3 + 1.5 * iqr;
    const low = values.filter(value => value < lowerFence), high = values.filter(value => value > upperFence);
    return { q1, q3, iqr, lowerFence, upperFence, low, high, count: low.length + high.length };
  }

  function scoreSegments(values, maxScore, masteryCut) {
    if (!Number.isFinite(maxScore) || !Number.isFinite(masteryCut)) return [];
    const nearBoundary = Math.max(0, masteryCut - maxScore * 0.10);
    const moderateBoundary = Math.max(0, masteryCut - maxScore * 0.25);
    const highBoundary = maxScore * 0.9;
    const definitions = [
      { id: "advanced", label: "إتقان مرتفع / إثراء", test: value => value >= highBoundary },
      { id: "mastered", label: "متقنون", test: value => value >= masteryCut && value < highBoundary },
      { id: "near", label: "قريبون من الإتقان", test: value => value >= nearBoundary && value < masteryCut },
      { id: "support", label: "تعثر متوسط", test: value => value >= moderateBoundary && value < nearBoundary },
      { id: "intensive", label: "تعثر شديد", test: value => value < moderateBoundary }
    ];
    return definitions.map(item => {
      const selected = values.filter(item.test);
      return {
        id: item.id,
        label: item.label,
        count: selected.length,
        percentage: round(pct(selected.length, values.length)),
        mean: round(mean(selected))
      };
    });
  }

  function analyzeScores(context) {
    const result = createBase(context, "scores", "تحليل أداء الدرجات وتشخيص التوزيع والفجوات وفئات التدخل");
    const column = context.scoreColumn || findHeader(context.headers, ["درجة عنصر المادة", "الدرجة", "المجموع", "المتوسط"]);
    const rawValues = column ? context.rows.map(row => parseNumber(row[column])) : [];
    const maxScore = Number.isFinite(context.maxScore) && context.maxScore > 0 ? context.maxScore : NaN;
    const thresholdPct = Number.isFinite(context.thresholdPct)
      ? context.thresholdPct
      : masteryEngine().DEFAULTS.masteryCutoffPercent;
    const masteryAnalysis = Number.isFinite(maxScore)
      ? masteryEngine().calculate(rawValues, {
          totalScore: maxScore,
          masteryCutoffPercent: thresholdPct,
          nearMasteryMargin: masteryEngine().DEFAULTS.nearMasteryMargin,
          deepGapMargin: masteryEngine().DEFAULTS.deepGapMargin,
          decimalPlaces: masteryEngine().DEFAULTS.decimalPlaces
        })
      : null;
    const values = masteryAnalysis
      ? masteryAnalysis.validScores.map(record => record.score)
      : rawValues.filter(Number.isFinite);
    const invalidCount = masteryAnalysis
      ? masteryAnalysis.validation.invalidRecords.filter(record => record.reason === "not_numeric").length
      : rawValues.filter(value => !Number.isFinite(value)).length;
    const outOfRange = masteryAnalysis
      ? masteryAnalysis.validation.invalidRecords.filter(record => record.reason !== "not_numeric").length
      : 0;
    if (!values.length) throw new Error("لا توجد درجات صالحة للتحليل العميق.");

    const n = values.length;
    const avg = mean(values), med = median(values), sigma = sd(values), vari = variance(values), q1 = quantile(values, 0.25), q3 = quantile(values, 0.75);
    const min = Math.min(...values), max = Math.max(...values), p10 = quantile(values, 0.1), p90 = quantile(values, 0.9);
    const modes = mode(values), skew = skewness(values), kurt = excessKurtosis(values), cv = coefficientOfVariation(values);
    const outliers = outlierSummary(values);
    const masteryCut = masteryAnalysis?.summary.masteryCutoffScoreRaw ?? NaN;
    const masteryCount = masteryAnalysis?.summary.masteryCount ?? null;
    const masteryPct = masteryAnalysis?.summary.masterySpreadPercentRaw ?? null;
    const masteryPctDisplay = masteryAnalysis?.summary.masterySpreadPercent ?? null;
    const masteryJudgement = masteryAnalysis?.judgement ?? null;
    const masteryGap = masteryAnalysis?.gapToNextLevel ?? null;
    const segments = masteryAnalysis
      ? masteryAnalysis.distribution.map(band => {
          const selected = masteryAnalysis.validScores.filter(record => record.percent >= band.minPercent && (band.key === "mastery" ? record.percent <= band.maxPercent : record.percent < band.maxPercent));
          return { id: band.key, label: band.label, count: band.count, percentage: band.percent, mean: round(mean(selected.map(record => record.score))) };
        })
      : [];
    const histogram = buildHistogram(values, maxScore, n >= 120 ? 10 : 8);
    const sensitivity = Number.isFinite(maxScore)
      ? masteryEngine().calculateSensitivity(rawValues, { totalScore: maxScore, masteryCutoffPercent: thresholdPct, decimalPlaces: 1 })
          .map(item => ({ threshold: item.threshold, count: item.count, percentage: item.percentage, judgement: item.judgement }))
      : [];

    result.n = n; result.mean = avg; result.med = med; result.min = min; result.max = max; result.sd = sigma;
    result.variance = vari; result.q1 = q1; result.q3 = q3; result.iqr = q3 - q1; result.p10 = p10; result.p90 = p90;
    result.mode = modes; result.cv = cv; result.skewness = skew; result.kurtosis = kurt;
    result.hasMax = Number.isFinite(maxScore); result.maxScore = maxScore; result.thresholdPct = thresholdPct; result.masteryPct = masteryPct;
    result.masteryPctDisplay = masteryPctDisplay;
    result.masteryCount = masteryCount;
    result.nonMasteryCount = masteryAnalysis?.summary.nonMasteryCount ?? null;
    result.masteryCutoffScore = masteryAnalysis?.summary.masteryCutoffScore ?? null;
    result.masteryCutoffScoreRaw = masteryAnalysis?.summary.masteryCutoffScoreRaw ?? null;
    result.masteryJudgement = masteryJudgement;
    result.masteryGapToNextLevel = masteryGap;
    result.masteryDistribution = masteryAnalysis?.distribution || [];
    result.masteryContractVersion = masteryAnalysis?.version || masteryEngine().VERSION;
    result.bins = histogram.map(item => ({ label: item.label, count: item.count }));
    result.segments = segments; result.sensitivity = sensitivity; result.outliers = outliers;

    result.analysisProfile.dataSufficiency = n >= 30 ? "مرتفعة للتحليل الوصفي" : "محدودة نسبيًا";
    result.analysisProfile.dimensions = ["مركز التوزيع", "التشتت", "شكل التوزيع", "الإتقان", "فئات التدخل", "القيم المتطرفة"];
    result.analysisProfile.assumptions = [
      Number.isFinite(maxScore) ? `الدرجة الكلية المعتمدة ${maxScore}.` : "لم تُحدد الدرجة الكلية؛ لا تعتمد نسب الإتقان.",
      `حد الإتقان المستخدم ${thresholdPct}% وفق عقد بوصلة الإتقان؛ هامش القريب 5 نقاط مئوية وهامش الفجوة العميقة 15 نقطة.`,
      "تُستخدم القيم الخام غير المقربة للحكم والتصنيف، ويستخدم التقريب للعرض فقط."
    ];
    result.analysisProfile.decisionUse = ["بناء مجموعات علاجية", "تحديد شدة التدخل", "وضع خط أساس", "تحديد موعد إعادة القياس"];

    result.metrics = [
      metric("n", "السجلات الصالحة", n, `${invalidCount + outOfRange} سجلًا لم يدخل الحساب`, "integer"),
      metric("mean", "المتوسط الحسابي", round(avg), Number.isFinite(maxScore) ? `من ${maxScore}` : "قيمة خام"),
      metric("median", "الوسيط", round(med), "منتصف التوزيع"),
      metric("sd", "الانحراف المعياري", round(sigma), "درجة التفاوت"),
      metric("q1", "الربيع الأول", round(q1), "25% من الدرجات عنده أو دونه"),
      metric("q3", "الربيع الثالث", round(q3), "75% من الدرجات عنده أو دونه"),
      metric("cv", "معامل الاختلاف", round(cv), "التشتت النسبي", "percent"),
      metric("skewness", "معامل الالتواء", round(skew, 2), skew < -0.5 ? "انحراف نحو الدرجات العليا" : skew > 0.5 ? "انحراف نحو الدرجات الدنيا" : "توزيع قريب من التماثل"),
      metric("outlierCount", "القيم المتطرفة", outliers.count, "وفق قاعدة المدى الربيعي", "integer"),
      ...(Number.isFinite(masteryPct) ? [
        metric("masteryCutoffScore", "درجة حد الإتقان", masteryAnalysis.summary.masteryCutoffScore, `${thresholdPct}% من ${maxScore}`),
        metric("masteryCount", "حققوا حد الإتقان", masteryCount, `من أصل ${n}`, "integer"),
        metric("nonMasteryCount", "لم يحققوا الإتقان", masteryAnalysis.summary.nonMasteryCount, `من أصل ${n}`, "integer"),
        metric("masteryPct", "نسبة انتشار الإتقان", masteryPctDisplay, `القيمة الخام ${round(masteryPct, 4)}%`, "percent"),
        metric("masteryJudgement", "الحكم وفق سلم بوصلة الإتقان", masteryJudgement.label, `بني على ${round(masteryPct, 4)}%`),
        metric("additionalStudentsNeeded", "المطلوب للمستوى التالي", masteryGap.additionalStudentsNeeded, masteryGap.hasNextLevel ? `للوصول إلى ${masteryGap.nextJudgementLabel}` : "بلغ أعلى مستوى", "integer"),
        metric("singleStudentImpact", "أثر الطالب الواحد", masteryAnalysis.summary.singleStudentImpact, "نقطة مئوية تقريبًا"),
        metric("nearMasteryPct", "القريبون من الإتقان", masteryAnalysis.distribution.find(item => item.key === "near_mastery")?.percent || 0, "هامش 5 نقاط", "percent"),
        metric("deepGapPct", "الفجوة العميقة", masteryAnalysis.distribution.find(item => item.key === "deep_gap")?.percent || 0, "15 نقطة أو أكثر دون الحد", "percent")
      ] : [])
    ];

    result.charts = [
      chart("score-histogram", "bar", "توزيع الدرجات", "عدد الطلبة ونسبتهم في كل فئة درجية.", histogram, { xKey: "label", yKey: "count", valueSuffix: " طالب" }),
      ...(segments.length ? [chart("intervention-segments", "bar", "فئات التدخل التربوي", "تقسيم الطلبة وفق المسافة عن حد الإتقان.", segments, { xKey: "label", yKey: "count", valueSuffix: " طالب" })] : []),
      ...(sensitivity.length ? [chart("mastery-sensitivity", "line", "حساسية نسبة الإتقان للمعيار", "كيف تتغير نسبة الإتقان عند تغيير الحد المعتمد.", sensitivity, { xKey: "threshold", yKey: "percentage", xSuffix: "%", valueSuffix: "%" })] : []),
      chart("box-summary", "box", "ملخص التوزيع والقيم المتطرفة", "الأدنى والربيعات والوسيط والأعلى وحدود القيم المتطرفة.", [{ min, q1, median: med, q3, max, lowerFence: outliers.lowerFence, upperFence: outliers.upperFence, outlierCount: outliers.count }])
    ];

    if (Number.isFinite(masteryPct)) {
      result.findings.push(finding(
        `انتشار الإتقان: ${masteryJudgement.label}`,
        `بلغت نسبة انتشار الإتقان ${masteryPctDisplay}% (${masteryCount} من أصل ${n}) عند حد ${thresholdPct}%، والحكم وفق السلم المعتمد «${masteryJudgement.label}».`,
        "مرتفعة",
        masteryPct < 50 ? "الحاجة ليست حالات فردية معزولة؛ حجم الفجوة يبرر تدخلًا منظّمًا متعدد المستويات." : "تتطلب الفجوة دعمًا متدرجًا بدل إجراء موحد لجميع الطلبة.",
        "اعتماد مجموعات تدخل وفق قرب الطالب من حد الإتقان، لا وفق تصنيف ثنائي فقط.",
        masteryPct < 50 ? "high" : "medium",
        ["metric:masteryPct", "metric:n"]
      ));
    } else {
      result.findings.push(finding("الإتقان غير قابل للحساب بعد", "لم تُعتمد الدرجة الكلية للمكوّن.", "مرتفعة", "يمكن وصف التوزيع، لكن لا يمكن تحويله إلى نسب إتقان موثوقة.", "تأكيد الدرجة الكلية وحد الإتقان قبل اعتماد التقرير النهائي.", "medium", ["metric:n"]));
    }

    const dispersionLevel = cv >= 35 ? "مرتفع جدًا" : cv >= 25 ? "مرتفع" : cv >= 15 ? "متوسط" : "منخفض";
    result.findings.push(finding(
      `التفاوت بين الطلبة ${dispersionLevel}`,
      `بلغ الانحراف المعياري ${round(sigma)} ومعامل الاختلاف ${round(cv)}%، وامتد النطاق بين ${round(min)} و${round(max)}.`,
      "مرتفعة",
      cv >= 25 ? "التدخل الصفي الموحد لن يكون كافيًا؛ المجموعة تضم احتياجات مختلفة بوضوح." : "يمكن تنفيذ تدخل جماعي مع تخصيص محدود للحالات الطرفية.",
      cv >= 25 ? "تصميم ثلاثة أو أربعة مسارات دعم وإثراء مع قياس مستقل لكل مسار." : "تدخل جماعي قصير ثم متابعة الربع الأدنى بصورة فردية.",
      cv >= 25 ? "high" : "medium",
      ["metric:sd", "metric:cv", "metric:q1", "metric:q3"]
    ));

    result.findings.push(finding(
      Math.abs(skew) >= 0.5 ? "التوزيع غير متماثل" : "التوزيع قريب من التماثل",
      `معامل الالتواء ${round(skew, 2)}؛ المتوسط ${round(avg)} والوسيط ${round(med)}.`,
      "متوسطة",
      skew > 0.5 ? "تتركز كتلة كبيرة في الدرجات المنخفضة مع ذيل نحو الأعلى، وقد يخفي المتوسط شدة التعثر." : skew < -0.5 ? "تتركز الدرجات نسبيًا في المستويات العليا مع حالات منخفضة تحتاج متابعة." : "المتوسط والوسيط يقدمان صورة متقاربة عن مركز الأداء.",
      "قراءة المتوسط مع الوسيط والربيعات بدل الاعتماد على مؤشر واحد.",
      "medium",
      ["metric:mean", "metric:median", "metric:skewness"]
    ));

    if (outliers.count) {
      result.findings.push(finding(
        "وجود حالات متطرفة تحتاج مراجعة",
        `اكتُشفت ${outliers.count} قيمة خارج حدود ${round(outliers.lowerFence)} و${round(outliers.upperFence)} وفق قاعدة المدى الربيعي.`,
        "مرتفعة",
        "قد تكون هذه الحالات أخطاء إدخال أو مؤشرات لحاجة فردية شديدة أو تميز استثنائي.",
        "مراجعة السجلات الأصلية للحالات المتطرفة قبل اتخاذ قرار تربوي أو إداري.",
        "medium",
        ["metric:outlierCount", "metric:q1", "metric:q3"]
      ));
    }

    const belowMedian = values.filter(value => value < med).length;
    result.findings.push(finding(
      "اتساع الفجوة بين الربعين الأدنى والأعلى",
      `الربيع الأول ${round(q1)} والربيع الثالث ${round(q3)}، بفارق ربيعي ${round(q3 - q1)}. يقع ${belowMedian} طالبًا دون الوسيط.`,
      "مرتفعة",
      "الفارق يوضح حجم المساحة التي يجب أن تغطيها الخطة العلاجية، ويمنع اختزال المجموعة في متوسط واحد.",
      "استخدام الربيعات والمئينات لتحديد الفئات المستهدفة وحدود الانتقال بينها.",
      "medium",
      ["metric:q1", "metric:q3", "metric:median"]
    ));

    const severe = segments.find(item => item.id === "deep_gap");
    const moderate = segments.find(item => item.id === "moderate_gap");
    const near = segments.find(item => item.id === "near_mastery");
    const mastered = segments.find(item => item.id === "mastery");
    if (segments.length) {
      result.findings.push(finding(
        "الحاجة إلى تدخلات متمايزة",
        `فجوة عميقة: ${severe?.count || 0}، فجوة متوسطة: ${moderate?.count || 0}، قريبون من الإتقان: ${near?.count || 0}، حققوا الإتقان: ${mastered?.count || 0}.`,
        "مرتفعة",
        "الفئات تختلف في نوع التدخل المطلوب؛ الجمع بينها في برنامج واحد يضعف الكفاءة.",
        "تخصيص تدخل مكثف للحالات الشديدة، دعم قصير للقريبين من الإتقان، وإثراء للمتقنين.",
        "high",
        ["metric:masteryPct", "metric:n"]
      ));
    }

    result.qualityTools = [
      qualityTool("distribution", "المدرج التكراري وتحليل شكل التوزيع", true, "توجد درجات فردية كافية لفهم التجمع والانحراف.", histogram, `التواء ${round(skew, 2)} وتفرطح زائد ${round(kurt, 2)}.`),
      qualityTool("boxplot", "الصندوق والربيعات والقيم المتطرفة", n >= 5, "توجد بيانات فردية تسمح بحساب الربيعات.", outliers, `المدى الربيعي ${round(q3 - q1)} مع ${outliers.count} قيمة متطرفة.`),
      qualityTool("gap", "تحليل الفجوة للمستوى التالي", Number.isFinite(masteryPct), "يتطلب درجة كلية وحد إتقان معتمدين.", Number.isFinite(masteryPct) ? masteryGap : null, Number.isFinite(masteryPct) ? masteryGap.message : "غير متاح دون معيار."),
      qualityTool("segmentation", "تجزئة فئات التدخل", segments.length > 0, "تتطلب حد إتقان ودرجة كلية.", segments, "تحدد شدة التدخل والفئة المستهدفة."),
      qualityTool("sensitivity", "تحليل حساسية معيار الإتقان", sensitivity.length > 0, "يفحص استقرار الحكم عند تغير المعيار.", sensitivity, "يمنع بناء الحكم على حد وحيد دون فهم أثره."),
      qualityTool("priority", "مصفوفة أولوية التدخل", segments.length > 0, "تستخدم حجم الفئة وشدة الفجوة لتحديد الأولوية.", segments.map(item => ({ group: item.label, size: item.count, urgency: item.id === "deep_gap" ? 5 : item.id === "moderate_gap" ? 4 : item.id === "near_mastery" ? 3 : item.id === "mastery" ? 2 : 1 })), "الأولوية الأعلى للحالات شديدة التعثر ثم التعثر المتوسط.")
    ];

    if (segments.length) {
      const groupMap = Object.fromEntries(segments.map(item => [item.id, item]));
      result.improvementPlan = [
        intervention("عالية", "فجوة عميقة", `دون الإتقان بفجوة عميقة (${groupMap.deep_gap?.count || 0})`, "إجراء تشخيص جماعي وفردي موجز ثم إعادة تدريس مركزة للمتطلبات السابقة، مع مجموعات صغيرة ومتابعة لصيقة.", "المعلم بالتنسيق مع أخصائي التقويم والدعم", "3 أسابيع", "خفض فئة الفجوة العميقة وانتقال نسبة موثقة منها إلى الفجوة المتوسطة أو أعلى", "اختبار تشخيصي قبلي وبعدي + سجل متابعة أسبوعي", "إذا لم يتحقق التحسن، جمع بيانات الحضور والصعوبات وعينات الأعمال وإحالة الحالات لتشخيص أعمق.", ["metric:deepGapPct", "metric:masteryPct"]),
        intervention("عالية", "فجوة متوسطة", `دون الإتقان بفجوة متوسطة (${groupMap.moderate_gap?.count || 0})`, "دعم جماعي موجّه ومتدرج مع نمذجة الحل وتغذية راجعة فورية ومهام قصيرة متكررة.", "معلم المادة", "أسبوعان", "انتقال 50% من الفئة إلى قريب من الإتقان أو إلى الإتقان", "مهام قصيرة مرتين أسبوعيًا", "تغيير الاستراتيجية أو تقليل حجم المجموعة إذا ثبت ضعف الاستجابة.", ["metric:nearMasteryPct", "metric:masteryPct"]),
        intervention("متوسطة", "قرب من الإتقان", `قريبون من الإتقان (${groupMap.near_mastery?.count || 0})`, "مراجعة مركزة قصيرة ومهام تصحيحية تستهدف الفجوة المحدودة عن حد الإتقان.", "معلم المادة", "أسبوع واحد", "بلوغ أغلب الفئة حد الإتقان في القياس اللاحق", "اختبار خروج قصير بعد كل جلسة", "تقديم دعم فردي محدود للحالات التي تبقى دون الحد.", ["metric:nearMasteryPct", "metric:masteryPct"]),
        intervention("محددة", "تثبيت وإثراء", `حققوا حد الإتقان (${groupMap.mastery?.count || 0})`, "مهام تثبيت وإثراء وتطبيقات أعلى تحافظ على النمو وتمنع توقف التقدم.", "معلم المادة", "مستمر خلال الوحدة", "ثبات الإتقان مع تحسن جودة الأداء في مهمة إثرائية", "Rubric مختصر + ملف إنجاز", "رفع مستوى التحدي دون تحميل المتقنين مسؤولية تدريس زملائهم.", ["metric:masteryCount"])
      ];
    }

    result.monitoringPlan = [
      { stage: "خط الأساس", timing: "الآن", measure: `المتوسط ${round(avg)} وانتشار الإتقان ${Number.isFinite(masteryPct) ? `${masteryPctDisplay}% (${masteryJudgement.label})` : "غير محسوب"}`, owner: "معلم المادة / أخصائي التقويم" },
      { stage: "متابعة قصيرة", timing: "أسبوعيًا", measure: "نتائج مهام قصيرة وانتقال الطلبة بين فئات التدخل", owner: "معلم المادة" },
      { stage: "إعادة قياس", timing: "بعد 2-3 أسابيع", measure: "اختبار مكافئ ومقارنة المتوسط والإتقان والتشتت", owner: "فريق المادة" },
      { stage: "قرار الاستمرار", timing: "بعد إعادة القياس", measure: "الاستجابة للتدخل وتحديد من يحتاج مسارًا بديلًا", owner: "المعلم الأول / المشرف" }
    ];

    result.limitations = [
      "الدرجات الإجمالية تحدد حجم التعثر ولا تحدد المهارة أو المفهوم المسبب له.",
      "لا يجوز تفسير الفروق بوصفها أسبابًا مرتبطة بالمعلم أو المنهج دون بيانات إضافية.",
      Number.isFinite(maxScore) ? "تعتمد فئات التدخل على الدرجة الكلية وحد الإتقان اللذين أدخلهما المستخدم." : "لا يمكن اعتماد تحليل الإتقان دون الدرجة الكلية.",
      ...(invalidCount ? [`توجد ${invalidCount} قيمة غير رقمية أو فارغة لم تدخل التحليل.`] : []),
      ...(outOfRange ? [`استُبعدت ${outOfRange} قيمة خارج نطاق الدرجة الكلية.`] : [])
    ];

    result.executiveTitle = Number.isFinite(masteryPct) ? `انتشار الإتقان ${masteryPctDisplay}% — ${masteryJudgement.label}` : "تحليل تشخيصي للتوزيع";
    result.executiveSummary = `شمل التحليل ${n} درجة. بلغ المتوسط ${round(avg)} والوسيط ${round(med)} والانحراف المعياري ${round(sigma)}. ${Number.isFinite(masteryPct) ? `بلغ انتشار الإتقان ${masteryPctDisplay}% (${masteryCount} من أصل ${n}) عند حد ${thresholdPct}%، والحكم «${masteryJudgement.label}». ${masteryGap.message}` : "لم يحسب الإتقان لغياب الدرجة الكلية."} تشير الربيعات ومعامل الاختلاف إلى تفاوت ${dispersionLevel}، وتحتاج القرارات إلى تدخلات متدرجة وإعادة قياس موثقة.`;
    result.action = result.improvementPlan[0]
      ? { title: result.improvementPlan[0].action, text: `${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`, priority: result.improvementPlan[0].priority, indicator: result.improvementPlan[0].successIndicator }
      : { title: "تحديد الدرجة الكلية", text: "إكمال إعدادات القياس قبل اعتماد الإتقان.", priority: "عالية", indicator: "ظهور فئات التدخل ونسبة الإتقان" };
    result.evidenceMap = evidenceMapFromMetrics(result.metrics);
    return result;
  }

  const LEVEL_ORDER = ["أ", "ب", "ج", "د", "هـ"];
  function canonicalLevel(value) {
    const n = normalize(value);
    if (n === "ا" || n === "أ") return "أ";
    if (n === "ب") return "ب";
    if (n === "ج") return "ج";
    if (n === "د") return "د";
    if (n === "ه" || n === "هـ") return "هـ";
    return String(value || "").trim();
  }

  function analyzeLevelDistribution(context) {
    const result = createBase(context, "levels", "تحليل توزيع مستويات الأداء ومقارنة المجموعات وترتيب أولوية التدخل");
    const levelColumns = context.headers.map(header => ({ header, level: canonicalLevel(header) })).filter(item => LEVEL_ORDER.includes(item.level));
    if (levelColumns.length < 2) throw new Error("لم تُكتشف أعمدة مستويات أداء كافية.");
    const groupHeader = findHeader(context.headers, ["الصف", "الشعبة", "البيان", "المجموعة"]) || context.headers.find(header => !levelColumns.some(item => item.header === header)) || "المجموعة";
    const groups = context.rows.map((row, index) => {
      const counts = Object.fromEntries(LEVEL_ORDER.map(level => [level, 0]));
      levelColumns.forEach(item => counts[item.level] += parseNumber(row[item.header]) || 0);
      const total = sum(Object.values(counts));
      return {
        group: String(row[groupHeader] || `مجموعة ${index + 1}`),
        counts,
        total,
        percentages: Object.fromEntries(LEVEL_ORDER.map(level => [level, round(pct(counts[level], total))]))
      };
    }).filter(group => group.total > 0);
    const totals = Object.fromEntries(LEVEL_ORDER.map(level => [level, groups.reduce((total, group) => total + group.counts[level], 0)]));
    const total = sum(Object.values(totals));
    const entries = LEVEL_ORDER.map(label => ({ label, count: totals[label], pct: round(pct(totals[label], total)) }));
    const highCount = totals["أ"] + totals["ب"], lowCount = totals["د"] + totals["هـ"];
    const highPct = pct(highCount, total), lowPct = pct(lowCount, total);
    const concentration = entropy(Object.values(totals));
    const groupComparisons = groups.map(group => ({
      group: group.group,
      total: group.total,
      highPct: round(group.percentages["أ"] + group.percentages["ب"]),
      lowPct: round(group.percentages["د"] + group.percentages["هـ"]),
      dominant: LEVEL_ORDER.reduce((best, level) => group.counts[level] > group.counts[best] ? level : best, "أ")
    }));
    const worstGroup = [...groupComparisons].sort((a, b) => b.lowPct - a.lowPct)[0];
    const bestGroup = [...groupComparisons].sort((a, b) => b.highPct - a.highPct)[0];

    result.total = total; result.entries = entries; result.groups = groups; result.highPct = highPct; result.lowPct = lowPct;
    result.analysisProfile.dataSufficiency = groups.length > 1 ? "مرتفعة للمقارنة الوصفية" : "كافية للتوزيع العام فقط";
    result.analysisProfile.dimensions = ["حجم الفئات", "المستويات العليا والدنيا", "المقارنة بين المجموعات", "تركيز التوزيع"];
    result.analysisProfile.decisionUse = ["تحديد أولوية الصفوف أو الشعب", "اختيار التدخل الجماعي أو الفردي", "متابعة انتقال المستويات"];

    result.metrics = [
      metric("total", "إجمالي الطلبة", total, `${groups.length} مجموعة`, "integer"),
      metric("highPct", "المستويات العليا (أ+ب)", round(highPct), `${highCount} طالبًا`, "percent"),
      metric("lowPct", "المستويات الدنيا (د+هـ)", round(lowPct), `${lowCount} طالبًا`, "percent"),
      metric("groupCount", "عدد المجموعات", groups.length, "صفوف أو شعب", "integer"),
      metric("entropy", "تنوع التوزيع", round(concentration, 2), "كلما ارتفع توزعت الحالات على فئات أكثر")
    ];
    result.charts = [
      chart("levels-overall", "bar", "التوزيع العام لمستويات الأداء", "الأعداد والنسب في المستويات أ إلى هـ.", entries.map(item => ({ ...item, percentage: item.pct })), { xKey: "label", yKey: "count" }),
      ...(groups.length > 1 ? [chart("levels-groups", "stacked", "مقارنة المجموعات حسب المستوى", "النسب داخل كل صف أو شعبة.", groups.map(group => ({ group: group.group, ...group.percentages })), { xKey: "group", series: LEVEL_ORDER })] : []),
      ...(groups.length > 1 ? [chart("low-share", "bar", "نسبة المستويات الدنيا حسب المجموعة", "ترتيب المجموعات وفق نسبة د وهـ.", groupComparisons.sort((a, b) => b.lowPct - a.lowPct), { xKey: "group", yKey: "lowPct", valueSuffix: "%" })] : [])
    ];

    result.findings.push(finding(
      lowPct >= 30 ? "كتلة واسعة في المستويات الدنيا" : "المستويات الدنيا محدودة نسبيًا",
      `تمثل المستويات د وهـ ${round(lowPct)}% (${lowCount} طالبًا) من الإجمالي.`,
      "مرتفعة",
      lowPct >= 30 ? "حجم الفئة يبرر تدخلًا جماعيًا منظّمًا، مع مسارات إضافية للحالات الأشد." : "التدخلات الموجهة والمجموعات الصغيرة أكثر كفاءة من برنامج عام واسع.",
      lowPct >= 30 ? "بدء خطة علاجية على مستوى المادة ثم ربطها بنتائج المهارات أو الأسئلة." : "استخراج أسماء الحالات الدنيا من الكشف الفردي ووضع متابعة قصيرة.",
      lowPct >= 30 ? "high" : "medium",
      ["metric:lowPct", "metric:total"]
    ));
    result.findings.push(finding(
      highPct >= 40 ? "قاعدة جيدة للبناء والإثراء" : "نسبة المستويات العليا محدودة",
      `تمثل المستويات أ وب ${round(highPct)}% (${highCount} طالبًا).`,
      "مرتفعة",
      highPct >= 40 ? "توجد كتلة من الطلبة يمكن استثمارها في الإثراء والتعلم بالأقران المنضبط." : "الحاجة إلى رفع مستوى العمق والفهم لا تقتصر على الحالات الدنيا.",
      highPct >= 40 ? "تصميم مسار إثرائي ومهام عليا دون إهمال الدعم العلاجي." : "تطوير التدريس الصفي العام بالتوازي مع التدخل العلاجي.",
      "medium",
      ["metric:highPct"]
    ));
    if (groups.length > 1) {
      result.findings.push(finding(
        "فروق واضحة بين المجموعات",
        `أعلى نسبة للمستويات الدنيا في «${worstGroup.group}» بلغت ${worstGroup.lowPct}%، بينما أعلى نسبة للمستويات العليا في «${bestGroup.group}» بلغت ${bestGroup.highPct}%.`,
        "مرتفعة",
        "توجيه الموارد بالتساوي قد لا يحقق العدالة؛ شدة الاحتياج تختلف بين المجموعات.",
        "ترتيب المجموعات وفق فجوة الأداء، ثم مقارنة الممارسات والظروف ببيانات إضافية دون افتراض السببية.",
        "high",
        ["metric:lowPct", "metric:highPct"]
      ));
    }
    const dominant = [...entries].sort((a, b) => b.count - a.count)[0];
    result.findings.push(finding("المستوى الأكثر انتشارًا", `المستوى ${dominant.label} يضم ${dominant.count} طالبًا بنسبة ${dominant.pct}%.`, "مرتفعة", "يحدد مركز التوزيع العام لكنه لا يفسر أسباب الأداء.", "ربط المستوى ببيانات المهارات والمفردات والتقدم الزمني.", "medium", ["metric:total"]));

    result.qualityTools = [
      qualityTool("distribution", "تحليل توزيع المستويات", true, "توجد فئات أداء رسمية وأعداد لكل فئة.", entries, `المستويات الدنيا ${round(lowPct)}% والعليا ${round(highPct)}%.`),
      qualityTool("comparison", "مصفوفة مقارنة المجموعات", groups.length > 1, "تتطلب أكثر من صف أو شعبة.", groupComparisons, groups.length > 1 ? `أعلى احتياج ظاهر في ${worstGroup.group}.` : "لا توجد مجموعات كافية للمقارنة."),
      qualityTool("gap", "تحليل فجوة المستويات", true, "يعامل المستويات الدنيا كفجوة تحتاج انتقالًا في القياس القادم.", { lowPct: round(lowPct), targetLowPct: Math.max(0, Math.floor(lowPct - 10)), highPct: round(highPct), targetHighPct: Math.min(100, Math.ceil(highPct + 10)) }, "يركز على انتقال الطلبة بين الفئات بدل المتوسط فقط."),
      qualityTool("priority", "مصفوفة أولوية الصفوف أو الشعب", groups.length > 1, "ترتب المجموعات حسب نسبة المستويات الدنيا وحجمها.", groupComparisons.sort((a, b) => b.lowPct - a.lowPct), "الأولوية للمجموعة الأعلى في د وهـ.")
    ];

    result.improvementPlan = [
      intervention(lowPct >= 30 ? "عالية" : "متوسطة", "ارتفاع المستويات الدنيا", `طلبة د وهـ (${lowCount})`, "استخراج الطلبة حسب الصف أو الشعبة وبناء مجموعات علاجية مرتبطة بمهارات محددة بعد جمع بيانات الأسئلة أو المهارات.", "معلمو المادة والمعلم الأول", "3 أسابيع", `خفض د وهـ إلى ${Math.max(0, Math.floor(lowPct - 10))}% أو أقل`, "كشف انتقال المستويات + اختبار مكافئ", "إذا لم تتغير المستويات، تحليل مفردات الاختبار ومراجعة شدة التدخل.", ["metric:lowPct"]),
      intervention("متوسطة", "الحفاظ على النمو لدى المستويات العليا", `طلبة أ وب (${highCount})`, "توفير مهام إثرائية ومشروعات قصيرة تتطلب تطبيقًا وتحليلًا وإنتاجًا.", "معلم المادة", "خلال الوحدة التالية", "بقاء 90% من الفئة في أ أو ب مع تحسن جودة المنتجات", "Rubric للإثراء + ملف أعمال", "رفع مستوى التحدي إذا ظهرت سهولة مفرطة.", ["metric:highPct"]),
      ...(groups.length > 1 ? [intervention("عالية", "تفاوت المجموعات", worstGroup.group, "إجراء تحليل تشخيصي خاص بالمجموعة الأعلى احتياجًا ومقارنة نوعية بالبيانات الصفية والحضور والتدريس.", "المعلم الأول / المشرف", "أسبوعان", "تحديد ثلاثة أسباب مدعومة بالأدلة وخطة مخصصة", "مقابلات قصيرة + عينات أعمال + نتائج مهارية", "عدم نسبة الفجوة للمعلم أو الطلبة دون أدلة متعددة.", ["metric:groupCount"])] : [])
    ];
    result.monitoringPlan = [
      { stage: "خط الأساس", timing: "الآن", measure: `د+هـ ${round(lowPct)}%، أ+ب ${round(highPct)}%`, owner: "أخصائي التقويم" },
      { stage: "متابعة التنفيذ", timing: "أسبوعيًا", measure: "الحضور في المجموعات العلاجية وإنجاز المهام المستهدفة", owner: "معلم المادة" },
      { stage: "إعادة توزيع المستويات", timing: "بعد 3 أسابيع", measure: "الانتقال بين أ-هـ", owner: "فريق المادة" }
    ];
    result.limitations = ["توزيع المستويات يصف النتيجة ولا يحدد المهارات أو أسباب الضعف.", "لا يجوز مقارنة المجموعات سببيًا دون معلومات عن حجمها وظروفها وتكافؤ أدوات القياس."];
    result.executiveTitle = `المستويات الدنيا ${round(lowPct)}%`;
    result.executiveSummary = `شمل التحليل ${total} طالبًا عبر ${groups.length} مجموعة. بلغت المستويات العليا ${round(highPct)}% والدنيا ${round(lowPct)}%. ${groups.length > 1 ? `ظهرت أعلى أولوية في «${worstGroup.group}».` : "لا تتوفر مقارنة بين مجموعات متعددة."} يلزم ربط التوزيع ببيانات المهارات أو مفردات الاختبار قبل تشخيص الأسباب.`;
    result.action = { title: result.improvementPlan[0].action, text: `${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`, priority: result.improvementPlan[0].priority, indicator: result.improvementPlan[0].successIndicator };
    result.evidenceMap = evidenceMapFromMetrics(result.metrics);
    return result;
  }

  const SUBJECT_EXCLUSIONS = ["م", "اسم الطالب", "الجنسية", "القيد", "حالة القيد", "المستوى", "الصف", "الشعبة", "الملاحظات"];
  function analyzeCrossSubject(context) {
    const result = createBase(context, "cross_subject", "تحليل الأداء عبر المواد وبناء ملفات القوة والضعف والتفاوت المشترك");
    const excluded = SUBJECT_EXCLUSIONS.map(normalize);
    const subjects = numericColumns(context.headers, context.rows, 0.45)
      .filter(column => !excluded.some(key => normalize(column.header) === key || normalize(column.header).includes(key)))
      .map(column => ({ name: column.header, values: column.values }));
    if (subjects.length < 2) throw new Error("لا توجد أعمدة مواد كافية للتحليل عبر المواد.");
    const maxScore = Number.isFinite(context.maxScore) && context.maxScore > 0 ? context.maxScore : 100;
    const thresholdPct = Number.isFinite(context.thresholdPct) ? context.thresholdPct : masteryEngine().DEFAULTS.masteryCutoffPercent;
    const subjectStats = subjects.map(subject => {
      const avg = mean(subject.values), sigma = sd(subject.values);
      const mastery = masteryEngine().calculate(subject.values, { totalScore: maxScore, masteryCutoffPercent: thresholdPct, decimalPlaces: 1 });
      return { subject: subject.name, n: subject.values.length, mean: round(avg), median: round(median(subject.values)), sd: round(sigma), masteryPct: mastery.summary.masterySpreadPercent, masteryPctRaw: mastery.summary.masterySpreadPercentRaw, masteryCount: mastery.summary.masteryCount, judgement: mastery.judgement.label, min: Math.min(...subject.values), max: Math.max(...subject.values) };
    }).sort((a, b) => b.mean - a.mean);
    const studentProfiles = context.rows.map((row, index) => {
      const values = subjects.map(subject => parseNumber(row[subject.name]));
      const valid = values.filter(Number.isFinite);
      if (valid.length < Math.max(2, subjects.length * 0.5)) return null;
      const avg = mean(valid), spread = sd(valid);
      const pairs = subjects.map(subject => ({ subject: subject.name, value: parseNumber(row[subject.name]) })).filter(item => Number.isFinite(item.value));
      const strongest = [...pairs].sort((a, b) => b.value - a.value)[0], weakest = [...pairs].sort((a, b) => a.value - b.value)[0];
      return { ref: `row:${index + 1}`, mean: avg, sd: spread, strongest, weakest, belowCount: valid.filter(value => (value / maxScore) * 100 < thresholdPct).length };
    }).filter(Boolean);
    const comprehensiveRisk = studentProfiles.filter(profile => profile.belowCount >= Math.ceil(subjects.length * 0.6)).length;
    const specializedRisk = studentProfiles.filter(profile => profile.belowCount > 0 && profile.belowCount < Math.ceil(subjects.length * 0.6)).length;
    const stableHigh = studentProfiles.filter(profile => profile.mean >= maxScore * 0.8 && profile.sd <= maxScore * 0.12).length;
    const correlations = [];
    for (let i = 0; i < subjects.length; i++) {
      for (let j = i + 1; j < subjects.length; j++) {
        const xs = context.rows.map(row => parseNumber(row[subjects[i].name]));
        const ys = context.rows.map(row => parseNumber(row[subjects[j].name]));
        const r = pearson(xs, ys);
        if (Number.isFinite(r)) correlations.push({ subjectA: subjects[i].name, subjectB: subjects[j].name, correlation: round(r, 2), strength: Math.abs(r) >= 0.7 ? "قوية" : Math.abs(r) >= 0.4 ? "متوسطة" : "ضعيفة" });
      }
    }
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    const strongestSubject = subjectStats[0], weakestSubject = subjectStats.at(-1);
    const meanGap = strongestSubject.mean - weakestSubject.mean;

    result.subjects = subjectStats; result.studentProfiles = studentProfiles; result.correlations = correlations;
    result.analysisProfile.dataSufficiency = studentProfiles.length >= 20 ? "مرتفعة للتحليل المقارن" : "محدودة نسبيًا";
    result.analysisProfile.dimensions = ["ترتيب المواد", "إتقان كل مادة", "تفاوت ملف الطالب", "الضعف العام والتخصصي", "العلاقات بين المواد"];
    result.analysisProfile.decisionUse = ["تحديد مواد الأولوية", "تمييز الدعم الشامل من التخصصي", "بناء فرق تدخل بين المواد"];
    result.metrics = [
      metric("subjectCount", "عدد المواد", subjects.length, "مواد قابلة للتحليل", "integer"),
      metric("studentProfiles", "ملفات الطلبة المكتملة", studentProfiles.length, "طالبًا", "integer"),
      metric("strongestSubjectMean", "أعلى متوسط مادة", strongestSubject.mean, strongestSubject.subject),
      metric("weakestSubjectMean", "أدنى متوسط مادة", weakestSubject.mean, weakestSubject.subject),
      metric("subjectGap", "الفجوة بين أعلى وأدنى مادة", round(meanGap), "درجة"),
      metric("comprehensiveRisk", "تعثر متعدد المواد", comprehensiveRisk, "حالة", "integer"),
      metric("specializedRisk", "تعثر تخصصي", specializedRisk, "حالة", "integer")
    ];
    result.charts = [
      chart("subject-means", "bar", "متوسطات المواد", "ترتيب المواد من الأعلى إلى الأدنى.", subjectStats, { xKey: "subject", yKey: "mean" }),
      chart("subject-mastery", "bar", "نسب الإتقان حسب المادة", `حد الإتقان ${thresholdPct}%.`, subjectStats, { xKey: "subject", yKey: "masteryPct", valueSuffix: "%" }),
      chart("student-risk", "bar", "أنماط الاحتياج عبر المواد", "تعثر شامل أو تخصصي أو أداء مرتفع متزن.", [
        { label: "تعثر متعدد المواد", count: comprehensiveRisk },
        { label: "تعثر تخصصي", count: specializedRisk },
        { label: "أداء مرتفع متزن", count: stableHigh }
      ], { xKey: "label", yKey: "count" }),
      ...(correlations.length ? [chart("subject-correlations", "table", "أقوى العلاقات بين المواد", "علاقات وصفية لا تثبت السببية.", correlations.slice(0, 10))] : [])
    ];

    result.findings = [
      finding("فجوة بين المواد", `تتقدم «${strongestSubject.subject}» بمتوسط ${strongestSubject.mean}، بينما تسجل «${weakestSubject.subject}» متوسط ${weakestSubject.mean}، بفجوة ${round(meanGap)} درجة.`, "مرتفعة", "الفجوة تحدد مادة أولوية للمراجعة، لكنها لا تفسر سببها.", "تنفيذ تحليل مهاري واختبار جودة أداة القياس في المادة الأضعف.", meanGap >= maxScore * 0.15 ? "high" : "medium", ["metric:subjectGap"]),
      finding("وجود تعثر متعدد المواد", `ظهر ${comprehensiveRisk} ملفًا منخفضًا في 60% أو أكثر من المواد.`, "مرتفعة", "هذه الحالات تحتاج تدخلًا شاملاً، لا علاجًا داخل مادة واحدة فقط.", "بناء ملف تشخيصي مشترك يشمل الحضور والمهارات الأساسية وعينات الأعمال.", comprehensiveRisk ? "high" : "low", ["metric:comprehensiveRisk"]),
      finding("تعثر تخصصي قابل للتوجيه", `ظهر ${specializedRisk} ملفًا منخفضًا في مادة أو عدة مواد محدودة دون ضعف عام.`, "مرتفعة", "التدخل التخصصي أكثر كفاءة من إدخال الطالب في برنامج شامل.", "توجيه الطالب إلى دعم المادة الأضعف مع الحفاظ على نقاط القوة.", "medium", ["metric:specializedRisk"])
    ];
    if (correlations.length) {
      const top = correlations[0];
      result.findings.push(finding("علاقة بين بعض المواد", `أقوى ارتباط وصفي بين «${top.subjectA}» و«${top.subjectB}» بلغ ${top.correlation}.`, "متوسطة", "قد يشير إلى مهارات مشتركة أو تشابه في متطلبات التعلم، لكنه لا يثبت أن مادة تسبب الأخرى.", "مراجعة المهارات المشتركة وتصميم تدخل عابر للمواد عند توفر دليل مهاري.", "medium", []));
    }

    result.qualityTools = [
      qualityTool("ranking", "المقارنة المرجعية الداخلية للمواد", true, "توجد درجات عدة مواد للطلبة أنفسهم.", subjectStats, `فجوة أعلى وأدنى مادة ${round(meanGap)} درجة.`),
      qualityTool("heatmap", "خريطة أداء الطالب عبر المواد", studentProfiles.length > 0, "تتطلب درجات فردية في أكثر من مادة.", { subjects: subjects.map(item => item.name), rows: context.rows.slice(0, 60).map((row, index) => ({ ref: `row:${index + 1}`, values: subjects.map(subject => parseNumber(row[subject.name])) })) }, "تكشف الضعف العام والتخصصي بصريًا."),
      qualityTool("correlation", "مصفوفة الارتباط بين المواد", correlations.length > 0, "تتطلب درجات متزاوجة لعدد كافٍ من الطلبة.", correlations, "تستخدم للاستكشاف لا لإثبات السببية."),
      qualityTool("segmentation", "تصنيف ملفات الاحتياج", true, "يقسم الطلبة إلى تعثر شامل أو تخصصي أو أداء مرتفع متزن.", { comprehensiveRisk, specializedRisk, stableHigh }, "يوجه نوع التدخل المناسب.")
    ];
    result.improvementPlan = [
      intervention("عالية", `انخفاض أداء ${weakestSubject.subject}`, `طلبة المادة الأضعف`, "تحليل نتائج المادة حسب المهارات والأسئلة، ثم تنفيذ تدخل علاجي مرتبط بأعلى فجوات.", "معلم المادة والمعلم الأول", "3 أسابيع", `رفع متوسط ${weakestSubject.subject} بمقدار 10% وتقليل التعثر`, "اختبار مهاري قبلي وبعدي", "مراجعة جودة الاختبار واستراتيجيات التدريس إذا لم يظهر تحسن.", ["metric:weakestSubjectMean"]),
      intervention("عالية", "تعثر متعدد المواد", `${comprehensiveRisk} حالة`, "تشكيل ملف دعم مشترك يشمل المهارات الأساسية والحضور وعينات الأعمال وخطة أسبوعية قصيرة.", "فريق دعم متعدد التخصصات", "4 أسابيع", "تحسن في مادتين على الأقل لكل حالة", "لوحة متابعة أسبوعية", "إحالة الحالات غير المستجيبة لتشخيص أعمق.", ["metric:comprehensiveRisk"]),
      intervention("متوسطة", "تعثر تخصصي", `${specializedRisk} حالة`, "دعم تخصصي مركز في المادة أو المادتين الأضعف مع أهداف قصيرة قابلة للقياس.", "معلم المادة", "أسبوعان", "انتقال 60% من الحالات إلى مستوى الإتقان في المادة المستهدفة", "مهام قصيرة واختبار خروج", "تعديل مستوى المهمة أو طريقة التدريس للحالات غير المستجيبة.", ["metric:specializedRisk"])
    ];
    result.monitoringPlan = [
      { stage: "خط أساس", timing: "الآن", measure: "متوسط وإتقان كل مادة وتصنيف ملفات الطلبة", owner: "أخصائي التقويم" },
      { stage: "متابعة مواد الأولوية", timing: "كل أسبوعين", measure: "تحسن المهارات المستهدفة في المادة الأضعف", owner: "المعلم الأول" },
      { stage: "مراجعة مشتركة", timing: "بعد شهر", measure: "تغير عدد حالات التعثر المتعدد والتخصصي", owner: "فريق الدعم" }
    ];
    result.limitations = ["الارتباطات بين المواد وصفية ولا تثبت السببية.", "يجب توحيد مقاييس الدرجات أو تحويلها إلى نسب قبل المقارنة إذا اختلفت الدرجات الكلية.", "لا تحدد الدرجات الإجمالية المهارات المسؤولة عن الفروق."];
    result.executiveTitle = `أولوية المادة: ${weakestSubject.subject}`;
    result.executiveSummary = `حلل النظام ${subjects.length} مواد و${studentProfiles.length} ملف طالب. بلغت الفجوة بين أعلى وأدنى متوسط ${round(meanGap)} درجة، وظهر ${comprehensiveRisk} حالة تعثر متعدد المواد و${specializedRisk} حالة تعثر تخصصي. يتطلب القرار تحليلًا مهاريًا للمادة الأضعف ومسارات دعم منفصلة للحالات الشاملة والتخصصية.`;
    result.action = { title: result.improvementPlan[0].action, text: `${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`, priority: result.improvementPlan[0].priority, indicator: result.improvementPlan[0].successIndicator };
    result.evidenceMap = evidenceMapFromMetrics(result.metrics);
    return result;
  }

  const SUPERVISION_DOMAINS = [
    { id: "student-learning", label: "تعلم الطلبة وتقدمهم", keys: ["تحصيل", "تقدم", "المعارف", "المفاهيم", "الطلبه"] },
    { id: "planning", label: "التخطيط ونواتج التعلم", keys: ["تخطيط", "نواتج", "المنهاج", "الاهداف", "الخطة"] },
    { id: "instruction", label: "استراتيجيات التدريس", keys: ["استراتيجيات", "تدريس", "تعلم", "نشط", "استقصاء"] },
    { id: "assessment", label: "التقويم والتغذية الراجعة", keys: ["تقويم", "تغذيه", "تقييم", "رصد"] },
    { id: "classroom", label: "إدارة الصف والدافعية", keys: ["اداره", "الصف", "زمن", "دافعيه", "سلوك"] },
    { id: "resources", label: "المصادر والتقنية", keys: ["مصادر", "موارد", "تقنيه", "رقمي", "عرض"] },
    { id: "values", label: "القيم والهوية والسلامة", keys: ["هويه", "قيم", "سلامه", "نظافه", "مواطنه"] },
    { id: "professional", label: "التطوير المهني والسياسات", keys: ["تطوير مهني", "ذاتي", "سياسات", "لوائح", "مبادرات"] }
  ];
  const STUDENT_WORK_DOMAINS = [
    { id: "achievement", label: "جودة الإنجاز والتحصيل", keys: ["ينجز", "تحصيل", "اهداف المناهج", "تقدم"] },
    { id: "presentation", label: "تنظيم وعرض الأعمال", keys: ["يعرض", "منظم", "واضح", "تنوع"] },
    { id: "feedback", label: "التغذية الراجعة والتحسين", keys: ["تغذيه", "يحسن", "تصحيح"] },
    { id: "skills", label: "مهارات التعلم والتطبيق", keys: ["مهارات التعلم", "ذاتي", "تعاوني", "رقمي", "يطبق"] },
    { id: "motivation", label: "الدافعية والقيم", keys: ["دافعيه", "مشاركه", "قيم", "اتجاهات", "ابتكار"] },
    { id: "differentiation", label: "التمايز وملاءمة الأنشطة", keys: ["تمايز", "مستويات", "يراعي", "فروق"] },
    { id: "quality", label: "تنوع الأنشطة والمعايير", keys: ["تتنوع", "معايير", "مواصفات", "الفترات الزمنيه"] }
  ];

  function classifyDomain(text, domains) {
    const normalized = normalize(text);
    const scored = domains.map(domain => ({ ...domain, score: domain.keys.filter(key => normalized.includes(normalize(key))).length })).sort((a, b) => b.score - a.score);
    return scored[0]?.score ? scored[0] : { id: "other", label: "مجالات أخرى", keys: [], score: 0 };
  }

  function analyzeIndicatorSet(context, mode) {
    const domains = mode === "student_work" ? STUDENT_WORK_DOMAINS : SUPERVISION_DOMAINS;
    const familyName = mode === "student_work" ? "student_work" : "supervision_indicator";
    const purpose = mode === "student_work" ? "تحليل جودة أعمال الطلبة وممارسات تصميمها ومتابعتها" : "تحليل المؤشرات الإشرافية والفجوات وأولويات النمو المهني";
    const result = createBase(context, familyName, purpose);
    const itemHeader = findHeader(context.headers, ["بنود التقويم", "البند", "المؤشر", "النص"]);
    const scoreHeader = context.scoreColumn || findHeader(context.headers, ["المتوسط", "الدرجة", "القيمة"]);
    const modeHeader = findHeader(context.headers, ["الأكثر تكرارا", "المنوال"]);
    if (!itemHeader || !scoreHeader) throw new Error("لم يكتشف التطبيق عمود البند وعمود الدرجة أو المتوسط.");
    const maxScore = Number.isFinite(context.maxScore) && context.maxScore > 0 ? context.maxScore : Math.max(...context.rows.map(row => parseNumber(row[scoreHeader])).filter(Number.isFinite));
    const items = context.rows.map((row, index) => {
      const label = String(row[itemHeader] || "").trim();
      const score = parseNumber(row[scoreHeader]);
      if (!label || !Number.isFinite(score)) return null;
      const domain = classifyDomain(label, domains);
      const modeValue = modeHeader ? parseNumber(row[modeHeader]) : NaN;
      const normalizedScore = maxScore ? score / maxScore * 100 : score;
      return { ref: `row:${index + 1}`, label, score, mode: modeValue, normalizedScore, gap: Math.max(0, 100 - normalizedScore), domainId: domain.id, domain: domain.label };
    }).filter(Boolean);
    if (!items.length) throw new Error("لا توجد مؤشرات صالحة للتحليل.");
    const domainStats = unique(items.map(item => item.domain)).map(domain => {
      const domainItems = items.filter(item => item.domain === domain);
      return {
        domain,
        count: domainItems.length,
        mean: round(mean(domainItems.map(item => item.normalizedScore))),
        gap: round(mean(domainItems.map(item => item.gap))),
        minimum: round(Math.min(...domainItems.map(item => item.normalizedScore))),
        maximum: round(Math.max(...domainItems.map(item => item.normalizedScore)))
      };
    }).sort((a, b) => b.mean - a.mean);
    const sortedItems = [...items].sort((a, b) => b.normalizedScore - a.normalizedScore);
    const strengths = sortedItems.slice(0, Math.min(5, items.length));
    const priorities = [...items].sort((a, b) => b.gap - a.gap).slice(0, Math.min(7, items.length));
    const totalGap = sum(items.map(item => item.gap));
    const pareto = priorities.map(item => ({ label: item.label, gap: round(item.gap), contribution: round(totalGap ? item.gap / totalGap * 100 : 0) }));
    let cumulative = 0; pareto.forEach(item => { cumulative += item.contribution; item.cumulative = round(cumulative); });
    const overall = mean(items.map(item => item.normalizedScore));
    const domainGap = domainStats.length ? domainStats[0].mean - domainStats.at(-1).mean : 0;
    const meanModeGap = modeHeader ? mean(items.filter(item => Number.isFinite(item.mode)).map(item => Math.abs(item.score - item.mode))) : NaN;

    result.items = items; result.domains = domainStats; result.overallPct = overall; result.strengths = strengths; result.priorities = priorities;
    result.analysisProfile.dataSufficiency = items.length >= 8 ? "مرتفعة للتحليل المؤشري" : "محدودة";
    result.analysisProfile.dimensions = mode === "student_work"
      ? ["جودة الإنجاز", "التقدم", "التغذية الراجعة", "مهارات التعلم", "التمايز", "تنوع الأنشطة"]
      : ["تعلم الطلبة", "التخطيط", "التدريس", "التقويم", "إدارة الصف", "التقنية", "القيم", "التطوير المهني"];
    result.analysisProfile.decisionUse = mode === "student_work" ? ["تحسين تصميم الأعمال", "رفع جودة التغذية الراجعة", "بناء معايير متابعة"] : ["تحديد أولويات الإشراف", "بناء خطة نمو مهني", "اختيار الدعم والمتابعة"];

    result.metrics = [
      metric("indicatorCount", "عدد المؤشرات", items.length, "مؤشرًا", "integer"),
      metric("overallPct", "المستوى العام", round(overall), `من ${maxScore} بعد التطبيع`, "percent"),
      metric("domainCount", "عدد المجالات", domainStats.length, "مجالًا", "integer"),
      metric("domainGap", "الفجوة بين أعلى وأدنى مجال", round(domainGap), "نقطة مئوية"),
      metric("priorityCount", "أولويات التطوير", priorities.filter(item => item.normalizedScore < 70).length, "مؤشرًا دون 70%", "integer"),
      ...(Number.isFinite(meanModeGap) ? [metric("meanModeGap", "فارق المتوسط والمنوال", round(meanModeGap), "مؤشر اتساق التقديرات")] : [])
    ];
    result.charts = [
      chart("domain-radar", "radar", "ملف المجالات", "مقارنة متوسطات المجالات بعد توحيدها إلى 100%.", domainStats.map(item => ({ label: item.domain, value: item.mean })), { max: 100 }),
      chart("domain-bars", "bar", "ترتيب المجالات", "المتوسط المعياري لكل مجال.", domainStats, { xKey: "domain", yKey: "mean", valueSuffix: "%" }),
      chart("priority-pareto", "pareto", "باريتو فجوات المؤشرات", "المؤشرات الأعلى إسهامًا في فجوة التطوير.", pareto, { xKey: "label", yKey: "gap", cumulativeKey: "cumulative" }),
      chart("indicator-distribution", "bar", "توزيع المؤشرات حسب مستوى الأداء", "عدد المؤشرات في فئات الأداء.", [
        { label: "متميز (85%+)" , count: items.filter(item => item.normalizedScore >= 85).length },
        { label: "فاعل (70-84%)", count: items.filter(item => item.normalizedScore >= 70 && item.normalizedScore < 85).length },
        { label: "ملائم (55-69%)", count: items.filter(item => item.normalizedScore >= 55 && item.normalizedScore < 70).length },
        { label: "يحتاج تطوير (<55%)", count: items.filter(item => item.normalizedScore < 55).length }
      ], { xKey: "label", yKey: "count" })
    ];

    const strongestDomain = domainStats[0], weakestDomain = domainStats.at(-1);
    result.findings.push(finding("المجال الأقوى", `سجل «${strongestDomain.domain}» متوسطًا معياريًا ${strongestDomain.mean}%.`, "مرتفعة", "يمثل ممارسة قابلة للحفاظ ونقل الأثر إذا دعمتها أدلة ميدانية كافية.", "توثيق الممارسة الأقوى ونقلها من خلال مداولة أو نموذج تطبيقي.", "low", []));
    result.findings.push(finding("أولوية التطوير الرئيسة", `سجل «${weakestDomain.domain}» أدنى متوسط ${weakestDomain.mean}% بفجوة ${weakestDomain.gap}%.`, "مرتفعة", "المجال يمثل أعلى عائد متوقع من الدعم إذا عولجت مؤشرات محددة داخله.", "اختيار مؤشرين أو ثلاثة من المجال وبناء تدخل قصير مع قياس لاحق.", weakestDomain.mean < 55 ? "high" : "medium", []));
    result.findings.push(finding("تفاوت بين المجالات", `بلغ الفرق بين أعلى وأدنى مجال ${round(domainGap)} نقطة مئوية.`, "مرتفعة", domainGap >= 20 ? "الأداء غير متوازن؛ القوة في مجال لا تعوض فجوة مجال آخر." : "الأداء متقارب نسبيًا مع أولويات محددة.", "استخدام ملف المجالات بدل حكم كلي واحد.", domainGap >= 20 ? "high" : "medium", ["metric:domainGap"]));
    if (pareto.length) {
      const eighty = pareto.findIndex(item => item.cumulative >= 80);
      result.findings.push(finding("تركيز فجوة التطوير", `${eighty + 1 || pareto.length} مؤشرات تفسر نحو 80% من فجوة التطوير المحسوبة.`, "مرتفعة", "التركيز على عدد محدود من المؤشرات أكثر كفاءة من توزيع الجهد على جميع البنود.", "اعتماد المؤشرات الأعلى في مخطط باريتو كأولويات الدورة القادمة.", "high", []));
    }
    if (Number.isFinite(meanModeGap)) {
      result.findings.push(finding("اتساق المتوسط والمنوال", `بلغ متوسط الفارق بين المتوسط والأكثر تكرارًا ${round(meanModeGap)} نقطة.`, "متوسطة", meanModeGap > maxScore * 0.2 ? "يوجد تباين بين مركز التقديرات والنمط الأكثر شيوعًا يستحق مراجعة طريقة التجميع." : "التقديرات متقاربة نسبيًا.", "مراجعة البنود ذات الفارق الأعلى قبل اعتماد الحكم.", "medium", ["metric:meanModeGap"]));
    }

    result.qualityTools = [
      qualityTool("radar", "مخطط الرادار للمجالات", domainStats.length >= 3, "يتطلب ثلاثة مجالات أو أكثر على مقياس موحد.", domainStats, "يظهر توازن ملف الأداء."),
      qualityTool("gap", "تحليل الفجوة", Number.isFinite(maxScore), "يعتمد على مستوى حالي ومقياس أعلى مستهدف.", domainStats.map(item => ({ domain: item.domain, current: item.mean, target: 85, gap: round(Math.max(0, 85 - item.mean)) })), "يحدد المسافة عن المستوى المستهدف."),
      qualityTool("pareto", "مخطط باريتو للأولويات", pareto.length >= 3, "توجد فجوات قابلة للترتيب حسب الإسهام.", pareto, "يركز التدخل على المؤشرات الأعلى أثرًا."),
      qualityTool("priority", "مصفوفة الأولوية والأثر", priorities.length > 0, "ترتب البنود وفق حجم الفجوة وإمكان التدخل.", priorities.map((item, index) => ({ rank: index + 1, indicator: item.label, domain: item.domain, score: round(item.normalizedScore), gap: round(item.gap), priority: item.gap >= 45 ? "عالية" : item.gap >= 25 ? "متوسطة" : "محددة" })), "تحول النتائج إلى قائمة تنفيذ مرتبة."),
      qualityTool("pdca", "دورة التحسين PDCA", true, "توجد أولويات قابلة للتخطيط والتنفيذ وإعادة القياس.", { plan: "تحديد مؤشرات الأولوية", do: "تنفيذ دعم محدد", check: "إعادة القياس بنفس المقياس", act: "تثبيت الممارسة أو تعديل التدخل" }, "تربط التحليل بالمتابعة المستمرة.")
    ];

    result.improvementPlan = priorities.slice(0, 4).map((item, index) => intervention(
      index < 2 ? "عالية" : "متوسطة",
      `فجوة في ${item.domain}`,
      mode === "student_work" ? "أعمال الطلبة والمعلم المسؤول عن تصميمها" : "المعلم والممارسات المرتبطة بالمؤشر",
      mode === "student_work"
        ? `إعادة تصميم مهمة أو أداة متابعة تستهدف «${item.label}»، مع Rubric وتغذية راجعة وقياس تحسن عينة الأعمال.`
        : `تنفيذ دعم إشرافي تطبيقي يستهدف «${item.label}» من خلال نموذج ممارسة وتجريب وملاحظة لاحقة.`,
      mode === "student_work" ? "معلم المادة والمعلم الأول" : "المشرف / المعلم الأول والمعلم",
      index < 2 ? "أسبوعان" : "3-4 أسابيع",
      `رفع المؤشر من ${round(item.normalizedScore)}% إلى ${Math.min(100, Math.ceil(item.normalizedScore / 5) * 5 + 10)}% أو أكثر`,
      "ملاحظة أو فحص عينة قبل وبعد بنفس المعيار",
      "إذا لم يتحسن المؤشر، مراجعة جودة الأداة وملاءمة الدعم وجمع دليل نوعي إضافي.",
      [item.ref]
    ));
    result.monitoringPlan = [
      { stage: "اختيار الأولويات", timing: "الأسبوع الأول", measure: "أعلى 3 مؤشرات فجوة", owner: "المشرف / المعلم الأول" },
      { stage: "تطبيق الدعم", timing: "الأسبوعان 1-2", measure: "تنفيذ الممارسة المستهدفة وتوثيقها", owner: "المعلم" },
      { stage: "إعادة الملاحظة", timing: "الأسبوع 3", measure: "نفس المؤشرات وبالأداة نفسها", owner: "المشرف" },
      { stage: "تثبيت أو تعديل", timing: "بعد المراجعة", measure: "حجم التحسن واستدامته", owner: "فريق المادة" }
    ];
    result.limitations = ["المتوسطات المجمعة لا تكشف تباين الزيارات الفردية أو اختلاف المقيمين.", "النتيجة الرقمية لا تعوض مراجعة الأدلة الميدانية والنصوص المصاحبة.", `اعتمد التطبيع على الدرجة العليا ${maxScore}؛ يجب التأكد أنها الدرجة الرسمية للمقياس.`];
    result.executiveTitle = `الأولوية: ${weakestDomain.domain}`;
    result.executiveSummary = `حلل النظام ${items.length} مؤشرًا ضمن ${domainStats.length} مجالات. بلغ المستوى العام ${round(overall)}%. تصدر «${strongestDomain.domain}» الأداء، بينما ظهر «${weakestDomain.domain}» كأولوية بفجوة ${weakestDomain.gap}%. يوصى بتركيز دورة التحسين على عدد محدود من المؤشرات الأعلى إسهامًا في الفجوة وإعادة قياسها بالأداة نفسها.`;
    result.action = result.improvementPlan[0] ? { title: result.improvementPlan[0].action, text: `${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`, priority: result.improvementPlan[0].priority, indicator: result.improvementPlan[0].successIndicator } : result.action;
    result.evidenceMap = evidenceMapFromMetrics(result.metrics);
    return result;
  }

  const NARRATIVE_THEMES = [
    { id: "student-learning", label: "تعلم الطلبة وتحصيلهم", keys: ["الطلبه", "تحصيل", "فهم", "تقدم", "استيعاب", "مهارات"] },
    { id: "planning", label: "التخطيط ونواتج التعلم", keys: ["تخطيط", "اهداف", "نواتج", "الخطة", "تحضير"] },
    { id: "instruction", label: "التدريس والتعلم النشط", keys: ["استراتيجيات", "تدريس", "تعلم تعاوني", "قصة", "عصف", "استقصاء"] },
    { id: "assessment", label: "التقويم والتغذية الراجعة", keys: ["تقويم", "تقييم", "تغذيه", "بطاقات", "اختبار"] },
    { id: "classroom", label: "إدارة الصف والدافعية", keys: ["اداره", "الصف", "زمن", "دافعيه", "انضباط"] },
    { id: "technology", label: "التقنيات والمصادر", keys: ["تقنيه", "رقمي", "منصه", "شاشه", "مصادر", "فيديو"] },
    { id: "differentiation", label: "التمايز والدعم", keys: ["تمايز", "فروق", "دعم", "علاجي", "صعوبات"] },
    { id: "values", label: "القيم والهوية والمواطنة", keys: ["هويه", "مواطنه", "قيم", "عمانيه", "اخلاق"] },
    { id: "professional", label: "النمو المهني والمبادرات", keys: ["نمو مهني", "ورش", "مبادرات", "مجتمع تعلم", "تبادل"] }
  ];
  const SECTION_PATTERNS = [
    { id: "strengths", label: "جوانب الإجادة", pattern: /جوانب\s+(?:الاجاده|الإجادة|الجاده).*ادلتها|مواطن\s+القوه/i },
    { id: "development", label: "جوانب التطوير", pattern: /الجوانب.*تحتاج.*تطوير|اولويات\s+التطوير/i },
    { id: "support", label: "الدعم المقدم", pattern: /الدعم\s+المقدم/i },
    { id: "deliberation", label: "المداولة الإشرافية", pattern: /مداوله\s+اشرافيه|المداوله\s+الاشرافيه/i },
    { id: "recommendations", label: "التوصيات", pattern: /^\s*التوصيات\s*$/i }
  ];

  function splitSentences(text) {
    return String(text || "").split(/\n+|(?<=[.!؟؛])\s+/).map(item => item.trim()).filter(item => item.length >= 10);
  }
  function sentenceTheme(sentence) {
    return classifyDomain(sentence, NARRATIVE_THEMES);
  }
  function evidenceScore(sentence) {
    const n = normalize(sentence);
    let score = 0;
    if (/من خلال|حيث|يظهر|يتضح|وثبت|مما|استنادا|اعتمادا/.test(n)) score += 2;
    if (/\d|%/.test(sentence)) score += 1;
    if (/جميع|معظم|بعض|قليل|اغلب/.test(n)) score += 1;
    if (/ادى|اسهم|انعكس|حقق|رفع|خفض|حسن/.test(n)) score += 1;
    if (sentence.length >= 100) score += 1;
    return clamp(score, 0, 6);
  }
  function actionabilityScore(sentence) {
    const n = normalize(sentence);
    let score = 0;
    if (/تنفيذ|اعداد|تصميم|تفعيل|تعزيز|متابعه|تزويد|توجيه|تقديم|حضور|زياره/.test(n)) score += 1;
    if (/خلال|اسبوع|شهر|يوم|حصه|الفصل|تاريخ/.test(n)) score += 1;
    if (/المعلم|المشرف|المعلم الاول|الاداره|الفريق/.test(n)) score += 1;
    if (/مؤشر|نسبه|ارتفاع|انخفاض|قياس|توثيق|انجاز/.test(n)) score += 1;
    if (/الطلبه|الفئه|المجموعه|المعلمين/.test(n)) score += 1;
    return score;
  }

  function extractNarrativeSections(context) {
    const rows = context.rows || [];
    const sectionHeader = findHeader(context.headers || [], ["القسم"]);
    const textHeader = findHeader(context.headers || [], ["النص", "الملاحظة", "الملاحظات"]);
    if (sectionHeader && textHeader) {
      const sections = {};
      rows.forEach((row, index) => {
        const sectionText = String(row[sectionHeader] || "").trim();
        const text = String(row[textHeader] || "").trim();
        if (!text) return;
        const matched = SECTION_PATTERNS.find(item => item.pattern.test(normalize(sectionText))) || { id: "other", label: sectionText || "غير مصنف" };
        (sections[matched.id] ||= []).push({ ref: `row:${index + 1}`, text, section: matched.label });
      });
      return sections;
    }
    const lines = String(context.narrativeText || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const sections = {}; let current = "other";
    lines.forEach((line, index) => {
      const match = SECTION_PATTERNS.find(item => item.pattern.test(normalize(line)));
      if (match) { current = match.id; return; }
      (sections[current] ||= []).push({ ref: `line:${index + 1}`, text: line, section: SECTION_PATTERNS.find(item => item.id === current)?.label || "غير مصنف" });
    });
    return sections;
  }

  function analyzeNarrative(context) {
    const result = createBase(context, "narrative", "تحليل الأدلة السردية واتساق التشخيص والدعم والتوصيات");
    const sections = extractNarrativeSections(context);
    const allEntries = Object.values(sections).flat();
    const sentences = allEntries.flatMap(entry => splitSentences(entry.text).map(text => ({ ref: entry.ref, section: entry.section, text })));
    if (!sentences.length) throw new Error("النص السردي لا يحتوي جملًا كافية للتحليل.");
    const themed = sentences.map(item => ({ ...item, theme: sentenceTheme(item.text).label, evidenceScore: evidenceScore(item.text), actionability: actionabilityScore(item.text) }));
    const themes = unique(themed.map(item => item.theme)).map(theme => {
      const items = themed.filter(item => item.theme === theme);
      const bySection = {};
      items.forEach(item => bySection[item.section] = (bySection[item.section] || 0) + 1);
      return { theme, count: items.length, evidenceMean: round(mean(items.map(item => item.evidenceScore))), bySection };
    }).sort((a, b) => b.count - a.count);
    const evidenceLevels = [
      { label: "دليل قوي", count: themed.filter(item => item.evidenceScore >= 4).length },
      { label: "دليل متوسط", count: themed.filter(item => item.evidenceScore >= 2 && item.evidenceScore < 4).length },
      { label: "حكم عام أو دليل ضعيف", count: themed.filter(item => item.evidenceScore < 2).length }
    ];
    const recommendations = themed.filter(item => item.section.includes("التوصيات") || /يوصي|اوصي|تنفيذ|اعداد|تصميم|تفعيل|تعزيز|متابعه|حضور|زياره/.test(normalize(item.text)));
    const actionLevels = [
      { label: "قابلة للتنفيذ والقياس", count: recommendations.filter(item => item.actionability >= 4).length },
      { label: "قابلة للتنفيذ جزئيًا", count: recommendations.filter(item => item.actionability >= 2 && item.actionability < 4).length },
      { label: "عامة أو غير قابلة للقياس", count: recommendations.filter(item => item.actionability < 2).length }
    ];
    const duplicates = [];
    for (let i = 0; i < themed.length; i++) {
      for (let j = i + 1; j < themed.length; j++) {
        const similarity = jaccard(themed[i].text, themed[j].text);
        if (similarity >= 0.72) duplicates.push({ first: themed[i].text, second: themed[j].text, similarity: round(similarity * 100), refs: [themed[i].ref, themed[j].ref] });
        if (duplicates.length >= 40) break;
      }
      if (duplicates.length >= 40) break;
    }
    const development = sections.development || [];
    const noDevelopmentClaims = development.filter(item => /لا\s+توجد|لا\s+يوجد/.test(normalize(item.text)));
    const substantiveDevelopment = development.filter(item => !/لا\s+توجد|لا\s+يوجد/.test(normalize(item.text)) && item.text.length > 12);
    const contradictions = [];
    if (noDevelopmentClaims.length && substantiveDevelopment.length) contradictions.push({ title: "تعارض داخل قسم التطوير", detail: "ظهر نص يفيد بعدم وجود جوانب تطوير، مع وجود بنود تطوير أخرى في القسم نفسه.", refs: [...noDevelopmentClaims.map(item => item.ref), ...substantiveDevelopment.slice(0, 3).map(item => item.ref)] });
    const dateAnomalies = allEntries.filter(item => /(?:19|20)\d{3,}|\b\d{1,2}\/\d{1,2}\/\d{5,}\b/.test(item.text)).map(item => ({ text: item.text, ref: item.ref }));
    const sectionCounts = Object.entries(sections).map(([id, entries]) => ({ id, label: SECTION_PATTERNS.find(item => item.id === id)?.label || "غير مصنف", count: entries.length }));

    const alignmentThemes = unique(themed.map(item => item.theme)).map(theme => {
      const strengthCount = themed.filter(item => item.theme === theme && item.section.includes("الإجادة")).length;
      const devCount = themed.filter(item => item.theme === theme && item.section.includes("التطوير")).length;
      const supportCount = themed.filter(item => item.theme === theme && item.section.includes("الدعم")).length;
      const recCount = themed.filter(item => item.theme === theme && item.section.includes("التوصيات")).length;
      return { theme, strengths: strengthCount, development: devCount, support: supportCount, recommendations: recCount, alignment: devCount ? round(Math.min(100, (supportCount + recCount) / (devCount * 2) * 100)) : 100 };
    }).sort((a, b) => b.development - a.development);
    const evidenceStrongPct = pct(evidenceLevels[0].count, themed.length);
    const actionablePct = recommendations.length ? pct(actionLevels[0].count, recommendations.length) : 0;
    const duplicationPct = pct(duplicates.length, themed.length);
    const developmentCoverage = alignmentThemes.filter(item => item.development > 0);
    const alignedPct = developmentCoverage.length ? mean(developmentCoverage.map(item => item.alignment)) : 100;

    result.sections = sections; result.themes = themes; result.evidenceLevels = evidenceLevels; result.actionLevels = actionLevels;
    result.duplicates = duplicates; result.contradictions = contradictions; result.dateAnomalies = dateAnomalies; result.alignmentThemes = alignmentThemes;
    result.sentenceCount = themed.length; result.evidenceCount = evidenceLevels[0].count + evidenceLevels[1].count;
    result.evidenceRatio = pct(result.evidenceCount, themed.length); result.recommendationCount = recommendations.length;
    result.developmentCount = substantiveDevelopment.length; result.strengthCount = (sections.strengths || []).length;
    result.analysisProfile.dataSufficiency = themed.length >= 30 ? "مرتفعة للتحليل النصي" : "متوسطة";
    result.analysisProfile.dimensions = ["تغطية المجالات", "قوة الأدلة", "اتساق التطوير والدعم", "قابلية التوصيات", "التكرار والتناقض", "جودة التوثيق"];
    result.analysisProfile.decisionUse = ["بناء خطة نمو مهني", "تحسين جودة التقارير الإشرافية", "اختيار أولويات الدعم", "مراجعة التوصيات قبل الاعتماد"];

    result.metrics = [
      metric("sentenceCount", "الجمل التحليلية", themed.length, "جملة", "integer"),
      metric("strongEvidencePct", "الأدلة القوية", round(evidenceStrongPct), `${evidenceLevels[0].count} جملة`, "percent"),
      metric("actionablePct", "التوصيات القابلة للقياس", round(actionablePct), `${actionLevels[0].count} من ${recommendations.length}`, "percent"),
      metric("duplicationPct", "مؤشر التكرار", round(duplicationPct), `${duplicates.length} زوجًا متشابهًا`, "percent"),
      metric("alignmentPct", "اتساق التطوير مع الدعم والتوصيات", round(alignedPct), "متوسط تغطية المجالات", "percent"),
      metric("contradictionCount", "التعارضات المكتشفة", contradictions.length, "تحتاج مراجعة", "integer"),
      metric("dateAnomalies", "مشكلات التواريخ", dateAnomalies.length, "قيمة غير منطقية", "integer")
    ];
    result.charts = [
      chart("themes", "bar", "المجالات الأكثر حضورًا", "عدد الجمل المرتبطة بكل مجال تربوي.", themes, { xKey: "theme", yKey: "count" }),
      chart("evidence-quality", "bar", "جودة الأدلة السردية", "تصنيف الجمل وفق قوة الدليل والخصوصية.", evidenceLevels, { xKey: "label", yKey: "count" }),
      chart("recommendation-actionability", "bar", "قابلية التوصيات للتنفيذ والقياس", "مدى اكتمال الفئة والزمن والمسؤول ومؤشر النجاح.", actionLevels, { xKey: "label", yKey: "count" }),
      chart("section-alignment", "heatmap", "اتساق المجالات عبر أقسام التقرير", "ظهور كل مجال في الإجادة والتطوير والدعم والتوصيات.", alignmentThemes, { columns: ["strengths", "development", "support", "recommendations"] }),
      chart("section-counts", "bar", "توازن أقسام التقرير", "عدد البنود في كل قسم.", sectionCounts, { xKey: "label", yKey: "count" })
    ];

    const topTheme = themes[0];
    result.findings.push(finding("المجال الأكثر حضورًا", `ظهر «${topTheme?.theme || "غير محدد"}» في ${topTheme?.count || 0} جملة.`, "مرتفعة", "ارتفاع الحضور قد يعكس أولوية فعلية أو تحيزًا في التوثيق؛ يلزم مقارنته بهدف الزيارة.", "مراجعة توازن تغطية المجالات وربطها بأهداف الاستمارة.", "medium", []));
    result.findings.push(finding(
      evidenceStrongPct >= 40 ? "نسبة جيدة من الأدلة القوية" : "الأحكام أقوى من الأدلة المتاحة",
      `الأدلة القوية ${round(evidenceStrongPct)}%، والمتوسطة ${round(pct(evidenceLevels[1].count, themed.length))}%.`,
      "متوسطة",
      evidenceStrongPct >= 40 ? "جزء معتبر من الأحكام قابل للتتبع، مع حاجة لمراجعة نوعية الدليل." : "قد يصعب اعتماد الأحكام مهنيًا أو متابعة أثرها لغياب الدليل المحدد.",
      "اعتماد قالب: ممارسة محددة + دليل مشاهد + فئة متأثرة + أثر قابل للتحقق.",
      evidenceStrongPct < 25 ? "high" : "medium",
      ["metric:strongEvidencePct"]
    ));
    result.findings.push(finding(
      actionablePct >= 50 ? "توصيات قابلة للتنفيذ نسبيًا" : "التوصيات تحتاج تحويلًا إلى خطة",
      `بلغت التوصيات المكتملة نسبيًا ${round(actionablePct)}% من ${recommendations.length} توصية مكتشفة.`,
      "متوسطة",
      actionablePct < 50 ? "التوصيات العامة لا تكفي للمتابعة أو محاسبة التنفيذ." : "يمكن تحويل الجزء الأقوى منها مباشرة إلى خطة متابعة.",
      "إضافة المسؤول والزمن وخط الأساس والمستهدف وطريقة القياس لكل توصية معتمدة.",
      actionablePct < 30 ? "high" : "medium",
      ["metric:actionablePct"]
    ));
    if (duplicates.length) result.findings.push(finding("تكرار سردي يضعف التركيز", `اكتُشف ${duplicates.length} زوجًا من الجمل المتشابهة بدرجة 72% أو أكثر.`, "متوسطة", "التكرار يزيد حجم التقرير دون إضافة دليل جديد، وقد يخفي الأولويات الفعلية.", "دمج العبارات المتشابهة والإبقاء على الصياغة الأقوى والأوضح دليلًا.", "medium", ["metric:duplicationPct"]));
    if (contradictions.length) result.findings.push(finding("تعارض يحتاج تصحيحًا قبل الاعتماد", contradictions.map(item => item.detail).join(" "), "مرتفعة", "التعارض يضعف موثوقية التقرير وقد يؤدي إلى توصيات غير منسجمة.", "مراجعة الأقسام المتعارضة واعتماد صياغة واحدة مدعومة بالأدلة.", "high", ["metric:contradictionCount"]));
    if (dateAnomalies.length) result.findings.push(finding("تواريخ غير منطقية", `اكتُشفت ${dateAnomalies.length} إشارة تاريخية محتملة الخطأ.`, "مرتفعة", "الخطأ الزمني يربك خطة المتابعة ويضعف التوثيق الرسمي.", "تصحيح التواريخ والتحقق من توافقها مع زمن الزيارة والتوصية.", "medium", ["metric:dateAnomalies"]));
    result.findings.push(finding(
      alignedPct >= 70 ? "ارتباط جيد نسبيًا بين التطوير والدعم" : "فجوة بين التشخيص والدعم والتوصيات",
      `بلغ متوسط اتساق مجالات التطوير مع الدعم والتوصيات ${round(alignedPct)}%.`,
      "متوسطة",
      alignedPct < 70 ? "قد تظل بعض جوانب التطوير بلا دعم أو متابعة مقابلة." : "معظم المجالات ذات الاحتياج تظهر لها استجابة في الدعم أو التوصيات.",
      "استخدام مصفوفة تربط كل جانب تطوير بالدعم والتوصية ومؤشر المتابعة.",
      alignedPct < 50 ? "high" : "medium",
      ["metric:alignmentPct"]
    ));

    const priorityThemes = alignmentThemes.filter(item => item.development > 0).sort((a, b) => a.alignment - b.alignment || b.development - a.development).slice(0, 4);
    result.qualityTools = [
      qualityTool("evidence-matrix", "مصفوفة الحكم والدليل والأثر", true, "يوجد نص سردي وأحكام تحتاج تتبع الأدلة.", themed.slice(0, 120).map(item => ({ ref: item.ref, section: item.section, theme: item.theme, evidenceScore: item.evidenceScore, text: item.text })), `الأدلة القوية ${round(evidenceStrongPct)}%.`),
      qualityTool("alignment", "مصفوفة اتساق التشخيص والدعم", developmentCoverage.length > 0, "تتطلب جوانب تطوير ودعمًا أو توصيات.", alignmentThemes, `متوسط الاتساق ${round(alignedPct)}%.`),
      qualityTool("pareto", "باريتو موضوعات التطوير", substantiveDevelopment.length >= 3, "توجد عدة جوانب تطوير قابلة للتصنيف.", themes.map(item => ({ theme: item.theme, count: themed.filter(sentence => sentence.theme === item.theme && sentence.section.includes("التطوير")).length })).filter(item => item.count > 0).sort((a, b) => b.count - a.count), "يركز الدعم على الموضوعات الأعلى تكرارًا."),
      qualityTool("actionability", "مؤشر قابلية التوصيات للتنفيذ", recommendations.length > 0, "توجد توصيات يمكن فحص عناصرها التنفيذية.", actionLevels, `التوصيات القابلة للقياس ${round(actionablePct)}%.`),
      qualityTool("pdca", "دورة متابعة التوصيات", recommendations.length > 0, "توجد إجراءات قابلة للتحويل إلى خطة.", { plan: "اختيار توصيات الأولوية", do: "تحديد مسؤول وزمن", check: "زيارة أو قياس لاحق", act: "تثبيت الأثر أو تعديل الدعم" }, "تمنع بقاء التقرير وصفًا دون متابعة.")
    ];
    result.improvementPlan = priorityThemes.length ? priorityThemes.map((item, index) => intervention(
      index < 2 ? "عالية" : "متوسطة",
      `فجوة في ${item.theme}`,
      "المعلم أو الفئة المرتبطة بالملاحظة",
      `تحويل جانب التطوير في «${item.theme}» إلى ممارسة محددة، مع دعم تطبيقي ودليل متابعة وتوصية قابلة للقياس.`,
      "المشرف / المعلم الأول والمعلم",
      index < 2 ? "أسبوعان" : "3 أسابيع",
      `ارتفاع اتساق المجال من ${item.alignment}% إلى 80% أو أكثر في التقرير أو الزيارة اللاحقة`,
      "مصفوفة جانب التطوير - الدعم - التوصية - الدليل",
      "إذا لم يظهر أثر، مراجعة ملاءمة الدعم وجمع دليل ميداني إضافي.",
      []
    )) : [intervention("متوسطة", "تحسين جودة التوثيق", "معدّو التقارير الإشرافية", "اعتماد قالب موحد للأدلة والتوصيات القابلة للقياس دون توحيد محتوى التحليل.", "المشرف الأول", "خلال شهر", "ارتفاع الأدلة القوية والتوصيات القابلة للقياس إلى 70%", "تدقيق عينة من التقارير", "تقديم تدريب تطبيقي ومراجعة نموذجية إذا لم يتحسن المؤشر.", [])];
    result.monitoringPlan = [
      { stage: "تدقيق التقرير", timing: "قبل الاعتماد", measure: "التعارضات والتواريخ والتكرارات ومراجع الأدلة", owner: "المشرف" },
      { stage: "اعتماد خطة الدعم", timing: "خلال أسبوع", measure: "ربط كل جانب تطوير بإجراء ومسؤول وزمن", owner: "المعلم الأول" },
      { stage: "زيارة أو متابعة لاحقة", timing: "بعد 2-4 أسابيع", measure: "أدلة تنفيذ التوصيات وأثرها", owner: "المشرف والمعلم" },
      { stage: "تحديث سجل النمو", timing: "بعد المتابعة", measure: "ما تحقق وما يحتاج تعديلًا", owner: "فريق المادة" }
    ];
    result.limitations = ["تحليل اللغة يقدّر قوة الدليل من الصياغة ولا يثبت صحة الواقعة الميدانية.", "التكرار قد يكون ناتجًا عن دمج عدة زيارات أو معلمين، ويحتاج تفسيرًا سياقيًا.", "إخفاء الأسماء يحمي الخصوصية لكنه قد يمنع ربط بعض التوصيات بحالاتها الفردية."];
    result.executiveTitle = evidenceStrongPct >= 40 ? "تقرير غني جزئيًا بالأدلة ويحتاج ضبط الاتساق" : "التقرير يحتاج تقوية الأدلة وخطة المتابعة";
    result.executiveSummary = `حلل النظام ${themed.length} جملة موزعة على ${sectionCounts.length} أقسام. بلغت الأدلة القوية ${round(evidenceStrongPct)}% والتوصيات القابلة للقياس ${round(actionablePct)}%، مع اتساق ${round(alignedPct)}% بين جوانب التطوير والدعم والتوصيات. اكتُشف ${duplicates.length} تكرارًا محتملًا و${contradictions.length} تعارضًا و${dateAnomalies.length} مشكلة تاريخية. يجب مراجعة هذه النقاط قبل اعتماد التقرير وبناء خطة النمو.`;
    result.action = result.improvementPlan[0] ? { title: result.improvementPlan[0].action, text: `${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`, priority: result.improvementPlan[0].priority, indicator: result.improvementPlan[0].successIndicator } : result.action;
    result.evidenceMap = evidenceMapFromMetrics(result.metrics);
    return result;
  }


  const LIKERT_MAP = new Map([
    ["اوافق بشده", 5], ["اوافق", 4], ["محايد", 3], ["لا اوافق", 2], ["لا اوافق بشده", 1],
    ["ممتاز", 5], ["جيد جدا", 4], ["جيد", 3], ["مقبول", 2], ["ضعيف", 1],
    ["دائما", 5], ["غالبا", 4], ["احيانا", 3], ["نادرا", 2], ["ابدا", 1]
  ]);

  function likertValue(value) {
    const numeric = parseNumber(value);
    if (Number.isFinite(numeric)) return numeric;
    return LIKERT_MAP.get(normalize(value)) ?? NaN;
  }

  function cronbachAlpha(matrix) {
    if (!matrix.length || matrix[0].length < 2) return NaN;
    const k = matrix[0].length;
    const itemVars = Array.from({ length: k }, (_, index) => variance(matrix.map(row => row[index]), true));
    const totals = matrix.map(row => sum(row));
    const totalVar = variance(totals, true);
    if (!Number.isFinite(totalVar) || totalVar <= 0 || itemVars.some(v => !Number.isFinite(v))) return NaN;
    return k / (k - 1) * (1 - sum(itemVars) / totalVar);
  }

  function analyzeSurvey(context) {
    const result = createBase(context, "survey", "تحليل الاستبانات والاتجاهات والرضا مع فحص جودة المقياس وأولويات التحسين");
    const itemHeader = findHeader(context.headers, ["البند", "العباره", "السؤال", "المؤشر", "المجال"]);
    const meanHeader = context.scoreColumn || findHeader(context.headers, ["المتوسط", "الوسط", "الدرجه", "النسبه"]);
    let items = [];
    let alpha = NaN;
    let responseCount = context.rows.length;

    if (itemHeader && meanHeader) {
      const maxScore = Number.isFinite(context.maxScore) && context.maxScore > 0 ? context.maxScore : 5;
      items = context.rows.map((row, index) => {
        const label = String(row[itemHeader] || "").trim();
        const value = likertValue(row[meanHeader]);
        if (!label || !Number.isFinite(value)) return null;
        return { ref: `row:${index + 1}`, label, mean: value, positivePct: maxScore ? clamp(value / maxScore * 100, 0, 100) : value, gap: maxScore ? clamp((maxScore - value) / maxScore * 100, 0, 100) : 0 };
      }).filter(Boolean);
    } else {
      const candidateColumns = context.headers.filter(header => {
        const values = context.rows.map(row => likertValue(row[header])).filter(Number.isFinite);
        return values.length >= Math.max(3, context.rows.length * 0.55) && values.every(value => value >= 1 && value <= 5);
      });
      const completeRows = context.rows.map(row => candidateColumns.map(header => likertValue(row[header]))).filter(row => row.length >= 2 && row.every(Number.isFinite));
      alpha = cronbachAlpha(completeRows);
      items = candidateColumns.map((header, index) => {
        const values = context.rows.map(row => likertValue(row[header])).filter(Number.isFinite);
        return {
          ref: `metric:surveyItem${index + 1}`,
          label: header,
          mean: mean(values),
          positivePct: pct(values.filter(value => value >= 4).length, values.length),
          neutralPct: pct(values.filter(value => value === 3).length, values.length),
          negativePct: pct(values.filter(value => value <= 2).length, values.length),
          gap: 100 - pct(values.filter(value => value >= 4).length, values.length)
        };
      });
    }
    if (!items.length) throw new Error("لم يكتشف التطبيق بنود استبانة أو مقياس اتجاهات صالحًا للتحليل.");

    const overallMean = mean(items.map(item => item.mean));
    const overallPositive = mean(items.map(item => item.positivePct));
    const ranked = [...items].sort((a, b) => b.mean - a.mean);
    const priorities = [...items].sort((a, b) => b.gap - a.gap).slice(0, Math.min(8, items.length));
    const dispersion = sd(items.map(item => item.mean));

    result.items = items;
    result.analysisProfile.dataSufficiency = items.length >= 8 && responseCount >= 30 ? "مرتفعة للتحليل الوصفي" : "متوسطة";
    result.analysisProfile.dimensions = ["الاتجاه العام", "البنود الأعلى والأدنى", "التشتت بين البنود", "جودة المقياس", "أولويات التحسين", "الأسئلة المفتوحة عند توفرها"];
    result.analysisProfile.assumptions = ["تفسير الاتساق الداخلي صالح فقط إذا كانت البنود تقيس بُعدًا مترابطًا.", "المتوسطات لا تكشف أسباب الرضا أو عدمه دون بيانات نوعية."];
    result.analysisProfile.decisionUse = ["تحديد أولويات التحسين", "مراجعة بنود الأداة", "بناء خطة استجابة", "إعادة القياس بعد التدخل"];
    result.metrics = [
      metric("surveyItemCount", "عدد البنود", items.length, "بندًا", "integer"),
      metric("responseCount", "عدد الاستجابات", responseCount, "استجابة", "integer"),
      metric("surveyMean", "المتوسط العام", round(overallMean, 2), "على مقياس الأداة"),
      metric("positivePct", "متوسط الاستجابات الإيجابية", round(overallPositive), "%", "percent"),
      metric("itemDispersion", "تشتت متوسطات البنود", round(dispersion, 2), "درجة"),
      ...(Number.isFinite(alpha) ? [metric("cronbachAlpha", "ألفا كرونباخ", round(alpha, 3), alpha >= .7 ? "اتساق مقبول مبدئيًا" : "يحتاج مراجعة") ] : [])
    ];
    result.charts = [
      chart("survey-ranking", "bar", "ترتيب بنود الاستبانة", "متوسط كل بند من الأعلى إلى الأدنى.", ranked, { xKey: "label", yKey: "mean" }),
      chart("survey-positive", "bar", "نسبة الاستجابات الإيجابية", "نسبة التقديرات العليا لكل بند.", [...items].sort((a,b)=>b.positivePct-a.positivePct), { xKey: "label", yKey: "positivePct", valueSuffix: "%" }),
      chart("survey-gap", "pareto", "باريتو فجوات الرضا أو الاتفاق", "البنود الأعلى فجوة عن الاستجابة الإيجابية.", priorities, { xKey: "label", yKey: "gap", valueSuffix: "%" }),
      chart("survey-profile", "radar", "الملف العام للبنود", "صورة مقارنة للبنود بعد تحويلها إلى نسبة مئوية.", ranked.slice(0, Math.min(8, ranked.length)).map(item => ({ label: item.label, value: item.positivePct })), { max: 100 })
    ];
    result.findings = [
      finding(overallPositive >= 75 ? "اتجاه عام إيجابي" : overallPositive >= 55 ? "اتجاه عام متوسط" : "اتجاه عام يحتاج تدخلًا", `بلغ متوسط الاستجابات الإيجابية ${round(overallPositive)}% عبر ${items.length} بندًا.`, "مرتفعة", "يوضح المؤشر المناخ العام لكنه لا يغني عن فحص البنود المنخفضة والفروق بين الفئات.", "ربط التحسين بأدنى البنود وإعادة القياس بعد تنفيذ تدخلات محددة.", overallPositive < 55 ? "high" : "medium", ["metric:positivePct"]),
      finding("تباين بين البنود", `بلغ تشتت متوسطات البنود ${round(dispersion, 2)} درجة، وتراوح الأداء بين «${ranked[0].label}» و«${ranked.at(-1).label}».`, "مرتفعة", "ارتفاع التفاوت يعني أن المتوسط العام قد يخفي خبرات مختلفة داخل الأداة.", "معالجة البنود الأدنى بصورة مستقلة بدل تطبيق إجراء موحد على جميع المحاور.", "medium", ["metric:itemDispersion"]),
      ...(Number.isFinite(alpha) ? [finding(alpha >= .7 ? "اتساق داخلي مقبول مبدئيًا" : "اتساق داخلي يحتاج مراجعة", `بلغ معامل ألفا كرونباخ ${round(alpha, 3)}.`, "متوسطة", "المعامل يفحص ترابط البنود ولا يثبت صدق الأداة أو أحادية البعد.", "مراجعة بنية المحاور وحذف أو تعديل البنود غير المتسقة بعد تحليل تخصصي.", alpha < .7 ? "high" : "low", ["metric:cronbachAlpha"])] : [])
    ];
    result.qualityTools = [
      qualityTool("likert", "تحليل توزيع مقياس ليكرت", true, "توجد استجابات رتبية أو متوسطات بنود.", items, `الإيجابية العامة ${round(overallPositive)}%.`),
      qualityTool("survey-gap", "تحليل فجوة البنود", true, "توجد بنود يمكن ترتيبها بحسب مستوى الاتفاق أو الرضا.", priorities, `أعلى فجوة ${round(priorities[0]?.gap || 0)} نقطة.`),
      qualityTool("survey-pareto", "باريتو أولويات التحسين", priorities.length >= 3, "توجد عدة فجوات قابلة للترتيب.", priorities, "يوجه الجهد إلى البنود الأعلى أثرًا."),
      qualityTool("cronbach", "الاتساق الداخلي للمقياس", Number.isFinite(alpha), "يتطلب استجابات فردية متعددة البنود تقيس بُعدًا مترابطًا.", Number.isFinite(alpha) ? { alpha: round(alpha,3) } : null, Number.isFinite(alpha) ? `ألفا ${round(alpha,3)}.` : "غير مطبق لعدم تحقق الشروط.")
    ];
    result.improvementPlan = priorities.slice(0, Math.min(4, priorities.length)).map((item, index) => intervention(
      index < 2 ? "عالية" : "متوسطة", `فجوة في بند: ${item.label}`, "الفئة المستجيبة المرتبطة بالبند", `تحليل سبب انخفاض البند مع عينة نوعية، ثم تنفيذ إجراء محدد يعالج الخبرة أو الخدمة المرتبطة به.`, "مالك المجال وفريق الجودة", index < 2 ? "أسبوعان" : "شهر", `ارتفاع الاستجابة الإيجابية في البند بمقدار 10 نقاط مئوية أو بلوغ 75%`, "إعادة تطبيق البند ومقارنة قبل/بعد", "إذا لم يتحسن المؤشر، مراجعة صياغة البند أو تقسيم الفئة وتحليل الأسباب النوعية.", [item.ref]
    ));
    result.monitoringPlan = [
      { stage: "خط الأساس", timing: "الآن", measure: "متوسطات البنود ونسب الإيجابية", owner: "فريق الجودة" },
      { stage: "تحقق نوعي", timing: "خلال أسبوع", measure: "أسباب البنود الأدنى من مقابلات أو أسئلة مفتوحة", owner: "مالك المجال" },
      { stage: "إعادة القياس", timing: "بعد 4-6 أسابيع", measure: "التغير في البنود المستهدفة", owner: "فريق التحليل" }
    ];
    result.limitations = ["لا يجوز استخدام ألفا كرونباخ إذا كانت البنود تقيس أبعادًا مستقلة.", "المتوسط في المقياس الرتبي يحتاج تفسيرًا مع التوزيع لا منفردًا.", "لا تفسر الاستبانة أسباب الاتجاه دون أسئلة مفتوحة أو مقابلات."];
    result.executiveTitle = overallPositive >= 75 ? "اتجاه إيجابي مع أولويات محددة" : "فجوات استجابة تحتاج معالجة مركزة";
    result.executiveSummary = `حلل النظام ${items.length} بندًا و${responseCount} استجابة. بلغ متوسط الاستجابة الإيجابية ${round(overallPositive)}%، مع تفاوت مقداره ${round(dispersion,2)} درجة بين متوسطات البنود. ركزت الأولوية على «${priorities[0]?.label || "البنود الأدنى"}» بدل تعميم إجراء موحد على كامل الأداة.`;
    result.action = result.improvementPlan[0] ? { title: result.improvementPlan[0].action, text: `${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`, priority: result.improvementPlan[0].priority, indicator: result.improvementPlan[0].successIndicator } : result.action;
    result.evidenceMap = evidenceMapFromMetrics(result.metrics);
    return result;
  }

  function analyzeTrainingNeeds(context) {
    const result = createBase(context, "training_needs", "تحليل الاحتياجات التدريبية وترتيب الأولويات وفق الأهمية وفجوة الكفاية وحجم الفئة المستفيدة");
    const competencyHeader = findHeader(context.headers, ["الكفايه", "المهاره", "الاحتياج", "المجال", "البند"]);
    const importanceHeader = findHeader(context.headers, ["الاهميه", "درجة الاهمية", "الوزن"]);
    const currentHeader = findHeader(context.headers, ["المستوى الحالي", "الاداء الحالي", "التمكن الحالي", "الدرجة الحالية"]);
    const targetHeader = findHeader(context.headers, ["المستوى المستهدف", "الهدف", "التمكن المستهدف"]);
    const beneficiariesHeader = findHeader(context.headers, ["عدد المستفيدين", "الفئه", "العدد"]);
    if (!competencyHeader || (!currentHeader && !context.scoreColumn)) throw new Error("يحتاج تحليل الاحتياجات التدريبية إلى حقل كفاية أو مهارة ومستوى حالي.");
    const current = currentHeader || context.scoreColumn;
    const inferredMax = Number.isFinite(context.maxScore) && context.maxScore > 0 ? context.maxScore : 5;
    const items = context.rows.map((row,index)=>{
      const competency=String(row[competencyHeader]||"").trim(); const currentValue=parseNumber(row[current]);
      if(!competency||!Number.isFinite(currentValue)) return null;
      const importance=Number.isFinite(parseNumber(row[importanceHeader]))?parseNumber(row[importanceHeader]):inferredMax;
      const target=Number.isFinite(parseNumber(row[targetHeader]))?parseNumber(row[targetHeader]):inferredMax;
      const beneficiaries=Number.isFinite(parseNumber(row[beneficiariesHeader]))?Math.max(1,parseNumber(row[beneficiariesHeader])):1;
      const gap=Math.max(0,target-currentValue); const priority=gap*Math.max(.1,importance)*Math.log2(beneficiaries+1);
      return {ref:`row:${index+1}`,competency,current:currentValue,target,importance,beneficiaries,gap:round(gap,2),priority:round(priority,2)};
    }).filter(Boolean);
    if(!items.length) throw new Error("لا توجد احتياجات تدريبية صالحة للتحليل.");
    const ranked=[...items].sort((a,b)=>b.priority-a.priority); const meanGap=mean(items.map(i=>i.gap)); const zeroGap=items.filter(i=>i.gap<=0).length;
    result.analysisProfile.dataSufficiency=importanceHeader&&targetHeader?"مرتفعة لترتيب الاحتياج":"متوسطة مع افتراضات معلنة";
    result.analysisProfile.dimensions=["الأهمية","المستوى الحالي","المستوى المستهدف","حجم الفجوة","عدد المستفيدين","أولوية التدخل"];
    result.analysisProfile.assumptions=[!importanceHeader?"اعتُبرت الأهمية عند الحد الأعلى لغياب حقل مستقل.":"",!targetHeader?"اعتُبر المستوى المستهدف هو أعلى المقياس لغياب هدف صريح.":""].filter(Boolean);
    result.analysisProfile.decisionUse=["بناء الخطة التدريبية","ترتيب البرامج","اختيار الفئة","تحديد أسلوب التدخل","قياس أثر التدريب"];
    result.metrics=[metric("competencyCount","عدد الكفايات",items.length,"كفاية","integer"),metric("meanTrainingGap","متوسط فجوة الكفاية",round(meanGap,2),"درجة"),metric("highPriorityNeeds","الاحتياجات عالية الأولوية",ranked.filter(i=>i.priority>=quantile(ranked.map(x=>x.priority),.75)).length,"احتياجًا","integer"),metric("noGapCount","كفايات بلا فجوة",zeroGap,"كفاية","integer")];
    result.charts=[chart("training-priority","bar","ترتيب الاحتياجات التدريبية","درجة أولوية مركبة من الفجوة والأهمية وحجم الفئة.",ranked,{xKey:"competency",yKey:"priority"}),chart("training-gap","bar","فجوة المستوى الحالي والمستهدف","حجم الفجوة في كل كفاية.",ranked,{xKey:"competency",yKey:"gap"}),chart("training-matrix","heatmap","مصفوفة الاحتياج التدريبي","مقارنة الأهمية والفجوة وعدد المستفيدين.",ranked.map(i=>({theme:i.competency,strengths:i.importance,development:i.gap,support:i.beneficiaries,recommendations:i.priority,alignment:round(i.current/inferredMax*100)})),{columns:["strengths","development","support","recommendations"]})];
    result.findings=[finding("أولوية تدريبية قصوى",`جاءت «${ranked[0].competency}» في المرتبة الأولى بدرجة أولوية ${ranked[0].priority} وفجوة ${ranked[0].gap}.`,"مرتفعة","تجمع الكفاية بين حجم فجوة وأهمية أو فئة مستفيدة أكبر.","تصميم تدخل مخصص للكفاية الأولى مع قياس قبلي وبعدي.","high",[ranked[0].ref]),finding("الفجوة ليست متساوية بين الكفايات",`بلغ متوسط الفجوة ${round(meanGap,2)}، مع ${zeroGap} كفايات بلا فجوة ظاهرة.`,"مرتفعة","تطبيق برنامج موحد يهدر الموارد على كفايات لا تحتاج المستوى نفسه من الدعم.","تقسيم الخطة إلى تدريب، توجيه، تعلم ذاتي، ومجتمع تعلم مهني بحسب طبيعة الفجوة.","medium",["metric:meanTrainingGap"])];
    result.qualityTools=[qualityTool("training-matrix","مصفوفة الأولوية التدريبية",true,"توجد كفايات ومستوى حالي وفجوات.",ranked,"ترتيب مركب لا يعتمد على الفجوة وحدها."),qualityTool("training-pareto","باريتو الاحتياجات",items.length>=4,"توجد احتياجات متعددة قابلة للترتيب.",ranked,"يحدد العدد القليل الأعلى أثرًا."),qualityTool("gap-analysis","تحليل فجوة الكفاية",true,"يوجد مستوى حالي ومستهدف صريح أو مفترض ومعلن.",items,`متوسط الفجوة ${round(meanGap,2)}.`),qualityTool("impact-evaluation","قياس أثر التدريب",true,"كل تدخل تدريبي يحتاج خط أساس ومستهدف وإعادة قياس.",{before:"اختبار أو ملاحظة قبلية",after:"تطبيق مماثل بعد التدريب"},"لا يعتمد النجاح على الحضور فقط.")];
    result.improvementPlan=ranked.slice(0,Math.min(5,ranked.length)).map((item,index)=>intervention(index<2?"عالية":"متوسطة",`فجوة كفاية: ${item.competency}`,`${item.beneficiaries} مستفيدًا أو الفئة المحددة`,`تنفيذ تدخل مناسب لطبيعة الكفاية: تدريب تطبيقي أو توجيه موقعي أو تعلم ذاتي، مع مهمة أداء قبلية وبعدية.`,`منسق التدريب ومالك المجال`,index<2?"خلال شهر":"خلال فصل دراسي",`خفض فجوة الكفاية بمقدار 50% على الأقل أو بلوغ المستوى المستهدف`,`مهمة أداء وملاحظة تطبيقية قبل/بعد`,`إذا لم يتحسن الأداء، تحويل التدخل من معرفة نظرية إلى تدريب موقعي ومتابعة فردية.`,[item.ref]));
    result.monitoringPlan=[{stage:"قياس قبلي",timing:"قبل التدريب",measure:"المستوى الحالي لكل كفاية",owner:"منسق التدريب"},{stage:"تطبيق ومساندة",timing:"أثناء البرنامج",measure:"أداء المهمة التطبيقية",owner:"المدرب ومالك المجال"},{stage:"قياس أثر",timing:"بعد 4 أسابيع",measure:"الفجوة المتبقية ونقل أثر التدريب",owner:"الإشراف والتقويم"}];
    result.limitations=["معادلة الأولوية تعتمد على صحة تقدير الأهمية والمستوى الحالي.","الحاجة التدريبية قد تعالج بالتوجيه أو تحسين الموارد لا بالتدريب وحده.","لا يكفي رضا المتدرب لإثبات انتقال أثر التدريب إلى الممارسة."];
    result.executiveTitle=`أولوية التدريب: ${ranked[0].competency}`; result.executiveSummary=`حلل النظام ${items.length} كفاية، بمتوسط فجوة ${round(meanGap,2)}. حددت الأولوية من الفجوة والأهمية وحجم الفئة بدل ترتيب الاحتياجات بالانطباع، ونتجت خطة تدخل وقياس أثر لكل كفاية عالية الأولوية.`;
    result.action={title:result.improvementPlan[0].action,text:`${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`,priority:result.improvementPlan[0].priority,indicator:result.improvementPlan[0].successIndicator}; result.evidenceMap=evidenceMapFromMetrics(result.metrics); return result;
  }

  function analyzeProgramEvaluation(context) {
    const result=createBase(context,"program_evaluation","تقويم البرامج والمبادرات عبر التنفيذ والمخرجات والنتائج والأثر والاستدامة");
    const itemHeader=findHeader(context.headers,["الهدف","المؤشر","النشاط","المخرج","البند","المجال"]);
    const implementationHeader=findHeader(context.headers,["نسبة التنفيذ","التنفيذ","الانجاز","نسبة الإنجاز"]);
    const outcomeHeader=findHeader(context.headers,["النتيجه","الاثر","التحقق","مستوى الأثر","الرضا"]);
    const targetHeader=findHeader(context.headers,["المستهدف","الهدف المستهدف","القيمة المستهدفة"]);
    if(!itemHeader) throw new Error("يحتاج تقويم البرنامج إلى حقل هدف أو مؤشر أو نشاط.");
    const numeric=numericColumns(context.headers,context.rows,.35); const fallback=numeric[0]?.header;
    const items=context.rows.map((row,index)=>{const label=String(row[itemHeader]||"").trim();if(!label)return null;const implementation=parseNumber(row[implementationHeader||fallback]);const outcome=parseNumber(row[outcomeHeader]);const target=parseNumber(row[targetHeader]);const base=Number.isFinite(target)&&target>0?target:100;return{ref:`row:${index+1}`,label,implementation:Number.isFinite(implementation)?implementation:NaN,outcome:Number.isFinite(outcome)?outcome:NaN,target:Number.isFinite(target)?target:base,achievement:Number.isFinite(outcome)?clamp(outcome/base*100,0,200):Number.isFinite(implementation)?clamp(implementation/base*100,0,200):NaN,gap:Number.isFinite(outcome)?Math.max(0,base-outcome):Number.isFinite(implementation)?Math.max(0,base-implementation):NaN};}).filter(i=>i&&Number.isFinite(i.achievement));
    if(!items.length) throw new Error("لا توجد مؤشرات رقمية صالحة لتقويم البرنامج.");
    const meanAchievement=mean(items.map(i=>i.achievement));const meanImplementation=mean(items.filter(i=>Number.isFinite(i.implementation)).map(i=>i.implementation));const meanOutcome=mean(items.filter(i=>Number.isFinite(i.outcome)).map(i=>i.outcome));const bottlenecks=[...items].sort((a,b)=>b.gap-a.gap);
    result.analysisProfile.dataSufficiency=implementationHeader&&outcomeHeader?"مرتفعة نسبيًا لتفريق التنفيذ عن الأثر":"متوسطة؛ قد تختلط نسبة التنفيذ بالنتيجة";
    result.analysisProfile.dimensions=["المدخلات","الأنشطة","نسبة التنفيذ","المخرجات","النتائج","الأثر","الاستدامة"];
    result.analysisProfile.decisionUse=["استمرار البرنامج أو تعديله","ترتيب الفجوات","تحسين التنفيذ","قياس الأثر","تحديد الاستدامة"];
    result.metrics=[metric("programItemCount","المؤشرات أو الأهداف",items.length,"عنصرًا","integer"),metric("programAchievement","متوسط تحقق النتائج",round(meanAchievement),"%","percent"),...(Number.isFinite(meanImplementation)?[metric("implementationPct","متوسط التنفيذ",round(meanImplementation),"%","percent")]:[]),...(Number.isFinite(meanOutcome)?[metric("outcomePct","متوسط الأثر أو النتيجة",round(meanOutcome),"%","percent")]:[]),metric("programGap","متوسط الفجوة",round(mean(items.map(i=>i.gap))),"نقطة")];
    result.charts=[chart("program-achievement","bar","تحقق أهداف البرنامج","نسبة تحقق كل هدف أو مؤشر.",items,{xKey:"label",yKey:"achievement",valueSuffix:"%"}),chart("program-gap","pareto","باريتو فجوات البرنامج","الأهداف الأعلى فجوة عن المستهدف.",bottlenecks,{xKey:"label",yKey:"gap"}),chart("program-logic","table","سلسلة التنفيذ والنتائج","مقارنة التنفيذ والنتيجة والمستهدف.",items.map(i=>({الهدف:i.label,التنفيذ:Number.isFinite(i.implementation)?round(i.implementation):"—",النتيجة:Number.isFinite(i.outcome)?round(i.outcome):"—",المستهدف:round(i.target),التحقق:`${round(i.achievement)}%`})))];
    const implementationOutcomeGap=Number.isFinite(meanImplementation)&&Number.isFinite(meanOutcome)?meanImplementation-meanOutcome:NaN;
    result.findings=[finding(meanAchievement>=80?"تحقق مرتفع لأهداف البرنامج":meanAchievement>=60?"تحقق جزئي يحتاج تحسينًا":"تحقق منخفض يستدعي إعادة تصميم",`بلغ متوسط تحقق الأهداف ${round(meanAchievement)}%.`,"مرتفعة","يوضح مستوى بلوغ المستهدفات ولا يثبت وحده جودة الأثر أو استدامته.","تركيز التحسين على الأهداف الأعلى فجوة مع مراجعة منطق التدخل.",meanAchievement<60?"high":"medium",["metric:programAchievement"]),...(Number.isFinite(implementationOutcomeGap)?[finding(Math.abs(implementationOutcomeGap)>15?"فجوة بين التنفيذ والأثر":"تقارب نسبي بين التنفيذ والنتيجة",`بلغ الفرق بين متوسط التنفيذ والنتيجة ${round(implementationOutcomeGap)} نقطة.`,"متوسطة","ارتفاع التنفيذ دون أثر مماثل قد يشير إلى مشكلة في جودة النشاط أو افتراضات البرنامج.","مراجعة سلسلة المدخلات-الأنشطة-المخرجات-النتائج لكل هدف.",Math.abs(implementationOutcomeGap)>15?"high":"low",["metric:implementationPct","metric:outcomePct"])]:[])];
    result.qualityTools=[qualityTool("logic-model","نموذج المنطق للبرنامج",true,"التقويم يحتاج فصل المدخلات والأنشطة والمخرجات والنتائج والأثر.",items,"يمنع مساواة تنفيذ النشاط بتحقق الأثر."),qualityTool("program-gap","تحليل فجوة الأهداف",true,"توجد نتائج ومستهدفات صريحة أو معيارية.",bottlenecks,`متوسط الفجوة ${round(mean(items.map(i=>i.gap)))}.`),qualityTool("pdca","دورة PDCA",true,"توجد خطة تنفيذ ونتائج تحتاج متابعة وتعديل.",{plan:"تحديد الأهداف والفجوات",do:"تنفيذ التدخل",check:"قياس النتائج والأثر",act:"تعديل أو تثبيت الممارسة"},"تربط التقويم بالتحسين المستمر."),qualityTool("sustainability","فحص الاستدامة",false,"يحتاج بيانات عن استمرار الأثر والموارد بعد انتهاء البرنامج.",null,"تظهر كبيانات مطلوبة لا كحكم مفترض.")];
    result.improvementPlan=bottlenecks.slice(0,Math.min(4,bottlenecks.length)).map((item,index)=>intervention(index<2?"عالية":"متوسطة",`فجوة هدف: ${item.label}`,"المستفيدون من الهدف أو النشاط","مراجعة نظرية التغيير والأنشطة المرتبطة بالهدف، ثم تعديل التنفيذ أو المؤشر وجمع دليل أثر مباشر.","قائد البرنامج ومالك المؤشر",index<2?"دورة تحسين قصيرة 2-4 أسابيع":"الفترة القادمة",`خفض الفجوة بمقدار 50% أو بلوغ 80% من المستهدف`,`قياس المخرج والنتيجة قبل/بعد مع توثيق المستفيدين`,`إذا استمر ضعف الأثر رغم التنفيذ، إعادة تصميم النشاط أو إيقافه واستبداله ببديل أقوى دليلًا.`,[item.ref]));
    result.monitoringPlan=[{stage:"خط أساس",timing:"قبل دورة التحسين",measure:"التنفيذ والنتيجة لكل هدف",owner:"فريق البرنامج"},{stage:"مراجعة تنفيذ",timing:"منتصف الدورة",measure:"جودة النشاط ومعدل الوصول للمستفيدين",owner:"قائد البرنامج"},{stage:"قياس أثر",timing:"نهاية الدورة وبعدها",measure:"النتيجة والاستدامة",owner:"التقويم والجودة"}];
    result.limitations=["نسبة تنفيذ الأنشطة لا تساوي أثر البرنامج.","التحليل السببي يحتاج تصميمًا تقويميًا أقوى ومجموعة مقارنة أو بيانات قبل/بعد.","الاستدامة لا تقاس من تقرير فترة واحدة."];
    result.executiveTitle=meanAchievement>=80?"برنامج يحقق أهدافه مع فرص استدامة":"برنامج يحتاج دورة تحسين موجهة بالفجوات";result.executiveSummary=`حلل النظام ${items.length} هدفًا أو مؤشرًا، وبلغ متوسط التحقق ${round(meanAchievement)}%. رُتبت الفجوات وربطت بخطة PDCA، مع فصل التنفيذ عن الأثر حتى لا يتحول اكتمال الأنشطة إلى نجاح وهمي.`;result.action={title:result.improvementPlan[0].action,text:`${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`,priority:result.improvementPlan[0].priority,indicator:result.improvementPlan[0].successIndicator};result.evidenceMap=evidenceMapFromMetrics(result.metrics);return result;
  }

  function analyzeBehaviorAttendance(context) {
    const result=createBase(context,"behavior_attendance","تحليل السلوك والغياب والاتجاهات الزمنية والحالات المتكررة ومؤشرات الإنذار المبكر");
    const categoryHeader=findHeader(context.headers,["السلوك","نوع الحاله","المخالفه","سبب الغياب","الفئه","الحاله"]);
    const personHeader=findHeader(context.headers,["اسم الطالب","الطالب","الحاله الفرديه","الرقم"]);
    const dateHeader=findHeader(context.headers,["التاريخ","اليوم","الشهر","الفتره"]);
    const countHeader=findHeader(context.headers,["العدد","التكرار","ايام الغياب","المرات"]);
    if(!categoryHeader&&!dateHeader) throw new Error("يحتاج تحليل السلوك أو الغياب إلى نوع حالة أو تاريخ أو تكرار.");
    const records=context.rows.map((row,index)=>{const category=String(row[categoryHeader]||"غير مصنف").trim()||"غير مصنف";const person=String(row[personHeader]||"").trim();const date=String(row[dateHeader]||"").trim();const count=Number.isFinite(parseNumber(row[countHeader]))?Math.max(0,parseNumber(row[countHeader])):1;return{ref:`row:${index+1}`,category,person,date,count};}).filter(r=>r.category||r.date);
    const byCategory=frequency(records.flatMap(r=>Array.from({length:Math.min(200,Math.round(r.count))},()=>r.category))).slice(0,15);
    const personMap=new Map();records.forEach(r=>{if(r.person)personMap.set(r.person,(personMap.get(r.person)||0)+r.count)});const highRisk=[...personMap.entries()].map(([person,count])=>({person,count})).sort((a,b)=>b.count-a.count);
    const dateMap=new Map();records.forEach(r=>{if(r.date)dateMap.set(r.date,(dateMap.get(r.date)||0)+r.count)});const trend=[...dateMap.entries()].map(([date,count])=>({date,count}));
    const total=sum(records.map(r=>r.count));const repeatCases=highRisk.filter(i=>i.count>=3).length;const topCategory=byCategory[0];
    result.analysisProfile.dataSufficiency=records.length>=30?"مرتفعة لوصف التكرار":"متوسطة";result.analysisProfile.dimensions=["نوع الحالة","التكرار","الحالات الفردية المتكررة","الاتجاه الزمني","التركيز حسب الفئة","الإنذار المبكر"];result.analysisProfile.assumptions=["التكرار لا يحدد السبب الجذري دون بيانات سياقية."];result.analysisProfile.decisionUse=["تحديد الأولويات الوقائية","اختيار الحالات للمتابعة","جدولة التدخل","قياس أثر الإجراءات"];
    result.metrics=[metric("incidentCount","إجمالي الحالات أو الأيام",total,"حالة","integer"),metric("categoryCount","عدد الفئات",byCategory.length,"فئة","integer"),metric("repeatCases","حالات متكررة",repeatCases,"حالة بثلاث مرات فأكثر","integer"),metric("topCategoryCount","تكرار الفئة الأعلى",topCategory?.count||0,topCategory?.label||"غير محددة","integer")];
    result.charts=[chart("behavior-pareto","pareto","باريتو أنواع الحالات","الفئات الأعلى إسهامًا في إجمالي الحالات.",byCategory,{xKey:"label",yKey:"count"}),...(trend.length>=3?[chart("behavior-trend","line","الاتجاه الزمني للحالات","تغير عدد الحالات عبر الفترات المسجلة.",trend,{xKey:"date",yKey:"count"})]:[]),...(highRisk.length?[chart("behavior-risk","bar","الحالات الفردية الأعلى تكرارًا","ترتيب الحالات المتكررة مع إخفاء الأسماء في التقارير العامة.",highRisk.slice(0,12).map((i,index)=>({label:`حالة ${index+1}`,count:i.count})),{xKey:"label",yKey:"count"})]:[])];
    result.findings=[finding("تركيز الحالات في فئة محددة",`تمثل «${topCategory?.label||"غير محددة"}» أعلى فئة بعدد ${topCategory?.count||0} من أصل ${total}.`,"مرتفعة","تركيز المشكلة يسمح بتدخل وقائي محدد بدل حملة عامة.","تحليل السياق الزمني والمكاني للفئة الأعلى وبناء إجراء وقائي موجه.","medium",["metric:topCategoryCount"]),...(repeatCases?[finding("حالات متكررة تحتاج متابعة فردية",`ظهرت ${repeatCases} حالات بثلاث مرات أو أكثر.`,"مرتفعة","التكرار مؤشر إنذار مبكر وليس تشخيصًا للسبب.","إنشاء مسار متابعة فردي يجمع التحصيل والحضور والسلوك والتواصل الأسري وفق الصلاحيات.","high",["metric:repeatCases"])]:[])];
    result.qualityTools=[qualityTool("behavior-pareto","باريتو الحالات",true,"توجد فئات وتكرارات.",byCategory,"يركز الوقاية على الفئات الأعلى تكرارًا."),qualityTool("trend","مخطط الاتجاه",trend.length>=3,"يتطلب ثلاث فترات زمنية مرتبة على الأقل.",trend,"يكشف التزايد أو الانخفاض بعد التدخل."),qualityTool("risk-matrix","مصفوفة الإنذار المبكر",highRisk.length>0,"توجد حالات فردية متكررة.",highRisk,"تجمع التكرار والشدة والسياق عند توفرها."),qualityTool("root-cause","تحليل السبب الجذري",false,"التكرار وحده لا يثبت السبب؛ يلزم سياق صفّي وأسري وتحصيلي.",null,"يعرض كفرضيات تحتاج تحققًا لا كحقيقة.")];
    result.improvementPlan=[intervention("عالية",`الفئة الأكثر تكرارًا: ${topCategory?.label||"غير محددة"}`,"الفئة أو الوقت المرتبط بالحالات","تنفيذ تدخل وقائي محدد وجمع بيانات سياقية قبل وبعد، مع إشراك الأطراف ذات الصلة دون وصم الأفراد.","فريق الانضباط والدعم", "أسبوعان",`انخفاض تكرار الفئة الأعلى 20% على الأقل`,`مقارنة أسبوعية وتوثيق نوع الحالة والسياق`,`إذا لم ينخفض المؤشر، تحليل السبب الجذري ومراجعة ملاءمة الإجراء.`,[]),...(repeatCases?[intervention("عالية","تكرار فردي مرتفع","الحالات المتكررة","إعداد خطة متابعة فردية متعددة المصادر تتضمن هدفًا قصيرًا ومؤشرًا أسبوعيًا وتواصلًا منضبطًا.","الأخصائي والمعلم والإدارة","4 أسابيع","انخفاض التكرار وتحسن مؤشر المتابعة المتفق عليه","سجل متابعة أسبوعي","إحالة الحالة إلى فريق مختص وفق الإجراءات عند استمرار الخطر.",[])]:[])];
    result.monitoringPlan=[{stage:"خط أساس",timing:"الآن",measure:"تكرار الفئات والحالات",owner:"فريق الانضباط"},{stage:"متابعة أسبوعية",timing:"أسبوعيًا",measure:"الاتجاه والحالات الجديدة والمتكررة",owner:"الأخصائي"},{stage:"تقييم التدخل",timing:"بعد شهر",measure:"التغير ونسبة الاستجابة",owner:"الإدارة وفريق الدعم"}];
    result.limitations=["التكرار لا يثبت السبب الجذري.","ينبغي إخفاء الهوية في التقارير العامة وقصر التفاصيل الفردية على الصلاحيات.","تحتاج مقارنة الزمن إلى توحيد فترات التسجيل وحجم المجتمع المعرض."];
    result.executiveTitle=repeatCases?"مؤشرات إنذار مبكر تتطلب تدخلًا موجهًا":"نمط حالات قابل للمعالجة الوقائية";result.executiveSummary=`حلل النظام ${total} حالة ضمن ${byCategory.length} فئات، وحدد «${topCategory?.label||"غير محددة"}» كأعلى فئة و${repeatCases} حالات متكررة. بُنيت الخطة على باريتو والاتجاه والإنذار المبكر دون ادعاء أسباب غير مدعومة.`;result.action={title:result.improvementPlan[0].action,text:`${result.improvementPlan[0].responsibleRole} - ${result.improvementPlan[0].timeframe}`,priority:result.improvementPlan[0].priority,indicator:result.improvementPlan[0].successIndicator};result.evidenceMap=evidenceMapFromMetrics(result.metrics);return result;
  }

  function analyzeGeneric(context) {
    const result = createBase(context, "adaptive_generic", "تحليل تكيفي لنوع جديد يبني خطة من بنية الحقول بدل فرض قالب موحد");
    const nums = numericColumns(context.headers, context.rows, 0.3);
    const textColumns = context.headers.filter(header => !nums.some(column => column.header === header));
    const categorical = textColumns.map(header => ({ header, values: frequency(context.rows.map(row => row[header])).slice(0, 12) })).filter(item => item.values.length);
    const dateHeaders = context.headers.filter(header => /تاريخ|يوم|شهر|فتره|زمن|date|time/i.test(normalize(header)));
    const targetHeader = findHeader(context.headers, ["المستهدف", "الهدف", "القيمه المستهدفه"]);
    const currentHeader = findHeader(context.headers, ["الحالي", "النتيجه", "الفعلي", "نسبه التنفيذ", "الدرجه"]);
    const beforeHeader = findHeader(context.headers, ["قبلي", "قبل", "البدايه"]);
    const afterHeader = findHeader(context.headers, ["بعدي", "بعد", "النهايه"]);
    const itemHeader = findHeader(context.headers, ["البند", "المؤشر", "المجال", "الهدف", "النشاط", "الحاله", "الفئه"]);
    const rows = context.rows.length;

    result.analysisProfile.dataSufficiency = rows >= 30 ? "مرتفعة للوصف البنيوي" : rows >= 10 ? "متوسطة" : "محدودة";
    result.analysisProfile.dimensions = ["جودة البيانات", "التوزيعات الرقمية", "الفئات المتكررة", ...(dateHeaders.length ? ["الاتجاه الزمني"] : []), ...(targetHeader && currentHeader ? ["الفجوة عن المستهدف"] : []), ...(beforeHeader && afterHeader ? ["التغير قبل/بعد"] : []), "خطة اعتماد النوع"];
    result.analysisProfile.assumptions = ["نوع النموذج جديد؛ يظل معنى المؤشرات وقراراتها بحاجة إلى اعتماد المستخدم وGemini."];
    result.analysisProfile.decisionUse = ["فهم بنية النموذج", "اختيار أدوات الجودة المشروطة", "بناء عقد نوع جديد", "تحديد البيانات الناقصة", "إنتاج تحليل أولي قابل للمراجعة"];
    result.metrics = [
      metric("rowCount", "عدد السجلات", rows, "سجلًا", "integer"),
      metric("columnCount", "عدد الحقول", context.headers.length, "حقلًا", "integer"),
      metric("numericColumnCount", "الحقول الرقمية", nums.length, "حقلًا", "integer"),
      metric("categoricalColumnCount", "الحقول الفئوية أو النصية", categorical.length, "حقلًا", "integer"),
      metric("dateColumnCount", "الحقول الزمنية", dateHeaders.length, "حقلًا", "integer")
    ];
    result.charts = nums.slice(0, 3).map((column, index) => chart(`adaptive-num-${index}`, "bar", `توزيع ${column.header}`, "توزيع القيم الرقمية بعد فحص صلاحيتها.", buildHistogram(column.values, null, 8), { xKey: "label", yKey: "count" }));
    categorical.slice(0, 2).forEach((column, index) => result.charts.push(chart(`adaptive-cat-${index}`, "bar", `الفئات الأكثر تكرارًا في ${column.header}`, "ترتيب الفئات بحسب التكرار.", column.values, { xKey: "label", yKey: "count" })));

    if (targetHeader && currentHeader) {
      const gapRows = context.rows.map((row, index) => { const target=parseNumber(row[targetHeader]), current=parseNumber(row[currentHeader]); if(!Number.isFinite(target)||!Number.isFinite(current)) return null; return { ref:`row:${index+1}`, label:String(row[itemHeader]||`سجل ${index+1}`), current, target, gap:Math.max(0,target-current) }; }).filter(Boolean);
      if (gapRows.length) {
        result.charts.push(chart("adaptive-gap","pareto","فجوة القيم الحالية عن المستهدف","ترتيب الفجوات المكتشفة في النموذج الجديد.",gapRows.sort((a,b)=>b.gap-a.gap),{xKey:"label",yKey:"gap"}));
        result.metrics.push(metric("adaptiveMeanGap","متوسط الفجوة",round(mean(gapRows.map(i=>i.gap)),2),"وحدة"));
        result.qualityTools.push(qualityTool("adaptive-gap","تحليل الفجوة",true,"اكتُشف حقل حالي وحقل مستهدف.",gapRows,"أداة صالحة لهذا النموذج الجديد بعد تأكيد معنى الحقول."));
      }
    }
    if (beforeHeader && afterHeader) {
      const pairs=context.rows.map((row,index)=>{const before=parseNumber(row[beforeHeader]),after=parseNumber(row[afterHeader]);if(!Number.isFinite(before)||!Number.isFinite(after))return null;return{ref:`row:${index+1}`,label:String(row[itemHeader]||`سجل ${index+1}`),before,after,change:after-before};}).filter(Boolean);
      if(pairs.length){result.charts.push(chart("adaptive-before-after","bar","التغير قبل وبعد","الفارق بين القياسين لكل عنصر.",pairs,{xKey:"label",yKey:"change"}));result.metrics.push(metric("adaptiveMeanChange","متوسط التغير",round(mean(pairs.map(i=>i.change)),2),"وحدة"));result.qualityTools.push(qualityTool("before-after","مقارنة قبل/بعد",true,"اكتُشف قياسان قبلي وبعدي.",pairs,"يقيس التغير ولا يثبت أن التدخل وحده سببه."));}
    }
    if (dateHeaders.length && nums.length) result.qualityTools.push(qualityTool("trend","تحليل الاتجاه الزمني",true,"اكتُشف حقل زمني وحقول رقمية.",null,"يطبق بعد تأكيد ترتيب الفترات ووحدة القياس."));
    if (categorical.length) result.qualityTools.push(qualityTool("pareto-categories","باريتو الفئات",categorical[0].values.length>=3,"توجد فئات متكررة قابلة للترتيب.",categorical[0].values,"يحدد الفئات الأعلى إسهامًا."));
    result.qualityTools.push(qualityTool("profiling","ملف تعريف البيانات",true,"أي نوع جديد يحتاج فهم الحقول والقيم قبل التفسير.",{numeric:nums.map(item=>({header:item.header,count:item.values.length,mean:round(mean(item.values)),min:item.values.length?Math.min(...item.values):null,max:item.values.length?Math.max(...item.values):null})),categorical},"أساس للعقد التحليلي الديناميكي."));

    result.findings = [
      finding("بنية تحليلية قابلة للتكيّف", `يحتوي النموذج ${rows} سجلًا و${context.headers.length} حقول، منها ${nums.length} رقمية و${categorical.length} فئوية و${dateHeaders.length} زمنية.`, "مرتفعة", "يمكن اختيار وحدات التحليل والأدوات من طبيعة الحقول بدل إجبار النموذج على محرك معروف.", "اعتماد الغرض التربوي ووحدة التحليل ثم حفظ عقد النوع الجديد.", "medium", ["metric:rowCount", "metric:columnCount"]),
      finding("التحليل المتاح مرتبط بدلالات الحقول", `اكتشف المحرك ${result.qualityTools.filter(tool=>tool.conditionsMet!==false).length} أدوات منطبقة مبدئيًا.`, "متوسطة", "صلاحية الأداة الحسابية لا تعني صحة التفسير التربوي قبل تأكيد معنى الحقول والمعيار.", "استخدام Gemini لتفسير السياق ثم مراجعة المستخدم قبل اعتماد التقرير النهائي.", "high", ["metric:numericColumnCount", "metric:categoricalColumnCount"])
    ];
    const topCategory = categorical[0]?.values?.[0];
    if(topCategory) result.findings.push(finding("تركيز في فئة متكررة", `الفئة «${topCategory.label}» هي الأعلى تكرارًا بعدد ${topCategory.count}.`, "مرتفعة", "قد تمثل أولوية أو مجرد حجم طبيعي للفئة؛ يحتاج الأمر إلى معيار وسياق.", "مقارنة النسبة بحجم المجتمع أو المستهدف قبل اتخاذ قرار.", "medium", []));
    result.improvementPlan = [
      intervention("عالية", "اعتماد عقد النوع الجديد", "مالك النموذج والمختص التربوي", "تحديد الهدف ووحدة التحليل والمعيار والقرارات المطلوبة، ثم اعتماد خطة Gemini والأدوات الحتمية المنطبقة.", "مالك النظام والمختص التربوي", "جلسة إعداد واحدة", "حفظ عقد نوع قابل لإعادة الاستخدام وإنتاج تقرير متسق على ثلاث عينات", "مراجعة نتائج ثلاث ملفات من النوع نفسه", "تعديل تعريف الحقول أو الأدوات عند عدم اتساق النتائج.", []),
      intervention("متوسطة", "استكمال البيانات الناقصة للتحليل", "الجهة المالكة للبيانات", "إضافة المستهدف أو الزمن أو الفئة أو المؤشرات النوعية التي يطلبها التحليل المتخصص.", "مالك البيانات", "قبل الاعتماد النهائي", "ارتفاع كفاية البيانات إلى مستوى يسمح بالقرار المطلوب", "قائمة تحقق حقول إلزامية واختيارية", "خفض نطاق الاستنتاج إذا تعذر توفير البيانات.", [])
    ];
    result.monitoringPlan = [{ stage: "اعتماد النوع", timing: "قبل التقرير النهائي", measure: "صحة الهدف ووحدة التحليل والأدوات", owner: "المستخدم المختص" }, { stage: "اختبار العقد", timing: "على 3 ملفات", measure: "اتساق النتائج وعدم فرض استنتاجات غير مناسبة", owner: "فريق تقارير" }];
    result.limitations = ["النوع الجديد لا يملك بعد معيارًا مؤسسيًا محفوظًا.", "التفسير التربوي النهائي يحتاج اعتماد معنى الحقول والغرض.", "الأدوات المكتشفة تطبق فقط عند تحقق شروطها ولا تُستخدم للزينة."];
    result.executiveTitle = "تحليل تكيفي لنوع جديد";
    result.executiveSummary = `بنى المحرك ملفًا تحليليًا من بنية ${context.headers.length} حقلًا دون فرض قالب نتائج أو إشراف أو استبانة. طُبقت الأدوات التي تحققت شروطها، ويستكمل Gemini تفسير السياق وإنشاء عقد خاص بالنوع قبل الاعتماد النهائي.`;
    result.action = { title: result.improvementPlan[0].action, text: result.improvementPlan[0].timeframe, priority: "عالية", indicator: result.improvementPlan[0].successIndicator };
    result.evidenceMap = evidenceMapFromMetrics(result.metrics);
    return result;
  }

  function deriveDiagnosticSections(result) {
    const high = "مرتفعة";
    const medium = "متوسطة";
    const refs = (...values) => values.filter(Boolean);
    if (result.kind === "scores") {
      return [
        {
          title: "جودة القياس وحدود الاستدلال",
          analysis: `استند التحليل إلى ${result.n} درجة صالحة. ${result.hasMax ? `اعتمدت الدرجة الكلية ${round(result.maxScore)} وحد الإتقان ${round(result.thresholdPct)}%.` : "لم تُعتمد درجة كلية؛ لذلك تبقى قراءة الإتقان غير نهائية."} الدرجات الإجمالية تسمح بتقدير حجم التعثر والتفاوت، لكنها لا تحدد المهارة أو المفهوم المسؤول عنه.`,
          evidenceRefs: refs("metric:n", result.hasMax ? "metric:masteryPct" : ""),
          confidence: high,
          implications: ["اعتماد النتائج للتحليل الوصفي والتجزئة العلاجية.", "جمع بيانات الأسئلة أو المهارات قبل تشخيص المحتوى المسبب للضعف."]
        },
        {
          title: "مركز التوزيع والتشتت",
          analysis: `بلغ المتوسط ${round(result.mean)} والوسيط ${round(result.med)}، والانحراف المعياري ${round(result.sd)}. امتدت الدرجات من ${round(result.min)} إلى ${round(result.max)}، وبلغ المدى الربيعي ${round(result.iqr)}. القراءة المشتركة لهذه المؤشرات تمنع اختزال المجموعة في المتوسط وحده.`,
          evidenceRefs: refs("metric:mean", "metric:median", "metric:sd", "metric:q1", "metric:q3"),
          confidence: high,
          implications: ["تحديد ما إذا كان التدخل الجماعي كافيًا أو يلزم تمايزه.", "استخدام الربيعات لفصل الفئات العلاجية والإثرائية."]
        },
        {
          title: "الإتقان وفئات التدخل",
          analysis: result.hasMax ? `بلغ الإتقان ${round(result.masteryPct)}%. قُسمت الحالات إلى فئات إثراء وإتقان وقرب من الإتقان وتعثر متوسط وتعثر شديد، بحيث يرتبط كل مستوى بنوع تدخل مختلف وموعد إعادة قياس.` : "لا يمكن بناء فئات تدخل مرتبطة بالإتقان قبل اعتماد الدرجة الكلية، لكن يمكن مؤقتًا استخدام الربيعات والمئينات لتحديد الحالات الطرفية.",
          evidenceRefs: refs(result.hasMax ? "metric:masteryPct" : "metric:q1", "metric:n"),
          confidence: result.hasMax ? high : medium,
          implications: ["تجنب برنامج علاجي واحد لجميع الطلبة.", "ربط انتقال الطالب بين الفئات بمؤشر نجاح زمني."]
        },
        {
          title: "استقرار الحكم والقيم المتطرفة",
          analysis: `بلغ معامل الالتواء ${round(result.skewness, 2)} ومعامل الاختلاف ${round(result.cv)}%. اكتُشفت ${result.outliers?.count || 0} قيمة متطرفة وفق قاعدة المدى الربيعي. تحليل الحساسية يوضح مقدار تغير الإتقان عند تغيير الحد المعتمد، فلا يُبنى القرار على نسبة منفردة بلا سياق.`,
          evidenceRefs: refs("metric:skewness", "metric:cv", "metric:outlierCount"),
          confidence: high,
          implications: ["مراجعة الحالات المتطرفة في السجل الأصلي.", "تثبيت حد الإتقان مؤسسيًا قبل المقارنات الزمنية."]
        }
      ];
    }
    if (result.kind === "levels") {
      const worst = Array.isArray(result.groups) && result.groups.length ? result.groups.map(group => ({ group: group.group, low: Number(group.percentages?.["د"] || 0) + Number(group.percentages?.["هـ"] || 0) })).sort((a,b)=>b.low-a.low)[0] : null;
      return [
        { title: "بنية توزيع مستويات الأداء", analysis: `يشمل التوزيع ${result.total} طالبًا. بلغت المستويات العليا أ وب ${round(result.highPct)}%، بينما بلغت المستويات الدنيا د وهـ ${round(result.lowPct)}%. يصف هذا موضع الكتلة الرئيسة في التوزيع ولا يشرح أسبابها.`, evidenceRefs: refs("metric:total", "metric:highPct", "metric:lowPct"), confidence: high, implications: ["تحديد حجم التدخل الجماعي مقابل الفردي.", "متابعة انتقال الطلبة بين المستويات في القياس اللاحق."] },
        { title: "المقارنة بين الصفوف أو الشعب", analysis: worst ? `أعلى أولوية وصفية ظهرت في «${worst.group}» بنسبة مستويات دنيا تقارب ${round(worst.low)}%. لا يجوز نسبة الفجوة إلى المعلم أو الطلبة قبل فحص تكافؤ الأداة والحضور والظروف الصفية.` : "لا توجد مجموعات متعددة كافية لإجراء مقارنة داخلية موثوقة.", evidenceRefs: refs("metric:groupCount", "metric:lowPct"), confidence: worst ? high : medium, implications: ["توجيه الموارد حسب شدة الاحتياج.", "جمع بيانات تفسيرية قبل الحكم السببي."] },
        { title: "فجوة الانتقال وأولوية التدخل", analysis: `يركز القرار على خفض نسبة د وهـ ورفع الانتقال إلى ج ثم ب وأ، بدل الاكتفاء بمقارنة متوسط عام. لذلك تُبنى الخطة على خط أساس ومستهدف زمني ومصفوفة انتقال في إعادة القياس.`, evidenceRefs: refs("metric:lowPct", "metric:highPct"), confidence: high, implications: ["إنشاء كشف انتقال مستوى لكل طالب.", "ربط الخطة ببيانات المهارات أو الأسئلة لتحديد المحتوى."] }
      ];
    }
    if (result.kind === "cross_subject") {
      const strongest = result.subjects?.[0];
      const weakest = result.subjects?.at?.(-1) || result.subjects?.[result.subjects.length - 1];
      return [
        { title: "الخريطة الأكاديمية عبر المواد", analysis: `قورنت ${result.subjects?.length || 0} مواد على مستوى الملفات نفسها. ${strongest && weakest ? `ظهر أعلى متوسط في «${strongest.subject}» وأدنى متوسط في «${weakest.subject}».` : "تعذر تحديد طرفي المقارنة."} المقارنة تصف الفجوة ولا تفسر سببها.`, evidenceRefs: refs("metric:subjectGap", "metric:weakestSubjectMean"), confidence: high, implications: ["تحديد مواد الأولوية.", "تحويل الدرجات إلى نسب إذا اختلفت الدرجات الكلية."] },
        { title: "التعثر الشامل والتخصصي", analysis: `يميز التحليل بين الطالب المنخفض في غالبية المواد والطالب الذي يتركز ضعفه في مادة أو مادتين. هذا الفصل يمنع إدخال جميع الحالات في برنامج دعم واحد لا يناسب طبيعتها.`, evidenceRefs: refs("metric:comprehensiveRisk", "metric:specializedRisk"), confidence: high, implications: ["خطة متعددة التخصصات للتعثر الشامل.", "دعم مادة محددة للتعثر التخصصي."] },
        { title: "العلاقات الوصفية بين المواد", analysis: `تفحص معاملات الارتباط تزامن الحركة بين المواد لاستكشاف مهارات مشتركة محتملة. الارتباط لا يثبت أن مادة تسبب أداء مادة أخرى، لذلك يستخدم لتوليد سؤال تشخيصي لا حكم نهائي.`, evidenceRefs: [], confidence: medium, implications: ["فحص القراءة واللغة والمهارات الرياضية المشتركة.", "عدم تحويل الارتباط إلى سببية."] }
      ];
    }
    if (result.kind === "supervision_indicator" || result.kind === "student_work") {
      const best = result.domains?.[0];
      const weakest = result.domains?.at?.(-1) || result.domains?.[result.domains.length - 1];
      const label = result.kind === "student_work" ? "أعمال الطلبة" : "الأداء الإشرافي";
      return [
        { title: `الصورة الكلية لـ${label}`, analysis: `بلغ المستوى الكلي المعياري ${round(result.overallPct)}%. جُمعت البنود في مجالات مترابطة بدل قراءتها كقائمة منفصلة، وبذلك يمكن تحديد المجال الأقوى والفجوة ذات الأولوية.`, evidenceRefs: refs("metric:overallPct"), confidence: high, implications: ["توجيه الخطة إلى المجال لا إلى العبارة المنفردة فقط.", "الحفاظ على الممارسات القوية ونقل أثرها."] },
        { title: "الفجوة بين المجالات", analysis: best && weakest ? `ظهر المجال الأقوى «${best.domain}» بمتوسط ${round(best.mean)}%، والأقل «${weakest.domain}» بمتوسط ${round(weakest.mean)}%. الفارق يساعد في ترتيب الأولوية، لكنه يحتاج مراجعة عدد البنود وملاءمة المقياس.` : "لم تتوفر مجالات كافية للمقارنة.", evidenceRefs: refs("metric:overallPct", "metric:domainGap"), confidence: high, implications: ["بناء خطة تحسين على المجال الأقل.", "عدم مساواة المجالات إذا اختلف عدد البنود أو وزنها."] },
        { title: "الأولوية وباريتو الفجوات", analysis: `رُتبت البنود بحسب حجم الفجوة، ثم حُسب إسهام كل بند في مجموع الفجوات. يتيح ذلك توجيه الجهد إلى العدد القليل من البنود الأعلى أثرًا بدل توزيع التدخل بالتساوي.`, evidenceRefs: refs("metric:priorityCount"), confidence: high, implications: ["اختيار أولويات محدودة قابلة للتنفيذ.", "إعادة القياس على البنود نفسها بعد التدخل."] },
        { title: "اتساق المتوسط والمنوال", analysis: Number.isFinite(result.meanModeGap) ? `بلغ متوسط الفارق بين المتوسط والمنوال ${round(result.meanModeGap)}؛ واتساعه قد يشير إلى تباين الاستجابات أو عدم استقرار الحكم في بعض البنود.` : "لا يتوفر منوال رقمي صالح للمقارنة مع المتوسط.", evidenceRefs: refs("metric:meanModeGap"), confidence: Number.isFinite(result.meanModeGap) ? medium : "منخفضة", implications: ["مراجعة البنود ذات الفارق المرتفع.", "عدم اعتماد المتوسط وحده عندما تتباين الاستجابات."] }
      ];
    }
    if (result.kind === "narrative") {
      return [
        { title: "قوة الأدلة وقابلية التتبع", analysis: `حلل النظام ${result.sentenceCount || 0} جملة. بلغت الأدلة القوية ${round(result.evidenceRatio)}% تقريبًا من الجمل المحللة، مع فصل الحكم العام عن الدليل المشاهد والأثر على التعلم.`, evidenceRefs: refs("metric:sentenceCount", "metric:strongEvidencePct"), confidence: medium, implications: ["تعزيز صياغة ممارسة محددة + دليل + أثر.", "مراجعة الأحكام المرتفعة التي لا يرافقها دليل قابل للتتبع."] },
        { title: "اتساق الإجادة والتطوير والدعم", analysis: `بلغ مؤشر الاتساق بين جوانب التطوير والدعم والتوصيات ${round(result.alignmentThemes?.length ? mean(result.alignmentThemes.map(item=>item.alignment)) : 0)}%. يكشف هذا ما إذا كان كل تشخيص قد حصل على استجابة إشرافية مقابلة أم بقي مجرد ملاحظة.` , evidenceRefs: refs("metric:alignmentPct"), confidence: medium, implications: ["ربط كل جانب تطوير بدعم وتوصية ومؤشر متابعة.", "إسقاط التوصيات غير المرتبطة بتشخيص واضح."] },
        { title: "التكرار والتناقض وجودة التوثيق", analysis: `اكتُشف ${result.duplicates?.length || 0} تكرار محتمل، و${result.contradictions?.length || 0} تعارض، و${result.dateAnomalies?.length || 0} مشكلة تاريخية. هذه المؤشرات لا تثبت خطأ المحتوى تلقائيًا، لكنها تحدد مواضع التدقيق قبل الاعتماد.`, evidenceRefs: refs("metric:duplicationPct", "metric:contradictionCount", "metric:dateAnomalies"), confidence: high, implications: ["دمج التكرارات والإبقاء على الدليل الأقوى.", "تصحيح التواريخ والتعارضات قبل إصدار التقرير النهائي."] },
        { title: "قابلية التوصيات للتنفيذ", analysis: `بلغت التوصيات القابلة للقياس ${round(result.recommendationCount ? (result.actionLevels?.[0]?.count || 0) / result.recommendationCount * 100 : 0)}%. تُعد التوصية تنفيذية عندما تحدد الإجراء والفئة والزمن والمسؤول ومؤشر النجاح وطريقة المتابعة.`, evidenceRefs: refs("metric:actionablePct"), confidence: medium, implications: ["تحويل التوصيات العامة إلى خطة قابلة للتتبع.", "إضافة بديل عند عدم تحقق التحسن."] }
      ];
    }
    if (result.kind === "survey") {
      return [
        { title: "الاتجاه العام وتوزيع الاستجابات", analysis: `يجمع التحليل بين المتوسط ونسبة الاستجابات الإيجابية والتشتت بين البنود، فلا يختزل الاستبانة في متوسط واحد قد يخفي بنودًا ضعيفة.`, evidenceRefs: refs("metric:positivePct", "metric:surveyMean"), confidence: high, implications: ["قراءة البنود الأدنى مستقلًا.", "ربط النتائج بالأسئلة المفتوحة عند توفرها."] },
        { title: "جودة المقياس", analysis: Number.isFinite(result.metrics?.find(item=>item.id==="cronbachAlpha")?.value) ? `فُحص الاتساق الداخلي بوصفه مؤشرًا لترابط البنود، لا دليلًا على الصدق أو أحادية البعد.` : "لم تتحقق شروط حساب الاتساق الداخلي من البيانات الحالية.", evidenceRefs: refs("metric:cronbachAlpha"), confidence: medium, implications: ["عدم استخدام ألفا لبنود تقيس محاور مستقلة.", "مراجعة البنية العاملية عند الحاجة البحثية."] },
        { title: "أولويات الاستجابة", analysis: "رُتبت فجوات البنود وبُني باريتو للتحسين، ثم حُولت الأولويات إلى إجراءات وقياس بعدي بدل توصية عامة برفع الرضا.", evidenceRefs: refs("metric:itemDispersion"), confidence: high, implications: ["اختيار عدد محدود من البنود الأعلى فجوة.", "إعادة القياس على البنود نفسها."] }
      ];
    }
    if (result.kind === "training_needs") {
      return [
        { title: "منهج ترتيب الحاجة", analysis: "تُرتب الاحتياجات من تفاعل الأهمية والفجوة وحجم الفئة المستفيدة، لا من المتوسط أو الانطباع وحده.", evidenceRefs: refs("metric:meanTrainingGap", "metric:highPriorityNeeds"), confidence: high, implications: ["توجيه الموارد إلى الاحتياجات الأعلى أثرًا.", "تمييز التدريب عن التوجيه أو تحسين الموارد."] },
        { title: "قياس أثر التدريب", analysis: "لا يعد الحضور أو الرضا دليلًا كافيًا؛ تُربط كل كفاية بمهمة أداء قبلية وبعدية ومؤشر نقل أثر إلى الممارسة.", evidenceRefs: [], confidence: high, implications: ["تطبيق قياس قبلي وبعدي.", "متابعة نقل الأثر بعد أسابيع من التدريب."] }
      ];
    }
    if (result.kind === "program_evaluation") {
      return [
        { title: "الفصل بين التنفيذ والأثر", analysis: "يفصل التحليل اكتمال الأنشطة عن تحقق النتائج والأثر، حتى لا يُعلن نجاح البرنامج لمجرد تنفيذ الخطة.", evidenceRefs: refs("metric:implementationPct", "metric:outcomePct"), confidence: high, implications: ["مراجعة نظرية التغيير.", "جمع دليل أثر مباشر."] },
        { title: "فجوات الأهداف ودورة التحسين", analysis: "رُتبت الأهداف بحسب الفجوة وربطت بدورة PDCA وقرار الاستمرار أو التعديل أو الاستبدال.", evidenceRefs: refs("metric:programAchievement", "metric:programGap"), confidence: high, implications: ["تركيز الموارد على أعلى الفجوات.", "تحديد موعد قياس للاستدامة."] }
      ];
    }
    if (result.kind === "behavior_attendance") {
      return [
        { title: "التركيز والاتجاه والإنذار المبكر", analysis: "يجمع التحليل باريتو أنواع الحالات والاتجاه الزمني والحالات الفردية المتكررة لتحديد الوقاية والتدخل دون وصم الأفراد.", evidenceRefs: refs("metric:incidentCount", "metric:repeatCases"), confidence: high, implications: ["تدخل وقائي للفئة الأعلى.", "متابعة فردية للحالات المتكررة وفق الصلاحيات."] },
        { title: "حدود التفسير السببي", analysis: "التكرار يحدد موضع الفحص لكنه لا يثبت السبب الجذري؛ يلزم سياق صفّي وأسري وتحصيلي قبل اعتماد تفسير أو إحالة.", evidenceRefs: refs("metric:topCategoryCount"), confidence: high, implications: ["جمع بيانات سياقية.", "عدم تحويل الارتباط إلى وصم أو تشخيص."] }
      ];
    }
    return [
      { title: "ملف تعريف النوع الجديد", analysis: `تم تحليل البنية دون إجبارها على قالب نتائج أو إشراف أو استبانة معروف. يدعم الوصف الحالي فهم الحقول الرقمية والفئوية والنصية، لكنه يحتاج اعتماد الغرض التربوي ووحدة التحليل قبل التقرير النهائي.`, evidenceRefs: refs("metric:rowCount", "metric:columnCount"), confidence: medium, implications: ["تأكيد الهدف والقرارات المطلوبة.", "حفظ عقد تحليل متخصص بعد المراجعة."] },
      { title: "حدود القراءة الاستكشافية", analysis: "يمكن وصف التوزيعات والأنماط الأولية، لكن تفسيرها تربويًا يعتمد على معنى الحقول والمعيار والسياق المؤسسي. لذلك يضيف Gemini خطة متخصصة ويطلب اعتماد المستخدم بدل اختراع نوع أو معيار.", evidenceRefs: refs("metric:numericColumnCount", "metric:categoricalColumnCount"), confidence: medium, implications: ["عدم اعتماد توصيات نهائية قبل تأكيد النوع.", "جمع الحقول والمعايير التي يحتاجها العقد الجديد."] }
    ];
  }

  const analyzers = {
    single_subject: analyzeScores,
    assessment_component: analyzeScores,
    level_distribution: analyzeLevelDistribution,
    cross_subject: analyzeCrossSubject,
    supervision_indicator: context => analyzeIndicatorSet(context, "supervision_indicator"),
    student_work: context => analyzeIndicatorSet(context, "student_work"),
    supervision_narrative: analyzeNarrative,
    survey: analyzeSurvey,
    training_needs: analyzeTrainingNeeds,
    program_evaluation: analyzeProgramEvaluation,
    behavior_attendance: analyzeBehaviorAttendance,
    unknown: analyzeGeneric
  };

  function analyze(input) {
    const context = {
      typeId: input.typeId || "unknown",
      headers: Array.isArray(input.headers) ? input.headers : [],
      rows: Array.isArray(input.rows) ? input.rows : [],
      sourceMeta: input.sourceMeta || {},
      narrativeText: input.narrativeText || "",
      scoreColumn: input.scoreColumn || "",
      levelColumn: input.levelColumn || "",
      maxScore: parseNumber(input.maxScore),
      thresholdPct: parseNumber(input.thresholdPct),
      quality: input.quality || {}
    };
    const analyzer = analyzers[context.typeId] || analyzeGeneric;
    const result = analyzer(context);
    if (!Array.isArray(result.diagnosticSections) || !result.diagnosticSections.length) {
      result.diagnosticSections = deriveDiagnosticSections(result);
    }
    result.typeId = context.typeId;
    result.evidenceMap = { ...evidenceMapFromMetrics(result.metrics || []), ...(result.evidenceMap || {}) };
    result.evidenceCatalog = Object.entries(result.evidenceMap).map(([ref, label]) => ({ ref, label }));
    return result;
  }

  window.TaqareerDeepAnalytics = { VERSION, analyze, analyzers: Object.keys(analyzers), helpers: { normalize, parseNumber, quantile, pearson }, masteryContractVersion: masteryEngine().VERSION };
})();
