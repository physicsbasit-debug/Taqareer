const EDGE_VERSION = "0.15.9";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_FAST_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_ANALYSIS_MODEL = "gemini-3.6-flash";
const FAST_MODEL_FALLBACKS = Object.freeze(["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"]);
const GENERAL_MODEL_FALLBACKS = Object.freeze(["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]);
const PRIMARY_REASONING_MODELS = Object.freeze(["gemini-3.6-flash", "gemini-3.5-flash"]);
const PRIMARY_ACTION_MODELS = Object.freeze(["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"]);
const PRIMARY_REPAIR_MODELS = Object.freeze(["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]);
const PRIMARY_TRANSIENT_RESCUE_MODELS = Object.freeze(["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash"]);
const MAX_REQUEST_BYTES = 9_000_000;
const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000;
const PRIMARY_ANALYSIS_DEADLINE_MS = 45_000;
// احجز جزءًا من المهلة للإنقاذ الشبكي والإصلاح النهائي بدل السماح للمرحلة الأولى باستهلاك كامل الـ45 ثانية.
const PRIMARY_INITIAL_PHASE_DEADLINE_MS = 26_000;
const PRIMARY_TRANSIENT_RESCUE_PHASE_DEADLINE_MS = 36_500;
const PRIMARY_REASONING_ATTEMPT_TIMEOUT_MS = 15_000;
const PRIMARY_ACTION_ATTEMPT_TIMEOUT_MS = 13_000;
const PRIMARY_REPAIR_ATTEMPT_TIMEOUT_MS = 11_000;
const PRIMARY_TRANSIENT_RESCUE_ATTEMPT_TIMEOUT_MS = 8_000;
const PRIMARY_MIN_REMAINING_MS = 2_500;

type JsonRecord = Record<string, unknown>;

const CLASSIFICATION_SCHEMA: JsonRecord = {
  type: "object",
  additionalProperties: false,
  properties: {
    classification: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        nameAr: { type: "string" },
        confidence: { type: "number" },
        rationale: { type: "string" },
      },
      required: ["id", "nameAr", "confidence", "rationale"],
    },
    analysisProfile: {
      type: "object",
      additionalProperties: false,
      properties: {
        shape: { type: "string" },
        unitOfAnalysis: { type: "string" },
        dataNature: { type: "string" },
        aggregationLevel: { type: "string" },
        orientation: { type: "string" },
        measureType: { type: "string" },
        scaleDirection: { type: "string" },
        analyzerId: { type: "string" },
        recommendedTypeId: { type: "string" },
        requiresScoreSettings: { type: "boolean" },
        confidence: { type: "number" },
        rationale: { type: "string" },
        analysisFamilies: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
        dimensionFields: { type: "array", maxItems: 12, items: { type: "string" } },
        measureFields: { type: "array", maxItems: 20, items: { type: "string" } },
        levelFields: { type: "array", maxItems: 10, items: { type: "string" } },
        totalFields: { type: "array", maxItems: 6, items: { type: "string" } },
      },
      required: ["shape", "unitOfAnalysis", "dataNature", "aggregationLevel", "orientation", "measureType", "scaleDirection", "analyzerId", "recommendedTypeId", "requiresScoreSettings", "confidence", "rationale", "analysisFamilies", "dimensionFields", "measureFields", "levelFields", "totalFields"],
    },
    suggestedNewType: {
      type: "object",
      additionalProperties: false,
      properties: {
        needed: { type: "boolean" },
        nameAr: { type: "string" },
        purpose: { type: "string" },
      },
      required: ["needed", "nameAr", "purpose"],
    },
  },
  required: ["classification", "analysisProfile", "suggestedNewType"],
};

const VISION_SCHEMA: JsonRecord = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        nameAr: { type: "string" },
        confidence: { type: "number" },
        rationale: { type: "string" },
      },
      required: ["id", "nameAr", "confidence", "rationale"],
    },
    extractionMode: { type: "string", enum: ["table", "narrative", "mixed"] },
    title: { type: "string" },
    metadata: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { key: { type: "string" }, value: { type: "string" } },
        required: ["key", "value"],
      },
    },
    datasets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          headers: { type: "array", items: { type: "string" } },
          rows: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { cells: { type: "array", items: { type: "string" } } },
              required: ["cells"],
            },
          },
        },
        required: ["name", "headers", "rows"],
      },
    },
    narrativeText: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["documentType", "extractionMode", "title", "metadata", "datasets", "narrativeText", "warnings"],
};


const PRIMARY_ANALYSIS_SCHEMA: JsonRecord = {
  type: "object",
  additionalProperties: false,
  properties: {
    contractVersion: { type: "string" },
    analysisProfile: {
      type: "object",
      additionalProperties: false,
      properties: {
        method: { type: "string" },
        dataAdequacy: { type: "string" },
        dimensions: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
        decisionUses: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
      },
      required: ["method", "dataAdequacy", "dimensions", "decisionUses"],
    },
    executive: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        overallJudgement: { type: "string" },
        confidence: { type: "string", enum: ["مرتفعة", "متوسطة", "منخفضة"] },
        evidenceRefs: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
        limitations: { type: "array", maxItems: 2, items: { type: "string" } },
      },
      required: ["title", "summary", "overallJudgement", "confidence", "evidenceRefs", "limitations"],
    },
    analysisUnits: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          diagnosticAnalysis: { type: "string" },
          decisionFinding: { type: "string" },
          claimType: { type: "string", enum: ["fact", "inference", "hypothesis"] },
          evidenceRefs: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          confidence: { type: "string", enum: ["مرتفعة", "متوسطة", "منخفضة"] },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          educationalImpact: { type: "string" },
          recommendedAction: { type: "string" },
          alternativeExplanations: { type: "array", maxItems: 1, items: { type: "string" } },
          limitations: { type: "array", maxItems: 2, items: { type: "string" } },
          dataRequests: { type: "array", maxItems: 2, items: { type: "string" } },
        },
        required: ["title", "diagnosticAnalysis", "decisionFinding", "claimType", "evidenceRefs", "confidence", "severity", "educationalImpact", "recommendedAction", "alternativeExplanations", "limitations", "dataRequests"],
      },
    },
    interventions: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: { type: "string" },
          issue: { type: "string" },
          targetGroup: { type: "string" },
          targetGroupIds: { type: "array", maxItems: 4, items: { type: "string" } },
          action: { type: "string" },
          implementationSteps: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
          responsibleRole: { type: "string" },
          timeframe: { type: "string" },
          successIndicator: { type: "string" },
          successMetric: {
            type: "object",
            additionalProperties: false,
            properties: {
              mode: { type: "string", enum: ["mastery_gain", "segment_reduction", "mastery_maintenance", "custom"] },
              targetValue: { type: "number" },
              targetSegmentId: { type: "string" },
            },
            required: ["mode", "targetValue", "targetSegmentId"],
          },
          monitoringMethod: { type: "string" },
          contingency: { type: "string" },
          resources: { type: "array", maxItems: 2, items: { type: "string" } },
          evidenceRefs: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
        },
        required: ["priority", "issue", "targetGroup", "targetGroupIds", "action", "implementationSteps", "responsibleRole", "timeframe", "successIndicator", "successMetric", "monitoringMethod", "contingency", "resources", "evidenceRefs"],
      },
    },
    methodChecks: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
          interpretation: { type: "string" },
          requiredData: { type: "array", maxItems: 2, items: { type: "string" } },
          evidenceRefs: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
        },
        required: ["name", "reason", "interpretation", "requiredData", "evidenceRefs"],
      },
    },
    monitoringPlan: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          stage: { type: "string" },
          timing: { type: "string" },
          measure: { type: "string" },
          owner: { type: "string" },
          evidenceRefs: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
        },
        required: ["stage", "timing", "measure", "owner", "evidenceRefs"],
      },
    },
    additionalCautions: { type: "array", maxItems: 3, items: { type: "string" } },
    missingDataRequests: { type: "array", maxItems: 3, items: { type: "string" } },
    suggestedNewType: {
      type: "object",
      additionalProperties: false,
      properties: {
        needed: { type: "boolean" },
        nameAr: { type: "string" },
        purpose: { type: "string" },
      },
      required: ["needed", "nameAr", "purpose"],
    },
  },
  required: ["contractVersion", "analysisProfile", "executive", "analysisUnits", "interventions", "methodChecks", "monitoringPlan", "additionalCautions", "missingDataRequests", "suggestedNewType"],
};

const PRIMARY_SCHEMA_PROPERTIES = PRIMARY_ANALYSIS_SCHEMA.properties as JsonRecord;

// v0.15.5: لا نطلب العقد الضخم كاملًا في استجابة Gemini واحدة.
// نقسمه إلى reasoning + action، ثم نركبه ونمرره على الحارس الكامل نفسه.
const PRIMARY_REASONING_SCHEMA: JsonRecord = {
  type: "object",
  additionalProperties: false,
  properties: {
    contractVersion: PRIMARY_SCHEMA_PROPERTIES.contractVersion,
    analysisProfile: PRIMARY_SCHEMA_PROPERTIES.analysisProfile,
    executive: PRIMARY_SCHEMA_PROPERTIES.executive,
    analysisUnits: PRIMARY_SCHEMA_PROPERTIES.analysisUnits,
    methodChecks: PRIMARY_SCHEMA_PROPERTIES.methodChecks,
    additionalCautions: PRIMARY_SCHEMA_PROPERTIES.additionalCautions,
    missingDataRequests: PRIMARY_SCHEMA_PROPERTIES.missingDataRequests,
    suggestedNewType: PRIMARY_SCHEMA_PROPERTIES.suggestedNewType,
  },
  required: ["contractVersion", "analysisProfile", "executive", "analysisUnits", "methodChecks", "additionalCautions", "missingDataRequests", "suggestedNewType"],
};

const PRIMARY_ACTION_SCHEMA: JsonRecord = {
  type: "object",
  additionalProperties: false,
  properties: {
    interventions: PRIMARY_SCHEMA_PROPERTIES.interventions,
    monitoringPlan: PRIMARY_SCHEMA_PROPERTIES.monitoringPlan,
  },
  required: ["interventions", "monitoringPlan"],
};

function normalizeOrigin(value: string): string {
  const raw = String(value || "").trim();
  if (!raw || raw === "*") return raw;
  try { return new URL(raw).origin; }
  catch { return raw.replace(/\/+$/, ""); }
}

