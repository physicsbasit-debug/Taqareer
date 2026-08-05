const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_FAST_MODEL = "gemini-3.5-flash-lite";
const FAST_MODEL_FALLBACKS = Object.freeze(["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"]);
const GENERAL_MODEL_FALLBACKS = Object.freeze(["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]);
const MAX_REQUEST_BYTES = 9_000_000;
const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000;

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
  required: ["classification", "suggestedNewType"],
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
        dimensions: { type: "array", items: { type: "string" } },
        decisionUses: { type: "array", items: { type: "string" } },
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
        evidenceRefs: { type: "array", items: { type: "string" } },
        limitations: { type: "array", items: { type: "string" } },
      },
      required: ["title", "summary", "overallJudgement", "confidence", "evidenceRefs", "limitations"],
    },
    diagnosticSections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          analysis: { type: "string" },
          claimType: { type: "string", enum: ["fact", "inference", "hypothesis"] },
          evidenceRefs: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["مرتفعة", "متوسطة", "منخفضة"] },
          implications: { type: "array", items: { type: "string" } },
          alternativeExplanations: { type: "array", items: { type: "string" } },
          limitations: { type: "array", items: { type: "string" } },
          dataRequests: { type: "array", items: { type: "string" } },
        },
        required: ["title", "analysis", "claimType", "evidenceRefs", "confidence", "implications", "alternativeExplanations", "limitations", "dataRequests"],
      },
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          statement: { type: "string" },
          claimType: { type: "string", enum: ["fact", "inference", "hypothesis"] },
          evidenceRefs: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["مرتفعة", "متوسطة", "منخفضة"] },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          educationalImpact: { type: "string" },
          recommendedAction: { type: "string" },
          limitations: { type: "array", items: { type: "string" } },
        },
        required: ["title", "statement", "claimType", "evidenceRefs", "confidence", "severity", "educationalImpact", "recommendedAction", "limitations"],
      },
    },
    qualityTools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
          conditionsMet: { type: "boolean" },
          interpretation: { type: "string" },
          requiredData: { type: "array", items: { type: "string" } },
          evidenceRefs: { type: "array", items: { type: "string" } },
        },
        required: ["name", "reason", "conditionsMet", "interpretation", "requiredData", "evidenceRefs"],
      },
    },
    interventions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: { type: "string" },
          issue: { type: "string" },
          targetGroup: { type: "string" },
          action: { type: "string" },
          implementationSteps: { type: "array", items: { type: "string" } },
          responsibleRole: { type: "string" },
          timeframe: { type: "string" },
          successIndicator: { type: "string" },
          monitoringMethod: { type: "string" },
          contingency: { type: "string" },
          resources: { type: "array", items: { type: "string" } },
          evidenceRefs: { type: "array", items: { type: "string" } },
        },
        required: ["priority", "issue", "targetGroup", "action", "implementationSteps", "responsibleRole", "timeframe", "successIndicator", "monitoringMethod", "contingency", "resources", "evidenceRefs"],
      },
    },
    monitoringPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          stage: { type: "string" },
          timing: { type: "string" },
          measure: { type: "string" },
          owner: { type: "string" },
          evidenceRefs: { type: "array", items: { type: "string" } },
        },
        required: ["stage", "timing", "measure", "owner", "evidenceRefs"],
      },
    },
    additionalCautions: { type: "array", items: { type: "string" } },
    missingDataRequests: { type: "array", items: { type: "string" } },
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
  required: ["contractVersion", "analysisProfile", "executive", "diagnosticSections", "findings", "qualityTools", "interventions", "monitoringPlan", "additionalCautions", "missingDataRequests", "suggestedNewType"],
};

