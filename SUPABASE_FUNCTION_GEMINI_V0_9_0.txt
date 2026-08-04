const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_CLASSIFIER_MODEL = "gemini-2.5-flash-lite";
const MAX_REQUEST_BYTES = 9_000_000;
const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000;

const ANALYSIS_SCHEMA = {
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
        rationale: { type: "string" }
      },
      required: ["id", "nameAr", "confidence", "rationale"]
    },
    executiveTitle: { type: "string" },
    executiveSummary: { type: "string" },
    analysisProfile: {
      type: "object",
      additionalProperties: false,
      properties: {
        method: { type: "string" },
        dataAdequacy: { type: "string" },
        dimensions: { type: "array", items: { type: "string" } },
        decisionUses: { type: "array", items: { type: "string" } }
      },
      required: ["method", "dataAdequacy", "dimensions", "decisionUses"]
    },
    diagnosticSections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          analysis: { type: "string" },
          evidenceRefs: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["مرتفعة", "متوسطة", "منخفضة"] },
          implications: { type: "array", items: { type: "string" } },
          limitations: { type: "array", items: { type: "string" } }
        },
        required: ["title", "analysis", "evidenceRefs", "confidence", "implications", "limitations"]
      }
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          statement: { type: "string" },
          evidenceRefs: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["مرتفعة", "متوسطة", "منخفضة"] },
          educationalImpact: { type: "string" },
          recommendedAction: { type: "string" },
          limitations: { type: "array", items: { type: "string" } }
        },
        required: ["title", "statement", "evidenceRefs", "confidence", "educationalImpact", "recommendedAction", "limitations"]
      }
    },
    qualityTools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          reason: { type: "string" },
          conditionsMet: { type: "boolean" },
          interpretation: { type: "string" },
          requiredData: { type: "array", items: { type: "string" } }
        },
        required: ["id", "name", "reason", "conditionsMet", "interpretation", "requiredData"]
      }
    },
    improvementPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: { type: "string", enum: ["عالية", "متوسطة", "محددة"] },
          issue: { type: "string" },
          targetGroup: { type: "string" },
          action: { type: "string" },
          responsibleRole: { type: "string" },
          timeframe: { type: "string" },
          successIndicator: { type: "string" },
          monitoringMethod: { type: "string" },
          contingency: { type: "string" },
          evidenceRefs: { type: "array", items: { type: "string" } }
        },
        required: ["priority", "issue", "targetGroup", "action", "responsibleRole", "timeframe", "successIndicator", "monitoringMethod", "contingency", "evidenceRefs"]
      }
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
          owner: { type: "string" }
        },
        required: ["stage", "timing", "measure", "owner"]
      }
    },
    dataRequests: { type: "array", items: { type: "string" } },
    cautions: { type: "array", items: { type: "string" } },
    suggestedNewType: {
      type: "object",
      additionalProperties: false,
      properties: {
        needed: { type: "boolean" },
        nameAr: { type: "string" },
        purpose: { type: "string" },
        requiredFields: { type: "array", items: { type: "string" } },
        analysisFamily: { type: "array", items: { type: "string" } }
      },
      required: ["needed", "nameAr", "purpose", "requiredFields", "analysisFamily"]
    }
  },
  required: ["classification", "executiveTitle", "executiveSummary", "analysisProfile", "diagnosticSections", "findings", "qualityTools", "improvementPlan", "monitoringPlan", "dataRequests", "cautions", "suggestedNewType"]
};

const DEEP_ANALYSIS_OUTPUT_KEYS = [
  "contractVersion",
  "deepAnalysisUnits",
  "patches",
  "additionalCautions",
  "missingDataRequests",
] as const;

const SEGMENT_PROTOCOL_VERSION = "4.1.0";
const SEGMENT_NAMES = new Set(["diagnostic", "findings", "interventions", "governance"]);
type SegmentConfig = { thinkingBudget: number; compactThinkingBudget: number; maxOutputTokens: number; compactMaxOutputTokens: number };
const SEGMENT_CONFIG: Record<string, SegmentConfig> = {
  diagnostic: { thinkingBudget: 320, compactThinkingBudget: 160, maxOutputTokens: 2300, compactMaxOutputTokens: 1500 },
  findings: { thinkingBudget: 256, compactThinkingBudget: 128, maxOutputTokens: 1900, compactMaxOutputTokens: 1250 },
  interventions: { thinkingBudget: 320, compactThinkingBudget: 160, maxOutputTokens: 2100, compactMaxOutputTokens: 1400 },
  governance: { thinkingBudget: 192, compactThinkingBudget: 96, maxOutputTokens: 1350, compactMaxOutputTokens: 900 },
};

class SegmentGenerationError extends Error {
  details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = "SegmentGenerationError";
    this.details = details;
  }
}

function segmentConfig(segment: string, scope: string): SegmentConfig {
  if (segment !== "governance") return SEGMENT_CONFIG[segment];
  if (scope === "quality" || scope === "monitoring") {
    return { thinkingBudget: 176, compactThinkingBudget: 80, maxOutputTokens: 1150, compactMaxOutputTokens: 760 };
  }
  return SEGMENT_CONFIG.governance;
}


const CLASSIFICATION_SCHEMA = {
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
        rationale: { type: "string" }
      },
      required: ["id", "nameAr", "confidence", "rationale"]
    },
    suggestedNewType: {
      type: "object",
      additionalProperties: false,
      properties: {
        needed: { type: "boolean" },
        nameAr: { type: "string" },
        purpose: { type: "string" }
      },
      required: ["needed", "nameAr", "purpose"]
    }
  },
  required: ["classification", "suggestedNewType"]
};

const VISION_SCHEMA = {
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
        rationale: { type: "string" }
      },
      required: ["id", "nameAr", "confidence", "rationale"]
    },
    extractionMode: { type: "string", enum: ["table", "narrative", "mixed"] },
    title: { type: "string" },
    metadata: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { key: { type: "string" }, value: { type: "string" } },
        required: ["key", "value"]
      }
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
              required: ["cells"]
            }
          }
        },
        required: ["name", "headers", "rows"]
      }
    },
    narrativeText: { type: "string" },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["documentType", "extractionMode", "title", "metadata", "datasets", "narrativeText", "warnings"]
};

