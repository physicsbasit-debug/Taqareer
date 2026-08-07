(() => {
  "use strict";

  const VERSION = "1.2.18";
  const ALLOWED_DIRECTIONS = new Set(["lower-is-better", "higher-is-better", "descriptive-only"]);

  function normalize(value) {
    return String(value ?? "").trim().replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").toLowerCase();
  }

  function explicitTypeLock({ sourceMeta = {}, rawText = "" } = {}) {
    const titleText = [
      sourceMeta?.reportTitle,
      sourceMeta?.metadata?.title,
      sourceMeta?.title,
      ...(Array.isArray(sourceMeta?.documentPreamble) ? sourceMeta.documentPreamble : [])
    ].filter(Boolean).join(" ");
    const introText = `${titleText} ${String(rawText || "").slice(0, 4500)}`;
    const normalized = normalize(introText);

    if (normalized.includes("فحص اعمال الطلبه")) {
      return {
        typeId: "student_work",
        confidence: 99,
        reason: "عنوان المصدر يصرّح بأنه استمارة فحص أعمال الطلبة.",
        authority: "explicit-source-title"
      };
    }
    return null;
  }

  function isConfirmedScaleSemantics(value) {
    if (!value || typeof value !== "object" || value.confirmed !== true) return false;
    return ALLOWED_DIRECTIONS.has(String(value.direction || ""));
  }

  function confirmedScaleDirection({ localScaleSemantics = null, sourceScaleSemantics = null } = {}) {
    if (isConfirmedScaleSemantics(localScaleSemantics)) return String(localScaleSemantics.direction);
    if (isConfirmedScaleSemantics(sourceScaleSemantics)) return String(sourceScaleSemantics.direction);
    return "unknown";
  }

  window.TaqareerRecognitionPolicy = {
    VERSION,
    explicitTypeLock,
    isConfirmedScaleSemantics,
    confirmedScaleDirection,
    normalize
  };
})();