function allowedOrigins(): string[] {
  return (Deno.env.get("TAQAREER_ALLOWED_ORIGINS") || "*")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

function originIsAllowed(origin: string | null): boolean {
  const allowed = allowedOrigins();
  if (allowed.includes("*")) return true;
  if (!origin) return true;
  return allowed.includes(normalizeOrigin(origin));
}

function corsHeaders(origin: string | null): HeadersInit {
  const normalized = origin ? normalizeOrigin(origin) : "";
  return {
    "Access-Control-Allow-Origin": normalized || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-taqareer-access-code, x-taqareer-client-version, x-taqareer-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "x-taqareer-edge-version, x-taqareer-request-id, x-request-id",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Taqareer-Edge-Version": EDGE_VERSION,
    },
  });
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secureEqual(a: string, b: string): Promise<boolean> {
  const left = await digest(a);
  const right = await digest(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

function normalizeModelName(value: string): string {
  return String(value || DEFAULT_MODEL).trim().replace(/^models\//, "") || DEFAULT_MODEL;
}

function configuredModelList(envName: string, defaults: readonly string[]): string[] {
  const raw = String(Deno.env.get(envName) || "").trim();
  if (!raw) return [...defaults];
  const configured = raw.split(/[,;\n]/).map(item => item.trim()).filter(Boolean).map(normalizeModelName);
  return configured.length ? [...new Set(configured)] : [...defaults];
}

function configuredModelChain(preferredEnvName: string, fallbackEnvName: string, defaultPreferred: string, defaultFallbacks: readonly string[]): string[] {
  const preferredRaw = String(Deno.env.get(preferredEnvName) || "").trim();
  const preferred = preferredRaw ? normalizeModelName(preferredRaw) : normalizeModelName(defaultPreferred);
  return uniqueModelCandidates(preferred, configuredModelList(fallbackEnvName, defaultFallbacks));
}

function shouldRetryGemini(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

type GeminiFailureKind = "rate_limit" | "capacity" | "timeout" | "network" | "unavailable" | "other";

type GeminiRequestFailure = Error & {
  status?: number;
  failureKind?: GeminiFailureKind;
  retryAfterMs?: number;
  providerRequestId?: string;
  attemptedModelNames?: string[];
};

function geminiErrorStatus(error: unknown): number {
  return Number((error as { status?: number })?.status || 0);
}

function geminiErrorMessage(error: unknown): string {
  return String((error as { message?: string })?.message || "");
}

function geminiErrorRetryAfterMs(error: unknown): number {
  return Math.max(0, Number((error as { retryAfterMs?: number })?.retryAfterMs || 0));
}

function geminiErrorAttemptedModels(error: unknown): string[] {
  return Array.isArray((error as { attemptedModelNames?: string[] })?.attemptedModelNames)
    ? [...new Set(((error as { attemptedModelNames?: string[] }).attemptedModelNames || []).map(normalizeModelName).filter(Boolean))]
    : [];
}

function parseRetryAfterMs(value: string | null): number {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(120_000, Math.round(seconds * 1000));
  const target = Date.parse(raw);
  if (Number.isFinite(target)) return Math.min(120_000, Math.max(0, target - Date.now()));
  return 0;
}

function modelFailureKind(error: unknown): GeminiFailureKind {
  const annotated = error as { failureKind?: GeminiFailureKind };
  if (annotated?.failureKind) return annotated.failureKind;
  const status = geminiErrorStatus(error);
  const message = geminiErrorMessage(error);
  if (status === 429 || /RESOURCE_EXHAUSTED|rate limit|quota|too many requests/i.test(message)) return "rate_limit";
  if (status === 404 || /no longer available|not found|does not exist|unknown model|unsupported model|model.*unavailable/i.test(message)) return "unavailable";
  if (status === 408 || status === 504 || /timeout|timed out|مهلة استجابة نموذج|مهلة التحليل/i.test(message)) return "timeout";
  if (status === 503 || status >= 500 || /high demand|spikes in demand|temporar(?:y|ily)|overload(?:ed)?|service unavailable/i.test(message)) return "capacity";
  if (/تعذر الاتصال|network|fetch failed|connection/i.test(message)) return "network";
  return "other";
}

function modelIsTransientlyBusy(error: unknown): boolean {
  const kind = modelFailureKind(error);
  return kind === "capacity" || kind === "timeout" || kind === "network";
}

async function wait(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

type GeminiRequestOptions = {
  attemptTimeoutMs?: number;
  deadlineAt?: number;
  minRemainingMs?: number;
};

function geminiRequestError(
  message: string,
  status: number,
  metadata: { failureKind?: GeminiFailureKind; retryAfterMs?: number; providerRequestId?: string; attemptedModelNames?: string[] } = {},
): GeminiRequestFailure {
  const error = new Error(message) as GeminiRequestFailure;
  error.status = status;
  error.failureKind = metadata.failureKind || modelFailureKind({ status, message });
  error.retryAfterMs = Math.max(0, Number(metadata.retryAfterMs || 0));
  error.providerRequestId = String(metadata.providerRequestId || "");
  error.attemptedModelNames = Array.isArray(metadata.attemptedModelNames) ? [...metadata.attemptedModelNames] : [];
  return error;
}

async function geminiRequest(
  model: string,
  requestBody: JsonRecord,
  maxAttempts = 2,
  options: GeminiRequestOptions = {},
): Promise<{ raw: JsonRecord; requestId: string | null }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("سر GEMINI_API_KEY غير مضبوط في Supabase.");
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(normalizeModelName(model))}:generateContent`;
  let lastMessage = "تعذر الاتصال بـGemini.";
  const attemptLimit = Math.max(1, maxAttempts);
  const requestedAttemptTimeout = Math.max(5_000, Number(options.attemptTimeoutMs || 45_000));
  const minRemainingMs = Math.max(1_000, Number(options.minRemainingMs || 2_000));

  for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
    const remainingMs = options.deadlineAt ? Number(options.deadlineAt) - performance.now() : Number.POSITIVE_INFINITY;
    if (Number.isFinite(remainingMs) && remainingMs <= minRemainingMs) {
      throw geminiRequestError("انتهت مهلة التحليل الذكي داخل الخادم قبل بدء محاولة نموذج جديدة.", 504);
    }
    const attemptTimeoutMs = Number.isFinite(remainingMs)
      ? Math.max(1_000, Math.min(requestedAttemptTimeout, remainingMs - 500))
      : requestedAttemptTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
    let response: Response;
    let rawText = "";
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      // تبقى مهلة المحاولة فعالة حتى اكتمال جسم الاستجابة، لا حتى وصول الترويسات فقط.
      // هذا يمنع بقاء Edge ينتظر stream متعثرًا بعد انتهاء الميزانية بينما يسبق العميل بإلغائه.
      rawText = await response.text();
    } catch (error) {
      const aborted = (error as { name?: string })?.name === "AbortError" || controller.signal.aborted;
      lastMessage = aborted
        ? `انتهت مهلة استجابة نموذج Gemini بعد ${Math.round(attemptTimeoutMs / 1000)} ثانية.`
        : `تعذر الاتصال بنموذج Gemini: ${String((error as { message?: string })?.message || error || "خطأ شبكة")}`;
      const status = aborted ? 504 : 503;
      const failureKind: GeminiFailureKind = aborted ? "timeout" : "network";
      if (attempt === attemptLimit - 1) throw geminiRequestError(lastMessage, status, { failureKind });
      const baseDelay = 500 * (2 ** attempt);
      await wait(baseDelay + Math.floor(Math.random() * 200));
      continue;
    } finally {
      clearTimeout(timeoutId);
    }

    const requestId = response.headers.get("x-request-id") || response.headers.get("x-goog-request-id");
    let raw: JsonRecord = {};
    try { raw = rawText ? JSON.parse(rawText) as JsonRecord : {}; }
    catch { raw = { error: { message: rawText || "استجابة غير مفهومة من Gemini." } }; }
    if (response.ok) return { raw, requestId };
    const errorObject = raw.error && typeof raw.error === "object" ? raw.error as JsonRecord : {};
    lastMessage = String(errorObject.message || `فشل Gemini برمز ${response.status}.`);
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    const failureKind = modelFailureKind({ status: response.status, message: lastMessage });
    if (!shouldRetryGemini(response.status) || attempt === attemptLimit - 1 || failureKind === "rate_limit") {
      throw geminiRequestError(lastMessage, response.status, { failureKind, retryAfterMs, providerRequestId: requestId || "" });
    }
    const baseDelay = 500 * (2 ** attempt);
    await wait(baseDelay + Math.floor(Math.random() * 200));
  }
  throw new Error(lastMessage);
}

function uniqueModelCandidates(preferred: string, fallbacks: readonly string[]): string[] {
  return [...new Set([preferred, ...fallbacks].map(normalizeModelName).filter(Boolean))];
}

function modelIsUnavailable(error: unknown): boolean {
  const item = error as { status?: number; message?: string };
  const message = String(item?.message || "");
  return item?.status === 404 || /no longer available|not found|does not exist|unknown model|unsupported model|model.*unavailable/i.test(message);
}

type GeminiFallbackError = GeminiRequestFailure & {
  attemptedModels?: number;
  attemptedModelNames?: string[];
  fallbackReason?: string;
};

function annotateGeminiFallbackFailure(
  error: unknown,
  attemptedModelNames: string[],
  fallbackReason: string,
): GeminiFallbackError {
  const annotated = (error instanceof Error ? error : new Error(String(error || "تعذر تشغيل نموذج Gemini."))) as GeminiFallbackError;
  const names = [...new Set(attemptedModelNames.map(normalizeModelName).filter(Boolean))];
  annotated.attemptedModels = Math.max(1, names.length);
  annotated.attemptedModelNames = names;
  annotated.fallbackReason = fallbackReason || "";
  annotated.failureKind = annotated.failureKind || modelFailureKind(annotated);
  return annotated;
}

async function geminiRequestWithFallback(
  models: string[],
  requestBody: JsonRecord,
  maxAttempts = 2,
  options: GeminiRequestOptions = {},
): Promise<{ raw: JsonRecord; requestId: string | null; modelUsed: string; fallbackUsed: boolean; fallbackReason: string; attemptedModels: number; attemptedModelNames: string[] }> {
  let lastError: unknown = null;
  let fallbackReason = "";
  const attemptedModelNames: string[] = [];
  for (let index = 0; index < models.length; index += 1) {
    const model = normalizeModelName(models[index]);
    attemptedModelNames.push(model);
    try {
      const response = await geminiRequest(model, requestBody, maxAttempts, options);
      return { ...response, modelUsed: model, fallbackUsed: index > 0, fallbackReason, attemptedModels: attemptedModelNames.length, attemptedModelNames: [...attemptedModelNames] };
    } catch (error) {
      lastError = error;
      const kind = modelFailureKind(error);
      // 429 يعني حد معدل/حصة. تبديل النموذج فورًا يضاعف ضغط المشروع وقد يمدد المشكلة؛
      // نوقف fan-out ونحافظ على 429 كما هو حتى يطبق العميل backoff مناسبًا.
      if (kind === "rate_limit") throw annotateGeminiFallbackFailure(error, attemptedModelNames, "rate_limit");
      const canSwitchModel = kind === "unavailable" || kind === "capacity" || kind === "timeout" || kind === "network";
      if (!canSwitchModel || index === models.length - 1) {
        throw annotateGeminiFallbackFailure(error, attemptedModelNames, fallbackReason);
      }
      fallbackReason = kind === "unavailable" ? "model_unavailable" : `transient_${kind}`;
    }
  }
  throw annotateGeminiFallbackFailure(lastError, attemptedModelNames, fallbackReason);
}

function candidateResult(raw: JsonRecord): { text: string; finishReason: string } {
  const candidates = Array.isArray(raw.candidates) ? raw.candidates as JsonRecord[] : [];
  const first = candidates[0];
  if (!first) {
    const feedback = raw.promptFeedback && typeof raw.promptFeedback === "object" ? raw.promptFeedback as JsonRecord : {};
    const blockReason = String(feedback.blockReason || "");
    if (blockReason) throw new Error(`حظر Gemini الطلب: ${blockReason}.`);
    throw new Error("لم يرجع Gemini أي نتيجة.");
  }
  const content = first.content && typeof first.content === "object" ? first.content as JsonRecord : {};
  const parts = Array.isArray(content.parts) ? content.parts as JsonRecord[] : [];
  const text = parts.map(part => typeof part.text === "string" ? part.text : "").filter(Boolean).join("\n").trim();
  return { text, finishReason: String(first.finishReason || "STOP") };
}

function parseJsonObject(text: string): JsonRecord {
  const unfenced = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const variants = [unfenced];
  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) variants.push(unfenced.slice(firstBrace, lastBrace + 1));
  let lastError: unknown = null;
  for (const candidate of variants) {
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("الجذر ليس كائن JSON.");
      return parsed as JsonRecord;
    } catch (error) { lastError = error; }
  }
  throw new Error(`رجع Gemini JSON غير مكتمل: ${lastError instanceof Error ? lastError.message : "تعذر التحليل"}.`);
}

function parseImageDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("صيغة الصورة غير صالحة.");
  return { mimeType: match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase(), data: match[2] };
}

function validateVisualPayload(payload: JsonRecord): Array<{ label: string; dataUrl: string }> {
  const images = Array.isArray(payload.images) ? payload.images : [];
  if (!images.length) throw new Error("لم تصل أي صورة إلى وظيفة القراءة البصرية.");
  if (images.length > MAX_IMAGE_COUNT) throw new Error(`الحد الأعلى ${MAX_IMAGE_COUNT} صور في الطلب الواحد.`);
  return images.map((image, index) => {
    if (!image || typeof image !== "object") throw new Error(`الصورة رقم ${index + 1} غير صالحة.`);
    const item = image as JsonRecord;
    const dataUrl = String(item.dataUrl || "");
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(dataUrl)) throw new Error(`تنسيق الصورة رقم ${index + 1} غير مدعوم.`);
    if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) throw new Error(`الصورة رقم ${index + 1} كبيرة جدًا.`);
    return { label: String(item.label || `صورة ${index + 1}`), dataUrl };
  });
}

function contractObject(payload: JsonRecord): JsonRecord {
  return payload.reconciliationContract && typeof payload.reconciliationContract === "object"
    ? payload.reconciliationContract as JsonRecord
    : {};
}

function targetMap(payload: JsonRecord): Map<string, Set<string>> {
  const contract = contractObject(payload);
  const output = new Map<string, Set<string>>();
  const executive = contract.executive && typeof contract.executive === "object" ? contract.executive as JsonRecord : {};
  if (executive.id) output.set(`executive:${String(executive.id)}`, new Set(Array.isArray(executive.allowedFields) ? executive.allowedFields.map(String) : []));
  const patchTargets = contract.patchTargets && typeof contract.patchTargets === "object" ? contract.patchTargets as JsonRecord : {};
  const groups: Array<[string, string]> = [["findings", "finding"], ["interventions", "intervention"]];
  for (const [key, type] of groups) {
    const items = Array.isArray(patchTargets[key]) ? patchTargets[key] as JsonRecord[] : [];
    for (const item of items) output.set(`${type}:${String(item.id || "")}`, new Set(Array.isArray(item.allowedFields) ? item.allowedFields.map(String) : []));
  }
  return output;
}

function validateFastDelta(result: unknown, payload: JsonRecord): JsonRecord {
  if (!result || typeof result !== "object") throw new Error("رجع Gemini نتيجة فارغة.");
  const output = structuredClone(result) as JsonRecord;
  const contract = contractObject(payload);
  const deepTargets = new Set((Array.isArray(contract.deepAnalysisTargets) ? contract.deepAnalysisTargets as JsonRecord[] : []).map(item => String(item.id || "")).filter(Boolean));
  const targets = targetMap(payload);
  const allowedEvidence = new Set((Array.isArray(payload.availableEvidenceRefs) ? payload.availableEvidenceRefs : []).map(String));
  const deep = Array.isArray(output.deepAnalysisUnits) ? output.deepAnalysisUnits as JsonRecord[] : [];
  const seenDeep = new Set<string>();
  const acceptedDeep = deep.slice(0, 4).filter(item => {
    const id = String(item.targetId || "");
    if (!id || !deepTargets.has(id) || seenDeep.has(id)) return false;
    seenDeep.add(id);
    const refs = (Array.isArray(item.evidenceRefs) ? item.evidenceRefs : []).map(String).filter(ref => allowedEvidence.has(ref));
    item.evidenceRefs = refs;
    return Boolean(String(item.analysis || "").trim() && refs.length);
  });
  const patches = Array.isArray(output.patches) ? output.patches as JsonRecord[] : [];
  const seenPatch = new Set<string>();
  const acceptedPatches = patches.slice(0, 14).filter(item => {
    const type = String(item.targetType || "");
    const id = String(item.targetId || "");
    const field = String(item.field || "");
    const key = `${type}:${id}:${field}`;
    const allowed = targets.get(`${type}:${id}`);
    if (!allowed || !allowed.has(field) || seenPatch.has(key)) return false;
    seenPatch.add(key);
    const refs = (Array.isArray(item.evidenceRefs) ? item.evidenceRefs : []).map(String).filter(ref => allowedEvidence.has(ref));
    item.evidenceRefs = refs;
    return Boolean(String(item.text || "").trim() || (Array.isArray(item.items) && item.items.some(value => String(value || "").trim())));
  });
  output.contractVersion = "5.1.0";
  output.deepAnalysisUnits = acceptedDeep;
  output.patches = acceptedPatches;
  output.additionalCautions = Array.isArray(output.additionalCautions) ? output.additionalCautions.map(String).filter(Boolean).slice(0, 3) : [];
  output.missingDataRequests = Array.isArray(output.missingDataRequests) ? output.missingDataRequests.map(String).filter(Boolean).slice(0, 4) : [];
  output.validation = {
    acceptedDeepAnalysisUnits: acceptedDeep.length,
    acceptedPatches: acceptedPatches.length,
    returnedDeepAnalysisUnits: deep.length,
    returnedPatches: patches.length,
  };
  return output;
}

function classificationInstructions(): string {
  return `أنت مهندس فهم بنية البيانات التربوية في تطبيق «تقارير». لا تكتفِ باختيار اسم نوع جاهز، ولا تُجبر الملف على قالب معروف.

المطلوب مرحلتان في استجابة واحدة:
1) classification: أقرب نوع معروف إن انطبق فعلًا، أو unknown إن كان الملف نوعًا جديدًا.
2) analysisProfile: ملف دلالي مستقل يحدد وحدة التحليل، مستوى التجميع، طبيعة المقاييس، اتجاه المقياس، الحقول البعدية والعددية، وعائلات التحليل المناسبة.

قواعد إلزامية:
- استند إلى العنوان، الترويسة، أسماء الأعمدة، عينات القيم، وملف البنية المحلي المرسل semanticProfile.
- لا تعتبر كل جدول رقمي «درجات طلاب». فرّق بين السجلات الفردية، التوزيعات المجمعة، المؤشرات، المقارنات، السلاسل الزمنية، والنصوص السردية.
- إذا وجدت أعمدة مستويات مثل أ، ب، ج، د، هـ أو مسميات متميز/جيد/ملائم مع صفوف شعب أو صفوف، فهذا توزيع مستويات مجمع؛ analyzerId وrecommendedTypeId = level_distribution، requiresScoreSettings = false.
- إذا كان كل صف يمثل طالبًا وتكررت أزواج «اسم المادة - الدرجة» و«اسم المادة - المستوى» لعدة مواد، فهذا سجل نتائج فردي متعدد المواد؛ analyzerId وrecommendedTypeId = multi_subject_results، unitOfAnalysis = student، aggregationLevel = individual، requiresScoreSettings = false. لا تختزله إلى عمود درجة واحد ولا تحوله إلى توزيع مجمع.
- إذا كان الملف المجمع يحتوي صف إجمالي، اعتبره صف تحقق لا سجلًا إضافيًا للحساب.
- لا تطلب الدرجة الكلية أو حد الإتقان لملف توزيع مجمع أو مؤشرات أو استبانة.
- analyzerId يجب أن يكون أحد: single_subject, assessment_component, level_distribution, multi_subject_results, cross_subject, supervision_indicator, supervision_multi_visit, student_work, supervision_narrative, survey, training_needs, program_evaluation, behavior_attendance, unknown.
- analysisFamilies تصف طرق التحليل المطلوبة لهذا الملف، لا قائمة موحدة لكل الملفات.
- إذا لم ينطبق نوع معروف، اجعل suggestedNewType.needed = true واقترح اسمًا وغرضًا، مع analyzerId = unknown وملف دلالي قابل للتحليل التكيفي.
- لا تعرض أسماء أشخاص أو أرقام هوية. أعد JSON فقط وفق المخطط.`;
}

function visionInstructions(): string {
  return `اقرأ المستندات التربوية المصورة بدقة دون اختراع. استخرج الجداول كما تظهر، واجمع النص السردي مع عناوينه، واستخدم [غير واضح] عند الشك. لا تحسب النتائج ولا تصحح المصدر صامتًا.`;
}

function fastEnhancementInstructions(): string {
  return `أنت محلل تربوي عربي سريع ودقيق. التحليل المحلي المرسل مكتمل بالحسابات والرسوم والأدلة. حسّن المعنى التربوي فقط في طلب واحد قصير.
لا تغيّر الأرقام أو الفئات أو عدد الاستنتاجات والتدخلات. استخدم targetId الموجود فقط. أنشئ حتى 4 deepAnalysisUnits موجزة وعميقة، وحتى 14 patch لتحسين educationalImpact وrecommendedAction للاستنتاجات ثم action وsuccessIndicator وmonitoringMethod وcontingency للتدخلات. لا تحسن أدوات الجودة ولا المتابعة. استخدم evidenceRefs المتاحة فقط. لا تكرر الأرقام؛ فسّر أثرها على القرار. أعد JSON خامًا فقط بالمفاتيح contractVersion, deepAnalysisUnits, patches, additionalCautions, missingDataRequests. اجعل كل تحليل 250-550 حرفًا وكل patch 80-350 حرفًا.`;
}

function edgeHealth(): JsonRecord {
  return {
    result: { status: "ready" },
    provider: "supabase-edge",
    edgeVersion: EDGE_VERSION,
    aiKeyConfigured: Boolean(Deno.env.get("GEMINI_API_KEY")),
  };
}

async function pingGemini(): Promise<JsonRecord> {
  const models = configuredModelChain("GEMINI_FAST_MODEL", "GEMINI_FAST_FALLBACK_MODELS", DEFAULT_FAST_MODEL, FAST_MODEL_FALLBACKS);
  const { raw, requestId, modelUsed, fallbackUsed } = await geminiRequestWithFallback(models, {
    contents: [{ role: "user", parts: [{ text: "أجب بكلمة READY فقط." }] }],
    generationConfig: { maxOutputTokens: 64, candidateCount: 1, temperature: 0 },
  }, 1);
  const candidate = candidateResult(raw);
  if (!/ready/i.test(candidate.text)) throw new Error("اتصلت الوظيفة بـGemini لكن رد الاختبار غير متوقع.");
  return { result: { status: "ready" }, model: String(raw.modelVersion || modelUsed), usage: raw.usageMetadata || null, requestId, provider: "gemini", fallbackUsed };
}

async function classify(payload: JsonRecord): Promise<JsonRecord> {
  const models = configuredModelChain("GEMINI_CLASSIFIER_MODEL", "GEMINI_CLASSIFIER_FALLBACK_MODELS", DEFAULT_FAST_MODEL, FAST_MODEL_FALLBACKS);
  const startedAt = performance.now();
  const { raw, requestId, modelUsed, fallbackUsed } = await geminiRequestWithFallback(models, {
    systemInstruction: { parts: [{ text: classificationInstructions() }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: CLASSIFICATION_SCHEMA, maxOutputTokens: 1800, candidateCount: 1, temperature: 0 },
  }, 2);
  const candidate = candidateResult(raw);
  return { result: parseJsonObject(candidate.text), model: String(raw.modelVersion || modelUsed), usage: raw.usageMetadata || null, requestId, provider: "gemini", serverTiming: { geminiMs: Math.round(performance.now() - startedAt), payloadChars: JSON.stringify(payload).length, fallbackUsed } };
}

async function extractVisual(payload: JsonRecord): Promise<JsonRecord> {
  const models = configuredModelChain("GEMINI_MODEL", "GEMINI_GENERAL_FALLBACK_MODELS", DEFAULT_MODEL, GENERAL_MODEL_FALLBACKS);
  const images = validateVisualPayload(payload);
  const startedAt = performance.now();
  const parts: JsonRecord[] = [{ text: JSON.stringify({ fileName: payload.fileName, sourceKind: payload.sourceKind, locale: payload.locale, knownFormTypes: payload.knownFormTypes }) }];
  for (const image of images) {
    const parsed = parseImageDataUrl(image.dataUrl);
    parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
  }
  const { raw, requestId, modelUsed, fallbackUsed } = await geminiRequestWithFallback(models, {
    systemInstruction: { parts: [{ text: visionInstructions() }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: VISION_SCHEMA, maxOutputTokens: 6000, candidateCount: 1, temperature: 0 },
  }, 2);
  const candidate = candidateResult(raw);
  return { result: parseJsonObject(candidate.text), model: String(raw.modelVersion || modelUsed), usage: raw.usageMetadata || null, requestId, provider: "gemini", serverTiming: { geminiMs: Math.round(performance.now() - startedAt), payloadChars: JSON.stringify(payload).length, fallbackUsed } };
}

async function enhanceFast(payload: JsonRecord): Promise<JsonRecord> {
  const models = configuredModelChain("GEMINI_FAST_MODEL", "GEMINI_FAST_FALLBACK_MODELS", DEFAULT_FAST_MODEL, FAST_MODEL_FALLBACKS);
  const startedAt = performance.now();
  const { raw, requestId, modelUsed, fallbackUsed } = await geminiRequestWithFallback(models, {
    systemInstruction: { parts: [{ text: fastEnhancementInstructions() }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2600, candidateCount: 1, temperature: 0.1 },
  }, 1);
  const candidate = candidateResult(raw);
  if (candidate.finishReason === "MAX_TOKENS") throw new Error("توقف التحسين الذكي عند حد الإخراج؛ بقي التقرير المحلي كاملًا.");
  const result = validateFastDelta(parseJsonObject(candidate.text), payload);
  const validation = result.validation && typeof result.validation === "object" ? result.validation as JsonRecord : {};
  const usage = raw.usageMetadata && typeof raw.usageMetadata === "object" ? raw.usageMetadata as JsonRecord : null;
  return {
    result,
    model: String(raw.modelVersion || modelUsed),
    usage,
    requestId,
    provider: "gemini",
    serverTiming: {
      fastSingle: true,
      geminiMs: Math.round(performance.now() - startedAt),
      payloadChars: JSON.stringify(payload).length,
      finishReason: candidate.finishReason,
      thinkingLevel: "minimal",
      maxOutputTokens: 2600,
      fallbackUsed,
      outputCharacters: candidate.text.length,
      acceptedDeepAnalysisUnits: validation.acceptedDeepAnalysisUnits || 0,
      acceptedPatches: validation.acceptedPatches || 0,
    },
  };
}


function primaryAnalysisInstructions(): string {
  return `أنت كبير المحللين التربويين في تطبيق «تقارير». أنت مالك التحليل التربوي الأساسي، ولست محررًا لقوالب محلية.

ستصلك حزمة أدلة تحتوي على مؤشرات ورسوم حُسبت من كامل البيانات، مع عينة سياقية منقحة. الأرقام المحلية هي مصدر الحقيقة الحسابية. ابنِ تحليلًا أصيلًا ومتوازنًا من الأدلة نفسها.

قواعد إلزامية:
1) أخرج 3 analysisUnits مختلفة في المسار الطبيعي. غطِّ ثلاث زوايا قرار مستقلة تدعمها الأدلة، مثل مستوى النتيجة، شكل التوزيع أو التفاوت، وفرصة التدخل أو الحساسية. لا تخترع زاوية لا يدعمها الملف.
2) في كل وحدة: diagnosticAnalysis يشرح العلاقة والدلالة والحدود بعمق، بينما decisionFinding يصوغ القرار أو الأولوية الناتجة باختصار. لا تكرر النص نفسه أو تعيد صياغته شكليًا.
3) أخرج 2-3 interventions لفئات أو قضايا مختلفة. لا تجعل التدخلات نسخًا لفئة واحدة. في ملفات الدرجات استخدم targetGroupIds من المعرفات الموجودة حرفيًا داخل evidenceAnalysis.interventionMathContext.groups: mastery وnear_mastery وmoderate_gap وdeep_gap. لا تضع عددًا من عندك داخل targetGroup؛ الخادم يبني اسم الفئة وعددها.
4) في ملفات الدرجات استخدم successMetric بصورة منظمة: mastery_gain لرفع عدد المتقنين، segment_reduction لخفض فئة تعثر بعينها، mastery_maintenance لتثبيت المتقنين. targetValue يعني النسبة المستهدفة للإتقان في mastery_gain، ونسبة الخفض في segment_reduction، ونسبة الاحتفاظ في mastery_maintenance. لا تعتمد على successIndicator النصي لحساب الهدف؛ الخادم سيعيد بناء المؤشر ويمنع أي هدف مستحيل. في الأنواع غير الدرجية استخدم targetGroupIds فارغة وsuccessMetric.mode = custom وtargetValue = 0 وtargetSegmentId فارغًا، واكتب successIndicator المناسب للسياق.
5) أخرج 1-2 methodChecks عندما تضيف أداة مثل التشتت أو الالتواء أو الحساسية معنى يغير القرار، وليس لمجرد الزينة الإحصائية.
6) أخرج monitoringPlan من 3 مراحل بالضبط: خط أساس، متابعة مرحلية، وقياس أثر نهائي. يجب أن تكون المقاييس قابلة للتحقق ومرتبطة بالتدخلات.
7) ميّز claimType: fact لحقيقة مباشرة، inference لاستنتاج تدعمه العلاقات، hypothesis لفرضية تحتاج تحققًا.
8) كل وحدة وتدخل وفحص ومرحلة متابعة تستخدم evidenceRefs موجودة حرفيًا في availableEvidenceRefs. لا تخترع مرجعًا أو رقمًا.
9) لا تحول الارتباط إلى سبب. استخدم تفسيرًا بديلًا واحدًا فقط عند الحاجة، واطلب البيانات الحاسمة دون قوائم مطولة.
10) إذا كانت البيانات درجات كلية فقط، لا تسمِّ مهارة أو مفهومًا بعينه. قل إن اختبارًا تشخيصيًا أو تحليل مفردات مطلوب لتحديد المهارات أو المفاهيم.
11) اجعل diagnosticAnalysis بين 190 و360 حرفًا، وdecisionFinding بين 70 و180 حرفًا، وكل educationalImpact وrecommendedAction بين 50 و140 حرفًا، والملخص التنفيذي بين 180 و360 حرفًا.
12) التدخل يحدد الفئة والمسؤول والزمن ومؤشر نجاح قابلًا للقياس وطريقة متابعة وبديلًا مختصرًا عند عدم التحسن، وبحد أقصى 3 خطوات.
13) لا تستخدم أسماء الأشخاص، ولا تستنتج خصائص شخصية أو تشخيصات حساسة.
14) اكتب بالعربية المهنية الواضحة المناسبة للمدارس في سلطنة عمان، ولا تشرح أسماء الحقول أو تعيد قائمة المؤشرات.
15) إذا كان نوع النموذج غير معروف، اقترح نوعًا جديدًا دون ادعاء اليقين.
16) استخدم بيانات الترويسة المنظمة داخل source.meta.metadata عندما تكون موجودة، ولا تدّعِ غياب المدرسة أو المادة أو العام أو الصف إذا أرسلها المصدر.
17) إذا كان source.meta.documentContext.aggregatedReport = true، فلا تسمِّ العبارات المتعارضة «تناقضًا مؤكدًا» إلا إذا أثبتت الأدلة أنها تخص المعلم نفسه والزيارة نفسها والزمن نفسه. صنّفها «تباينًا سياقيًا يحتاج فصل السجلات حسب المعلم أو الزيارة»، ولا تنسب جميع الإيجابيات والسلبيات إلى شخص واحد.
18) إذا كان recognizedType.id = supervision_multi_visit فتعامل مع data.visits كسجلات زيارات مستقلة، وافهم أن المقياس معكوس: 1 متميز و5 يحتاج إلى تدخل. حلل الاتجاهات المشتركة دون ترتيب المعلمين، واربط أي عدم اتساق رقمي سردي بالزيارة نفسها فقط، واستخدم معرفات الزيارات المحجوبة بدل أسماء الأشخاص.
19) في زيارات الإشراف المتعددة التزم حرفيًا بنطاق evidenceAnalysis.scopeContext. لا توسع targetGroup إلى الهيئة التدريسية أو جميع معلمي المدرسة إذا كانت العينة تخص قسمًا أو مواد أو زيارات محددة. اجعل التدخل محصورًا في المعلمين المشمولين بالزيارات أو في فئة أضيق تدعمها الأدلة.
20) إذا كان recognizedType.semanticProfile موجودًا، استخدمه لتحديد وحدة التحليل ومستوى التجميع وعائلات التحليل، ولا تطلب إعدادات درجات لا تخص بنية الملف.
21) إذا كان recognizedType.id = multi_subject_results فالتزم بنطاق evidenceAnalysis.scopeContext.analysisMode: عند subject حلل selectedSubject وحدها ولا تعمم على بقية المواد؛ وعند all حلل المقارنة الشاملة. جداول الأوائل ودرجة ترتيب الدفعة محسوبة محليًا ومحجوبة عنك، فلا تعِد حساب المراكز ولا تطلب أسماء الطلبة. تعامل مع evidenceAnalysis.scopeContext.rankingPolicy بوصفها سياسة حسابية مقفلة: الأوزان والمواد الأساسية والتعادل والبيانات الناقصة لا يجوز تعديلها أو اقتراح بديل لها.
22) أعد JSON فقط وفق المخطط، بلا مقدمات أو شرح خارجه.`;
}

function primaryRescueInstructions(rejectionReason = ""): string {
  const reason = cleanString(rejectionReason, 520);
  return `${primaryAnalysisInstructions()}

