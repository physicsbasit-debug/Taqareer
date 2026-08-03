(() => {
  "use strict";

  const STORAGE_KEY = "taqareer.ai.config.v1";
  const ACCESS_KEY = "taqareer.ai.access-code.v1";
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
      timeoutMs: Number(stored.timeoutMs || defaults.requestTimeoutMs || 120000)
    };
  }

  function saveConfig(next) {
    const current = getConfig();
    const merged = {
      endpoint: normalizeEndpoint(next.endpoint ?? current.endpoint),
      anonKey: String(next.anonKey ?? current.anonKey).trim(),
      enabled: next.enabled ?? current.enabled,
      timeoutMs: Number(next.timeoutMs ?? current.timeoutMs)
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

  async function invoke(operation, payload) {
    const config = getConfig();
    if (!config.endpoint || !config.anonKey) {
      throw new Error("لم يُضبط رابط وظيفة الذكاء الاصطناعي ومفتاح Supabase العام بعد.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(10000, config.timeoutMs));
    const headers = {
      "Content-Type": "application/json",
      "apikey": config.anonKey,
      "Authorization": `Bearer ${config.anonKey}`
    };
    const accessCode = getAccessCode();
    if (accessCode) headers["x-taqareer-access-code"] = accessCode;

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ operation, payload }),
        signal: controller.signal
      });
      const bodyText = await response.text();
      const body = safeJsonParse(bodyText, { error: bodyText || "استجابة غير مفهومة من الخادم." });
      if (!response.ok || body.ok === false) {
        const message = body.error || body.message || `فشل الطلب برمز ${response.status}.`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("انتهت مهلة الاتصال بالذكاء الاصطناعي. أعد المحاولة أو استخدم التحليل المحلي.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function analyze(payload) {
    const response = await invoke("analyze", payload);
    return response.result;
  }

  async function extractVisual(payload) {
    const response = await invoke("vision_extract", payload);
    return response.result;
  }

  async function classify(payload) {
    const response = await invoke("classify", payload);
    return response.result;
  }

  async function ping() {
    const response = await invoke("ping", { clientVersion: "0.7.2" });
    return response;
  }

  window.TaqareerAI = {
    getConfig,
    saveConfig,
    clearConfig,
    isConfigured,
    setAccessCode,
    getAccessCode,
    analyze,
    extractVisual,
    classify,
    ping
  };
})();
