(() => {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULTS = Object.freeze({
    masteryCutoffPercent: 75,
    nearMasteryMargin: 5,
    deepGapMargin: 15,
    decimalPlaces: 1
  });

  const JUDGEMENT_SCALE = Object.freeze([
    Object.freeze({ code: "distinguished", label: "متميز", minPercent: 70, maxPercent: 100, rank: 5 }),
    Object.freeze({ code: "good", label: "جيد", minPercent: 60, maxPercent: 70, rank: 4 }),
    Object.freeze({ code: "adequate", label: "ملائم", minPercent: 50, maxPercent: 60, rank: 3 }),
    Object.freeze({ code: "not_adequate", label: "غير ملائم", minPercent: 40, maxPercent: 50, rank: 2 }),
    Object.freeze({ code: "rapid_intervention", label: "يحتاج إلى تدخل سريع", minPercent: 0, maxPercent: 40, rank: 1 })
  ]);

  function toNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return NaN;
    const arabicDigits = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    const normalized = String(value)
      .replace(/[٠-٩٫٬]/g, char => arabicDigits[char])
      .replace(/[%،]/g, char => char === "%" ? "" : ",")
      .trim();
    const parsed = Number(normalized.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function round(value, decimals = DEFAULTS.decimalPlaces) {
    if (!Number.isFinite(value)) return NaN;
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function normalizeSettings(settings = {}) {
    const totalScore = toNumber(settings.totalScore);
    const masteryCutoffPercent = Number.isFinite(toNumber(settings.masteryCutoffPercent))
      ? toNumber(settings.masteryCutoffPercent)
      : DEFAULTS.masteryCutoffPercent;
    const nearMasteryMargin = Number.isFinite(toNumber(settings.nearMasteryMargin))
      ? toNumber(settings.nearMasteryMargin)
      : DEFAULTS.nearMasteryMargin;
    const deepGapMargin = Number.isFinite(toNumber(settings.deepGapMargin))
      ? toNumber(settings.deepGapMargin)
      : DEFAULTS.deepGapMargin;
    const decimalPlaces = Number.isFinite(toNumber(settings.decimalPlaces))
      ? Math.max(0, Math.min(6, Math.trunc(toNumber(settings.decimalPlaces))))
      : DEFAULTS.decimalPlaces;

    if (!Number.isFinite(totalScore) || totalScore <= 0) throw new Error("الدرجة الكلية يجب أن تكون أكبر من صفر لحساب انتشار الإتقان.");
    if (!(masteryCutoffPercent > 0 && masteryCutoffPercent <= 100)) throw new Error("حد الإتقان يجب أن يكون بين 1% و100%.");
    if (!(nearMasteryMargin >= 0 && deepGapMargin > nearMasteryMargin)) throw new Error("يجب أن يكون هامش الفجوة العميقة أكبر من هامش القريب من الإتقان.");
    if (deepGapMargin > masteryCutoffPercent) throw new Error("هامش الفجوة العميقة لا يجوز أن يتجاوز حد الإتقان.");

    return { totalScore, masteryCutoffPercent, nearMasteryMargin, deepGapMargin, decimalPlaces };
  }

  function validateScores(rawScores, settings) {
    const validScores = [];
    const invalidRecords = [];
    (Array.isArray(rawScores) ? rawScores : []).forEach((rawValue, index) => {
      const score = toNumber(rawValue);
      if (!Number.isFinite(score)) {
        invalidRecords.push({ index, rawValue, reason: "not_numeric" });
        return;
      }
      if (score < 0) {
        invalidRecords.push({ index, rawValue, reason: "negative" });
        return;
      }
      if (score > settings.totalScore) {
        invalidRecords.push({ index, rawValue, reason: "above_total" });
        return;
      }
      const percent = (score / settings.totalScore) * 100;
      validScores.push({ index, rawValue, score, percent, isMastery: percent >= settings.masteryCutoffPercent });
    });
    return { validScores, invalidRecords };
  }

  function getJudgement(rawSpreadPercent) {
    return JUDGEMENT_SCALE.find(item => item.code === "distinguished"
      ? rawSpreadPercent >= item.minPercent
      : rawSpreadPercent >= item.minPercent && rawSpreadPercent < item.maxPercent
    ) || JUDGEMENT_SCALE[JUDGEMENT_SCALE.length - 1];
  }

  function getNextJudgement(judgement) {
    return [...JUDGEMENT_SCALE].sort((a, b) => a.rank - b.rank).find(item => item.rank === judgement.rank + 1);
  }

  function allocateRoundedPercentages(counts, total, decimals) {
    if (!total) return counts.map(() => 0);
    const factor = 10 ** decimals;
    const rawUnits = counts.map(count => (count / total) * 100 * factor);
    const floors = rawUnits.map(Math.floor);
    let remaining = Math.round(100 * factor - floors.reduce((sum, value) => sum + value, 0));
    const order = rawUnits.map((value, index) => ({ index, remainder: value - floors[index] }))
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; i < remaining; i += 1) floors[order[i % order.length].index] += 1;
    return floors.map(value => value / factor);
  }

  function calculateDistribution(validScores, settings) {
    const nearStart = Math.max(0, settings.masteryCutoffPercent - settings.nearMasteryMargin);
    const deepStart = Math.max(0, settings.masteryCutoffPercent - settings.deepGapMargin);
    const bands = [
      {
        key: "mastery", label: "حققوا حد الإتقان", minPercent: settings.masteryCutoffPercent, maxPercent: 100,
        count: validScores.filter(record => record.percent >= settings.masteryCutoffPercent).length,
        interpretation: "يمثلون حجم انتشار الإتقان الحالي داخل المجموعة."
      },
      {
        key: "near_mastery", label: "قريبون من الإتقان", minPercent: nearStart, maxPercent: settings.masteryCutoffPercent,
        count: validScores.filter(record => record.percent >= nearStart && record.percent < settings.masteryCutoffPercent).length,
        interpretation: "يمثلون فرصة رفع قريبة إذا نُفذ تدخل قصير وموجه."
      },
      {
        key: "moderate_gap", label: "دون الإتقان بفجوة متوسطة", minPercent: deepStart, maxPercent: nearStart,
        count: validScores.filter(record => record.percent >= deepStart && record.percent < nearStart).length,
        interpretation: "يحتاجون دعمًا جماعيًا موجهًا قبل بلوغ حد الإتقان."
      },
      {
        key: "deep_gap", label: "دون الإتقان بفجوة عميقة", minPercent: 0, maxPercent: deepStart,
        count: validScores.filter(record => record.percent < deepStart).length,
        interpretation: "يشيرون إلى حاجة علاجية أعمق على مستوى المجموعة."
      }
    ];
    const percentages = allocateRoundedPercentages(bands.map(item => item.count), validScores.length, settings.decimalPlaces);
    return bands.map((item, index) => ({ ...item, percent: percentages[index] }));
  }

  function calculateGapToNextLevel(summary, judgement, decimalPlaces) {
    const next = getNextJudgement(judgement);
    if (!next) {
      return {
        hasNextLevel: false,
        currentJudgement: judgement.code,
        currentSpreadPercentRaw: summary.masterySpreadPercentRaw,
        currentSpreadPercent: summary.masterySpreadPercent,
        gapPointsRaw: 0,
        gapPoints: 0,
        additionalStudentsNeeded: 0,
        requiredMasteryCount: summary.masteryCount,
        message: "المجموعة وصلت إلى أعلى مستوى في سلم انتشار الإتقان؛ يوصى بالتركيز على التثبيت والإثراء."
      };
    }
    const requiredSpreadPercent = next.minPercent;
    const requiredMasteryCount = Math.ceil((requiredSpreadPercent / 100) * summary.totalStudents);
    const additionalStudentsNeeded = Math.max(0, requiredMasteryCount - summary.masteryCount);
    const gapPointsRaw = Math.max(0, requiredSpreadPercent - summary.masterySpreadPercentRaw);
    return {
      hasNextLevel: true,
      currentJudgement: judgement.code,
      nextJudgement: next.code,
      nextJudgementLabel: next.label,
      requiredSpreadPercent,
      currentSpreadPercentRaw: summary.masterySpreadPercentRaw,
      currentSpreadPercent: summary.masterySpreadPercent,
      gapPointsRaw,
      gapPoints: round(gapPointsRaw, decimalPlaces),
      requiredMasteryCount,
      additionalStudentsNeeded,
      message: additionalStudentsNeeded === 0
        ? `المجموعة قريبة جدًا من مستوى "${next.label}" ولا تحتاج إلا إلى تثبيت الانتشار الحالي.`
        : `تحتاج المجموعة إلى انتقال ${additionalStudentsNeeded} ${additionalStudentsNeeded === 1 ? "طالب" : "طلاب"} إضافيين إلى حد الإتقان للوصول إلى مستوى "${next.label}".`
    };
  }

  function calculate(rawScores, inputSettings = {}) {
    const settings = normalizeSettings(inputSettings);
    const { validScores, invalidRecords } = validateScores(rawScores, settings);
    if (!validScores.length) throw new Error("لا توجد درجات صحيحة قابلة لحساب انتشار الإتقان.");

    const totalStudents = validScores.length;
    const masteryCount = validScores.filter(record => record.isMastery).length;
    const nonMasteryCount = totalStudents - masteryCount;
    const masterySpreadPercentRaw = (masteryCount / totalStudents) * 100;
    const masterySpreadPercent = round(masterySpreadPercentRaw, settings.decimalPlaces);
    const masteryCutoffScoreRaw = (settings.masteryCutoffPercent / 100) * settings.totalScore;
    const masteryCutoffScore = round(masteryCutoffScoreRaw, settings.decimalPlaces);
    const judgement = getJudgement(masterySpreadPercentRaw);
    const summary = {
      totalStudents,
      masteryCount,
      nonMasteryCount,
      masterySpreadPercentRaw,
      masterySpreadPercent,
      masteryCutoffPercent: settings.masteryCutoffPercent,
      totalScore: settings.totalScore,
      masteryCutoffScoreRaw,
      masteryCutoffScore,
      minimumWholeScoreForMastery: Math.ceil(masteryCutoffScoreRaw),
      singleStudentImpactRaw: 100 / totalStudents,
      singleStudentImpact: round(100 / totalStudents, settings.decimalPlaces)
    };
    const distribution = calculateDistribution(validScores, settings);
    const gapToNextLevel = calculateGapToNextLevel(summary, judgement, settings.decimalPlaces);

    return {
      version: VERSION,
      settings,
      validation: { validCount: validScores.length, invalidCount: invalidRecords.length, invalidRecords },
      validScores,
      summary,
      judgement,
      distribution,
      gapToNextLevel
    };
  }

  function calculateSensitivity(rawScores, inputSettings, thresholds = [50, 60, 70, 75, 80, 90]) {
    return thresholds.map(threshold => {
      const result = calculate(rawScores, { ...inputSettings, masteryCutoffPercent: threshold });
      return {
        threshold,
        count: result.summary.masteryCount,
        percentageRaw: result.summary.masterySpreadPercentRaw,
        percentage: result.summary.masterySpreadPercent,
        judgement: result.judgement.label
      };
    });
  }

  window.TaqareerMasteryMetrics = {
    VERSION,
    DEFAULTS,
    JUDGEMENT_SCALE,
    calculate,
    calculateSensitivity,
    helpers: { toNumber, round, getJudgement, calculateDistribution, allocateRoundedPercentages }
  };
})();
