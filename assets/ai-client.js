(() => {
  "use strict";

  const STORAGE_KEY = "taqareer.ai.config.v1";
  const ACCESS_KEY = "taqareer.ai.access-code.v1";
  const CLIENT_VERSION = "1.1.4";
  const defaults = window.TAQAREER_CONFIG || {};

  function safeJsonParse(value, fallback = {}) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function normalizeEndpoint(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function getStoredConfig() {
    return safeJsonParse(localStorage.getItem(STORAGE_KEY) || "{}", {});
  }

  function getConfig() {
    const stored = getStoredConfig();
    return {
      endpoint: normalizeEndpoint(stored.endpoint || defaults.aiEndpoint || ""),
      anonKey: String(stored.anonKey || defaults.supabaseAnonKey || "").trim(),
      enabled: stored.enabled !== undefined ? Boolean(stored.enabled) : defaults.aiEnabledByDefault !== false,
      timeoutMs: Number(stored.timeoutMs || defaults.requestTimeoutMs || 90000),
    };
  }

  function saveConfig(next) {
    const current = getConfig();
    const merged = {
      endpoint: normalizeEndpoint(next.endpoint ?? current.endpoint),
      anonKey: String(next.anonKey ?? current.anonKey).trim(),
      enabled: next.enabled ?? current.enabled,
      timeoutMs: Number(next.timeoutMs ?? current.timeoutMs),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function setAccessCode(value) {
    const code = String(value || "").trim();
    if (code) sessionStorage.setItem(ACCESS_KEY, code);
    else sessionStorage.removeItem(ACCESS_KEY);
  }

  function getAccessCode() {
    return sessionStorage.getItem(ACCESS_KEY) || "";
  }

  function clearConfig() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.endpoint && config.anonKey);
  }

  async function invoke(operation, payload, options = {}) {
    const config = getConfig();
    if (!config.endpoint || !config.anonKey) throw new Error("لم يُضبط رابط وظيفة الذكاء الاصطناعي ومفتاح Supabase العام بعد.");

    const controller = new AbortController();
    const timeoutMs = Math.max(8000, Number(options.timeoutMs || config.timeoutMs));
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = {
      "Content-Type": "application/json",
      "apikey": config.anonKey,
      "Authorization": `Bearer ${config.anonKey}`,
    };
    const accessCode = getAccessCode();
    if (accessCode) headers["x-taqareer-access-code"] = accessCode;

    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ operation, payload }),
        signal: controller.signal,
      });
      const bodyText = await response.text();
      const body = safeJsonParse(bodyText, { error: bodyText || "استجابة غير مفهومة من الخادم." });
      if (!response.ok || body.ok === false) {
        const error = new Error(body.error || body.message || `فشل الطلب برمز ${response.status}.`);
        error.status = response.status;
        error.code = body.errorCode || body.code || "";
        error.retryable = Boolean(body.retryable);
        error.requestId = body.requestId || response.headers.get("x-request-id") || response.headers.get("x-goog-request-id") || "";
        throw error;
      }
      body.clientTiming = { durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - startedAt) };
      return body;
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("انتهت مهلة التحليل الذكي الأساسي قبل اكتمال النتيجة. لم يعتمد التطبيق تحليلًا ناقصًا.");
        timeoutError.code = "AI_PRIMARY_TIMEOUT";
        timeoutError.retryable = true;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function analyzePrimaryDetailed(payload) {
    return invoke("analyze_primary", payload, { timeoutMs: 85000 });
  }

  // يبقى للتوافق مع نتائج v0.9.7 القديمة، لكنه ليس جزءًا من المسار الحالي.
  async function enhanceFastDetailed(payload) {
    return invoke("enhance_fast", payload, { timeoutMs: 16000 });
  }

  async function extractVisual(payload) {
    const response = await invoke("vision_extract", payload);
    return response.result;
  }

  async function classifyDetailed(payload) {
    return invoke("classify", payload, { timeoutMs: 20000 });
  }

  async function classify(payload) {
    const response = await classifyDetailed(payload);
    return response.result;
  }

  async function ping() {
    return invoke("ping", { clientVersion: CLIENT_VERSION }, { timeoutMs: 12000 });
  }

  window.TaqareerAI = {
    getConfig,
    saveConfig,
    clearConfig,
    isConfigured,
    setAccessCode,
    getAccessCode,
    analyzePrimaryDetailed,
    enhanceFastDetailed,
    extractVisual,
    classify,
    classifyDetailed,
    ping,
  };
})();