function allowedOrigins(): string[] {
  return (Deno.env.get("TAQAREER_ALLOWED_ORIGINS") || "*")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = allowedOrigins();
  const normalizedOrigin = (origin || "").replace(/\/$/, "");
  const allowOrigin = allowed.includes("*") ? "*" : (allowed.includes(normalizedOrigin) ? normalizedOrigin : "null");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-taqareer-access-code",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function originIsAllowed(origin: string | null): boolean {
  const allowed = allowedOrigins();
  if (allowed.includes("*")) return true;
  if (!origin) return true;
  return allowed.includes(origin.replace(/\/$/, ""));
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

async function secureEqual(a: string, b: string): Promise<boolean> {
  const left = await digest(a);
  const right = await digest(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) diff |= left[index] ^ right[index];
  return diff === 0;
}

function normalizeModelName(value: string): string {
  return String(value || DEFAULT_MODEL)
    .trim()
    .replace(/^models\//, "") || DEFAULT_MODEL;
}

function geminiCandidateResult(response: Record<string, unknown>): { text: string; finishReason: string } {
  const candidates = Array.isArray(response.candidates)
    ? response.candidates as Array<Record<string, unknown>>
    : [];

  const first = candidates[0];
  if (!first) {
    const feedback = response.promptFeedback as Record<string, unknown> | undefined;
    const blockReason = String(feedback?.blockReason || "");
    if (blockReason) throw new Error(`حظر Gemini الطلب: ${blockReason}.`);
    throw new Error("لم يرجع Gemini أي نتيجة.");
  }

  const finishReason = String(first.finishReason || "STOP");
  if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
    throw new Error(`توقف Gemini قبل إكمال النتيجة: ${finishReason}.`);
  }

  const content = first.content && typeof first.content === "object"
    ? first.content as Record<string, unknown>
    : {};
  const parts = Array.isArray(content.parts)
    ? content.parts as Array<Record<string, unknown>>
    : [];

  const text = parts
    .map((part) => typeof part.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
  return { text, finishReason };
}

function geminiOutputText(response: Record<string, unknown>): string {
  const candidate = geminiCandidateResult(response);
  if (candidate.finishReason === "MAX_TOKENS") {
    throw new Error("توقف رد Gemini عند حد الإخراج قبل اكتمال النتيجة.");
  }
  return candidate.text;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("رجع Gemini استجابة JSON فارغة.");

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const candidates = [unfenced];
  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const extracted = unfenced.slice(firstBrace, lastBrace + 1);
    if (extracted !== unfenced) candidates.push(extracted);
  }

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("الجذر ليس كائن JSON.");
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`رجع Gemini JSON غير مكتمل أو غير صالح: ${lastError instanceof Error ? lastError.message : "تعذر التحليل"}.`);
}

function parseImageDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("صيغة الصورة غير صالحة.");
  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  return { mimeType, data: match[2] };
}

function shouldRetryGemini(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function geminiRequest(
  model: string,
  requestBody: Record<string, unknown>,
): Promise<{ raw: Record<string, unknown>; requestId: string | null }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("سر GEMINI_API_KEY غير مضبوط في Supabase.");

  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(normalizeModelName(model))}:generateContent`;
  let lastMessage = "تعذر الاتصال بـGemini.";

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const requestId = response.headers.get("x-request-id") ||
      response.headers.get("x-goog-request-id");
    const rawText = await response.text();

    let raw: Record<string, unknown> = {};
    try {
      raw = rawText ? JSON.parse(rawText) as Record<string, unknown> : {};
    } catch {
      raw = { error: { message: rawText || "استجابة غير مفهومة من Gemini." } };
    }

    if (response.ok) return { raw, requestId };

    const errorObject = raw.error && typeof raw.error === "object"
      ? raw.error as Record<string, unknown>
      : {};
    lastMessage = String(errorObject.message || `فشل Gemini برمز ${response.status}.`);

    if (!shouldRetryGemini(response.status) || attempt === 2) {
      throw new Error(lastMessage);
    }

    const jitter = Math.floor(Math.random() * 250);
    await wait((2 ** attempt) * 900 + jitter);
  }

  throw new Error(lastMessage);
}

function validateVisualPayload(payload: Record<string, unknown>): Array<{ label: string; dataUrl: string }> {
  const images = Array.isArray(payload.images) ? payload.images : [];
  if (!images.length) throw new Error("لم تصل أي صورة إلى وظيفة القراءة البصرية.");
  if (images.length > MAX_IMAGE_COUNT) throw new Error(`الحد الأعلى ${MAX_IMAGE_COUNT} صور في الطلب الواحد.`);
  return images.map((image, index) => {
    if (!image || typeof image !== "object") throw new Error(`الصورة رقم ${index + 1} غير صالحة.`);
    const label = String((image as Record<string, unknown>).label || `صورة ${index + 1}`);
    const dataUrl = String((image as Record<string, unknown>).dataUrl || "");
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(dataUrl)) throw new Error(`تنسيق الصورة رقم ${index + 1} غير مدعوم.`);
    if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) throw new Error(`الصورة رقم ${index + 1} كبيرة جدًا. قلل دقتها ثم أعد المحاولة.`);
    return { label, dataUrl };
  });
}

function analysisInstructions(): string {
  return `أنت محلل تربوي خبير في الإشراف المدرسي، تقويم تعلم الطلبة، تحليل النتائج، وأدوات الجودة التعليمية في السياق العربي والعماني.
