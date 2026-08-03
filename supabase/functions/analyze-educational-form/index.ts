const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
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

function geminiOutputText(response: Record<string, unknown>): string {
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

  const finishReason = String(first.finishReason || "");
  if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
    throw new Error(`توقف Gemini قبل إكمال النتيجة: ${finishReason}.`);
  }

  const content = first.content && typeof first.content === "object"
    ? first.content as Record<string, unknown>
    : {};
  const parts = Array.isArray(content.parts)
    ? content.parts as Array<Record<string, unknown>>
    : [];

  return parts
    .map((part) => typeof part.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
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
10) استخدم deterministicAnalysis بوصفه مصدر الحسابات والرسوم وأدوات الجودة الحتمية، ثم أضف تفسيرًا تربويًا لا تكرارًا للأرقام.
11) أنشئ analysisProfile يوضح منهج التحليل وكفاية البيانات والأبعاد والقرارات التي تدعمها.
12) أنشئ 3 إلى 8 diagnosticSections، وكل قسم يفسر نمطًا أو علاقة أو فجوة أو اتساقًا مع آثار عملية وحدود صريحة.
13) اجعل عدد الاستنتاجات الأساسية بين 4 و10 بحسب قوة البيانات، وخطة التحسين بين 3 و8 إجراءات متعددة المستويات عند الحاجة.
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

async function callGemini(operation: "analyze" | "vision_extract" | "classify", payload: Record<string, unknown>) {
  const model = normalizeModelName(Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL);

  let instructions: string;
  let schema: Record<string, unknown>;
  let userParts: Array<Record<string, unknown>>;
  let maxOutputTokens: number;

  if (operation === "vision_extract") {
    const images = validateVisualPayload(payload);
    instructions = visionInstructions();
    schema = VISION_SCHEMA;
    maxOutputTokens = 7000;
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
    maxOutputTokens = 1400;
    userParts = [{ text: JSON.stringify(payload) }];
  } else {
    instructions = analysisInstructions();
    schema = ANALYSIS_SCHEMA;
    maxOutputTokens = 10000;
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
  };
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
      maxOutputTokens: 512,
      candidateCount: 1,
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
      const ai = await pingGemini();
      return jsonResponse({ ok: true, operation, aiKeyConfigured: Boolean(Deno.env.get("GEMINI_API_KEY")), ...ai }, 200, origin);
    }
    if (operation !== "analyze" && operation !== "vision_extract" && operation !== "classify") {
      return jsonResponse({ ok: false, error: "العملية المطلوبة غير مدعومة." }, 400, origin);
    }

    const ai = await callGemini(operation as "analyze" | "vision_extract" | "classify", payload);
    return jsonResponse({ ok: true, operation, ...ai }, 200, origin);
  } catch (error) {
    console.error("taqareer-ai-error", error);
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع في وظيفة التحليل.";
    return jsonResponse({ ok: false, error: message }, 500, origin);
  }
});
