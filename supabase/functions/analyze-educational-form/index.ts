const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";
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
          name: { type: "string" },
          reason: { type: "string" },
          conditionsMet: { type: "boolean" }
        },
        required: ["name", "reason", "conditionsMet"]
      }
    },
    improvementPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: { type: "string", enum: ["عالية", "متوسطة", "محددة"] },
          action: { type: "string" },
          responsibleRole: { type: "string" },
          timeframe: { type: "string" },
          successIndicator: { type: "string" },
          evidenceRefs: { type: "array", items: { type: "string" } }
        },
        required: ["priority", "action", "responsibleRole", "timeframe", "successIndicator", "evidenceRefs"]
      }
    },
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
  required: ["classification", "executiveTitle", "executiveSummary", "findings", "qualityTools", "improvementPlan", "cautions", "suggestedNewType"]
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

function outputText(response: Record<string, unknown>): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as Array<Record<string, unknown>>
      : [];
    for (const part of content) {
      if (part?.type === "output_text" && typeof part.text === "string") chunks.push(part.text);
      if (part?.type === "refusal" && typeof part.refusal === "string") throw new Error(part.refusal);
    }
  }
  return chunks.join("\n").trim();
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
9) اجعل عدد الاستنتاجات الأساسية بين 3 و8 بحسب قوة البيانات، وخطة التحسين بين 2 و6 إجراءات.
10) صرّح بالقيود ونقص البيانات بوضوح.`;
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

async function callOpenAI(operation: "analyze" | "vision_extract", payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("سر OPENAI_API_KEY غير مضبوط في Supabase.");
  const model = Deno.env.get("OPENAI_MODEL") || DEFAULT_MODEL;

  let instructions: string;
  let schema: Record<string, unknown>;
  let input: unknown;
  let schemaName: string;

  if (operation === "vision_extract") {
    const images = validateVisualPayload(payload);
    instructions = visionInstructions();
    schema = VISION_SCHEMA;
    schemaName = "taqareer_visual_extraction";
    input = [{
      role: "user",
      content: [
        { type: "input_text", text: `اقرأ المستندات المصورة التالية. سياق الطلب:\n${JSON.stringify({ fileName: payload.fileName, sourceKind: payload.sourceKind, locale: payload.locale, knownFormTypes: payload.knownFormTypes })}` },
        ...images.map((image) => ({ type: "input_image", image_url: image.dataUrl, detail: "high" }))
      ]
    }];
  } else {
    instructions = analysisInstructions();
    schema = ANALYSIS_SCHEMA;
    schemaName = "taqareer_educational_analysis";
    input = [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(payload) }] }];
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      instructions,
      input,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
      max_output_tokens: operation === "vision_extract" ? 7000 : 6000,
      store: false,
      truncation: "auto"
    })
  });

  const raw = await response.json();
  if (!response.ok) {
    const message = raw?.error?.message || `فشل مزود الذكاء الاصطناعي برمز ${response.status}.`;
    throw new Error(message);
  }
  if (raw?.status === "incomplete") throw new Error("لم يكتمل رد الذكاء الاصطناعي. قلل حجم الملف أو أعد المحاولة.");
  const text = outputText(raw);
  if (!text) throw new Error("لم يرجع مزود الذكاء الاصطناعي محتوى قابلًا للقراءة.");
  let result: unknown;
  try { result = JSON.parse(text); }
  catch { throw new Error("رجع مزود الذكاء الاصطناعي محتوى غير مطابق للعقد المتوقع."); }
  if (operation === "analyze") result = validateEvidenceReferences(result, payload);
  return { result, model: raw?.model || model, usage: raw?.usage || null, requestId: raw?.id || null };
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

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false, error: "حجم الطلب أكبر من الحد المسموح." }, 413, origin);
    }
    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody) as Record<string, unknown>; }
    catch { return jsonResponse({ ok: false, error: "جسم الطلب ليس JSON صالحًا." }, 400, origin); }
    const operation = String(body?.operation || "");
    const payload = body?.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};

    if (operation === "ping") {
      return jsonResponse({ ok: true, operation, model: Deno.env.get("OPENAI_MODEL") || DEFAULT_MODEL, aiKeyConfigured: Boolean(Deno.env.get("OPENAI_API_KEY")) }, 200, origin);
    }
    if (operation !== "analyze" && operation !== "vision_extract") {
      return jsonResponse({ ok: false, error: "العملية المطلوبة غير مدعومة." }, 400, origin);
    }

    const ai = await callOpenAI(operation, payload);
    return jsonResponse({ ok: true, operation, ...ai }, 200, origin);
  } catch (error) {
    console.error("taqareer-ai-error", error);
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع في وظيفة التحليل.";
    return jsonResponse({ ok: false, error: message }, 500, origin);
  }
});