حلل البيانات المقدمة بعمق ولكن بانضباط مهني صارم:
1) لا تخترع رقمًا أو حقلًا أو دليلًا غير موجود.
2) كل استنتاج يجب أن يستخدم مراجع موجودة حرفيًا داخل availableEvidenceRefs. لا تنشئ مرجعًا جديدًا من عندك.
3) ميّز بين الوصف، والاستنتاج المحتمل، والسبب المثبت. لا تحول الارتباط إلى سببية.
4) لا تستخدم أداة جودة إلا عند تحقق شروطها، واذكر ذلك في conditionsMet.
5) اجعل التوصيات محددة وقابلة للتنفيذ، مع دور مسؤول وزمن ومؤشر نجاح.
6) راعِ نوع الاستمارة وهدفها؛ لا تطبق قالب تحليل موحدًا.
7) عند ظهور نوع جديد، اقترح تعريفًا مختصرًا له بدل إجباره على نوع معروف.
8) اكتب بالعربية الواضحة، ولا تعرض أسماء الأفراد أو تعيد كشف بيانات حُجبت.
9) ابنِ تحليلًا عميقًا خاصًا بالنوع: لا تستخدم الإجراءات أو الأدوات نفسها للاستبانة والزيارة الإشرافية والنتائج والبرامج والاحتياجات التدريبية والسلوك.
10) استخدم deterministicAnalysis بوصفه مصدر الحسابات والرسوم وأدوات الجودة الحتمية، ثم أضف تفسيرًا تربويًا لا تكرارًا للأرقام. لا تعِد حساب الصفوف ولا تسرد كل مؤشر مرة أخرى.
11) أنشئ analysisProfile يوضح منهج التحليل وكفاية البيانات والأبعاد والقرارات التي تدعمها.
12) أنشئ 3 إلى 8 diagnosticSections، وكل قسم يفسر نمطًا أو علاقة أو فجوة أو اتساقًا مع آثار عملية وحدود صريحة.
13) اجعل عدد الاستنتاجات الأساسية بين 4 و8 بحسب قوة البيانات، وخطة التحسين بين 3 و6 إجراءات متعددة المستويات عند الحاجة. العمق في التفسير والربط، لا في تكرار العبارات.
14) لكل إجراء: المشكلة، الفئة، الإجراء، المسؤول، الزمن، مؤشر النجاح، طريقة المتابعة، والخطة البديلة إذا لم يتحقق التحسن.
15) أنشئ monitoringPlan من خط الأساس إلى إعادة القياس، وdataRequests لما يلزم جمعه لتأكيد الأسباب أو توسيع القرار.
16) في الأنواع الجديدة، استخدم بنية الحقول والغرض المتوقع لبناء عقد تحليل خاص؛ لا تكتفِ بوصف الأعمدة ولا تفرض نوعًا معروفًا.
17) صرّح بالقيود ونقص البيانات بوضوح.`;
}

function validateEvidenceReferences(result: unknown, payload: Record<string, unknown>): unknown {
  if (!result || typeof result !== "object") return result;
  const allowed = new Set(
    (Array.isArray(payload.availableEvidenceRefs) ? payload.availableEvidenceRefs : [])
      .map((value) => String(value))
  );
  if (!allowed.size) return result;

  const output = structuredClone(result) as Record<string, unknown>;
  let removed = 0;
  const findings = Array.isArray(output.findings) ? output.findings as Array<Record<string, unknown>> : [];
  for (const finding of findings) {
    const refs = Array.isArray(finding.evidenceRefs) ? finding.evidenceRefs.map(String) : [];
    const valid = refs.filter((ref) => allowed.has(ref));
    removed += refs.length - valid.length;
    finding.evidenceRefs = valid;
    if (!valid.length) {
      finding.confidence = "منخفضة";
      const limitations = Array.isArray(finding.limitations) ? finding.limitations.map(String) : [];
      limitations.push("لم يقدم النموذج مرجع دليل صالحًا من القائمة المتاحة؛ يحتاج الاستنتاج إلى مراجعة بشرية.");
      finding.limitations = [...new Set(limitations)];
    }
  }

  const sections = Array.isArray(output.diagnosticSections) ? output.diagnosticSections as Array<Record<string, unknown>> : [];
  for (const section of sections) {
    const refs = Array.isArray(section.evidenceRefs) ? section.evidenceRefs.map(String) : [];
    const valid = refs.filter((ref) => allowed.has(ref));
    removed += refs.length - valid.length;
    section.evidenceRefs = valid;
    if (!valid.length && refs.length) {
      section.confidence = "منخفضة";
      const limitations = Array.isArray(section.limitations) ? section.limitations.map(String) : [];
      limitations.push("حُذفت إحالات غير موجودة؛ يحتاج القسم إلى مراجعة بشرية.");
      section.limitations = [...new Set(limitations)];
    }
  }

  const plan = Array.isArray(output.improvementPlan) ? output.improvementPlan as Array<Record<string, unknown>> : [];
  for (const item of plan) {
    const refs = Array.isArray(item.evidenceRefs) ? item.evidenceRefs.map(String) : [];
    const valid = refs.filter((ref) => allowed.has(ref));
    removed += refs.length - valid.length;
    item.evidenceRefs = valid;
  }

  if (removed > 0) {
    const cautions = Array.isArray(output.cautions) ? output.cautions.map(String) : [];
    cautions.push(`حُذفت ${removed} إحالة دليل غير موجودة في البيانات المرسلة.`);
    output.cautions = [...new Set(cautions)];
  }
  return output;
}

function enrichmentInstructions(compactMode = false): string {
  const compact = compactMode
    ? "أنت في محاولة مختصرة بعد انقطاع سابق: حافظ على عمق القراءة التشخيصية، لكن اقتصر على أعلى التحسينات أثرًا، ولا تتجاوز رقعة واحدة أو اثنتين لكل هدف."
    : "قدّم قراءة تربوية عميقة لكل محور مطلوب، ثم حسّن فقط الحقول التنفيذية التي تضيف قيمة فعلية.";
  return `أنت المحلل التربوي العميق داخل بروتوكول مصالحة، ولست مصحح صياغة ولا مولد تقرير موازٍ.
