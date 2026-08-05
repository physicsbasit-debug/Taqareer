(() => {
  "use strict";

  const VERSION = "2.0.0";

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[\u200e\u200f\u202a-\u202e]/g, " ")
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/ـ/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function parseNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return NaN;
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    const normalized = String(value).replace(/[٠-٩٫٬]/g, ch => map[ch]).replace(/%/g, "").replace(/,/g, "").trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  const LEVEL_ALIASES = new Map([
    ["ا", "أ"], ["أ", "أ"], ["a", "أ"], ["متميز", "أ"], ["ممتاز", "أ"], ["المستوي ا", "أ"], ["المستوى ا", "أ"],
    ["ب", "ب"], ["b", "ب"], ["جيد", "ب"], ["المستوي ب", "ب"], ["المستوى ب", "ب"],
    ["ج", "ج"], ["c", "ج"], ["ملائم", "ج"], ["مناسب", "ج"], ["المستوي ج", "ج"], ["المستوى ج", "ج"],
    ["د", "د"], ["d", "د"], ["غير ملائم", "د"], ["غير مناسب", "د"], ["المستوي د", "د"], ["المستوى د", "د"],
    ["ه", "هـ"], ["هـ", "هـ"], ["e", "هـ"], ["يحتاج الي تدخل", "هـ"], ["يحتاج إلى تدخل", "هـ"], ["المستوي ه", "هـ"], ["المستوى ه", "هـ"],
  ]);

  function canonicalLevel(header) {
    const value = normalize(header).replace(/[()\[\]:]/g, " ").replace(/\s+/g, " ").trim();
    if (LEVEL_ALIASES.has(value)) return LEVEL_ALIASES.get(value);
    const compact = value.replace(/\s/g, "");
    if (["ا", "أ", "a"].includes(compact)) return "أ";
    if (["ب", "b"].includes(compact)) return "ب";
    if (["ج", "c"].includes(compact)) return "ج";
    if (["د", "d"].includes(compact)) return "د";
    if (["ه", "هـ", "e"].includes(compact)) return "هـ";
    return "";
  }

  function headerMatch(headers, aliases) {
    const normalizedAliases = aliases.map(normalize);
    return headers.find(header => {
      const value = normalize(header);
      return normalizedAliases.some(alias => value === alias || value.includes(alias));
    }) || "";
  }

  function columnStats(headers, rows) {
    return headers.map(header => {
      const raw = rows.map(row => row?.[header]);
      const nonEmpty = raw.filter(value => String(value ?? "").trim() !== "");
      const numeric = nonEmpty.map(parseNumber).filter(Number.isFinite);
      const unique = new Set(nonEmpty.map(normalize));
      const percentageLike = nonEmpty.filter(value => /%/.test(String(value)) || (Number.isFinite(parseNumber(value)) && parseNumber(value) >= 0 && parseNumber(value) <= 100)).length;
      return {
        header,
        nonEmptyCount: nonEmpty.length,
        numericCount: numeric.length,
        numericRatio: numeric.length / Math.max(1, nonEmpty.length),
        uniqueCount: unique.size,
        uniqueRatio: unique.size / Math.max(1, nonEmpty.length),
        percentageRatio: percentageLike / Math.max(1, nonEmpty.length),
        min: numeric.length ? Math.min(...numeric) : null,
        max: numeric.length ? Math.max(...numeric) : null,
      };
    });
  }

  function rowLooksAggregate(row, groupHeader, headers) {
    const groupValue = normalize(groupHeader ? row?.[groupHeader] : "");
    if (/^(الاجمالي|الإجمالي|المجموع|جمله عامه|جملة عامة|total)$/.test(groupValue)) return true;
    const text = headers.map(header => normalize(row?.[header])).join(" ");
    return /(^|\s)(الاجمالي|الإجمالي|المجموع الكلي|المجموع العام)(\s|$)/.test(text);
  }

  function detectDistributionProfile(headers, rows, sourceMeta, stats) {
    const levelColumns = headers
      .map(header => ({ header, level: canonicalLevel(header) }))
      .filter(item => item.level);
    if (levelColumns.length < 2) return null;

    const groupHeader = headerMatch(headers, ["الشعبة", "الصف", "المجموعة", "البيان", "الفئة", "الفصل"])
      || stats.find(item => item.numericRatio < 0.35 && item.uniqueCount > 1)?.header
      || "";
    const totalHeader = headerMatch(headers, ["جملة عامة", "الاجمالي", "الإجمالي", "المجموع", "العدد الكلي", "إجمالي الطلبة"]);
    const successCountHeader = headerMatch(headers, ["جملة النجاح", "عدد الناجحين", "الناجحون"]);
    const successRateHeader = headerMatch(headers, ["نسبة النجاح", "نسبه النجاح", "معدل النجاح"]);
    const serialHeader = headerMatch(headers, ["م", "ت", "الرقم", "التسلسل"]);
    const notesHeader = headerMatch(headers, ["ملاحظات", "الملاحظات"]);

    const aggregateRowIndexes = [];
    const dataRowIndexes = [];
    rows.forEach((row, index) => {
      if (rowLooksAggregate(row, groupHeader, headers)) aggregateRowIndexes.push(index);
      else if (levelColumns.some(item => Number.isFinite(parseNumber(row?.[item.header])))) dataRowIndexes.push(index);
    });

    const title = String(sourceMeta?.normalization?.reportTitle || sourceMeta?.metadata?.title || sourceMeta?.title || "");
    const titleSignal = /مستويات|توزيع|نسب.*الطلب|كشف.*مستويات/i.test(title) ? 16 : 0;
    const totalSignal = totalHeader ? 8 : 0;
    const groupSignal = groupHeader ? 8 : 0;
    const aggregateSignal = aggregateRowIndexes.length ? 5 : 0;
    const confidence = Math.min(99, 66 + levelColumns.length * 4 + titleSignal + totalSignal + groupSignal + aggregateSignal);

    return {
      profileVersion: VERSION,
      shape: "categorical_distribution",
      unitOfAnalysis: "group",
      dataNature: "aggregated_categorical_numeric",
      aggregationLevel: "aggregated",
      orientation: "levels_in_columns",
      measureType: "count_distribution",
      scaleDirection: "أ_to_هـ_high_to_low",
      analyzerId: "level_distribution",
      recommendedTypeId: "level_distribution",
      requiresScoreSettings: false,
      confidence,
      rationale: `اكتُشفت ${levelColumns.length} أعمدة مستويات أداء، مع ${dataRowIndexes.length} مجموعات${aggregateRowIndexes.length ? " وصف إجمالي منفصل" : ""}.`,
      analysisFamilies: ["distribution_analysis", "group_comparison", "concentration_analysis", "aggregate_consistency_check"],
      columnRoles: {
        group: groupHeader,
        levels: levelColumns,
        total: totalHeader,
        successCount: successCountHeader,
        successRate: successRateHeader,
        serial: serialHeader,
        notes: notesHeader,
      },
      rowRoles: {
        dataRowIndexes,
        aggregateRowIndexes,
      },
      scale: {
        order: ["أ", "ب", "ج", "د", "هـ"],
        highLevels: ["أ", "ب"],
        middleLevels: ["ج"],
        lowLevels: ["د", "هـ"],
      },
      metadata: {
        reportTitle: title,
      },
      requiresSemanticVerification: confidence < 95,
    };
  }

  function profileTable({ headers = [], rows = [], sourceMeta = {}, typeId = "unknown" } = {}) {
    const safeHeaders = Array.isArray(headers) ? headers.map(String) : [];
    const safeRows = Array.isArray(rows) ? rows : [];
    const stats = columnStats(safeHeaders, safeRows);
    const distribution = detectDistributionProfile(safeHeaders, safeRows, sourceMeta || {}, stats);
    if (distribution) return distribution;

    const numeric = stats.filter(item => item.numericRatio >= 0.6);
    const dimensions = stats.filter(item => item.numericRatio < 0.5 && item.nonEmptyCount > 0);
    const title = String(sourceMeta?.normalization?.reportTitle || sourceMeta?.metadata?.title || sourceMeta?.title || "");
    const narrative = sourceMeta?.mode === "narrative";

    if (narrative) {
      return {
        profileVersion: VERSION,
        shape: "narrative_document",
        unitOfAnalysis: "statement",
        dataNature: "narrative",
        aggregationLevel: "document",
        orientation: "sections",
        measureType: "text_evidence",
        scaleDirection: "not_applicable",
        analyzerId: typeId === "supervision_narrative" ? "supervision_narrative" : "unknown",
        recommendedTypeId: typeId,
        requiresScoreSettings: false,
        confidence: 88,
        rationale: "المصدر نص سردي منظم إلى أسطر أو أقسام.",
        analysisFamilies: ["narrative_evidence", "consistency_analysis", "recommendation_quality"],
        columnRoles: {}, rowRoles: { dataRowIndexes: safeRows.map((_, index) => index), aggregateRowIndexes: [] },
        metadata: { reportTitle: title }, requiresSemanticVerification: true,
      };
    }

    let shape = "unknown_table";
    let analyzerId = typeId || "unknown";
    let requiresScoreSettings = ["single_subject", "assessment_component", "cross_subject"].includes(typeId);
    let families = ["adaptive_profile_analysis"];
    let confidence = 58;
    let rationale = "جدول يحتاج تفسيرًا دلاليًا لتحديد وحدة التحليل والمقاييس المناسبة.";

    if (dimensions.length >= 1 && numeric.length === 1) {
      shape = "dimension_measure_table";
      families = ["indicator_analysis", "ranking", "gap_analysis_if_target"];
      confidence = 72;
      rationale = "اكتُشف بُعد وصفي مع مقياس رقمي واحد.";
    } else if (dimensions.length >= 1 && numeric.length >= 2) {
      shape = "multi_measure_table";
      families = ["comparative_analysis", "distribution_analysis", "relationship_analysis_if_valid"];
      confidence = 70;
      rationale = `اكتُشف ${numeric.length} مقاييس رقمية مع أبعاد وصفية.`;
    }

    return {
      profileVersion: VERSION,
      shape,
      unitOfAnalysis: "row",
      dataNature: numeric.length ? "mixed_table" : "categorical_table",
      aggregationLevel: "unknown",
      orientation: "records_in_rows",
      measureType: numeric.length ? "numeric" : "categorical",
      scaleDirection: "unknown",
      analyzerId,
      recommendedTypeId: typeId || "unknown",
      requiresScoreSettings,
      confidence,
      rationale,
      analysisFamilies: families,
      columnRoles: {
        dimensions: dimensions.map(item => item.header),
        measures: numeric.map(item => item.header),
      },
      rowRoles: { dataRowIndexes: safeRows.map((_, index) => index), aggregateRowIndexes: [] },
      metadata: { reportTitle: title },
      requiresSemanticVerification: true,
    };
  }

  function mergeProfiles(localProfile, aiProfile, headers = []) {
    const local = localProfile && typeof localProfile === "object" ? structuredClone(localProfile) : {};
    const ai = aiProfile && typeof aiProfile === "object" ? structuredClone(aiProfile) : {};
    const availableHeaders = new Set((headers || []).map(String));
    const validFields = values => Array.isArray(values)
      ? values.map(String).filter(value => !availableHeaders.size || availableHeaders.has(value))
      : [];

    const aiColumnRoles = { ...(ai.columnRoles || {}) };
    const dimensionFields = validFields(ai.dimensionFields);
    const measureFields = validFields(ai.measureFields);
    const levelFields = validFields(ai.levelFields);
    const totalFields = validFields(ai.totalFields);
    if (dimensionFields.length) aiColumnRoles.dimensions = dimensionFields;
    if (measureFields.length) aiColumnRoles.measures = measureFields;
    if (levelFields.length) aiColumnRoles.levels = levelFields.map(header => ({ header, level: canonicalLevel(header) || header }));
    if (totalFields.length) aiColumnRoles.totals = totalFields;

    const localStructuralAuthority = Number(local.confidence || 0) >= 90
      && local.shape && !["unknown_table", "unknown"].includes(local.shape);
    const merged = { ...local };
    const interpretiveFields = ["typeNameAr", "purpose", "rationale", "confidence"];
    const structuralFields = ["shape", "unitOfAnalysis", "dataNature", "aggregationLevel", "orientation", "measureType", "scaleDirection", "analyzerId", "recommendedTypeId", "requiresScoreSettings"];
    for (const field of interpretiveFields) {
      if (ai[field] !== undefined && ai[field] !== null && ai[field] !== "") merged[field] = ai[field];
    }
    if (!localStructuralAuthority) {
      for (const field of structuralFields) {
        if (ai[field] !== undefined && ai[field] !== null && ai[field] !== "") merged[field] = ai[field];
      }
    }
    if (Array.isArray(ai.analysisFamilies) && ai.analysisFamilies.length) {
      merged.analysisFamilies = [...new Set([...(local.analysisFamilies || []), ...ai.analysisFamilies.map(String)])];
    }
    // الأدوار البنيوية المستخرجة محليًا تبقى مصدر الحقيقة، بينما يضيف Gemini الأدوار التي لم يستطع القارئ اكتشافها.
    merged.columnRoles = { ...aiColumnRoles, ...(local.columnRoles || {}) };
    merged.rowRoles = { ...(ai.rowRoles || {}), ...(local.rowRoles || {}) };
    merged.scale = { ...(ai.scale || {}), ...(local.scale || {}) };
    merged.metadata = { ...(local.metadata || {}), ...(ai.metadata || {}) };
    merged.requiresSemanticVerification = false;
    merged.profileVersion = VERSION;
    return merged;
  }

  window.TaqareerAnalysisProfiler = { VERSION, profileTable, mergeProfiles, canonicalLevel, parseNumber, normalize };
})();