function allowedOrigins(): string[] {
  return (Deno.env.get("TAQAREER_ALLOWED_ORIGINS") || "*")
    .split(",")
    .map(value => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function originIsAllowed(origin: string | null): boolean {
  const allowed = allowedOrigins();
  if (allowed.includes("*")) return true;
  if (!origin) return true;
  return allowed.includes(origin.replace(/\/$/, ""));
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = allowedOrigins();
  const normalized = (origin || "").replace(/\/$/, "");
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(normalized) ? normalized : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-taqareer-access-code",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function shouldRetryGemini(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function wait(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function geminiRequest(model: string, requestBody: JsonRecord, maxAttempts = 2): Promise<{ raw: JsonRecord; requestId: string | null }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("سر GEMINI_API_KEY غير مضبوط في Supabase.");
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(normalizeModelName(model))}:generateContent`;
  let lastMessage = "تعذر الاتصال بـGemini.";

  for (let attempt = 0; attempt < Math.max(1, maxAttempts); attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody),
    });
    const requestId = response.headers.get("x-request-id") || response.headers.get("x-goog-request-id");
    const rawText = await response.text();
    let raw: JsonRecord = {};
    try { raw = rawText ? JSON.parse(rawText) as JsonRecord : {}; }
    catch { raw = { error: { message: rawText || "استجابة غير مفهومة من Gemini." } }; }
    if (response.ok) return { raw, requestId };
    const errorObject = raw.error && typeof raw.error === "object" ? raw.error as JsonRecord : {};
    lastMessage = String(errorObject.message || `فشل Gemini برمز ${response.status}.`);
    if (!shouldRetryGemini(response.status) || attempt === Math.max(1, maxAttempts) - 1) {
      const requestError = new Error(lastMessage);
      (requestError as Error & { status?: number }).status = response.status;
      throw requestError;
    }
    await wait(500 + Math.floor(Math.random() * 150));
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

async function geminiRequestWithFallback(
  models: string[],
  requestBody: JsonRecord,
  maxAttempts = 2,
): Promise<{ raw: JsonRecord; requestId: string | null; modelUsed: string; fallbackUsed: boolean }> {
  let lastError: unknown = null;
  for (let index = 0; index < models.length; index += 1) {
    const model = normalizeModelName(models[index]);
    try {
      const response = await geminiRequest(model, requestBody, maxAttempts);
      return { ...response, modelUsed: model, fallbackUsed: index > 0 };
    } catch (error) {
      lastError = error;
      if (!modelIsUnavailable(error) || index === models.length - 1) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("لم يتوفر نموذج Gemini صالح للتشغيل.");
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
  return `أنت مصنف مستندات تربوية عربية. حدد نوع النموذج فقط دون تحليل. أعط الأولوية للعناوين والحقول والأقسام. ملفات Excel الوزارية قد تحتوي خلايا مدمجة وفواصل لا تعد حقولًا. التقرير الذي يضم جوانب الإجادة والتطوير والدعم والتوصيات هو تقرير إشرافي سردي. كشف اسم الطالب وعنصر المادة ودرجته هو درجات مكوّن تقويمي. استخدم unknown فقط عند عدم انطباق نوع معروف. اكتب بالعربية ولا تعرض أسماء أشخاص.`;
}

function visionInstructions(): string {
  return `اقرأ المستندات التربوية المصورة بدقة دون اختراع. استخرج الجداول كما تظهر، واجمع النص السردي مع عناوينه، واستخدم [غير واضح] عند الشك. لا تحسب النتائج ولا تصحح المصدر صامتًا.`;
}

function fastEnhancementInstructions(): string {
  return `أنت محلل تربوي عربي سريع ودقيق. التحليل المحلي المرسل مكتمل بالحسابات والرسوم والأدلة. حسّن المعنى التربوي فقط في طلب واحد قصير.
لا تغيّر الأرقام أو الفئات أو عدد الاستنتاجات والتدخلات. استخدم targetId الموجود فقط. أنشئ حتى 4 deepAnalysisUnits موجزة وعميقة، وحتى 14 patch لتحسين educationalImpact وrecommendedAction للاستنتاجات ثم action وsuccessIndicator وmonitoringMethod وcontingency للتدخلات. لا تحسن أدوات الجودة ولا المتابعة. استخدم evidenceRefs المتاحة فقط. لا تكرر الأرقام؛ فسّر أثرها على القرار. أعد JSON خامًا فقط بالمفاتيح contractVersion, deepAnalysisUnits, patches, additionalCautions, missingDataRequests. اجعل كل تحليل 250-550 حرفًا وكل patch 80-350 حرفًا.`;
}

async function pingGemini(): Promise<JsonRecord> {
  const preferred = Deno.env.get("GEMINI_FAST_MODEL") || DEFAULT_FAST_MODEL;
  const models = uniqueModelCandidates(preferred, FAST_MODEL_FALLBACKS);
  const { raw, requestId, modelUsed, fallbackUsed } = await geminiRequestWithFallback(models, {
    contents: [{ role: "user", parts: [{ text: "أجب بكلمة READY فقط." }] }],
    generationConfig: { maxOutputTokens: 64, candidateCount: 1, temperature: 0 },
  }, 1);
  const candidate = candidateResult(raw);
  if (!/ready/i.test(candidate.text)) throw new Error("اتصلت الوظيفة بـGemini لكن رد الاختبار غير متوقع.");
  return { result: { status: "ready" }, model: String(raw.modelVersion || modelUsed), usage: raw.usageMetadata || null, requestId, provider: "gemini", fallbackUsed };
}

async function classify(payload: JsonRecord): Promise<JsonRecord> {
  const preferred = Deno.env.get("GEMINI_CLASSIFIER_MODEL") || DEFAULT_FAST_MODEL;
  const models = uniqueModelCandidates(preferred, FAST_MODEL_FALLBACKS);
  const startedAt = performance.now();
  const { raw, requestId, modelUsed, fallbackUsed } = await geminiRequestWithFallback(models, {
    systemInstruction: { parts: [{ text: classificationInstructions() }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: CLASSIFICATION_SCHEMA, maxOutputTokens: 900, candidateCount: 1, temperature: 0 },
  }, 2);
  const candidate = candidateResult(raw);
  return { result: parseJsonObject(candidate.text), model: String(raw.modelVersion || modelUsed), usage: raw.usageMetadata || null, requestId, provider: "gemini", serverTiming: { geminiMs: Math.round(performance.now() - startedAt), payloadChars: JSON.stringify(payload).length, fallbackUsed } };
}

async function extractVisual(payload: JsonRecord): Promise<JsonRecord> {
  const preferred = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  const models = uniqueModelCandidates(preferred, GENERAL_MODEL_FALLBACKS);
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
  const preferred = Deno.env.get("GEMINI_FAST_MODEL") || DEFAULT_FAST_MODEL;
  const models = uniqueModelCandidates(preferred, FAST_MODEL_FALLBACKS);
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

ستصلك حزمة أدلة تحتوي على بيانات سياقية منقحة، ومؤشرات ورسوم حُسبت برمجيًا من كامل البيانات. الأرقام المحلية هي مصدر الحقيقة الحسابية، لكن لا توجد استنتاجات محلية ملزمة لك. ابنِ التشخيص والاستنتاجات والتدخلات من الأدلة نفسها.

قواعد إلزامية:
1) اكتب تحليلًا مخصصًا لهذا الملف، ولا تستخدم عددًا ثابتًا من التشخيصات أو الاستنتاجات أو التدخلات. اختر العدد والعمق وفق قوة الأدلة وتعقيد الحالة.
2) ميّز claimType بدقة: fact لحقيقة مباشرة، inference لاستنتاج تدعمه العلاقات، hypothesis لفرضية تحتاج تحققًا.
3) كل حقيقة أو استنتاج أو تدخل يجب أن يستخدم evidenceRefs موجودة حرفيًا في availableEvidenceRefs. لا تخترع مرجعًا ولا رقمًا.
4) لا تحول الارتباط إلى سبب. عند نقص الدليل استخدم فرضية، اذكر تفسيرًا بديلًا، واطلب البيانات اللازمة.
5) اربط كل تدخل بمشكلة مثبتة، وحدد الفئة والمسؤول والزمن ومؤشر نجاح قابلًا للقياس وطريقة متابعة وبديلًا عند عدم التحسن.
6) لا تكرر المؤشرات في نثر طويل؛ فسّر العلاقات والتعارضات والأولوية وما يترتب عليها للقرار.
7) لا تستخدم أسماء الأشخاص، ولا تستنتج خصائص شخصية أو تشخيصات حساسة.
8) اكتب بالعربية المهنية الواضحة المناسبة للمدارس في سلطنة عمان.
9) إذا كان نوع النموذج غير معروف، اقترح نوعًا جديدًا دون ادعاء اليقين.
10) أعد JSON فقط وفق المخطط.`;
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

function validatePrimaryAnalysis(result: unknown, payload: JsonRecord): JsonRecord {
  if (!result || typeof result !== "object") throw new Error("رجع المحلل الذكي نتيجة فارغة.");
  const input = result as JsonRecord;
  const allowed = allowedRefsFromPayload(payload);
  const confidence = (value: unknown): string => ["مرتفعة", "متوسطة", "منخفضة"].includes(String(value)) ? String(value) : "متوسطة";
  const claimType = (value: unknown): string => ["fact", "inference", "hypothesis"].includes(String(value)) ? String(value) : "inference";
  const severity = (value: unknown): string => ["high", "medium", "low"].includes(String(value)) ? String(value) : "medium";
  const executiveInput = input.executive && typeof input.executive === "object" ? input.executive as JsonRecord : {};
  const executiveRefs = cleanRefs(executiveInput.evidenceRefs, allowed, 10);

  const diagnosticSections = (Array.isArray(input.diagnosticSections) ? input.diagnosticSections as JsonRecord[] : [])
    .slice(0, 9)
    .map((item, index) => ({
      id: `diagnostic.ai.${index + 1}`,
      title: cleanString(item.title, 220),
      analysis: cleanString(item.analysis, 2400),
      claimType: claimType(item.claimType),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 10),
      confidence: confidence(item.confidence),
      implications: cleanStringArray(item.implications, 5, 600),
      alternativeExplanations: cleanStringArray(item.alternativeExplanations, 4, 600),
      limitations: cleanStringArray(item.limitations, 5, 600),
      dataRequests: cleanStringArray(item.dataRequests, 5, 600),
      source: "gemini-primary",
    }))
    .filter(item => item.title && item.analysis && item.evidenceRefs.length);

  const findings = (Array.isArray(input.findings) ? input.findings as JsonRecord[] : [])
    .slice(0, 12)
    .map((item, index) => ({
      id: `finding.ai.${index + 1}`,
      title: cleanString(item.title, 220),
      statement: cleanString(item.statement, 1000),
      claimType: claimType(item.claimType),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 10),
      confidence: confidence(item.confidence),
      severity: severity(item.severity),
      educationalImpact: cleanString(item.educationalImpact, 1000),
      recommendedAction: cleanString(item.recommendedAction, 1000),
      limitations: cleanStringArray(item.limitations, 5, 600),
      source: "gemini-primary",
    }))
    .filter(item => item.title && item.statement && item.evidenceRefs.length && item.educationalImpact && item.recommendedAction);

  const qualityTools = (Array.isArray(input.qualityTools) ? input.qualityTools as JsonRecord[] : [])
    .slice(0, 10)
    .map((item, index) => ({
      id: `tool.ai.${index + 1}`,
      name: cleanString(item.name, 220),
      reason: cleanString(item.reason, 800),
      conditionsMet: item.conditionsMet !== false,
      interpretation: cleanString(item.interpretation, 1000),
      requiredData: cleanStringArray(item.requiredData, 6, 500),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 10),
      source: "gemini-primary",
    }))
    .filter(item => item.name && item.reason);

  const interventions = (Array.isArray(input.interventions) ? input.interventions as JsonRecord[] : [])
    .slice(0, 8)
    .map((item, index) => ({
      id: `intervention.ai.${index + 1}`,
      priority: cleanString(item.priority, 120) || `أولوية ${index + 1}`,
      issue: cleanString(item.issue, 320),
      targetGroup: cleanString(item.targetGroup, 320),
      action: cleanString(item.action, 1400),
      implementationSteps: cleanStringArray(item.implementationSteps, 6, 650),
      responsibleRole: cleanString(item.responsibleRole, 280),
      timeframe: cleanString(item.timeframe, 240),
      successIndicator: cleanString(item.successIndicator, 850),
      monitoringMethod: cleanString(item.monitoringMethod, 750),
      contingency: cleanString(item.contingency, 850),
      resources: cleanStringArray(item.resources, 6, 500),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 10),
      source: "gemini-primary",
    }))
    .filter(item => item.issue && item.action && item.successIndicator && item.evidenceRefs.length);

  const monitoringPlan = (Array.isArray(input.monitoringPlan) ? input.monitoringPlan as JsonRecord[] : [])
    .slice(0, 8)
    .map((item, index) => ({
      id: `monitoring.ai.${index + 1}`,
      stage: cleanString(item.stage, 220),
      timing: cleanString(item.timing, 220),
      measure: cleanString(item.measure, 800),
      owner: cleanString(item.owner, 280),
      evidenceRefs: cleanRefs(item.evidenceRefs, allowed, 10),
      source: "gemini-primary",
    }))
    .filter(item => item.stage && item.measure);

  if (!cleanString(executiveInput.title, 240) || !cleanString(executiveInput.summary, 1800)) {
    throw new Error("لم ينتج المحلل الذكي ملخصًا تنفيذيًا مكتملًا.");
  }
  if (diagnosticSections.length < 2 || findings.length < 2 || interventions.length < 1) {
    throw new Error("التحليل الذكي لم يبلغ الحد الأدنى من التشخيص المرتبط بالأدلة.");
  }

  const profileInput = input.analysisProfile && typeof input.analysisProfile === "object" ? input.analysisProfile as JsonRecord : {};
  const suggested = input.suggestedNewType && typeof input.suggestedNewType === "object" ? input.suggestedNewType as JsonRecord : {};
  return {
    contractVersion: "6.0.0",
    analysisProfile: {
      method: cleanString(profileInput.method, 900),
      dataAdequacy: cleanString(profileInput.dataAdequacy, 700),
      dimensions: cleanStringArray(profileInput.dimensions, 10, 350),
      decisionUses: cleanStringArray(profileInput.decisionUses, 10, 350),
    },
    executive: {
      title: cleanString(executiveInput.title, 240),
      summary: cleanString(executiveInput.summary, 1800),
      overallJudgement: cleanString(executiveInput.overallJudgement, 500),
      confidence: confidence(executiveInput.confidence),
      evidenceRefs: executiveRefs,
      limitations: cleanStringArray(executiveInput.limitations, 6, 600),
    },
    diagnosticSections,
    findings,
    qualityTools,
    interventions,
    monitoringPlan,
    additionalCautions: cleanStringArray(input.additionalCautions, 8, 650),
    missingDataRequests: cleanStringArray(input.missingDataRequests, 8, 650),
    suggestedNewType: {
      needed: Boolean(suggested.needed),
      nameAr: cleanString(suggested.nameAr, 220),
      purpose: cleanString(suggested.purpose, 700),
    },
    validation: {
      availableEvidenceCount: allowed.size,
      acceptedDiagnosticSections: diagnosticSections.length,
      acceptedFindings: findings.length,
      acceptedInterventions: interventions.length,
      acceptedMonitoringStages: monitoringPlan.length,
    },
  };
}