${compact}
القواعد الملزمة:
1) reconciliationContract هو العقد الرسمي الوحيد. الحسابات والأعداد والفئات والحدود ومعرفات العناصر لا تتغير.
2) deepAnalysisTargets هي محاور التحليل العميق. لكل محور: فسّر النمط تربويًا في 3 إلى 5 جمل مترابطة، اربطه بالأدلة، اذكر آثاره العملية، تفسيرًا بديلًا محتملًا، وحدود الاستدلال والبيانات اللازمة للتحقق.
3) لا تكرر الأرقام بلا تفسير، ولا تحول الارتباط إلى سبب مثبت. اشرح ماذا تعني المؤشرات للتعليم والتعلم والقرار.
4) patches تحسينات حقلية عالية القيمة داخل العناصر القائمة فقط. استخدم targetType وtargetId وfield المسموح بها حرفيًا في العقد.
5) لا تنشئ تدخلًا أو مرحلة متابعة أو أداة جودة أو استنتاجًا موازيًا. حسّن الإجراء، التنفيذ، مؤشر النجاح، المتابعة أو الخطة البديلة داخل الهدف الموجود.
6) لا تعد كتابة كل حقل. أرسل رقعة فقط عندما تضيف عمقًا أو دقة أو قابلية تنفيذ واضحة.
7) كل evidenceRefs يجب أن يكون موجودًا حرفيًا في availableEvidenceRefs. لا تخترع دليلًا.
8) اختلف باختلاف نوع الاستمارة: نتائج الدرجات، الاستبانة، التقرير الإشرافي، أعمال الطلبة والبرامج ليست قالبًا واحدًا.
9) لا تعرض أسماء أشخاص أو بيانات حجبت.
10) contractVersion في الرد يجب أن يكون 3.0.0.
11) في تحليل الدرجات: عمّق المحاور الأربعة، وحسّن الاستنتاجات الخمسة والتدخلات الأربعة والمتابعة القائمة دون تغيير أعدادها.
12) additionalCautions وmissingDataRequests تستخدمان فقط لما يؤثر في سلامة القرار أو يثبت فرضيات الأسباب.
13) patches: ضع النص في text للقيم النصية، أو القائمة في items للحقول القائمة. اترك الآخر فارغًا.
14) أعد JSON خامًا فقط بلا Markdown أو شرح خارجي، وبالمفاتيح العليا الخمسة حرفيًا:
{
  "contractVersion": "3.0.0",
  "deepAnalysisUnits": [],
  "patches": [],
  "additionalCautions": [],
  "missingDataRequests": []
}
15) كل عنصر deepAnalysisUnits يجب أن يحتوي: targetId, analysis, evidenceRefs, confidence, implications, alternativeExplanations, limitations, dataRequests.
16) كل عنصر patches يجب أن يحتوي: targetType, targetId, field, text, items, evidenceRefs. استخدم سلسلة فارغة أو قائمة فارغة للحقل غير المستخدم.`;
}

function contractObject(payload: Record<string, unknown>): Record<string, unknown> {
  return payload.reconciliationContract && typeof payload.reconciliationContract === "object"
    ? payload.reconciliationContract as Record<string, unknown>
    : {};
}

function prepareEnrichmentPayload(payload: Record<string, unknown>, compactMode: boolean): Record<string, unknown> {
  const prepared = structuredClone(payload) as Record<string, unknown>;
  prepared.compactMode = compactMode;
  const data = prepared.data && typeof prepared.data === "object" ? prepared.data as Record<string, unknown> : {};
  if (Array.isArray(data.sampleRows)) data.sampleRows = compactMode ? [] : data.sampleRows.slice(0, 6);
  if (Array.isArray(data.lines)) data.lines = compactMode ? data.lines.slice(0, 100) : data.lines.slice(0, 220);
  prepared.data = data;
  const deterministic = prepared.deterministicAnalysis && typeof prepared.deterministicAnalysis === "object"
    ? prepared.deterministicAnalysis as Record<string, unknown>
    : {};
  if (Array.isArray(deterministic.charts)) deterministic.charts = deterministic.charts.slice(0, compactMode ? 4 : 7);
  if (Array.isArray(deterministic.metrics)) deterministic.metrics = deterministic.metrics.slice(0, compactMode ? 20 : 28);
  if (Array.isArray(deterministic.evidenceCatalog)) deterministic.evidenceCatalog = deterministic.evidenceCatalog.slice(0, compactMode ? 60 : 100);
  prepared.deterministicAnalysis = deterministic;
  if (compactMode) {
    const contract = contractObject(prepared);
    const patchTargets = contract.patchTargets && typeof contract.patchTargets === "object"
      ? contract.patchTargets as Record<string, unknown>
      : {};
    contract.patchTargets = {
      findings: Array.isArray(patchTargets.findings) ? patchTargets.findings : [],
      interventions: Array.isArray(patchTargets.interventions) ? patchTargets.interventions : [],
      qualityTools: [],
      monitoring: Array.isArray(patchTargets.monitoring) ? patchTargets.monitoring : [],
    };
    prepared.reconciliationContract = contract;
  }
  return prepared;
}

function targetMapFromPayload(payload: Record<string, unknown>): Map<string, Set<string>> {
  const contract = contractObject(payload);
  const output = new Map<string, Set<string>>();
  const executive = contract.executive && typeof contract.executive === "object" ? contract.executive as Record<string, unknown> : {};
  const profile = contract.profile && typeof contract.profile === "object" ? contract.profile as Record<string, unknown> : {};
  output.set(`executive:${String(executive.id || "executive")}`, new Set(Array.isArray(executive.allowedFields) ? executive.allowedFields.map(String) : []));
  output.set(`profile:${String(profile.id || "profile")}`, new Set(Array.isArray(profile.allowedFields) ? profile.allowedFields.map(String) : []));
  const patchTargets = contract.patchTargets && typeof contract.patchTargets === "object"
    ? contract.patchTargets as Record<string, unknown>
    : {};
  const groups: Array<[string, string]> = [["findings", "finding"], ["qualityTools", "qualityTool"], ["interventions", "intervention"], ["monitoring", "monitoring"]];
  for (const [key, targetType] of groups) {
    const items = Array.isArray(patchTargets[key]) ? patchTargets[key] as Array<Record<string, unknown>> : [];
    for (const item of items) {
      output.set(`${targetType}:${String(item.id || "")}`, new Set(Array.isArray(item.allowedFields) ? item.allowedFields.map(String) : []));
    }
  }
  return output;
}

function deepTargetIds(payload: Record<string, unknown>): Set<string> {
  const contract = contractObject(payload);
  const targets = Array.isArray(contract.deepAnalysisTargets) ? contract.deepAnalysisTargets as Array<Record<string, unknown>> : [];
  return new Set(targets.map(item => String(item.id || "")).filter(Boolean));
}

function numberRule(payload: Record<string, unknown>, key: string, fallback: number): number {
  const contract = contractObject(payload);
  const rules = contract.rules && typeof contract.rules === "object" ? contract.rules as Record<string, unknown> : {};
  return Math.max(0, Number(rules[key] || fallback));
}

function validateDeepAnalysisDelta(result: unknown, payload: Record<string, unknown>): Record<string, unknown> {
  if (!result || typeof result !== "object") throw new Error("رجع Gemini نتيجة فارغة لبروتوكول التحليل العميق.");
  const output = structuredClone(result) as Record<string, unknown>;
  const allowedEvidence = new Set((Array.isArray(payload.availableEvidenceRefs) ? payload.availableEvidenceRefs : []).map(String));
  const allowedDeep = deepTargetIds(payload);
  const targets = targetMapFromPayload(payload);
  const maxDeep = numberRule(payload, "maxDeepAnalysisUnits", 6);
  const maxPatches = numberRule(payload, "maxPatches", 30);
  let rejectedTargets = 0;
  let rejectedEvidence = 0;
  let rejectedFields = 0;

  const seenDeep = new Set<string>();
  const deep = Array.isArray(output.deepAnalysisUnits) ? output.deepAnalysisUnits as Array<Record<string, unknown>> : [];
  output.deepAnalysisUnits = deep.slice(0, maxDeep).filter(item => {
    const id = String(item.targetId || "");
    if (!id || !allowedDeep.has(id) || seenDeep.has(id)) { rejectedTargets += 1; return false; }
    seenDeep.add(id);
    const refs = Array.isArray(item.evidenceRefs) ? item.evidenceRefs.map(String) : [];
    const valid = refs.filter(ref => allowedEvidence.has(ref));
    rejectedEvidence += refs.length - valid.length;
    item.evidenceRefs = valid;
    return Boolean(String(item.analysis || "").trim() && valid.length);
  });

  const seenPatch = new Set<string>();
  const patches = Array.isArray(output.patches) ? output.patches as Array<Record<string, unknown>> : [];
  output.patches = patches.slice(0, maxPatches).filter(item => {
    const targetType = String(item.targetType || "");
    const targetId = String(item.targetId || "");
    const field = String(item.field || "");
    const key = `${targetType}:${targetId}:${field}`;
    const allowedFields = targets.get(`${targetType}:${targetId}`);
    if (!targetId || !field || !allowedFields) { rejectedTargets += 1; return false; }
    if (!allowedFields.has(field) || seenPatch.has(key)) { rejectedFields += 1; return false; }
    seenPatch.add(key);
    const refs = Array.isArray(item.evidenceRefs) ? item.evidenceRefs.map(String) : [];
    const valid = refs.filter(ref => allowedEvidence.has(ref));
    rejectedEvidence += refs.length - valid.length;
    item.evidenceRefs = valid;
    const hasText = Boolean(String(item.text || "").trim());
    const hasItems = Array.isArray(item.items) && item.items.some(value => String(value || "").trim());
    return hasText || hasItems;
  });

  output.contractVersion = "3.0.0";
  output.additionalCautions = Array.isArray(output.additionalCautions) ? output.additionalCautions.map(String).filter(Boolean).slice(0, 6) : [];
  output.missingDataRequests = Array.isArray(output.missingDataRequests) ? output.missingDataRequests.map(String).filter(Boolean).slice(0, 8) : [];
  output.validation = {
    returnedDeepAnalysisUnits: deep.length,
    acceptedDeepAnalysisUnits: (output.deepAnalysisUnits as unknown[]).length,
    returnedPatches: patches.length,
    acceptedPatches: (output.patches as unknown[]).length,
    rejectedTargets,
    rejectedFields,
    rejectedEvidence,
  };
  return output;
}

async function callDeepEnrichment(payload: Record<string, unknown>, model: string, startedAt: number) {
  const attempts = [
    { compactMode: false, thinkingBudget: 512, maxOutputTokens: 4800 },
    { compactMode: true, thinkingBudget: 256, maxOutputTokens: 3800 },
  ];
  let firstFailure = "";
  for (let index = 0; index < attempts.length; index++) {
    const attempt = attempts[index];
    const prepared = prepareEnrichmentPayload(payload, attempt.compactMode);
    const { raw, requestId } = await geminiRequest(model, {
      systemInstruction: { parts: [{ text: enrichmentInstructions(attempt.compactMode) }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(prepared) }] }],
      generationConfig: {
        // لا نرسل responseJsonSchema لمسار enrich. مخطط التحليل العميق كبير
        // ويستطيع Gemini رفضه قبل التوليد بسبب تعقيد حالات المخطط.
        // نستخدم JSON mode ثم نتحقق خادميًا من المعرفات والحقول والأدلة.
        responseMimeType: "application/json",
        maxOutputTokens: attempt.maxOutputTokens,
        candidateCount: 1,
        temperature: 0.15,
        thinkingConfig: { thinkingBudget: attempt.thinkingBudget, includeThoughts: false },
      },
    });
    const candidate = geminiCandidateResult(raw);
    if (candidate.finishReason === "MAX_TOKENS") {
      firstFailure = "توقف رد Gemini عند حد الإخراج قبل اكتمال JSON.";
      if (index === 0) continue;
      throw new Error(`${firstFailure} فشلت أيضًا المحاولة المختصرة.`);
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonObject(candidate.text);
    } catch (error) {
      firstFailure = error instanceof Error ? error.message : "رجع Gemini JSON غير مكتمل أو غير صالح.";
      if (index === 0) continue;
      throw new Error(`${firstFailure} فشلت أيضًا المحاولة المختصرة.`);
    }
    const result = validateDeepAnalysisDelta(parsed, prepared);
    const validation = result.validation && typeof result.validation === "object" ? result.validation as Record<string, unknown> : {};
    const usage = raw.usageMetadata && typeof raw.usageMetadata === "object" ? raw.usageMetadata as Record<string, unknown> : null;
    return {
      result,
      model: String(raw.modelVersion || model),
      usage,
      requestId,
      provider: "gemini",
      serverTiming: {
        geminiMs: Math.round(performance.now() - startedAt),
        payloadChars: JSON.stringify(prepared).length,
        attemptNumber: index + 1,
        compactRetryUsed: index > 0,
        finishReason: candidate.finishReason,
        outputMode: "json-mode-server-validated",
        responseSchemaSent: false,
        thinkingBudget: attempt.thinkingBudget,
        maxOutputTokens: attempt.maxOutputTokens,
        outputCharacters: candidate.text.length,
        returnedDeepAnalysisUnits: validation.returnedDeepAnalysisUnits || 0,
        acceptedDeepAnalysisUnits: validation.acceptedDeepAnalysisUnits || 0,
        returnedPatches: validation.returnedPatches || 0,
        acceptedPatches: validation.acceptedPatches || 0,
        promptTokenCount: usage?.promptTokenCount || null,
        thoughtsTokenCount: usage?.thoughtsTokenCount || null,
        candidatesTokenCount: usage?.candidatesTokenCount || null,
      },
    };
  }
  throw new Error(firstFailure || "تعذر إكمال بروتوكول التحليل العميق.");
}


function segmentedInstructions(segment: string, compactMode = false, scope = "full"): string {
  const compact = compactMode
    ? "هذه محاولة مركزة بعد انقطاع سابق. استخدم جملة أو جملتين مفيدتين لكل هدف، ولا تعيد أي سياق موجود في العقد."
    : "قدّم عمقًا تربويًا داخل المهمة المحددة فقط، دون إعادة بناء التقرير أو تكرار الحسابات.";
  const duties: Record<string, string> = {
    diagnostic: "أعد deepAnalysisUnits لمحاور deepAnalysisTargets المرسلة فقط: تفسير النمط، الآثار، تفسير بديل، حدود الاستدلال، والبيانات المطلوبة للتحقق. لا ترجع patches.",
    findings: "أعد patches للأهداف executive وprofile وfinding المرسلة فقط. عمّق المعنى والأثر والإجراء المرتبط، ولا تنشئ استنتاجات جديدة.",
    interventions: "أعد patches لأهداف intervention المرسلة فقط. حسّن التنفيذ والمسؤول والزمن ومؤشر النجاح والمتابعة والخطة البديلة دون إنشاء تدخل جديد.",
    governance: scope === "quality"
      ? "أعد patches لأهداف qualityTool المرسلة فقط. حسّن سبب اختيار الأداة وتفسير ناتجها والبيانات الإضافية المطلوبة. لا ترجع monitoring."
      : scope === "monitoring"
        ? "أعد patches لأهداف monitoring المرسلة فقط، وأضف cautions أو missingDataRequests الضرورية للقرار. لا ترجع qualityTool."
        : "أعد patches لأهداف qualityTool وmonitoring المرسلة فقط، دون إنشاء أدوات أو مراحل جديدة.",
  };
  return `أنت محلل تربوي داخل خط تحليل يعزل المهام المتعثرة، ولست مولد تقرير موازٍ.