وضع إصلاح عقد موجّه: الاستجابة السابقة وصلت من Gemini لكنها رُفضت بعد التحقق الدلالي. أصلح سبب الرفض المحدد أدناه بدل إعادة بناء تحليل عشوائي من الصفر.
سبب الرفض السابق: ${reason || "لم تحقق الاستجابة السابقة عقد الجودة بالكامل."}
ستجد داخل payload.repairContext نسخة من المرشح السابق. احتفظ بالأجزاء الصحيحة منه، وصحح فقط ما يلزم لتحقيق العقد.
أخرج وحدتي analysisUnits مختلفتين على الأقل، وتدخلين لفئتين أو قضيتين مختلفتين، وثلاث مراحل متابعة بالضبط. يمكن أن تكون methodChecks فارغة. استخدم evidenceRefs الموجودة حرفيًا في availableEvidenceRefs فقط. لا تتجاوز 250 حرفًا في diagnosticAnalysis و130 حرفًا في decisionFinding و110 أحرف في الأثر أو الإجراء و280 حرفًا في الملخص التنفيذي. حافظ على العمق عبر الربط بين الأدلة، لا عبر الإطالة.`;
}

function buildPrimaryRepairPayload(payload: JsonRecord, rejectedText: string, rejectionReason: string): JsonRecord {
  let previousCandidate: JsonRecord = {};
  try { previousCandidate = parseJsonObject(rejectedText); } catch { previousCandidate = {}; }
  return {
    ...payload,
    repairContext: {
      mode: "contract_repair",
      rejectionReason: cleanString(rejectionReason, 520),
      previousCandidate,
    },
  };
}

function primaryReasoningInstructions(): string {
  return `${primaryAnalysisInstructions()}