async function analyzePrimary(payload: JsonRecord): Promise<JsonRecord> {
  const preferred = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  const models = uniqueModelCandidates(preferred, GENERAL_MODEL_FALLBACKS);
  const startedAt = performance.now();
  const { raw, requestId, modelUsed, fallbackUsed } = await geminiRequestWithFallback(models, {
    systemInstruction: { parts: [{ text: primaryAnalysisInstructions() }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: PRIMARY_ANALYSIS_SCHEMA,
      maxOutputTokens: 7600,
      candidateCount: 1,
      temperature: 0.35,
    },
  }, 2);
  const candidate = candidateResult(raw);
  if (candidate.finishReason === "MAX_TOKENS") throw new Error("توقف التحليل الذكي قبل اكتمال عقد النتيجة.");
  const result = validatePrimaryAnalysis(parseJsonObject(candidate.text), payload);
  const validation = result.validation && typeof result.validation === "object" ? result.validation as JsonRecord : {};
  return {
    result,
    model: String(raw.modelVersion || modelUsed),
    usage: raw.usageMetadata || null,
    requestId,
    provider: "gemini",
    serverTiming: {
      aiPrimary: true,
      geminiMs: Math.round(performance.now() - startedAt),
      payloadChars: JSON.stringify(payload).length,
      outputCharacters: candidate.text.length,
      finishReason: candidate.finishReason,
      fallbackUsed,
      acceptedDiagnosticSections: validation.acceptedDiagnosticSections || 0,
      acceptedFindings: validation.acceptedFindings || 0,
      acceptedInterventions: validation.acceptedInterventions || 0,
    },
  };
}

function errorInfo(message: string): { status: number; errorCode: string; retryable: boolean } {
  if (/رمز الوصول غير صحيح|النطاق غير مسموح|حجم الطلب أكبر|العملية المطلوبة غير مدعومة/i.test(message)) return { status: 400, errorCode: "REQUEST_NOT_RETRYABLE", retryable: false };
  if (/api key|مفتاح.*غير صالح|GEMINI_API_KEY|model.*not found|النموذج.*غير/i.test(message)) return { status: 502, errorCode: "GEMINI_CONFIGURATION", retryable: false };
  if (/429|rate limit|quota|RESOURCE_EXHAUSTED/i.test(message)) return { status: 429, errorCode: "GEMINI_RATE_LIMIT", retryable: false };
  if (/timeout|تعذر الاتصال|unavailable|overload|503|500/i.test(message)) return { status: 503, errorCode: "GEMINI_TRANSIENT", retryable: false };
  return { status: 500, errorCode: "GEMINI_RESPONSE", retryable: false };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!originIsAllowed(origin)) return jsonResponse({ ok: false, error: "هذا النطاق غير مسموح له باستدعاء الوظيفة." }, 403, origin);
    return new Response("ok", { headers: corsHeaders(origin) });
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
    if (operation === "ping") ai = await pingGemini();
    else if (operation === "classify") ai = await classify(payload);
    else if (operation === "vision_extract") ai = await extractVisual(payload);
    else if (operation === "analyze_primary") ai = await analyzePrimary(payload);
    else if (operation === "enhance_fast") ai = await enhanceFast(payload);
    else return jsonResponse({ ok: false, error: "العملية المطلوبة غير مدعومة." }, 400, origin);
    return jsonResponse({ ok: true, operation, aiKeyConfigured: Boolean(Deno.env.get("GEMINI_API_KEY")), ...ai }, 200, origin);
  } catch (error) {
    console.error("taqareer-ai-error", error);
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع في وظيفة التحليل.";
    const info = errorInfo(message);
    return jsonResponse({ ok: false, operation, error: message, errorCode: info.errorCode, retryable: info.retryable }, info.status, origin);
  }
});