المحور الحالي: ${segment}.
المهمة الدقيقة: ${scope}.
${duties[segment] || "التزم بالعقد المرسل."}
${compact}
القواعد الملزمة:
1) الحسابات والأعداد والفئات والحدود ومعرفات العناصر حتمية ولا تتغير.
2) استخدم targetId وtargetType وfield الموجودين حرفيًا في reconciliationContract.
3) لا تخترع evidenceRefs؛ استخدم فقط availableEvidenceRefs.
4) لا تكرر الأرقام دون تفسير تربوي، ولا تحول الارتباط إلى سببية.
5) اختلف بحسب نوع الاستمارة والسياق، ولا تطبق قالب درجات على تقرير سردي أو استبانة.
6) لا تعرض أسماء أشخاص أو بيانات محجوبة.
7) أعد JSON خامًا فقط بالمفاتيح التالية حرفيًا:
{
  "contractVersion":"4.1.0",
  "segment":"${segment}",
  "deepAnalysisUnits":[],
  "patches":[],
  "additionalCautions":[],
  "missingDataRequests":[]
}
8) عنصر deepAnalysisUnits: targetId, analysis, evidenceRefs, confidence, implications, alternativeExplanations, limitations, dataRequests.
9) عنصر patches: targetType, targetId, field, text, items, evidenceRefs. استخدم text أو items فقط واترك الآخر فارغًا.
10) لا تملأ حقلًا بكلام عام. إذا لم توجد إضافة ذات قيمة فاترك القائمة فارغة.`;
}

function prepareSegmentPayload(payload: Record<string, unknown>, compactMode: boolean): Record<string, unknown> {
  const prepared = structuredClone(payload) as Record<string, unknown>;
  const segment = String(prepared.segment || "");
  if (!SEGMENT_NAMES.has(segment)) throw new Error("جزء التحليل المطلوب غير مدعوم.");
  prepared.compactMode = compactMode;
  const data = prepared.data && typeof prepared.data === "object" ? prepared.data as Record<string, unknown> : {};
  if (Array.isArray(data.sampleRows)) data.sampleRows = data.sampleRows.slice(0, compactMode ? 3 : (segment === "diagnostic" ? 8 : 5));
  if (Array.isArray(data.lines)) data.lines = data.lines.slice(0, compactMode ? 50 : (segment === "diagnostic" ? 120 : 75));
  prepared.data = data;
  const deterministic = prepared.deterministicAnalysis && typeof prepared.deterministicAnalysis === "object"
    ? prepared.deterministicAnalysis as Record<string, unknown>
    : {};
  if (Array.isArray(deterministic.metrics)) deterministic.metrics = deterministic.metrics.slice(0, compactMode ? 16 : 24);
  if (Array.isArray(deterministic.charts)) deterministic.charts = deterministic.charts.slice(0, compactMode ? 3 : 6);
  if (Array.isArray(deterministic.evidenceCatalog)) deterministic.evidenceCatalog = deterministic.evidenceCatalog.slice(0, compactMode ? 35 : 70);
  prepared.deterministicAnalysis = deterministic;
  if (compactMode) {
    const contract = contractObject(prepared);
    const targets = Array.isArray(contract.deepAnalysisTargets) ? contract.deepAnalysisTargets as Array<Record<string, unknown>> : [];
    contract.deepAnalysisTargets = targets.map(item => ({
      ...item,
      currentAnalysis: String(item.currentAnalysis || "").slice(0, 320),
      currentImplications: Array.isArray(item.currentImplications) ? item.currentImplications.slice(0, 2) : [],
      currentLimitations: Array.isArray(item.currentLimitations) ? item.currentLimitations.slice(0, 2) : [],
    }));
    prepared.reconciliationContract = contract;
  }
  return prepared;
}

function validateSegmentDelta(result: unknown, payload: Record<string, unknown>): Record<string, unknown> {
  const segment = String(payload.segment || "");
  const scope = String(payload.scope || "full");
  if (!SEGMENT_NAMES.has(segment)) throw new Error("جزء التحليل غير صالح.");
  const normalized = result && typeof result === "object" ? structuredClone(result) as Record<string, unknown> : {};
  normalized.deepAnalysisUnits = Array.isArray(normalized.deepAnalysisUnits) ? normalized.deepAnalysisUnits : [];
  normalized.patches = Array.isArray(normalized.patches) ? normalized.patches : [];
  normalized.additionalCautions = Array.isArray(normalized.additionalCautions) ? normalized.additionalCautions : [];
  normalized.missingDataRequests = Array.isArray(normalized.missingDataRequests) ? normalized.missingDataRequests : [];
  normalized.contractVersion = SEGMENT_PROTOCOL_VERSION;
  normalized.segment = segment;
  const validated = validateDeepAnalysisDelta(normalized, payload);
  const allowedPatchTypes: Record<string, Set<string>> = {
    diagnostic: new Set(),
    findings: new Set(["executive", "profile", "finding"]),
    interventions: new Set(["intervention"]),
    governance: scope === "quality" ? new Set(["qualityTool"])
      : scope === "monitoring" ? new Set(["monitoring"])
      : new Set(["qualityTool", "monitoring"]),
  };
  if (segment !== "diagnostic") validated.deepAnalysisUnits = [];
  const patches = Array.isArray(validated.patches) ? validated.patches as Array<Record<string, unknown>> : [];
  validated.patches = patches.filter(item => allowedPatchTypes[segment].has(String(item.targetType || "")));
  const validation = validated.validation && typeof validated.validation === "object" ? validated.validation as Record<string, unknown> : {};
  validation.segment = segment;
  validation.scope = scope;
  validation.acceptedDeepAnalysisUnits = Array.isArray(validated.deepAnalysisUnits) ? validated.deepAnalysisUnits.length : 0;
  validation.acceptedPatches = Array.isArray(validated.patches) ? validated.patches.length : 0;
  validated.validation = validation;
  validated.contractVersion = SEGMENT_PROTOCOL_VERSION;
  validated.segment = segment;
  return validated;
}

async function callSegmentEnrichment(payload: Record<string, unknown>, model: string, startedAt: number) {
  const segment = String(payload.segment || "");
  const scope = String(payload.scope || "full");
  const taskId = String(payload.taskId || `${segment}.${scope}`);
  if (!SEGMENT_NAMES.has(segment)) throw new Error("جزء التحليل المطلوب غير مدعوم.");
  const config = segmentConfig(segment, scope);
  const attempts = [
    { compactMode: false, thinkingBudget: config.thinkingBudget, maxOutputTokens: config.maxOutputTokens },
    { compactMode: true, thinkingBudget: config.compactThinkingBudget, maxOutputTokens: config.compactMaxOutputTokens },
  ];
  const attemptDiagnostics: Array<Record<string, unknown>> = [];
  let firstFailure = "";
  let failureType = "unknown";
  for (let index = 0; index < attempts.length; index++) {
    const attempt = attempts[index];
    const prepared = prepareSegmentPayload(payload, attempt.compactMode);
    const payloadChars = JSON.stringify(prepared).length;
    const { raw, requestId } = await geminiRequest(model, {
      systemInstruction: { parts: [{ text: segmentedInstructions(segment, attempt.compactMode, scope) }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(prepared) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: attempt.maxOutputTokens,
        candidateCount: 1,
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: attempt.thinkingBudget, includeThoughts: false },
      },
    });
    const candidate = geminiCandidateResult(raw);
    const usage = raw.usageMetadata && typeof raw.usageMetadata === "object" ? raw.usageMetadata as Record<string, unknown> : null;
    const diagnostic: Record<string, unknown> = {
      attemptNumber: index + 1,
      compactMode: attempt.compactMode,
      finishReason: candidate.finishReason,
      payloadChars,
      outputCharacters: candidate.text.length,
      thinkingBudget: attempt.thinkingBudget,
      maxOutputTokens: attempt.maxOutputTokens,
      promptTokenCount: usage?.promptTokenCount || null,
      thoughtsTokenCount: usage?.thoughtsTokenCount || null,
      candidatesTokenCount: usage?.candidatesTokenCount || null,
      requestId,
    };
    attemptDiagnostics.push(diagnostic);
    if (candidate.finishReason === "MAX_TOKENS") {
      firstFailure = `توقفت مهمة ${taskId} عند حد الإخراج.`;
      failureType = "output_exhausted";
      diagnostic.failureType = failureType;
      if (index === 0) continue;
      throw new SegmentGenerationError(`${firstFailure} فشلت المحاولة المركزة أيضًا.`, {
        failureType, segment, scope, taskId, attempts: attemptDiagnostics,
      });
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonObject(candidate.text);
    } catch (error) {
      firstFailure = error instanceof Error ? error.message : `رجعت مهمة ${taskId} JSON غير صالحة.`;
      failureType = "json_invalid";
      diagnostic.failureType = failureType;
      diagnostic.parseError = firstFailure;
      if (index === 0) continue;
      throw new SegmentGenerationError(`${firstFailure} فشلت المحاولة المركزة أيضًا.`, {
        failureType, segment, scope, taskId, attempts: attemptDiagnostics,
      });
    }
    const result = validateSegmentDelta(parsed, prepared);
    const validation = result.validation && typeof result.validation === "object" ? result.validation as Record<string, unknown> : {};
    if ((Number(validation.acceptedDeepAnalysisUnits || 0) + Number(validation.acceptedPatches || 0)) === 0
        && (Number(validation.returnedDeepAnalysisUnits || 0) + Number(validation.returnedPatches || 0)) > 0) {
      firstFailure = `لم تجتز مخرجات مهمة ${taskId} التحقق الخادمي.`;
      failureType = "validation_empty";
      diagnostic.failureType = failureType;
      if (index === 0) continue;
      throw new SegmentGenerationError(firstFailure, {
        failureType, segment, scope, taskId, attempts: attemptDiagnostics, validation,
      });
    }
    return {
      result,
      model: String(raw.modelVersion || model),
      usage,
      requestId,
      provider: "gemini",
      serverTiming: {
        segment,
        scope,
        taskId,
        geminiMs: Math.round(performance.now() - startedAt),
        payloadChars,
        attemptNumber: index + 1,
        compactRetryUsed: index > 0,
        finishReason: candidate.finishReason,
        outputMode: "isolated-json-mode-server-validated",
        responseSchemaSent: false,
        thinkingBudget: attempt.thinkingBudget,
        maxOutputTokens: attempt.maxOutputTokens,
        outputCharacters: candidate.text.length,
        acceptedDeepAnalysisUnits: validation.acceptedDeepAnalysisUnits || 0,
        acceptedPatches: validation.acceptedPatches || 0,
        promptTokenCount: usage?.promptTokenCount || null,
        thoughtsTokenCount: usage?.thoughtsTokenCount || null,
        candidatesTokenCount: usage?.candidatesTokenCount || null,
        attempts: attemptDiagnostics,
      },
    };
  }
  throw new SegmentGenerationError(firstFailure || `تعذر إكمال مهمة ${taskId}.`, {
    failureType, segment, scope, taskId, attempts: attemptDiagnostics,
  });
}

function classificationInstructions(): string {
  return `أنت مصنف مستندات تربوية عربية. مهمتك تحديد نوع النموذج فقط، دون إجراء تحليل تربوي أو حساب نتائج.