مهمة هذا المقطع فقط: reasoning.
- أخرج contractVersion وanalysisProfile وexecutive وanalysisUnits وmethodChecks وadditionalCautions وmissingDataRequests وsuggestedNewType فقط.
- لا تخرج interventions ولا monitoringPlan في هذا المقطع.
- فضّل 3 وحدات تحليل عندما تسمح الأدلة، ويمكن الاكتفاء بوحدتين فقط إذا كانت الأدلة محدودة.
- methodChecks أداة إثراء وليست حشوًا؛ يمكن أن تكون مصفوفة فارغة عندما لا تضيف قيمة قرارية.
- أعد JSON خامًا فقط وفق مخطط reasoning المرسل.`;
}

function primaryActionInstructions(): string {
  return `أنت مسؤول تحويل الأدلة التربوية إلى تدخلات قابلة للتنفيذ والمتابعة في تطبيق «تقارير».

قواعد إلزامية:
1) أخرج تدخلين أو ثلاثة لقضايا أو فئات مختلفة فعلًا، لا نسخًا من نفس التدخل.
2) كل intervention يحدد issue وtargetGroup وaction وخطوات تنفيذ ومسؤولًا وزمنًا ومؤشر نجاح وطريقة متابعة وبديلًا مختصرًا.
3) استخدم evidenceRefs الموجودة حرفيًا في availableEvidenceRefs فقط.
4) في ملفات الدرجات استخدم targetGroupIds من evidenceAnalysis.interventionMathContext.groups فقط، واستخدم successMetric المنظمة؛ الخادم يملك الحساب النهائي ويصحح الهدف رقميًا.
5) في الأنواع غير الدرجية اجعل targetGroupIds فارغة وsuccessMetric.mode = custom وtargetValue = 0 وtargetSegmentId فارغًا.
6) لا تحول الارتباط إلى سبب، ولا تسمِّ مهارة لا تدعمها البيانات.
7) أخرج monitoringPlan من ثلاث مراحل بالضبط: خط أساس، متابعة مرحلية، قياس أثر نهائي.
8) اجعل التدخلات مختصرة وعملية؛ بحد أقصى 3 خطوات لكل تدخل.
9) لا تستخدم أسماء أشخاص ولا بيانات شخصية.
10) أعد JSON خامًا فقط بالمفتاحين interventions وmonitoringPlan وفق المخطط.`;
}

function primarySegmentRepairInstructions(segment: "reasoning" | "action", rejectionReason = ""): string {
  const reason = cleanString(rejectionReason, 520);
  const base = segment === "reasoning" ? primaryReasoningInstructions() : primaryActionInstructions();
  return `${base}

