(() => {
  "use strict";

  const STORAGE_KEY = "taqareer.ai.config.v1";
  const ACCESS_KEY = "taqareer.ai.access-code.v1";
  const CLIENT_VERSION = "1.4.1";
  const PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS = 50_000;
  const PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS = 1;
  const PRIMARY_ANALYSIS_FAST_CAPACITY_REPLAY_MAX_MS = 12_000;
  const HEALTH_MAX_AGE_MS = 120000;
  const defaults = window.TAQAREER_CONFIG || {};
  let healthState = {
    status: "unknown",
    checkedAt: 0,
    endpoint: "",
    edgeVersion: "",
    geminiReady: false,
    aiKeyConfigured: null,
    errorCode: "",
  };

  function safeJsonParse(value, fallback = {}) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function normalizeEndpoint(value) {
    let raw = String(value || "").trim();
    if (!raw) return "";

    const dashboardMatch = raw.match(/^https?:\/\/supabase\.com\/dashboard\/project\/([a-z0-9-]+)(?:\/.*)?$/i);
    if (dashboardMatch) raw = `https://${dashboardMatch[1]}.supabase.co/functions/v1/analyze-educational-form`;
    if (!/^https?:\/\//i.test(raw) && /^[a-z0-9-]+\.supabase\.co(?:\/|$)/i.test(raw)) raw = `https://${raw}`;

    try {
      const url = new URL(raw);
      url.hash = "";
      url.search = "";
      const path = url.pathname.replace(/\/+$/, "");
      if (/\.supabase\.co$/i.test(url.hostname)) {
        if (!path || path === "/") url.pathname = "/functions/v1/analyze-educational-form";
        else if (/^\/functions\/v1$/i.test(path)) url.pathname = "/functions/v1/analyze-educational-form";
        else url.pathname = path;
      } else {
        url.pathname = path || "/";
      }
      return url.toString().replace(/\/+$/, "");
    } catch {
      return raw.replace(/\/+$/, "");
    }
  }

  function validateEndpoint(endpoint) {
    let url;
    try { url = new URL(endpoint); }
    catch {
      const error = new Error("رابط وظيفة Supabase غير صالح.");
      error.code = "AI_ENDPOINT_INVALID";
      throw error;
    }
    const local = /^(localhost|127\.0\.0\.1)$/i.test(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
      const error = new Error("يجب أن يستخدم رابط وظيفة التحليل اتصال HTTPS آمنًا.");
      error.code = "AI_ENDPOINT_INVALID";
      throw error;
    }
    if (!/\/functions\/v1\/[^/]+$/i.test(url.pathname.replace(/\/+$/, ""))) {
      const error = new Error("رابط Supabase لا يشير إلى وظيفة Edge صحيحة. يجب أن ينتهي بـ /functions/v1/analyze-educational-form.");
      error.code = "AI_ENDPOINT_INVALID";
      throw error;
    }
    return url;
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

  function resetHealth(endpoint = "") {
    healthState = { status: "unknown", checkedAt: 0, endpoint, edgeVersion: "", geminiReady: false, aiKeyConfigured: null, errorCode: "" };
  }

  function setHealth(next) {
    healthState = { ...healthState, ...next, checkedAt: Date.now() };
    if (typeof CustomEvent === "function" && window.dispatchEvent) window.dispatchEvent(new CustomEvent("taqareer-ai-health", { detail: { ...healthState } }));
    return { ...healthState };
  }

  function getHealth() {
    return { ...healthState };
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
    if (merged.endpoint !== current.endpoint || merged.anonKey !== current.anonKey) resetHealth(merged.endpoint);
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
    resetHealth("");
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.endpoint && config.anonKey);
  }

  function createRequestId(operation) {
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `tqr-${operation}-${random}`;
  }

  function isTransportFailure(error) {
    if (!error) return false;
    if (error.name === "AbortError") return false;
    return error instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(String(error.message || ""));
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function networkError(config, cause) {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const error = new Error(offline
      ? "الجهاز غير متصل بالإنترنت حاليًا. لم يُرسل التحليل إلى الخادم."
      : "تعذر الوصول إلى وظيفة Supabase. تحقق التطبيق من الرابط، لكن الاتصال انقطع أو حجب المتصفح الاستجابة قبل وصولها.");
    error.code = offline ? "AI_OFFLINE" : "AI_NETWORK_FETCH_FAILED";
    error.retryable = true;
    error.endpoint = config.endpoint;
    error.cause = cause;
    return error;
  }

  async function invoke(operation, payload, options = {}) {
    const config = getConfig();
    if (!config.endpoint || !config.anonKey) {
      const error = new Error("لم يُضبط رابط خدمة التحليل ومفتاح Supabase العام بعد.");
      error.code = "AI_NOT_CONFIGURED";
      throw error;
    }
    validateEndpoint(config.endpoint);

    const timeoutMs = Math.max(8000, Number(options.timeoutMs || config.timeoutMs));
    const requestId = options.requestId || createRequestId(operation);
    const requestedMaxAttempts = Math.max(1, Number(options.maxAttempts || (options.networkRetry === true ? 2 : 1)));
    const maxAttempts = options.networkRetry === true ? requestedMaxAttempts : 1;
    const startedAt = globalThis.performance?.now?.() ?? Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const attemptStartedAt = globalThis.performance?.now?.() ?? Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const headers = {
        "Content-Type": "application/json",
        "apikey": config.anonKey,
        "Authorization": `Bearer ${config.anonKey}`,
        "x-taqareer-client-version": CLIENT_VERSION,
        "x-taqareer-request-id": requestId,
      };
      const accessCode = getAccessCode();
      if (accessCode) headers["x-taqareer-access-code"] = accessCode;

      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          mode: "cors",
          cache: "no-store",
          credentials: "omit",
          redirect: "follow",
          referrerPolicy: "no-referrer",
          headers,
          body: JSON.stringify({ operation, payload }),
          signal: controller.signal,
        });
        const bodyText = await response.text();
        const body = safeJsonParse(bodyText, { error: bodyText || "استجابة غير مفهومة من الخادم." });
        const edgeVersion = String(body.edgeVersion || response.headers.get("x-taqareer-edge-version") || "");
        setHealth({
          status: "live",
          endpoint: config.endpoint,
          edgeVersion,
          aiKeyConfigured: body.aiKeyConfigured ?? healthState.aiKeyConfigured,
          geminiReady: operation === "ping" || operation === "analyze_primary" ? response.ok && body.ok !== false : healthState.geminiReady,
          errorCode: "",
        });
        if (!response.ok || body.ok === false) {
          const error = new Error(body.error || body.message || `فشل الطلب برمز ${response.status}.`);
          error.status = response.status;
          error.code = body.errorCode || body.code || "";
          error.retryable = Boolean(body.retryable);
          error.requestId = body.requestId || response.headers.get("x-taqareer-request-id") || response.headers.get("x-request-id") || response.headers.get("x-goog-request-id") || requestId;
          error.edgeVersion = edgeVersion;
          error.retryAfterMs = Math.max(0, Number(body.retryAfterMs || body.diagnostic?.retryAfterMs || 0));
          error.diagnostic = body.diagnostic && typeof body.diagnostic === "object" ? body.diagnostic : null;
          throw error;
        }
        body.clientTiming = { durationMs: Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - startedAt) };
        body.requestId = body.requestId || requestId;
        return body;
      } catch (error) {
        if (error?.name === "AbortError") {
          // لا نعيد analyze_primary كاملًا بعد انتهاء مهلة العميل. قد تكون Edge ما زالت
          // تُنهي الطلب السابق، وإعادة الطلب هنا تضاعف حمل Gemini وتحوّل مهلة واحدة
          // إلى انتظار طويل قد يتجاوز دقيقة ونصف. تبقى إعادة المحاولة اليدوية متاحة.
          setHealth({ status: "failed", endpoint: config.endpoint, errorCode: "AI_PRIMARY_TIMEOUT" });
          const timeoutError = new Error("انتهت مهلة المحاولة الحالية للتحليل الذكي قبل اكتمال النتيجة. لم يعتمد التطبيق تحليلًا ناقصًا ولم يكرر الطلب الكامل تلقائيًا.");
          timeoutError.code = "AI_PRIMARY_TIMEOUT";
          timeoutError.retryable = true;
          throw timeoutError;
        }
        if (isTransportFailure(error)) {
          if (attempt < maxAttempts) {
            await delay(350 + Math.round(Math.random() * 250));
            continue;
          }
          const transportError = networkError(config, error);
          setHealth({ status: "failed", endpoint: config.endpoint, errorCode: transportError.code, geminiReady: false });
          throw transportError;
        }
        const code = String(error?.code || "");
        const status = Number(error?.status || 0);
        const attemptDurationMs = Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - attemptStartedAt);
        const transientCapacity = code === "GEMINI_TRANSIENT" || status === 503 || status === 504;

        // 429 وحدود الحصة لا تُعاد تلقائيًا. Edge أوقفت fan-out عمدًا، وإعادة الطلب
        // الكامل من المتصفح ستزيد RPM/TPM بدل أن تساعد.
        if (code === "GEMINI_RATE_LIMIT" || status === 429) {
          setHealth({ status: "failed", endpoint: config.endpoint, errorCode: "GEMINI_RATE_LIMIT", geminiReady: false });
          throw error;
        }

        // رفض عقد نواة القرار يعني أن Edge استنفدت النموذج الأساسي والفallback المحدود
        // أو رفضت النتيجة بعد التحقق. لا نعيد دورة AI كاملة من المتصفح.
        if (code === "GEMINI_CONTRACT_REJECTED") throw error;

        // نسمح بإعادة طلب خادمي واحدة فقط إذا كان 503/504 قد عاد بسرعة. إذا استغرقت
        // Edge وقتًا معتبرًا فقد قامت بالفعل بالفشل البديل/الإنقاذ، وإعادة العمل كله
        // تحوّل التعافي إلى انتظار 80-120 ثانية وتضاعف الضغط.
        if (attempt < maxAttempts && options.networkRetry === true && transientCapacity
          && attemptDurationMs <= PRIMARY_ANALYSIS_FAST_CAPACITY_REPLAY_MAX_MS) {
          setHealth({ status: "checking", endpoint: config.endpoint, errorCode: code, geminiReady: false });
          await delay(2600 + Math.round(Math.random() * 1200));
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw networkError(config, null);
  }

  async function health(options = {}) {
    const config = getConfig();
    const fresh = healthState.status === "live" && healthState.endpoint === config.endpoint && Date.now() - healthState.checkedAt < Number(options.maxAgeMs || HEALTH_MAX_AGE_MS);
    if (!options.force && fresh) return { ok: true, result: { status: "ready" }, edgeVersion: healthState.edgeVersion, aiKeyConfigured: healthState.aiKeyConfigured };
    setHealth({ status: "checking", endpoint: config.endpoint, errorCode: "" });
    try {
      return await invoke("health", { clientVersion: CLIENT_VERSION }, { timeoutMs: 10000, networkRetry: true });
    } catch (error) {
      if (Number(error?.status) === 400 && /غير مدعومة|unsupported/i.test(String(error?.message || ""))) {
        return invoke("ping", { clientVersion: CLIENT_VERSION }, { timeoutMs: 15000, networkRetry: true });
      }
      throw error;
    }
  }

  async function ensureHealthy() {
    const result = await health({ maxAgeMs: HEALTH_MAX_AGE_MS });
    if (result.aiKeyConfigured === false) {
      const error = new Error("تم الوصول إلى وظيفة Supabase، لكن سر GEMINI_API_KEY غير مضبوط.");
      error.code = "GEMINI_CONFIGURATION";
      error.retryable = false;
      throw error;
    }
    return result;
  }

  async function analyzePrimaryDetailed(payload) {
    // لا نجعل فحص health بوابة إلزامية قبل الطلب الحقيقي. قد يفشل الفحص
    // العابر أو يتأخر بينما تكون وظيفة التحليل نفسها قابلة للوصول بعد لحظة.
    // الطلب الحقيقي هو دليل الجاهزية الأوثق، وinvoke يحدّث healthState عند نجاحه
    // ويعيد أخطاء الإعداد/الشبكة الفعلية عند فشله.
    // ضغطة واحدة = طلب Edge واحد. Edge نفسها تملك fallback نموذجًا واحدًا فقط،
    // لذلك لا يكرر المتصفح دورة التحليل الذكي كاملة عند أي تعثر.
    return invoke("analyze_primary", payload, { timeoutMs: PRIMARY_ANALYSIS_CLIENT_TIMEOUT_MS, networkRetry: false, maxAttempts: PRIMARY_ANALYSIS_CLIENT_MAX_ATTEMPTS });
  }

  // يبقى للتوافق مع نتائج v0.9.7 القديمة، لكنه ليس جزءًا من المسار الحالي.
  async function enhanceFastDetailed(payload) {
    return invoke("enhance_fast", payload, { timeoutMs: 16000 });
  }

  async function extractVisual(payload) {
    await ensureHealthy();
    const response = await invoke("vision_extract", payload);
    return response.result;
  }

  async function classifyDetailed(payload) {
    await ensureHealthy();
    return invoke("classify", payload, { timeoutMs: 20000 });
  }

  async function classify(payload) {
    const response = await classifyDetailed(payload);
    return response.result;
  }

  async function ping(options = {}) {
    await health({ force: Boolean(options.force), maxAgeMs: 0 });
    return invoke("ping", { clientVersion: CLIENT_VERSION }, { timeoutMs: 18000, networkRetry: true });
  }

  window.TaqareerAI = {
    getConfig,
    saveConfig,
    clearConfig,
    isConfigured,
    normalizeEndpoint,
    validateEndpoint,
    getHealth,
    health,
    ensureHealthy,
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
