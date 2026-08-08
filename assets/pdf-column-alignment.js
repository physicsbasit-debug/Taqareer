(() => {
  "use strict";

  const VERSION = "1.0.0";

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[\u200e\u200f\u202a-\u202e]/g, " ")
      .replace(/ـ/g, "")
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeDigits(value) {
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    return String(value ?? "").replace(/[٠-٩٫٬]/g, char => map[char]);
  }

  function clean(value) {
    return String(value ?? "").replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function parseNumber(value) {
    const text = normalizeDigits(clean(value)).replace(/%/g, "").replace(/,/g, "");
    if (!/^[-+]?\d+(?:\.\d+)?$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function isPlaceholder(value) {
    const text = normalize(clean(value));
    return !text || /^(?:--+|—+|-+|غير متوفر|لا يوجد|n\/?a|null)$/i.test(text);
  }

  function hasText(value) {
    return /[A-Za-z\u0600-\u06ff]/.test(clean(value));
  }

  function isLevelToken(value) {
    const text = normalize(clean(value)).replace(/[.،,:؛()\[\]]/g, "").replace(/\s+/g, "");
    return ["ا", "ب", "ج", "د", "ه", "غ", "غائب", "غياب", "a", "b", "c", "d", "e"].includes(text);
  }

  function isEnrollmentToken(value) {
    const text = normalize(value);
    return /^(?:منقول|مستجد|باق|باقي|مرفع|موقوف|منسحب|منتقل|مسجل)$/.test(text);
  }

  function valueRoleScore(role, value) {
    const text = clean(value);
    const number = parseNumber(text);
    const numeric = Number.isFinite(number);
    const placeholder = isPlaceholder(text);
    switch (role) {
      case "serial":
        return numeric && Number.isInteger(number) && number >= 0 ? 1 : placeholder ? 0.2 : 0;
      case "student":
        return hasText(text) && !numeric && text.length >= 4 ? 1 : placeholder ? 0.1 : 0;
      case "nationality":
        return hasText(text) && !numeric && text.length >= 3 ? 0.95 : placeholder ? 0.2 : 0;
      case "enrollment":
        return isEnrollmentToken(text) ? 1 : hasText(text) && !numeric && text.length <= 24 ? 0.65 : placeholder ? 0.15 : 0;
      case "score":
      case "mean":
      case "value":
      case "mode":
        return numeric ? 1 : isLevelToken(text) ? 0.25 : placeholder ? 0.35 : 0;
      case "level":
        return isLevelToken(text) ? 1 : hasText(text) && !numeric && text.length <= 24 ? 0.45 : placeholder ? 0.25 : 0;
      case "second_round":
      case "notes":
        return placeholder || hasText(text) || numeric ? 0.85 : 0.5;
      case "date":
        return /20\d{2}\s*[\/-]\s*\d{1,2}\s*[\/-]\s*\d{1,2}/.test(normalizeDigits(text)) ? 1 : 0.25;
      case "grade":
      case "class":
        return numeric || hasText(text) ? 0.8 : 0.3;
      case "subject":
      case "item":
      case "category":
        return hasText(text) && !numeric ? 0.9 : numeric ? 0.35 : 0.25;
      case "unknown":
      default:
        return placeholder ? 0.55 : text ? 0.75 : 0.2;
    }
  }

  function candidateScore(values, columns) {
    if (!columns.length || values.length !== columns.length) return -1;
    let weighted = 0;
    let weight = 0;
    columns.forEach((column, index) => {
      const role = String(column?.role || "unknown");
      const roleWeight = role === "unknown" ? 0.45 : ["serial", "student", "score", "level"].includes(role) ? 1.35 : 1;
      weighted += valueRoleScore(role, values[index]) * roleWeight;
      weight += roleWeight;
    });
    return weight ? weighted / weight : 0;
  }

  function alignCells(cells = [], columns = []) {
    const cleanCells = (cells || []).map(clean);
    const cleanColumns = (columns || []).filter(Boolean);
    if (!cleanColumns.length || cleanCells.length !== cleanColumns.length) {
      return { values: cleanCells, orientation: "unresolved", score: 0, alternateScore: 0 };
    }
    const forwardScore = candidateScore(cleanCells, cleanColumns);
    const reversed = [...cleanCells].reverse();
    const reverseScore = candidateScore(reversed, cleanColumns);
    if (reverseScore > forwardScore + 0.08) {
      return { values: reversed, orientation: "reversed", score: reverseScore, alternateScore: forwardScore };
    }
    return { values: cleanCells, orientation: "source", score: forwardScore, alternateScore: reverseScore };
  }

  function validateRows(rows = [], columns = []) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(columns) ? columns : [];
    if (!safeRows.length || !safeColumns.length) return { score: 0, hardFailure: true, roles: {}, issues: ["no_rows_or_columns"] };
    const roleScores = {};
    const issues = [];
    let weighted = 0;
    let weight = 0;

    safeColumns.forEach(column => {
      const role = String(column?.role || "unknown");
      const header = String(column?.header || "");
      const values = safeRows.map(row => row?.[header]).filter(value => clean(value) !== "");
      if (!values.length) return;
      const average = values.reduce((sum, value) => sum + valueRoleScore(role, value), 0) / values.length;
      roleScores[role === "unknown" ? header : role] = average;
      const roleWeight = role === "unknown" ? 0.4 : ["serial", "student", "score", "level"].includes(role) ? 1.4 : 1;
      weighted += average * roleWeight;
      weight += roleWeight;
      if (["serial", "student", "score", "level"].includes(role) && average < 0.58) issues.push(`weak_${role}`);
    });

    const score = weight ? weighted / weight : 0;
    const hardFailure = issues.some(issue => /weak_(?:student|score)/.test(issue)) || score < 0.52;
    return { score, hardFailure, roles: roleScores, issues };
  }

  window.TaqareerPdfColumnAlignment = {
    VERSION,
    alignCells,
    validateRows,
    _test: { normalize, normalizeDigits, clean, parseNumber, isPlaceholder, isLevelToken, isEnrollmentToken, valueRoleScore, candidateScore },
  };
})();