وضع إصلاح مقطع موجّه: الاستجابة السابقة لهذا المقطع وصلت لكنها لم تحقق العقد.
سبب الرفض: ${reason || "لم يكتمل المقطع وفق العقد."}
ستجد previousCandidate داخل payload.segmentRepairContext. احتفظ بما هو صالح وصحح سبب الرفض فقط. لا تعِد بناء المقطع من الصفر بلا حاجة.`;
}

function buildPrimarySegmentRepairPayload(
  payload: JsonRecord,
  segment: "reasoning" | "action",
  previousCandidate: JsonRecord,
  rejectionReason: string,
): JsonRecord {
  return {
    ...payload,
    segmentRepairContext: {
      mode: "segment_contract_repair",
      segment,
      rejectionReason: cleanString(rejectionReason, 520),
      previousCandidate,
    },
  };
}

function cleanString(value: unknown, limit = 1200): string {
  const text = String(value ?? "").trim();
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function cleanStringArray(value: unknown, limit = 8, itemLimit = 500): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(value) ? value : []) {
    const text = cleanString(item, itemLimit);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    output.push(text);
    if (output.length >= limit) break;
  }
  return output;
}

function allowedRefsFromPayload(payload: JsonRecord): Set<string> {
  return new Set((Array.isArray(payload.availableEvidenceRefs) ? payload.availableEvidenceRefs : []).map(String).filter(Boolean));
}

function cleanRefs(value: unknown, allowed: Set<string>, limit = 10): string[] {
  return cleanStringArray(value, limit, 180).filter(ref => allowed.has(ref));
}

function normalizeForComparison(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function textOverlapRatio(left: string, right: string): number {
  const a = new Set(normalizeForComparison(left).split(" ").filter(word => word.length > 2));
  const b = new Set(normalizeForComparison(right).split(" ").filter(word => word.length > 2));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const word of a) if (b.has(word)) overlap += 1;
  return overlap / Math.min(a.size, b.size);
}

function toFiniteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundDecimal(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

type InterventionGroup = { id: string; label: string; count: number; percentage: number };
type ScoreInterventionContext = {
  totalCount: number;
  baselineMasteryCount: number;
  baselineMasteryRate: number;
  groups: InterventionGroup[];
};

const SCORE_GROUP_LABELS: Record<string, string> = Object.freeze({
  mastery: "حققوا حد الإتقان",
  near_mastery: "قريبون من الإتقان",
  moderate_gap: "دون الإتقان بفجوة متوسطة",
  deep_gap: "دون الإتقان بفجوة عميقة",
});
const SCORE_GROUP_ORDER = Object.freeze(["near_mastery", "moderate_gap", "deep_gap", "mastery"]);

function metricValue(payload: JsonRecord, id: string): number | null {
  const evidence = payload.evidenceAnalysis && typeof payload.evidenceAnalysis === "object" ? payload.evidenceAnalysis as JsonRecord : {};
  const metrics = Array.isArray(evidence.metrics) ? evidence.metrics as JsonRecord[] : [];
  const item = metrics.find(metric => String(metric.id || "") === id);
  return item ? toFiniteNumber(item.value) : null;
}

function scoreInterventionContext(payload: JsonRecord): ScoreInterventionContext | null {
  const evidence = payload.evidenceAnalysis && typeof payload.evidenceAnalysis === "object" ? payload.evidenceAnalysis as JsonRecord : {};
  const explicit = evidence.interventionMathContext && typeof evidence.interventionMathContext === "object"
    ? evidence.interventionMathContext as JsonRecord
    : {};
  const charts = Array.isArray(evidence.charts) ? evidence.charts as JsonRecord[] : [];
  const segmentChart = charts.find(chart => String(chart.id || "") === "intervention-segments");
  const chartRows = segmentChart && Array.isArray(segmentChart.data) ? segmentChart.data as JsonRecord[] : [];
  const explicitGroups = Array.isArray(explicit.groups) ? explicit.groups as JsonRecord[] : [];
  const sourceGroups = explicitGroups.length ? explicitGroups : chartRows;
  const groups = sourceGroups
    .map(item => {
      const id = String(item.id || item.key || "").trim();
      const count = toFiniteNumber(item.count);
      if (!SCORE_GROUP_LABELS[id] || count === null || count < 0) return null;
      const percentage = toFiniteNumber(item.percentage ?? item.percent) ?? 0;
      return {
        id,
        label: cleanString(item.label || SCORE_GROUP_LABELS[id], 180) || SCORE_GROUP_LABELS[id],
        count: Math.max(0, Math.trunc(count)),
        percentage: roundDecimal(Math.max(0, percentage), 1),
      };
    })
    .filter((item): item is InterventionGroup => Boolean(item));

  const data = payload.data && typeof payload.data === "object" ? payload.data as JsonRecord : {};
  const totalCount = toFiniteNumber(explicit.totalCount) ?? metricValue(payload, "n") ?? toFiniteNumber(data.rowCount);
  const masteryGroup = groups.find(item => item.id === "mastery");
  const baselineMasteryCount = toFiniteNumber(explicit.baselineMasteryCount) ?? metricValue(payload, "masteryCount") ?? masteryGroup?.count ?? null;
  const baselineMasteryRate = toFiniteNumber(explicit.baselineMasteryRate) ?? metricValue(payload, "masteryPct")
    ?? (totalCount && baselineMasteryCount !== null ? (baselineMasteryCount / totalCount) * 100 : null);

  if (!groups.length || totalCount === null || totalCount <= 0 || baselineMasteryCount === null || baselineMasteryRate === null) return null;
  const normalizedTotal = Math.max(1, Math.trunc(totalCount));
  return {
    totalCount: normalizedTotal,
    baselineMasteryCount: Math.min(normalizedTotal, Math.max(0, Math.trunc(baselineMasteryCount))),
    baselineMasteryRate: roundDecimal(clampNumber(baselineMasteryRate, 0, 100), 1),
    groups,
  };
}

function cleanScoreGroupIds(value: unknown, context: ScoreInterventionContext): string[] {
  const allowed = new Set(context.groups.map(item => item.id));
  return [...new Set((Array.isArray(value) ? value : []).map(String).filter(id => allowed.has(id)))].slice(0, 4);
}

function groupDisplay(groups: InterventionGroup[]): string {
  return groups.map(group => `${group.label} (${group.count} طالبًا)`).join("، ");
}

function groupEvidenceRef(groupId: string): string {
  if (groupId === "mastery") return "metric:masteryCount";
  if (groupId === "near_mastery") return "metric:nearMasteryCount";
  if (groupId === "moderate_gap") return "metric:moderateGapCount";
  if (groupId === "deep_gap") return "metric:deepGapCount";
  return "";
}

function applyScoreInterventionGuard(
  base: JsonRecord,
  rawItem: JsonRecord,
  context: ScoreInterventionContext,
  allowedEvidence: Set<string>,
): JsonRecord {
  const metricInput = rawItem.successMetric && typeof rawItem.successMetric === "object" ? rawItem.successMetric as JsonRecord : {};
  let mode = ["mastery_gain", "segment_reduction", "mastery_maintenance"].includes(String(metricInput.mode))
    ? String(metricInput.mode)
    : "mastery_gain";
  let groupIds = cleanScoreGroupIds(rawItem.targetGroupIds, context);
  const groupMap = new Map(context.groups.map(group => [group.id, group]));
  const requestedTargetValue = toFiniteNumber(metricInput.targetValue) ?? 0;
  let adjusted = false;
  const adjustmentReasons: string[] = [];
  let targetGroup = "";
  let successIndicator = "";
  let numericGuard: JsonRecord = { applied: true, mode };

  if (mode === "mastery_gain") {
    if (groupIds.includes("mastery")) {
      groupIds = groupIds.filter(id => id !== "mastery");
      adjusted = true;
      adjustmentReasons.push("استُبعدت فئة المتقنين لأنها لا تضيف حالات جديدة إلى عدد المتقنين.");
    }
    let selectedGroups = groupIds.map(id => groupMap.get(id)).filter((item): item is InterventionGroup => Boolean(item && item.count > 0));
    if (!selectedGroups.length) {
      const fallback = SCORE_GROUP_ORDER.map(id => groupMap.get(id)).find(item => item && item.id !== "mastery" && item.count > 0);
      if (fallback) {
        selectedGroups = [fallback];
        groupIds = [fallback.id];
        adjusted = true;
        adjustmentReasons.push("اختيرت أقرب فئة غير متقنة متاحة لأن الفئة المرسلة لا تسمح بقياس كسب في الإتقان.");
      }
    }
    const eligibleCount = selectedGroups.reduce((sum, group) => sum + group.count, 0);
    if (eligibleCount <= 0) {
      mode = "mastery_maintenance";
      adjusted = true;
      adjustmentReasons.push("لا توجد حالات غير متقنة صالحة للكسب؛ حُوّل المؤشر إلى تثبيت الإتقان.");
    } else {
      const minimumRate = roundDecimal(((context.baselineMasteryCount + 1) / context.totalCount) * 100, 1);
      const requestedRate = requestedTargetValue > 0 ? clampNumber(requestedTargetValue, minimumRate, 100) : minimumRate;
      const requestedCount = Math.ceil((requestedRate / 100) * context.totalCount);
      const requestedGain = Math.max(1, requestedCount - context.baselineMasteryCount);
      const feasibleGain = Math.min(eligibleCount, requestedGain);
      if (feasibleGain < requestedGain) {
        adjusted = true;
        adjustmentReasons.push("خُفّض الهدف إلى الحد الممكن داخل الفئات المستهدفة بدل إبقاء نسبة مستحيلة حسابيًا.");
      }
      const targetCount = context.baselineMasteryCount + feasibleGain;
      const targetRate = roundDecimal((targetCount / context.totalCount) * 100, 1);
      const conversionRate = roundDecimal((feasibleGain / eligibleCount) * 100, 1);
      targetGroup = groupDisplay(selectedGroups);
      successIndicator = `رفع عدد المتقنين من ${context.baselineMasteryCount} إلى ${targetCount} طالبًا على الأقل، عبر انتقال ${feasibleGain} من أصل ${eligibleCount} طالبًا مستهدفًا (${conversionRate}%) إلى الإتقان، بما يرفع النسبة من ${context.baselineMasteryRate}% إلى ${targetRate}% تقريبًا.`;
      numericGuard = {
        applied: true,
        mode,
        totalCount: context.totalCount,
        baselineCount: context.baselineMasteryCount,
        baselineRate: context.baselineMasteryRate,
        eligibleCount,
        requestedTargetRate: roundDecimal(requestedRate, 1),
        requiredGain: requestedGain,
        feasibleGain,
        targetCount,
        targetRate,
        adjusted,
        adjustmentReasons,
      };
    }
  }

  if (mode === "segment_reduction") {
    let segmentId = String(metricInput.targetSegmentId || "");
    let segment = groupMap.get(segmentId);
    if (!segment || segment.id === "mastery" || segment.count <= 0) {
      segment = groupIds.map(id => groupMap.get(id)).find(item => item && item.id !== "mastery" && item.count > 0)
        || ["deep_gap", "moderate_gap", "near_mastery"].map(id => groupMap.get(id)).find(item => item && item.count > 0);
      if (segment) {
        segmentId = segment.id;
        adjusted = true;
        adjustmentReasons.push("صُححت فئة الخفض إلى فئة غير متقنة موجودة فعليًا في البيانات.");
      }
    }
    if (segment) {
      groupIds = [segment.id];
      const reductionRate = clampNumber(requestedTargetValue > 0 ? requestedTargetValue : 20, 5, 100);
      const reductionCount = Math.min(segment.count, Math.max(1, Math.ceil((reductionRate / 100) * segment.count)));
      const targetSegmentCount = Math.max(0, segment.count - reductionCount);
      const actualReductionRate = roundDecimal((reductionCount / segment.count) * 100, 1);
      targetGroup = groupDisplay([segment]);
      successIndicator = `خفض عدد ${segment.label} من ${segment.count} إلى ${targetSegmentCount} طالبًا على الأكثر، أي انتقال ${reductionCount} طالبًا (${actualReductionRate}%) إلى فئة أعلى في القياس اللاحق.`;
      numericGuard = {
        applied: true,
        mode,
        totalCount: context.totalCount,
        segmentId: segment.id,
        baselineSegmentCount: segment.count,
        reductionCount,
        targetSegmentCount,
        targetReductionRate: actualReductionRate,
        adjusted,
        adjustmentReasons,
      };
    }
  }

  if (mode === "mastery_maintenance") {
    const mastery = groupMap.get("mastery") || {
      id: "mastery",
      label: SCORE_GROUP_LABELS.mastery,
      count: context.baselineMasteryCount,
      percentage: context.baselineMasteryRate,
    };
    groupIds = ["mastery"];
    const retentionRate = clampNumber(requestedTargetValue > 0 ? requestedTargetValue : 90, 50, 100);
    const retainedCount = mastery.count > 0 ? Math.min(mastery.count, Math.max(1, Math.ceil((retentionRate / 100) * mastery.count))) : 0;
    const actualRetentionRate = mastery.count > 0 ? roundDecimal((retainedCount / mastery.count) * 100, 1) : 0;
    targetGroup = groupDisplay([mastery]);
    successIndicator = mastery.count > 0
      ? `الحفاظ على إتقان ما لا يقل عن ${retainedCount} من أصل ${mastery.count} طالبًا متقنًا (${actualRetentionRate}%)، مع تحقق معيار المهمة الإثرائية المحدد في المتابعة.`
      : "لا توجد فئة متقنة حاليًا؛ يُستبدل هدف التثبيت بقياس كسب الإتقان بعد التدخل العلاجي.";
    numericGuard = {
      applied: true,
      mode,
      totalCount: context.totalCount,
      baselineMasteryCount: mastery.count,
      retainedCount,
      retentionRate: actualRetentionRate,
      adjusted,
      adjustmentReasons,
    };
  }

  const extraRefs = ["metric:n", "metric:masteryCount", "metric:masteryPct", ...groupIds.map(groupEvidenceRef)]
    .filter(ref => ref && allowedEvidence.has(ref));
  const evidenceRefs = [...new Set([...(Array.isArray(base.evidenceRefs) ? base.evidenceRefs as string[] : []), ...extraRefs])].slice(0, 8);
  return {
    ...base,
    targetGroup: targetGroup || cleanString(base.targetGroup, 260),
    targetGroupIds: groupIds,
    successIndicator: successIndicator || cleanString(base.successIndicator, 380),
    successMetric: {
      mode,
      targetValue: requestedTargetValue,
      targetSegmentId: String(metricInput.targetSegmentId || ""),
    },
    numericGuard,
    evidenceRefs,
  };
}

type MultiVisitScopeContext = {
  scopeType: string;
  sampleOnly: boolean;
  visitCount: number;
  school: string;
  gradeRange: string;
  subjects: string[];
  departmentLabel: string;
  populationLabel: string;
  forbiddenBroaderPopulations: string[];
};

function multiVisitScopeContext(payload: JsonRecord): MultiVisitScopeContext | null {
  const evidence = payload.evidenceAnalysis && typeof payload.evidenceAnalysis === "object" ? payload.evidenceAnalysis as JsonRecord : {};
  const explicit = evidence.scopeContext && typeof evidence.scopeContext === "object" ? evidence.scopeContext as JsonRecord : {};
  const data = payload.data && typeof payload.data === "object" ? payload.data as JsonRecord : {};
  const visits = Array.isArray(data.visits) ? data.visits as JsonRecord[] : [];
  const source = payload.source && typeof payload.source === "object" ? payload.source as JsonRecord : {};
  const sourceMeta = source.meta && typeof source.meta === "object" ? source.meta as JsonRecord : {};
  const metadata = sourceMeta.metadata && typeof sourceMeta.metadata === "object" ? sourceMeta.metadata as JsonRecord : {};
  const subjects = cleanStringArray(
    Array.isArray(explicit.subjects) && explicit.subjects.length ? explicit.subjects : visits.map(item => item.subject),
    12,
    120,
  );
  const populationLabel = cleanString(explicit.populationLabel, 260) || "المعلمون المشمولون بالزيارات";
  if (!populationLabel) return null;
  return {
    scopeType: cleanString(explicit.scopeType, 80) || "sampled-multi-visit",
    sampleOnly: explicit.sampleOnly !== false,
    visitCount: Math.max(0, Math.trunc(toFiniteNumber(explicit.visitCount) ?? visits.length)),
    school: cleanString(explicit.school || metadata.school, 220),
    gradeRange: cleanString(explicit.gradeRange || metadata.grade, 120),
    subjects,
    departmentLabel: cleanString(explicit.departmentLabel, 220),
    populationLabel,
    forbiddenBroaderPopulations: cleanStringArray(explicit.forbiddenBroaderPopulations, 8, 180),
  };
}

function isBroaderThanMultiVisitScope(targetGroup: string, context: MultiVisitScopeContext): boolean {
  const target = normalizeForComparison(targetGroup);
  if (!target) return true;
  const broadPatterns = [
    /الهيئه التدريسيه/,
    /الهيئه التعليميه/,
    /جميع معلمي المدرسه/,
    /معلمو المدرسه/,
    /كافه المعلمين/,
    /جميع المعلمين/,
    /كل المعلمين/,
  ];
  if (broadPatterns.some(pattern => pattern.test(target))) return true;
  if (/بالمدرسه|في المدرسه/.test(target) && !/المشمولين بالزيارات|قسم|ماده|الصف/.test(target)) return true;
  return context.forbiddenBroaderPopulations.some(label => {
    const normalized = normalizeForComparison(label);
    return normalized && target.includes(normalized);
  });
}

function applyMultiVisitScopeGuard(base: JsonRecord, payload: JsonRecord): JsonRecord {
  const context = multiVisitScopeContext(payload);
  if (!context) throw new Error("تعذر بناء نطاق موثوق لعينة الزيارات الإشرافية.");
  const originalTargetGroup = cleanString(base.targetGroup, 260);
  const adjusted = isBroaderThanMultiVisitScope(originalTargetGroup, context);
  const targetGroup = adjusted ? context.populationLabel : originalTargetGroup;
  return {
    ...base,
    targetGroup,
    scopeGuard: {
      applied: true,
      adjusted,
      scopeType: context.scopeType,
      sampleOnly: context.sampleOnly,
      visitCount: context.visitCount,
      school: context.school,
      gradeRange: context.gradeRange,
      subjects: context.subjects,
      departmentLabel: context.departmentLabel,
      populationLabel: context.populationLabel,
      originalTargetGroup,
      finalTargetGroup: targetGroup,
      reason: adjusted ? "ضُيّق نطاق التدخل إلى العينة الفعلية بدل تعميمه على جميع معلمي المدرسة." : "الفئة المستهدفة لا تتجاوز نطاق الزيارات محل التحليل.",
    },
  };
}

function validatePrimaryAnalysis(result: unknown, payload: JsonRecord, mode: "primary" | "rescue" = "primary"): JsonRecord {
  if (!result || typeof result !== "object") throw new Error("رجع المحلل الذكي نتيجة فارغة.");
  const input = result as JsonRecord;
  const allowed = allowedRefsFromPayload(payload);
  const confidence = (value: unknown): string => ["مرتفعة", "متوسطة", "منخفضة"].includes(String(value)) ? String(value) : "متوسطة";
  const claimType = (value: unknown): string => ["fact", "inference", "hypothesis"].includes(String(value)) ? String(value) : "inference";
  const severity = (value: unknown): string => ["high", "medium", "low"].includes(String(value)) ? String(value) : "medium";
  const executiveInput = input.executive && typeof input.executive === "object" ? input.executive as JsonRecord : {};
  const executiveRefs = cleanRefs(executiveInput.evidenceRefs, allowed, 8);

  const units = (Array.isArray(input.analysisUnits) ? input.analysisUnits as JsonRecord[] : [])
    .slice(0, 3)
    .map((item, index) => ({
      id: `analysis.ai.${index + 1}`,
      title: cleanString(item.title, 180),
      diagnosticAnalysis: cleanString(item.diagnosticAnalysis, 760),
      decisionFinding: cleanString(item.decisionFinding, 360),
      claimType: claimType(item.claimType),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 8),
      confidence: confidence(item.confidence),
      severity: severity(item.severity),
      educationalImpact: cleanString(item.educationalImpact, 360),
      recommendedAction: cleanString(item.recommendedAction, 360),
      alternativeExplanations: cleanStringArray(item.alternativeExplanations, 1, 300),
      limitations: cleanStringArray(item.limitations, 2, 300),
      dataRequests: cleanStringArray(item.dataRequests, 2, 300),
      source: "gemini-primary",
    }))
    .filter(item => item.title && item.diagnosticAnalysis && item.decisionFinding && item.evidenceRefs.length && item.educationalImpact && item.recommendedAction);

  for (const item of units) {
    const analysisNorm = normalizeForComparison(item.diagnosticAnalysis);
    const findingNorm = normalizeForComparison(item.decisionFinding);
    if ((analysisNorm.includes(findingNorm) && findingNorm.length > 70) || textOverlapRatio(item.diagnosticAnalysis, item.decisionFinding) > 0.84) {
      throw new Error(`وحدة التحليل «${item.title}» كررت الشرح التشخيصي داخل الاستنتاج القراري.`);
    }
  }

  const diagnosticSections = units.map((item, index) => ({
    id: `diagnostic.ai.${index + 1}`,
    title: item.title,
    analysis: item.diagnosticAnalysis,
    claimType: item.claimType,
    evidenceRefs: item.evidenceRefs,
    confidence: item.confidence,
    implications: [item.educationalImpact],
    alternativeExplanations: item.alternativeExplanations,
    limitations: item.limitations,
    dataRequests: item.dataRequests,
    source: item.source,
  }));

  const findings = units.map((item, index) => ({
    id: `finding.ai.${index + 1}`,
    title: item.title,
    statement: item.decisionFinding,
    claimType: item.claimType,
    evidenceRefs: item.evidenceRefs,
    confidence: item.confidence,
    severity: item.severity,
    educationalImpact: item.educationalImpact,
    recommendedAction: item.recommendedAction,
    limitations: item.limitations,
    source: item.source,
  }));

  const qualityTools = (Array.isArray(input.methodChecks) ? input.methodChecks as JsonRecord[] : [])
    .slice(0, 2)
    .map((item, index) => ({
      id: `tool.ai.${index + 1}`,
      name: cleanString(item.name, 180),
      reason: cleanString(item.reason, 360),
      conditionsMet: true,
      interpretation: cleanString(item.interpretation, 460),
      requiredData: cleanStringArray(item.requiredData, 2, 260),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 8),
      source: "gemini-primary",
    }))
    .filter(item => item.name && item.reason && item.interpretation && item.evidenceRefs.length);

  const recognizedType = payload.recognizedType && typeof payload.recognizedType === "object" ? payload.recognizedType as JsonRecord : {};
  const recognizedTypeId = String(recognizedType.id || "");
  const scoreLike = ["student_results", "single_subject", "assessment_component", "level_distribution", "multi_subject_results", "cross_subject"].includes(recognizedTypeId);
  const numericScoreType = ["student_results", "single_subject", "assessment_component"].includes(recognizedTypeId);
  const scoreContext = numericScoreType ? scoreInterventionContext(payload) : null;

  const interventions = (Array.isArray(input.interventions) ? input.interventions as JsonRecord[] : [])
    .slice(0, 3)
    .map((item, index) => {
      const metricInput = item.successMetric && typeof item.successMetric === "object" ? item.successMetric as JsonRecord : {};
      const base: JsonRecord = {
        id: `intervention.ai.${index + 1}`,
        priority: cleanString(item.priority, 100) || `أولوية ${index + 1}`,
        issue: cleanString(item.issue, 260),
        targetGroup: cleanString(item.targetGroup, 260),
        targetGroupIds: cleanStringArray(item.targetGroupIds, 4, 80),
        action: cleanString(item.action, 620),
        implementationSteps: cleanStringArray(item.implementationSteps, 3, 320),
        responsibleRole: cleanString(item.responsibleRole, 220),
        timeframe: cleanString(item.timeframe, 180),
        successIndicator: cleanString(item.successIndicator, 380),
        successMetric: {
          mode: cleanString(metricInput.mode, 80) || "custom",
          targetValue: toFiniteNumber(metricInput.targetValue) ?? 0,
          targetSegmentId: cleanString(metricInput.targetSegmentId, 80),
        },
        monitoringMethod: cleanString(item.monitoringMethod, 360),
        contingency: cleanString(item.contingency, 360),
        resources: cleanStringArray(item.resources, 2, 260),
        evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 8),
        source: "gemini-primary",
      };
      let guarded = scoreContext ? applyScoreInterventionGuard(base, item, scoreContext, allowed) : base;
      if (recognizedTypeId === "supervision_multi_visit") guarded = applyMultiVisitScopeGuard(guarded, payload);
      return guarded;
    })
    .filter(item => item.issue && item.targetGroup && item.action && item.successIndicator && item.monitoringMethod && Array.isArray(item.evidenceRefs) && item.evidenceRefs.length);

  if (numericScoreType && !scoreContext) {
    throw new Error("تعذر بناء سياق حسابي موثوق لفئات التدخل؛ رُفضت مؤشرات نجاح رقمية غير قابلة للتحقق.");
  }

  const targetGroups = new Set(interventions.map(item => normalizeForComparison(item.targetGroup)).filter(Boolean));
  const interventionSignatures = new Set(interventions.map(item => normalizeForComparison(`${item.targetGroup} ${item.issue}`)).filter(Boolean));
  if (interventions.length >= 2 && ((scoreLike && targetGroups.size < 2) || (!scoreLike && interventionSignatures.size < 2))) {
    throw new Error("التدخلات الذكية لم تقدم تمايزًا حقيقيًا بين الفئات أو القضايا المستهدفة.");
  }

  const monitoringPlan = (Array.isArray(input.monitoringPlan) ? input.monitoringPlan as JsonRecord[] : [])
    .slice(0, 3)
    .map((item, index) => ({
      id: `monitoring.ai.${index + 1}`,
      stage: cleanString(item.stage, 180),
      timing: cleanString(item.timing, 180),
      measure: cleanString(item.measure, 420),
      owner: cleanString(item.owner, 220),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 8),
      source: "gemini-primary",
    }))
    .filter(item => item.stage && item.timing && item.measure && item.owner && item.evidenceRefs.length);

  if (!cleanString(executiveInput.title, 220) || !cleanString(executiveInput.summary, 1000) || executiveRefs.length < 1) {
    throw new Error("لم ينتج المحلل الذكي ملخصًا تنفيذيًا مكتملًا مرتبطًا بالأدلة.");
  }
  const richEvidence = allowed.size >= 6;
  const minUnits = mode === "primary" && richEvidence ? 3 : 2;
  // أدوات الجودة إثرائية، وليست سببًا لإسقاط تحليل كامل إذا كانت الأدلة لا تحتاج أداة إضافية.
  const minTools = 0;
  if (units.length < minUnits || interventions.length < 2 || monitoringPlan.length < 3) {
    const missing: string[] = [];
    if (units.length < minUnits) missing.push(`وحدات التحليل ${units.length}/${minUnits}`);
    if (interventions.length < 2) missing.push(`التدخلات ${interventions.length}/2`);
    if (monitoringPlan.length < 3) missing.push(`مراحل المتابعة ${monitoringPlan.length}/3`);
    throw new Error(`التحليل الذكي لم يبلغ عمق القرار المتوازن المطلوب: ${missing.join("، ")}.`);
  }

  const numericGuardedInterventions = interventions.filter(item => item.numericGuard && typeof item.numericGuard === "object" && Boolean((item.numericGuard as JsonRecord).applied)).length;
  const adjustedNumericTargets = interventions.filter(item => item.numericGuard && typeof item.numericGuard === "object" && Boolean((item.numericGuard as JsonRecord).adjusted)).length;
  const scopeGuardedInterventions = interventions.filter(item => item.scopeGuard && typeof item.scopeGuard === "object" && Boolean((item.scopeGuard as JsonRecord).applied)).length;
  const adjustedScopeTargets = interventions.filter(item => item.scopeGuard && typeof item.scopeGuard === "object" && Boolean((item.scopeGuard as JsonRecord).adjusted)).length;
  const profileInput = input.analysisProfile && typeof input.analysisProfile === "object" ? input.analysisProfile as JsonRecord : {};
  const suggested = input.suggestedNewType && typeof input.suggestedNewType === "object" ? input.suggestedNewType as JsonRecord : {};
  return {
    contractVersion: "6.6.0",
    analysisProfile: {
      method: cleanString(profileInput.method, 620),
      dataAdequacy: cleanString(profileInput.dataAdequacy, 480),
      dimensions: cleanStringArray(profileInput.dimensions, 4, 240),
      decisionUses: cleanStringArray(profileInput.decisionUses, 4, 240),
    },
    executive: {
      title: cleanString(executiveInput.title, 220),
      summary: cleanString(executiveInput.summary, 760),
      overallJudgement: cleanString(executiveInput.overallJudgement, 360),
      confidence: confidence(executiveInput.confidence),
      evidenceRefs: executiveRefs,
      limitations: cleanStringArray(executiveInput.limitations, 2, 300),
    },
    diagnosticSections,
    findings,
    qualityTools,
    interventions,
    monitoringPlan,
    additionalCautions: cleanStringArray(input.additionalCautions, 3, 300),
    missingDataRequests: cleanStringArray(input.missingDataRequests, 3, 300),
    suggestedNewType: {
      needed: Boolean(suggested.needed),
      nameAr: cleanString(suggested.nameAr, 180),
      purpose: cleanString(suggested.purpose, 480),
    },
    validation: {
      availableEvidenceCount: allowed.size,
      acceptedAnalysisUnits: units.length,
      acceptedDiagnosticSections: diagnosticSections.length,
      acceptedFindings: findings.length,
      acceptedInterventions: interventions.length,
      acceptedMonitoringStages: monitoringPlan.length,
      acceptedQualityTools: qualityTools.length,
      distinctTargetGroups: targetGroups.size,
      distinctInterventionSignatures: interventionSignatures.size,
      numericGuardedInterventions,
      adjustedNumericTargets,
      scopeGuardedInterventions,
      adjustedScopeTargets,
      sampleScopeEnforced: recognizedTypeId === "supervision_multi_visit",
      richEvidence,
      nonDuplicativeDecisionContract: true,
      serverOwnedInterventionMath: Boolean(scoreContext),
      validationMode: mode,
    },
  };
}

function primaryRequestBody(
  payload: JsonRecord,
  instructions: string,
  schema: JsonRecord,
  thinkingLevel: "low" | "minimal",
  maxOutputTokens: number,
): JsonRecord {
  return {
    systemInstruction: { parts: [{ text: instructions }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      thinkingConfig: { thinkingLevel },
      maxOutputTokens,
      candidateCount: 1,
    },
  };
}

function tryValidatePrimaryObject(value: JsonRecord, payload: JsonRecord, mode: "primary" | "rescue" = "primary"): { result: JsonRecord | null; error: unknown } {
  try {
    return { result: validatePrimaryAnalysis(value, payload, mode), error: null };
  } catch (error) {
    return { result: null, error };
  }
}

function usageCount(raw: JsonRecord, key: string): number {
  const usage = raw.usageMetadata && typeof raw.usageMetadata === "object" ? raw.usageMetadata as JsonRecord : {};
  return Number(usage[key] || 0);
}

type PrimarySegmentName = "reasoning" | "action";
type PrimarySegmentRun = {
  segment: PrimarySegmentName;
  value: JsonRecord;
  raw: JsonRecord;
  candidateText: string;
  finishReason: string;
  requestId: string | null;
  modelUsed: string;
  fallbackUsed: boolean;
  fallbackReason: string;
  attemptedModels: number;
  attemptedModelNames: string[];
  repaired: boolean;
  firstError: string;
  repairModelUsed: string;
  repairAttemptedModels: number;
};

function primarySegmentSchema(segment: PrimarySegmentName): JsonRecord {
  return segment === "reasoning" ? PRIMARY_REASONING_SCHEMA : PRIMARY_ACTION_SCHEMA;
}

function primarySegmentInstructions(segment: PrimarySegmentName): string {
  return segment === "reasoning" ? primaryReasoningInstructions() : primaryActionInstructions();
}

function primarySegmentOutputLimit(segment: PrimarySegmentName): number {
  return segment === "reasoning" ? 2700 : 2300;
}

function primarySegmentTimeout(segment: PrimarySegmentName): number {
  return segment === "reasoning" ? PRIMARY_REASONING_ATTEMPT_TIMEOUT_MS : PRIMARY_ACTION_ATTEMPT_TIMEOUT_MS;
}

function primarySegmentModels(segment: PrimarySegmentName): string[] {
  if (segment === "reasoning") {
    return configuredModelChain("GEMINI_ANALYSIS_MODEL", "GEMINI_REASONING_FALLBACK_MODELS", DEFAULT_ANALYSIS_MODEL, PRIMARY_REASONING_MODELS);
  }
  return configuredModelChain("GEMINI_FAST_MODEL", "GEMINI_ACTION_FALLBACK_MODELS", DEFAULT_FAST_MODEL, PRIMARY_ACTION_MODELS);
}

function primaryRepairModels(): string[] {
  return configuredModelList("GEMINI_REPAIR_MODELS", PRIMARY_REPAIR_MODELS);
}

function validatePrimarySegmentShape(segment: PrimarySegmentName, value: JsonRecord): void {
  if (segment === "reasoning") {
    const executive = value.executive && typeof value.executive === "object" ? value.executive as JsonRecord : {};
    const units = Array.isArray(value.analysisUnits) ? value.analysisUnits : [];
    if (!cleanString(executive.title, 220) || !cleanString(executive.summary, 900) || units.length < 2) {
      throw new Error("مقطع reasoning لم يرجع ملخصًا ووحدتي تحليل على الأقل.");
    }
    return;
  }
  const interventions = Array.isArray(value.interventions) ? value.interventions : [];
  const monitoring = Array.isArray(value.monitoringPlan) ? value.monitoringPlan : [];
  if (interventions.length < 2 || monitoring.length !== 3) {
    throw new Error("مقطع action لم يرجع تدخلين على الأقل وثلاث مراحل متابعة بالضبط.");
  }
}

function parsePrimarySegment(segment: PrimarySegmentName, text: string): JsonRecord {
  const value = parseJsonObject(text);
  validatePrimarySegmentShape(segment, value);
  return value;
}

async function repairPrimarySegment(
  segment: PrimarySegmentName,
  payload: JsonRecord,
  previousCandidate: JsonRecord,
  rejectionReason: string,
  deadlineAt: number,
): Promise<PrimarySegmentRun> {
  const repairPayload = buildPrimarySegmentRepairPayload(payload, segment, previousCandidate, rejectionReason);
  const models = primaryRepairModels();
  const response = await geminiRequestWithFallback(
    models,
    primaryRequestBody(
      repairPayload,
      primarySegmentRepairInstructions(segment, rejectionReason),
      primarySegmentSchema(segment),
      "minimal",
      primarySegmentOutputLimit(segment),
    ),
    1,
    {
      attemptTimeoutMs: PRIMARY_REPAIR_ATTEMPT_TIMEOUT_MS,
      deadlineAt,
      minRemainingMs: PRIMARY_MIN_REMAINING_MS,
    },
  );
  const candidate = candidateResult(response.raw);
  if (candidate.finishReason === "MAX_TOKENS") {
    throw new Error(`استنفد Gemini حد الإخراج أثناء إصلاح مقطع ${segment}.`);
  }
  const value = parsePrimarySegment(segment, candidate.text);
  return {
    segment,
    value,
    raw: response.raw,
    candidateText: candidate.text,
    finishReason: candidate.finishReason,
    requestId: response.requestId,
    modelUsed: response.modelUsed,
    fallbackUsed: response.fallbackUsed,
    fallbackReason: response.fallbackReason || "",
    attemptedModels: response.attemptedModels || 1,
    attemptedModelNames: response.attemptedModelNames || [response.modelUsed],
    repaired: true,
    firstError: cleanString(rejectionReason, 520),
    repairModelUsed: response.modelUsed,
    repairAttemptedModels: response.attemptedModels || 1,
  };
}

type PrimarySegmentRequestOptions = {
  models?: string[];
  attemptTimeoutMs?: number;
  excludeModels?: string[];
};

async function requestPrimarySegment(
  segment: PrimarySegmentName,
  payload: JsonRecord,
  deadlineAt: number,
  options: PrimarySegmentRequestOptions = {},
): Promise<PrimarySegmentRun> {
  const excluded = new Set((options.excludeModels || []).map(normalizeModelName));
  const modelCandidates = (options.models || primarySegmentModels(segment)).map(normalizeModelName).filter(model => model && !excluded.has(model));
  if (!modelCandidates.length) {
    throw geminiRequestError(`لا يوجد نموذج إنقاذ جديد متاح لمقطع ${segment} دون إعادة نموذج فشل سابقًا.`, 503, { failureKind: "capacity", attemptedModelNames: [...excluded] });
  }
  const response = await geminiRequestWithFallback(
    modelCandidates,
    primaryRequestBody(
      payload,
      primarySegmentInstructions(segment),
      primarySegmentSchema(segment),
      segment === "reasoning" ? "low" : "minimal",
      primarySegmentOutputLimit(segment),
    ),
    1,
    {
      attemptTimeoutMs: options.attemptTimeoutMs || primarySegmentTimeout(segment),
      deadlineAt,
      minRemainingMs: PRIMARY_MIN_REMAINING_MS,
    },
  );
  const candidate = candidateResult(response.raw);
  let value: JsonRecord;
  try {
    if (candidate.finishReason === "MAX_TOKENS") throw new Error(`توقف مقطع ${segment} عند حد الإخراج.`);
    value = parsePrimarySegment(segment, candidate.text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : `مقطع ${segment} غير مكتمل.`;
    let previousCandidate: JsonRecord = {};
    try { previousCandidate = parseJsonObject(candidate.text); } catch { previousCandidate = {}; }
    return repairPrimarySegment(segment, payload, previousCandidate, reason, deadlineAt);
  }
  return {
    segment,
    value,
    raw: response.raw,
    candidateText: candidate.text,
    finishReason: candidate.finishReason,
    requestId: response.requestId,
    modelUsed: response.modelUsed,
    fallbackUsed: response.fallbackUsed,
    fallbackReason: response.fallbackReason || "",
    attemptedModels: response.attemptedModels || 1,
    attemptedModelNames: response.attemptedModelNames || [response.modelUsed],
    repaired: false,
    firstError: "",
    repairModelUsed: "",
    repairAttemptedModels: 0,
  };
}

function primaryTransientRescueModels(): string[] {
  return configuredModelList("GEMINI_RESCUE_MODELS", PRIMARY_TRANSIENT_RESCUE_MODELS);
}

async function rescueTransientPrimarySegment(
  segment: PrimarySegmentName,
  payload: JsonRecord,
  deadlineAt: number,
  excludeModels: string[] = [],
): Promise<PrimarySegmentRun> {
  // الإنقاذ يستخدم نموذجًا لم يُجرّب في المقطع نفسه متى أمكن. إعادة نفس النموذج
  // الذي أعاد 503/timeout قبل ثوانٍ تهدر ميزانية الإنقاذ وتزيد الضغط بلا فائدة.
  await wait(250 + Math.floor(Math.random() * 150));
  return requestPrimarySegment(segment, payload, deadlineAt, {
    models: primaryTransientRescueModels(),
    excludeModels,
    attemptTimeoutMs: PRIMARY_TRANSIENT_RESCUE_ATTEMPT_TIMEOUT_MS,
  });
}

function mergePrimarySegments(reasoning: JsonRecord, action: JsonRecord): JsonRecord {
  return {
    ...reasoning,
    interventions: Array.isArray(action.interventions) ? action.interventions : [],
    monitoringPlan: Array.isArray(action.monitoringPlan) ? action.monitoringPlan : [],
  };
}

function validationRepairTargets(message: string): PrimarySegmentName[] {
  if (/ملخص|وحدة التحليل|وحدات التحليل|كررت الشرح/i.test(message)) return ["reasoning"];
  if (/التدخلات|الفئات أو القضايا|فئات أو قضايا|مراحل المتابعة|سياق حسابي|مؤشرات نجاح|targetGroup/i.test(message)) return ["action"];
  return ["reasoning", "action"];
}

async function analyzePrimary(payload: JsonRecord): Promise<JsonRecord> {
  const startedAt = performance.now();
  const deadlineAt = startedAt + PRIMARY_ANALYSIS_DEADLINE_MS;
  const initialPhaseDeadlineAt = Math.min(deadlineAt, startedAt + PRIMARY_INITIAL_PHASE_DEADLINE_MS);
  const transientRescueDeadlineAt = Math.min(deadlineAt, startedAt + PRIMARY_TRANSIENT_RESCUE_PHASE_DEADLINE_MS);

  // الطلبان أصغر ويعملان بالتوازي، لكن المرحلة الأولى لها سقف مستقل.
  // هذا يحجز وقتًا فعليًا لإنقاذ المقطع المتعثر بدل الوصول إلى rescue بعد استنزاف المهلة الكلية.
  const segmentSettled = await Promise.allSettled([
    requestPrimarySegment("reasoning", payload, initialPhaseDeadlineAt),
    requestPrimarySegment("action", payload, initialPhaseDeadlineAt),
  ]);

  const segmentNames: PrimarySegmentName[] = ["reasoning", "action"];
  const initialSegmentErrors: Partial<Record<PrimarySegmentName, string>> = {};
  const transientRescuedSegments = new Set<PrimarySegmentName>();
  const segmentRuns: Partial<Record<PrimarySegmentName, PrimarySegmentRun>> = {};
  const transientFailures: Array<{ segment: PrimarySegmentName; error: unknown }> = [];
  let failedInitialAttemptedModels = 0;

  for (let index = 0; index < segmentSettled.length; index += 1) {
    const segment = segmentNames[index];
    const settled = segmentSettled[index];
    if (settled.status === "fulfilled") {
      segmentRuns[segment] = settled.value;
      continue;
    }
    const message = settled.reason instanceof Error ? settled.reason.message : String(settled.reason || "خطأ غير معروف");
    initialSegmentErrors[segment] = cleanString(message, 520);
    failedInitialAttemptedModels += Math.max(1, Number((settled.reason as GeminiFallbackError)?.attemptedModels || 1));
    const failureKind = modelFailureKind(settled.reason);
    // لا نحول 429 إلى سلسلة fallback/rescue. هذا حد معدل/حصة ويجب الحفاظ عليه
    // كي لا يضاعف الطلب الواحد عدد استدعاءات Gemini ويزيد مدة الحظر.
    if (failureKind === "rate_limit") throw settled.reason;
    if (!modelIsTransientlyBusy(settled.reason)) {
      throw new Error(`فشل مقطع ${segment} بعد استجابة Gemini غير قابلة للإنقاذ الشبكي: ${message}`);
    }
    transientFailures.push({ segment, error: settled.reason });
  }

  if (transientFailures.length) {
    const rescueSettled = await Promise.allSettled(
      transientFailures.map(item => rescueTransientPrimarySegment(
        item.segment,
        payload,
        transientRescueDeadlineAt,
        geminiErrorAttemptedModels(item.error),
      )),
    );
    for (let index = 0; index < rescueSettled.length; index += 1) {
      const failed = transientFailures[index];
      const rescued = rescueSettled[index];
      if (rescued.status === "fulfilled") {
        segmentRuns[failed.segment] = rescued.value;
        transientRescuedSegments.add(failed.segment);
        continue;
      }
      const rescueMessage = rescued.reason instanceof Error ? rescued.reason.message : String(rescued.reason || "خطأ غير معروف");
      const firstMessage = initialSegmentErrors[failed.segment] || "تعثر شبكي أولي";
      const status = geminiErrorStatus(rescued.reason) || geminiErrorStatus(failed.error) || 503;
      const combinedAttempts = [...new Set([
        ...geminiErrorAttemptedModels(failed.error),
        ...geminiErrorAttemptedModels(rescued.reason),
      ])];
      throw geminiRequestError(
        `فشل مقطع ${failed.segment} بعد إنقاذ شبكي معزول. المحاولة الأولى: ${firstMessage}. محاولة الإنقاذ: ${rescueMessage}`,
        status,
        {
          failureKind: modelFailureKind(rescued.reason),
          retryAfterMs: geminiErrorRetryAfterMs(rescued.reason) || geminiErrorRetryAfterMs(failed.error),
          attemptedModelNames: combinedAttempts,
        },
      );
    }
  }

  const reasoning = segmentRuns.reasoning;
  const action = segmentRuns.action;
  if (!reasoning || !action) {
    throw new Error("لم تكتمل مقاطع التحليل الأساسية بعد مسار الإنقاذ.");
  }

  let reasoningRun = reasoning;
  let actionRun = action;
  let combined = mergePrimarySegments(reasoningRun.value, actionRun.value);
  let checked = tryValidatePrimaryObject(combined, payload, "primary");
  const firstValidationError = checked.error instanceof Error ? checked.error.message : "";
  let postValidationRepairUsed = false;
  let rescueValidationError = "";
  const repairedSegments = new Set<PrimarySegmentName>([
    ...(reasoningRun.repaired ? ["reasoning" as const] : []),
    ...(actionRun.repaired ? ["action" as const] : []),
  ]);

  if (!checked.result) {
    postValidationRepairUsed = true;
    const targets = validationRepairTargets(firstValidationError);
    const repairs = await Promise.all(targets.map(async segment => {
      const previous = segment === "reasoning" ? reasoningRun.value : actionRun.value;
      return repairPrimarySegment(segment, payload, previous, firstValidationError, deadlineAt);
    }));
    for (const repaired of repairs) {
      repairedSegments.add(repaired.segment);
      if (repaired.segment === "reasoning") reasoningRun = repaired;
      else actionRun = repaired;
    }
    combined = mergePrimarySegments(reasoningRun.value, actionRun.value);
    checked = tryValidatePrimaryObject(combined, payload, "rescue");
    rescueValidationError = checked.error instanceof Error ? checked.error.message : "";
  }

  if (!checked.result) {
    const detail = checked.error instanceof Error ? checked.error.message : "نتيجة غير مكتملة";
    throw new Error(`فشل إصلاح مقاطع عقد التحليل بعد استجابات Gemini: ${detail}`);
  }

  const result = checked.result;
  const validation = result.validation && typeof result.validation === "object" ? result.validation as JsonRecord : {};
  const reasoningThoughtTokens = usageCount(reasoningRun.raw, "thoughtsTokenCount");
  const actionThoughtTokens = usageCount(actionRun.raw, "thoughtsTokenCount");
  const reasoningCandidateTokens = usageCount(reasoningRun.raw, "candidatesTokenCount");
  const actionCandidateTokens = usageCount(actionRun.raw, "candidatesTokenCount");
  const totalAttemptedModels = failedInitialAttemptedModels + reasoningRun.attemptedModels + actionRun.attemptedModels + reasoningRun.repairAttemptedModels + actionRun.repairAttemptedModels;
  const transientRescueUsed = transientRescuedSegments.size > 0;
  const rescueUsed = transientRescueUsed || repairedSegments.size > 0 || postValidationRepairUsed;

  return {
    result,
    model: `${String(reasoningRun.raw.modelVersion || reasoningRun.modelUsed)} + ${String(actionRun.raw.modelVersion || actionRun.modelUsed)}`,
    usage: {
      reasoning: reasoningRun.raw.usageMetadata || null,
      action: actionRun.raw.usageMetadata || null,
    },
    requestId: reasoningRun.requestId || actionRun.requestId,
    provider: "gemini",
    serverTiming: {
      aiPrimary: true,
      segmentedPrimary: true,
      parallelSegments: true,
      geminiMs: Math.round(performance.now() - startedAt),
      payloadChars: JSON.stringify(payload).length,
      outputCharacters: reasoningRun.candidateText.length + actionRun.candidateText.length,
      finishReason: `${reasoningRun.finishReason}/${actionRun.finishReason}`,
      firstFinishReason: `${reasoningRun.finishReason}/${actionRun.finishReason}`,
      thinkingLevel: "segmented-low-minimal",
      maxOutputTokens: primarySegmentOutputLimit("reasoning") + primarySegmentOutputLimit("action"),
      rescueUsed,
      transientRescueUsed,
      transientRescuedSegments: [...transientRescuedSegments],
      transientInitialAttemptedModels: failedInitialAttemptedModels,
      repairedSegments: [...repairedSegments],
      firstValidationError: cleanString(firstValidationError, 520),
      rescueValidationError: cleanString(rescueValidationError, 520),
      repairContextUsed: repairedSegments.size > 0 || postValidationRepairUsed,
      fallbackUsed: transientRescueUsed || reasoningRun.fallbackUsed || actionRun.fallbackUsed,
      fallbackReason: [
        transientRescueUsed ? "segment_transient_rescue" : "",
        reasoningRun.fallbackReason,
        actionRun.fallbackReason,
      ].filter(Boolean).join(","),
      attemptedModels: totalAttemptedModels,
      reasoningModel: reasoningRun.modelUsed,
      actionModel: actionRun.modelUsed,
      serverDeadlineMs: PRIMARY_ANALYSIS_DEADLINE_MS,
      initialPhaseDeadlineMs: PRIMARY_INITIAL_PHASE_DEADLINE_MS,
      transientRescuePhaseDeadlineMs: PRIMARY_TRANSIENT_RESCUE_PHASE_DEADLINE_MS,
      reservedPostRescueMs: PRIMARY_ANALYSIS_DEADLINE_MS - PRIMARY_TRANSIENT_RESCUE_PHASE_DEADLINE_MS,
      primaryAttemptTimeoutMs: Math.max(PRIMARY_REASONING_ATTEMPT_TIMEOUT_MS, PRIMARY_ACTION_ATTEMPT_TIMEOUT_MS),
      reasoningAttemptTimeoutMs: PRIMARY_REASONING_ATTEMPT_TIMEOUT_MS,
      actionAttemptTimeoutMs: PRIMARY_ACTION_ATTEMPT_TIMEOUT_MS,
      rescueAttemptTimeoutMs: PRIMARY_REPAIR_ATTEMPT_TIMEOUT_MS,
      transientRescueAttemptTimeoutMs: PRIMARY_TRANSIENT_RESCUE_ATTEMPT_TIMEOUT_MS,
      firstThoughtTokens: reasoningThoughtTokens + actionThoughtTokens,
      firstCandidateTokens: reasoningCandidateTokens + actionCandidateTokens,
      finalThoughtTokens: reasoningThoughtTokens + actionThoughtTokens,
      finalCandidateTokens: reasoningCandidateTokens + actionCandidateTokens,
      acceptedAnalysisUnits: validation.acceptedAnalysisUnits || 0,
      acceptedDiagnosticSections: validation.acceptedDiagnosticSections || 0,
      acceptedFindings: validation.acceptedFindings || 0,
      acceptedInterventions: validation.acceptedInterventions || 0,
      acceptedMonitoringStages: validation.acceptedMonitoringStages || 0,
      acceptedQualityTools: validation.acceptedQualityTools || 0,
      distinctTargetGroups: validation.distinctTargetGroups || 0,
      numericGuardedInterventions: validation.numericGuardedInterventions || 0,
      adjustedNumericTargets: validation.adjustedNumericTargets || 0,
      scopeGuardedInterventions: validation.scopeGuardedInterventions || 0,
      adjustedScopeTargets: validation.adjustedScopeTargets || 0,
    },
  };
}

function errorInfo(error: unknown): { status: number; errorCode: string; retryable: boolean } {
  const message = geminiErrorMessage(error);
  const status = geminiErrorStatus(error);
  const kind = modelFailureKind(error);
  if (/رمز الوصول غير صحيح|النطاق غير مسموح|حجم الطلب أكبر|العملية المطلوبة غير مدعومة/i.test(message)) return { status: 400, errorCode: "REQUEST_NOT_RETRYABLE", retryable: false };
  if (/api key|مفتاح.*غير صالح|GEMINI_API_KEY|model.*not found|النموذج.*غير/i.test(message)) return { status: 502, errorCode: "GEMINI_CONFIGURATION", retryable: false };
  if (kind === "rate_limit" || status === 429) return { status: 429, errorCode: "GEMINI_RATE_LIMIT", retryable: true };
  if (/حد الإخراج|MAX_TOKENS|استنفد Gemini/i.test(message)) return { status: 502, errorCode: "GEMINI_OUTPUT_EXHAUSTED", retryable: false };
  if (/فشل إصلاح (?:مقاطع )?عقد التحليل|مقطع (?:reasoning|action) لم يرجع|لم يبلغ عمق القرار|لم ينتج المحلل الذكي ملخصًا|التدخلات الذكية لم تقدم تمايزًا|كررت الشرح التشخيصي/i.test(message)) return { status: 502, errorCode: "GEMINI_CONTRACT_REJECTED", retryable: true };
  if (kind === "capacity" || kind === "timeout" || kind === "network" || /high demand|spikes in demand|temporar(?:y|ily)|timeout|مهلة التحليل الذكي|مهلة استجابة نموذج|تعذر الاتصال|unavailable|overload|503|500|504/i.test(message)) return { status: 503, errorCode: "GEMINI_TRANSIENT", retryable: true };
  return { status: 500, errorCode: "GEMINI_RESPONSE", retryable: false };
}

function publicErrorMessage(info: { errorCode: string }, rawMessage: string): string {
  if (info.errorCode === "GEMINI_TRANSIENT") {
    return "خدمة التحليل الذكي مزدحمة مؤقتًا. جرّب التطبيق تلقائيًا النماذج البديلة وإعادة الطلب، لكن الخدمة لم تستجب الآن. أعد المحاولة بعد قليل.";
  }
  if (info.errorCode === "GEMINI_RATE_LIMIT") {
    return "تم بلوغ حد طلبات الذكاء الاصطناعي مؤقتًا. انتظر قليلًا ثم أعد المحاولة.";
  }
  if (info.errorCode === "GEMINI_CONFIGURATION") {
    return "تعذر تشغيل الذكاء الاصطناعي بسبب إعداد غير صحيح في وظيفة Supabase أو نموذج Gemini.";
  }
  if (info.errorCode === "GEMINI_OUTPUT_EXHAUSTED") {
    return "لم يكتمل عقد التحليل الذكي ضمن حد الإخراج المعتمد.";
  }
  if (info.errorCode === "GEMINI_CONTRACT_REJECTED") {
    return "وصلت استجابة التحليل، لكن حتى مسار إصلاح العقد لم يحقق معايير الجودة كاملة. بقيت الحسابات والأدلة محفوظة ويمكن إعادة المحاولة مباشرة.";
  }
  if (info.errorCode === "REQUEST_NOT_RETRYABLE") return rawMessage;
  return "تعذر إكمال التحليل الذكي الآن. لم يعتمد التطبيق نتيجة ناقصة.";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!originIsAllowed(origin)) return jsonResponse({ ok: false, error: "هذا النطاق غير مسموح له باستدعاء الوظيفة." }, 403, origin);
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "تُقبل طلبات POST فقط." }, 405, origin);
  if (!originIsAllowed(origin)) return jsonResponse({ ok: false, error: "هذا النطاق غير مسموح له باستدعاء الوظيفة." }, 403, origin);
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return jsonResponse({ ok: false, error: "حجم الطلب أكبر من الحد المسموح." }, 413, origin);

  const expectedAccessCode = Deno.env.get("TAQAREER_ACCESS_CODE") || "";
  if (expectedAccessCode) {
    const supplied = req.headers.get("x-taqareer-access-code") || "";
    if (!supplied || !(await secureEqual(supplied, expectedAccessCode))) return jsonResponse({ ok: false, error: "رمز الوصول غير صحيح." }, 401, origin);
  }

  let operation = "";
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) return jsonResponse({ ok: false, error: "حجم الطلب أكبر من الحد المسموح." }, 413, origin);
    let body: JsonRecord;
    try { body = JSON.parse(rawBody) as JsonRecord; }
    catch { return jsonResponse({ ok: false, error: "جسم الطلب ليس JSON صالحًا." }, 400, origin); }
    operation = String(body.operation || "");
    const payload = body.payload && typeof body.payload === "object" ? body.payload as JsonRecord : {};
    let ai: JsonRecord;
    if (operation === "health") ai = edgeHealth();
    else if (operation === "ping") ai = await pingGemini();
    else if (operation === "classify") ai = await classify(payload);
    else if (operation === "vision_extract") ai = await extractVisual(payload);
    else if (operation === "analyze_primary") ai = await analyzePrimary(payload);
    else if (operation === "enhance_fast") ai = await enhanceFast(payload);
    else return jsonResponse({ ok: false, error: "العملية المطلوبة غير مدعومة." }, 400, origin);
    return jsonResponse({ ok: true, operation, edgeVersion: EDGE_VERSION, aiKeyConfigured: Boolean(Deno.env.get("GEMINI_API_KEY")), ...ai }, 200, origin);
  } catch (error) {
    console.error("taqareer-ai-error", error);
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع في وظيفة التحليل.";
    const info = errorInfo(error);
    const retryAfterMs = geminiErrorRetryAfterMs(error);
    const attemptedModelNames = geminiErrorAttemptedModels(error);
    return jsonResponse({
      ok: false,
      operation,
      error: publicErrorMessage(info, message),
      errorCode: info.errorCode,
      retryable: info.retryable,
      retryAfterMs,
      diagnostic: {
        providerStatus: geminiErrorStatus(error) || info.status,
        providerKind: modelFailureKind(error),
        attemptedModels: attemptedModelNames,
      },
      requestId: req.headers.get("x-taqareer-request-id") || "",
      edgeVersion: EDGE_VERSION,
    }, info.status, origin);
  }
});