القواعد:
1) استخدم معرفًا من knownFormTypes إذا كان النوع منطبقًا بوضوح.
2) أعطِ أولوية لعنوان التقرير، وأسماء الحقول، وعناوين الأقسام، لا للتنسيق الطباعي أو الأعمدة الفارغة.
3) ملفات Excel الوزارية قد تحتوي خلايا مدمجة وصفوفًا وأعمدة فاصلة؛ لا تعتبرها حقولًا حقيقية.
4) لا تصنف توزيع مستويات الأداء لمجرد ظهور حروف أ أو ب أو ج داخل نص سردي؛ يجب أن تكون أعمدة مستويات صريحة.
5) التقرير الذي يضم جوانب الإجادة، وجوانب التطوير، والدعم المقدم، والمداولة الإشرافية أو التوصيات هو تقرير إشرافي سردي.
6) كشف يحتوي اسم الطالب وعنصر المادة ودرجة عنصر المادة هو درجات مكوّن تقويمي.
7) إذا لم ينطبق نوع معروف، استخدم id بقيمة unknown واقترح اسمًا وغرضًا مختصرين.
8) لا تذكر أسماء أشخاص في rationale، واكتب بالعربية الواضحة.
9) confidence رقم من 0 إلى 100.`;
}

function visionInstructions(): string {
  return `أنت قارئ مستندات تربوية عربية عالي الدقة. استخرج المحتوى من الصور كما هو، دون اختراع أو تصحيح صامت.
المطلوب:
1) تعرف نوع النموذج وهدفه المحتمل من العنوان والحقول.
2) استخرج الجداول مع الحفاظ على ترتيب الأعمدة والقيم والأسماء والأرقام كما تظهر.
3) إذا كان المحتوى سرديًا، اجمعه في narrativeText مع الحفاظ على العناوين والأقسام.
4) عند وجود أكثر من جدول، أنشئ dataset مستقلًا لكل جدول.
5) لا تحول القيم أو التقديرات إلى معانٍ جديدة، ولا تحسب نتائج.
6) ضع أي جزء غير واضح في warnings، واستخدم النص [غير واضح] بدل التخمين.
7) أعد العربية باتجاه منطقي، لكن لا تغيّر صياغة المصدر.
8) استخدم knownFormTypes للمطابقة، واقترح معرفًا وصفيًا جديدًا إذا لم ينطبق أي نوع.`;
}

async function callGemini(operation: "analyze" | "enrich" | "enrich_segment" | "vision_extract" | "classify", payload: Record<string, unknown>) {
  const model = normalizeModelName(operation === "classify"
    ? (Deno.env.get("GEMINI_CLASSIFIER_MODEL") || DEFAULT_CLASSIFIER_MODEL)
    : (Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL));
  const startedAt = performance.now();
  if (operation === "enrich") return callDeepEnrichment(payload, model, startedAt);
  if (operation === "enrich_segment") return callSegmentEnrichment(payload, model, startedAt);

  let instructions: string;
  let schema: Record<string, unknown>;
  let userParts: Array<Record<string, unknown>>;
  let maxOutputTokens: number;

  if (operation === "vision_extract") {
    const images = validateVisualPayload(payload);
    instructions = visionInstructions();
    schema = VISION_SCHEMA;
    maxOutputTokens = 6000;
    userParts = [
      {
        text: `اقرأ المستندات المصورة التالية. سياق الطلب:\n${
          JSON.stringify({
            fileName: payload.fileName,
            sourceKind: payload.sourceKind,
            locale: payload.locale,
            knownFormTypes: payload.knownFormTypes,
          })
        }`,
      },
      ...images.map((image) => {
        const parsed = parseImageDataUrl(image.dataUrl);
        return {
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        };
      }),
    ];
  } else if (operation === "classify") {
    instructions = classificationInstructions();
    schema = CLASSIFICATION_SCHEMA;
    maxOutputTokens = 900;
    userParts = [{ text: JSON.stringify(payload) }];
  } else {
    instructions = analysisInstructions();
    schema = ANALYSIS_SCHEMA;
    maxOutputTokens = 7500;
    userParts = [{ text: JSON.stringify(payload) }];
  }

  const { raw, requestId } = await geminiRequest(model, {
    systemInstruction: {
      parts: [{ text: instructions }],
    },
    contents: [{
      role: "user",
      parts: userParts,
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      maxOutputTokens,
      candidateCount: 1,
      temperature: operation === "analyze" ? 0.2 : 0,
      thinkingConfig: {
        thinkingBudget: operation === "analyze" ? 1024 : 0,
        includeThoughts: false,
      },
    },
  });

  const text = geminiOutputText(raw);
  if (!text) throw new Error("لم يرجع Gemini محتوى قابلًا للقراءة.");

  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("رجع Gemini محتوى غير مطابق لعقد JSON المتوقع.");
  }

  if (operation === "analyze") result = validateEvidenceReferences(result, payload);
  

  return {
    result,
    model: String(raw.modelVersion || model),
    usage: raw.usageMetadata || null,
    requestId,
    provider: "gemini",
    serverTiming: {
      geminiMs: Math.round(performance.now() - startedAt),
      payloadChars: JSON.stringify(payload).length,
      thinkingBudget: operation === "analyze" ? 1024 : 0,
    },
  };
}

function edgeErrorDetails(message: string, operation: string): { status: number; errorCode: string; retryable: boolean } {
  const text = String(message || "");
  if (/رمز الوصول غير صحيح|النطاق غير مسموح|حجم الطلب أكبر|العملية المطلوبة غير مدعومة|جزء التحليل المطلوب غير مدعوم|جزء التحليل غير صالح/i.test(text)) {
    return { status: 400, errorCode: "REQUEST_NOT_RETRYABLE", retryable: false };
  }
  if (/api key|مفتاح.*غير صالح|سر GEMINI_API_KEY غير مضبوط|model.*not found|النموذج.*غير/i.test(text)) {
    return { status: 502, errorCode: "GEMINI_CONFIGURATION", retryable: false };
  }
  if (/حد الإخراج|MAX_TOKENS|المحاولة المختصرة/i.test(text)) {
    return { status: 503, errorCode: "SEGMENT_OUTPUT_EXHAUSTED", retryable: operation === "enrich_segment" };
  }
  if (/JSON غير صالح|JSON المتوقع|غير مطابق لعقد JSON/i.test(text)) {
    return { status: 503, errorCode: "SEGMENT_JSON_INVALID", retryable: operation === "enrich_segment" };
  }
  if (/لم تجتز مخرجات مهمة|التحقق الخادمي/i.test(text)) {
    return { status: 503, errorCode: "SEGMENT_VALIDATION_EMPTY", retryable: operation === "enrich_segment" };
  }
  if (/429|rate limit|quota|RESOURCE_EXHAUSTED/i.test(text)) {
    return { status: 429, errorCode: "GEMINI_RATE_LIMIT", retryable: true };
  }
  if (/timeout|timed out|تعذر الاتصال|temporar|unavailable|overload|internal|503|500/i.test(text)) {
    return { status: 503, errorCode: "GEMINI_TRANSIENT", retryable: true };
  }
  return { status: 500, errorCode: "GEMINI_UNKNOWN", retryable: operation === "enrich_segment" };
}

async function pingGemini(): Promise<Record<string, unknown>> {
  const model = normalizeModelName(Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL);
  const { raw, requestId } = await geminiRequest(model, {
    contents: [{
      role: "user",
      parts: [{ text: "أجب بكلمة READY فقط دون أي شرح." }],
    }],
    generationConfig: {
      // اختبار الاتصال لا يحتاج عقد JSON كاملًا. رفع الميزانية يمنع استهلاكها
      // بواسطة تفكير Gemini قبل إنتاج الرد النهائي القصير.
      maxOutputTokens: 128,
      candidateCount: 1,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
    },
  });

  const text = geminiOutputText(raw).trim();
  if (!/ready/i.test(text)) {
    const preview = text.slice(0, 120) || "[استجابة فارغة]";
    throw new Error(`اتصلت الوظيفة بـGemini، لكن رد اختبار الاتصال كان غير متوقع: ${preview}`);
  }

  return {
    result: { status: "ready" },
    model: String(raw.modelVersion || model),
    usage: raw.usageMetadata || null,
    requestId,
    provider: "gemini",
  };
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
    if (!supplied || !(await secureEqual(supplied, expectedAccessCode))) {
      return jsonResponse({ ok: false, error: "رمز الوصول غير صحيح." }, 401, origin);
    }
  }

  let operation = "";
  let payload: Record<string, unknown> = {};
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false, error: "حجم الطلب أكبر من الحد المسموح." }, 413, origin);
    }
    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody) as Record<string, unknown>; }
    catch { return jsonResponse({ ok: false, error: "جسم الطلب ليس JSON صالحًا." }, 400, origin); }
    operation = String(body?.operation || "");
    payload = body?.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};

    if (operation === "ping") {
      const ai = await pingGemini();
      return jsonResponse({ ok: true, operation, aiKeyConfigured: Boolean(Deno.env.get("GEMINI_API_KEY")), ...ai }, 200, origin);
    }
    if (operation !== "analyze" && operation !== "enrich" && operation !== "enrich_segment" && operation !== "vision_extract" && operation !== "classify") {
      return jsonResponse({ ok: false, error: "العملية المطلوبة غير مدعومة." }, 400, origin);
    }

    const ai = await callGemini(operation as "analyze" | "enrich" | "enrich_segment" | "vision_extract" | "classify", payload);
    return jsonResponse({ ok: true, operation, ...ai }, 200, origin);
  } catch (error) {
    console.error("taqareer-ai-error", error);
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع في وظيفة التحليل.";
    const mapped = edgeErrorDetails(message, operation);
    const failureDetails = error instanceof SegmentGenerationError ? error.details : {};
    return jsonResponse({
      ok: false,
      error: message,
      errorCode: mapped.errorCode,
      retryable: mapped.retryable,
      operation,
      segment: String(payload.segment || ""),
      scope: String(payload.scope || ""),
      taskId: String(payload.taskId || ""),
      failureType: String(failureDetails.failureType || ""),
      details: failureDetails,
    }, mapped.status, origin);
  }
});
