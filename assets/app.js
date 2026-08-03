(() => {
  "use strict";

  const formTypes = [
    { id: "single_subject", name: "نتائج الطلبة في مادة واحدة", purpose: "تحليل درجات الطلبة في مادة محددة وتحديد أنماط الأداء والاحتياج.", keywords: ["اسم الطالب", "الدرجة", "المستوى", "حالة القيد", "المادة"], min: 2 },
    { id: "assessment_component", name: "درجات مكوّن تقويمي", purpose: "تحليل درجات التقويم المستمر أو الاختبار أو أي عنصر تقويمي محدد.", keywords: ["عنصر المادة", "اختبار", "التقويم المستمر", "درجة عنصر"], min: 2 },
    { id: "level_distribution", name: "توزيع مستويات الأداء", purpose: "تحليل أعداد ونسب الطلبة حسب مستويات الأداء ومقارنة المجموعات.", keywords: ["أ", "ب", "ج", "د", "هـ", "المجموع", "النسبة"], min: 4 },
    { id: "cross_subject", name: "الأداء عبر المواد", purpose: "بناء صورة شاملة لأداء الطالب أو الصف في عدة مواد.", keywords: ["اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الدراسات الاجتماعية"], min: 3 },
    { id: "supervision_indicator", name: "ملخص مؤشرات زيارة إشرافية", purpose: "تحليل مؤشرات الأداء الإشرافي ومواطن القوة وأولويات التطوير.", keywords: ["بنود التقويم", "المتوسط", "التخطيط", "إدارة الصف", "استراتيجيات التدريس"], min: 2 },
    { id: "student_work", name: "ملخص فحص أعمال الطلبة", purpose: "تحليل جودة أعمال الطلبة والتغذية الراجعة والتمايز والتقدم.", keywords: ["أعمال الطلبة", "الأكثر تكرارا", "التغذية الراجعة", "التمايز", "الأنشطة"], min: 2 },
    { id: "supervision_narrative", name: "تقرير إشرافي سردي", purpose: "تحليل الأدلة السردية وربط جوانب الإجادة والتطوير بالدعم والتوصيات.", keywords: ["جوانب الإجادة", "أدلتها", "الدعم المقدم", "التوصيات", "الجوانب التي تحتاج"], min: 2 },
    { id: "unknown", name: "نوع جديد غير مسجل", purpose: "سيُبنى له تعريف تحليلي مخصص بعد مراجعة المستخدم.", keywords: [], min: 0 }
  ];

  const samples = [
    {
      id: "single",
      title: "نتائج مادة واحدة",
      desc: "15 طالبًا بدرجات من 100 ومستويات أداء.",
      maxScore: 100,
      text: `اسم الطالب,الدرجة,المستوى,حالة القيد\nطالب 1,92,أ,منقول\nطالب 2,84,ب,منقول\nطالب 3,77,ج,منقول\nطالب 4,61,د,منقول\nطالب 5,48,هـ,منقول\nطالب 6,73,ج,منقول\nطالب 7,88,ب,منقول\nطالب 8,55,د,منقول\nطالب 9,96,أ,منقول\nطالب 10,69,ج,منقول\nطالب 11,81,ب,منقول\nطالب 12,44,هـ,منقول\nطالب 13,78,ج,منقول\nطالب 14,90,أ,منقول\nطالب 15,,—,منقول`
    },
    {
      id: "component",
      title: "التقويم المستمر",
      desc: "درجات مكوّن تقويمي من 60 مع قيمة مفقودة.",
      maxScore: 60,
      text: `اسم الطالب,عنصر المادة,درجة عنصر المادة,ملاحظات\nطالب 1,التقويم المستمر,52,\nطالب 2,التقويم المستمر,41,\nطالب 3,التقويم المستمر,59,\nطالب 4,التقويم المستمر,35,يحتاج متابعة\nطالب 5,التقويم المستمر,47,\nطالب 6,التقويم المستمر,38,\nطالب 7,التقويم المستمر,55,\nطالب 8,التقويم المستمر,,غياب جزئي\nطالب 9,التقويم المستمر,44,\nطالب 10,التقويم المستمر,57,`
    },
    {
      id: "levels",
      title: "توزيع مستويات الأداء",
      desc: "صفان وأعداد الطلبة في المستويات أ إلى هـ.",
      maxScore: null,
      text: `الصف,أ,ب,ج,د,هـ,المجموع\nالتاسع,47,46,73,77,25,268\nالعاشر,46,29,65,97,15,252`
    },
    {
      id: "supervision",
      title: "مؤشرات زيارة إشرافية",
      desc: "بنود تقويم ومتوسطات لممارسات تعليمية.",
      maxScore: 4,
      text: `بنود التقويم,المتوسط\nتحصيل الطلبة في الأعمال الصفية وغير الصفية,2.8\nالتقدم الدراسي للطلبة,2.4\nتطبيق مهارات التعلم وربطها بالواقع,2.1\nتخطيط المنهاج لتحقيق نواتج التعلم,3.2\nفاعلية إدارة الصف,3.5\nتوظيف استراتيجيات التدريس الفعالة,2.7\nتوظيف أساليب تقويم متنوعة,2.0\nالتطوير المهني وتحسين الأداء,2.9`
    },
    {
      id: "studentwork",
      title: "فحص أعمال الطلبة",
      desc: "مؤشرات ومتوسطات ومنوال الأداء.",
      maxScore: 4,
      text: `بنود التقويم,المتوسط,الأكثر تكرارا\nينجز الطلبة الأعمال وفقا لمستوياتهم التحصيلية,2.2,2\nتحقق الأعمال أهداف المناهج الدراسية,2.7,3\nيحقق الطلبة تقدما بمرور الوقت,2.1,2\nيحسن الطلبة أعمالهم بناء على التغذية الراجعة,1.8,2\nتنمي الأعمال مهارات التعلم الذاتي والتعاوني,2.4,2\nيراعي المعلم التمايز بين الطلبة,1.9,2\nتتنوع الأعمال والأنشطة,2.6,3\nيقدم المعلم تغذية راجعة فعالة,1.7,2`
    },
    {
      id: "narrative",
      title: "تقرير إشرافي سردي",
      desc: "نص يتضمن جوانب إجادة وأدلة ودعمًا وتوصيات.",
      maxScore: null,
      text: `القسم	النص
جوانب الإجادة وأدلتها	يوظف المعلم المحاكاة الرقمية بفاعلية، حيث تمكن معظم الطلبة من تفسير حركة الماء داخل النبات اعتمادًا على المشاهدة والنقاش.
جوانب الإجادة وأدلتها	يدير المعلم زمن التعلم بصورة منظمة من خلال توزيع الحصة بين الاستقصاء والعمل المخبري والتلخيص.
الجوانب التي تحتاج إلى تطوير	يحتاج بعض الطلبة إلى دعم إضافي في صياغة الاستنتاج العلمي وربطه بالأدلة التجريبية.
الدعم المقدم	تمت مناقشة بناء مهام قصيرة متدرجة لقياس التفسير والاستنتاج بصورة فردية.
التوصيات	إعداد نشاط أسبوعي قصير يتطلب تفسير نتيجة تجربة مع مؤشر نجاح يتمثل في ارتفاع جودة الاستنتاجات في القياس اللاحق.`
    },
    {
      id: "unknown",
      title: "نوع جديد",
      desc: "نموذج متابعة خطة علاجية غير موجود في السجل الحالي.",
      maxScore: 100,
      text: `اسم الخطة,الفئة المستهدفة,نسبة التنفيذ,الأثر الملحوظ,الإجراء القادم\nخطة القراءة,الطلبة المتعثرون,70,تحسن جزئي,تدريب فردي\nخطة الحساب,الصف التاسع,55,تقدم محدود,زيادة الممارسة\nخطة الحضور,الحالات المتكررة,82,تحسن واضح,متابعة أسبوعية`
    }
  ];

  const state = {
    headers: [], rows: [], sourceName: "", rawText: "", narrativeText: "", delimiter: ",", type: formTypes.at(-1), confidence: 0,
    quality: { blockers: [], warnings: [], info: [], completeness: 0 },
    analysis: null, aiResult: null, aiError: "", aiUsed: false,
    localRecognition: null, aiRecognition: null, recognitionStatus: "محلي", recognitionRequestId: 0,
    sampleMaxScore: null, pendingSource: null, sourceMeta: null, pendingManualFileName: "", pendingVisualPreview: null
  };

  const $ = (id) => document.getElementById(id);
  const panels = [1,2,3,4];

  function normalize(value) {
    return String(value ?? "").trim().replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").toLowerCase();
  }

  function showPanel(number) {
    panels.forEach(n => $("panel-" + n).classList.toggle("active-panel", n === number));
    document.querySelectorAll(".step").forEach(btn => btn.classList.toggle("active", Number(btn.dataset.step) === number));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setMessage(id, text, error = false) {
    const el = $(id); el.textContent = text; el.classList.remove("hidden", "error"); if (error) el.classList.add("error");
  }
  function clearMessage(id) { $(id).classList.add("hidden"); }


  function aiConfig() {
    return window.TaqareerAI?.getConfig?.() || { endpoint: "", anonKey: "", enabled: false };
  }

  function aiReady() {
    return Boolean(window.TaqareerAI?.isConfigured?.() && aiConfig().enabled);
  }

  function updateAiStatusUi() {
    const config = aiConfig();
    const configured = Boolean(window.TaqareerAI?.isConfigured?.());
    const enabled = Boolean(config.enabled);
    const header = $("aiHeaderStatus");
    const card = $("aiConnectionStatus");
    const mode = $("aiModeToggle");
    if (mode) mode.checked = enabled;
    const text = configured ? (enabled ? "ذكاء اصطناعي حي جاهز" : "الذكاء الاصطناعي متوقف") : "الذكاء الاصطناعي غير مربوط";
    if (header) {
      header.textContent = text;
      header.className = configured && enabled ? "version-badge ai-live" : "version-badge";
    }
    if (card) {
      card.textContent = configured
        ? `${text}. يبقى التحليل المحلي متاحًا كخطة رجوع.`
        : "أدخل رابط وظيفة Supabase والمفتاح العام مرة واحدة، ثم يتولى التطبيق بقية العمل.";
    }
    const runButton = $("runAnalysisBtn");
    if (runButton) runButton.textContent = configured && enabled ? "تنفيذ التحليل الذكي" : "تنفيذ التحليل المحلي";
  }

  function openAiSettings() {
    const config = aiConfig();
    $("aiEndpointInput").value = config.endpoint || "";
    $("aiAnonKeyInput").value = config.anonKey || "";
    $("aiAccessCodeInput").value = window.TaqareerAI?.getAccessCode?.() || "";
    $("aiEnabledInput").checked = config.enabled !== false;
    $("aiSettingsMessage").classList.add("hidden");
    $("aiSettingsDialog").showModal();
  }

  async function saveAndTestAiSettings() {
    const endpoint = $("aiEndpointInput").value.trim();
    const anonKey = $("aiAnonKeyInput").value.trim();
    const accessCode = $("aiAccessCodeInput").value.trim();
    const enabled = $("aiEnabledInput").checked;
    window.TaqareerAI.saveConfig({ endpoint, anonKey, enabled });
    window.TaqareerAI.setAccessCode(accessCode);
    updateAiStatusUi();
    const message = $("aiSettingsMessage");
    message.classList.remove("hidden", "error");
    message.textContent = "جارٍ اختبار الاتصال…";
    try {
      const result = await window.TaqareerAI.ping();
      if (result.aiKeyConfigured === false) {
        message.textContent = "تم الوصول إلى وظيفة Supabase، لكن سر GEMINI_API_KEY غير مضبوط بعد.";
        message.classList.add("error");
        return;
      }
      message.textContent = `تم الاتصال بنجاح${result.model ? ` · النموذج ${result.model}` : ""}.`;
      setTimeout(() => $("aiSettingsDialog").close(), 650);
    } catch (error) {
      message.textContent = error.message || "تعذر الاتصال بوظيفة الذكاء الاصطناعي.";
      message.classList.add("error");
    }
  }

  function detectDelimiter(text) {
    const first = text.split(/\r?\n/).find(line => line.trim()) || "";
    const candidates = ["\t", ",", ";", "|"];
    let best = ",", count = -1;
    candidates.forEach(d => { const c = first.split(d).length - 1; if (c > count) { count = c; best = d; } });
    return best;
  }

  function parseDelimited(text) {
    const cleaned = text.replace(/^\uFEFF/, "").trim();
    if (!cleaned) throw new Error("لا توجد بيانات قابلة للقراءة.");
    const delimiter = detectDelimiter(cleaned);
    const lines = cleaned.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) throw new Error("الملف يحتاج صف عناوين وسجلًا واحدًا على الأقل.");

    const parseLine = (line) => {
      const out = []; let current = "", quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (quoted && line[i+1] === '"') { current += '"'; i++; } else quoted = !quoted;
        } else if (ch === delimiter && !quoted) { out.push(current.trim()); current = ""; }
        else current += ch;
      }
      out.push(current.trim()); return out;
    };

    const headers = parseLine(lines[0]).map((h, i) => h || `عمود ${i+1}`);
    const rows = lines.slice(1).map(parseLine).map(values => {
      const row = {}; headers.forEach((h, i) => row[h] = values[i] ?? ""); return row;
    });
    return { headers, rows, delimiter };
  }

  const REQUIRED_FIELDS = {
    single_subject: [["اسم الطالب", "الطالب"], ["الدرجة", "المجموع"]],
    assessment_component: [["اسم الطالب", "الطالب"], ["عنصر المادة", "عنصر التقويم"], ["درجة عنصر المادة", "درجة العنصر", "الدرجة"]],
    level_distribution: [["الصف", "البيان"], ["المجموع"]],
    cross_subject: [["اسم الطالب", "الطالب"]],
    supervision_indicator: [["بنود التقويم", "البند"], ["المتوسط"]],
    student_work: [["بنود التقويم", "البند"], ["المتوسط"]],
    supervision_narrative: [["النص"]]
  };

  function normalizedHeaders(headers) {
    return headers.map(header => ({ original: header, normalized: normalize(header) }));
  }

  function findHeader(headers, aliases) {
    const candidates = normalizedHeaders(headers);
    return candidates.find(item => aliases.some(alias => item.normalized === normalize(alias) || item.normalized.includes(normalize(alias))))?.original || "";
  }

  function exactHeader(headers, aliases) {
    const normalizedAliases = aliases.map(normalize);
    return normalizedHeaders(headers).some(item => normalizedAliases.includes(item.normalized));
  }

  function typeById(id) {
    return formTypes.find(type => type.id === id) || null;
  }

  function classify(headers, rows, sourceMeta = {}, rawText = "") {
    const headerText = normalize(headers.join(" | "));
    const titleText = normalize(sourceMeta?.reportTitle || sourceMeta?.metadata?.title || sourceMeta?.title || "");
    const tableSample = normalize(rows.slice(0, 45).map(row => Object.values(row).join(" ")).join(" "));
    const narrativeSample = normalize(String(rawText || "").slice(0, 50000));
    const allText = `${titleText} ${headerText} ${tableSample} ${narrativeSample}`;
    const scores = new Map(formTypes.slice(0, -1).map(type => [type.id, { score: 0, reasons: [] }]));
    const add = (id, points, reason) => {
      const target = scores.get(id); if (!target || !points) return;
      target.score += points; if (reason) target.reasons.push(reason);
    };
    const has = phrase => allText.includes(normalize(phrase));
    const headerHas = phrase => headerText.includes(normalize(phrase));

    if (exactHeader(headers, ["عنصر المادة", "عنصر التقويم"])) add("assessment_component", 34, "وجود حقل عنصر المادة");
    if (exactHeader(headers, ["درجة عنصر المادة", "درجة العنصر"])) add("assessment_component", 38, "وجود حقل درجة عنصر المادة");
    if (has("التقويم المستمر") || has("اختبار")) add("assessment_component", 14, "ظهور اسم مكوّن تقويمي");
    if (has("كشف مراجعة إدخال الدرجات")) add("assessment_component", 20, "عنوان كشف مراجعة الدرجات");

    if (exactHeader(headers, ["اسم الطالب"])) add("single_subject", 22, "وجود اسم الطالب");
    if (exactHeader(headers, ["الدرجة", "المجموع"])) add("single_subject", 20, "وجود درجة كلية");
    if (exactHeader(headers, ["المستوى", "حالة القيد"])) add("single_subject", 16, "وجود مستوى أو حالة قيد");
    if (has("كشف نتائج الطلب") && !has("عنصر المادة")) add("single_subject", 20, "عنوان كشف نتائج مادة");

    const levelLabels = ["أ", "ا", "ب", "ج", "د", "هـ", "ه"].filter(label => exactHeader(headers, [label])).length;
    if (levelLabels >= 3) add("level_distribution", 48 + levelLabels * 4, `وجود ${levelLabels} أعمدة مستويات صريحة`);
    if (levelLabels >= 3 && exactHeader(headers, ["المجموع"])) add("level_distribution", 20, "وجود مجموع مع مستويات الأداء");
    if (has("احصائية بنسب مستويات") || has("إحصائية بنسب مستويات")) add("level_distribution", 22, "عنوان توزيع مستويات الأداء");

    const subjects = ["اللغه العربيه", "اللغه الانجليزيه", "الرياضيات", "العلوم", "الدراسات الاجتماعيه", "التربيه الاسلاميه"];
    const subjectHits = subjects.filter(subject => headerText.includes(normalize(subject))).length;
    if (subjectHits >= 3) add("cross_subject", 45 + subjectHits * 5, `وجود ${subjectHits} مواد دراسية`);

    if (headerHas("بنود التقويم") && headerHas("المتوسط")) add("supervision_indicator", 44, "وجود بنود تقويم ومتوسطات");
    if (has("الزياره الاشرافيه") && !has("الدعم المقدم")) add("supervision_indicator", 24, "عنوان زيارة إشرافية رقمية");
    if (has("تخطيط") && has("اداره الصف") && has("استراتيجيات التدريس")) add("supervision_indicator", 18, "مجالات أداء إشرافي");

    if (has("فحص اعمال الطلبه") || has("فحص أعمال الطلبة")) add("student_work", 52, "عنوان فحص أعمال الطلبة");
    if (has("التغذيه الراجعه") && has("التمايز") && has("الانشطه")) add("student_work", 24, "مؤشرات أعمال الطلبة");
    if (headerHas("الاكثر تكرارا") || headerHas("الأكثر تكرارا")) add("student_work", 18, "وجود المنوال أو الأكثر تكرارًا");

    if (sourceMeta?.mode === "narrative") add("supervision_narrative", 18, "المصدر نص سردي");
    if (has("التقرير التجميعي") && has("الزياره الاشرافيه")) add("supervision_narrative", 58, "عنوان تقرير تجميعي للزيارة الإشرافية");
    if (has("جوانب الاجاده") || has("جوانب الإجادة")) add("supervision_narrative", 24, "قسم جوانب الإجادة");
    if (has("الجوانب التي تحتاج الي تطوير") || has("الجوانب التى تحتاج إلى تطوير") || has("اولويات التطوير")) add("supervision_narrative", 22, "قسم جوانب التطوير");
    if (has("الدعم المقدم")) add("supervision_narrative", 20, "قسم الدعم المقدم");
    if (has("مداوله اشرافيه") || has("مداولة إشرافية")) add("supervision_narrative", 12, "قسم المداولة الإشرافية");
    if (has("التوصيات")) add("supervision_narrative", 18, "قسم التوصيات");

    const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
    const [bestId, bestResult] = ranked[0] || ["unknown", { score: 0, reasons: [] }];
    const secondScore = ranked[1]?.[1]?.score || 0;
    if (!bestResult.score || bestResult.score < 28) {
      return { type: formTypes.at(-1), confidence: 48, rationale: "لم تتجمع إشارات كافية لنوع معروف.", source: "local" };
    }
    const margin = Math.max(0, bestResult.score - secondScore);
    const confidence = Math.min(98, Math.max(62, Math.round(65 + bestResult.score * 0.24 + margin * 0.18)));
    return {
      type: typeById(bestId) || formTypes.at(-1),
      confidence,
      rationale: bestResult.reasons.slice(0, 4).join("، ") || "مطابقة بنية الحقول والمحتوى.",
      source: "local"
    };
  }

  function assessQuality(headers, rows, type, sourceMeta = {}) {
    const blockers = [], warnings = [], info = [];
    if (!headers.length) blockers.push({ title: "لا توجد عناوين أعمدة", detail: "لا يمكن فهم بنية البيانات دون عناوين." });
    if (!rows.length) blockers.push({ title: "لا توجد سجلات", detail: "الملف لا يحتوي بيانات بعد صف العناوين." });

    const requirements = REQUIRED_FIELDS[type?.id] || [];
    const requiredHeaders = requirements.map(aliases => findHeader(headers, aliases)).filter(Boolean);
    const activeHeaders = headers.filter(header => rows.some(row => String(row[header] ?? "").trim() !== ""));
    const basisHeaders = requiredHeaders.length ? [...new Set(requiredHeaders)] : activeHeaders;
    const denominator = Math.max(1, basisHeaders.length * rows.length);
    let missing = 0;
    rows.forEach(row => basisHeaders.forEach(header => { if (String(row[header] ?? "").trim() === "") missing++; }));
    const completeness = Math.round((1 - missing / denominator) * 1000) / 10;

    const missingRequirements = requirements.filter(aliases => !findHeader(headers, aliases));
    if (missingRequirements.length) {
      warnings.push({
        title: `${missingRequirements.length} حقل أساسي غير مؤكد`,
        detail: `لم يُعثر بوضوح على: ${missingRequirements.map(aliases => aliases[0]).join("، ")}. سيستمر التحليل ضمن حدود البيانات المتاحة.`
      });
    }
    if (missing > 0) warnings.push({ title: `${missing} قيمة مفقودة في الحقول الأساسية`, detail: `اكتمال الحقول اللازمة للتحليل ${completeness}%.` });
    else if (basisHeaders.length) info.push({ title: "الحقول الأساسية مكتملة", detail: `اكتملت الحقول المستخدمة في هذا النوع بنسبة ${completeness}%. الحقول الاختيارية الفارغة لا تخفض النسبة.` });

    const signatureHeaders = basisHeaders.length ? basisHeaders : headers;
    const signatures = rows.map(row => signatureHeaders.map(header => normalize(row[header])).join("|"));
    const duplicates = signatures.length - new Set(signatures).size;
    if (duplicates > 0) warnings.push({ title: `${duplicates} سجل مكرر`, detail: "لم تُحذف السجلات تلقائيًا. راجعها قبل الاعتماد النهائي." });
    if (headers.length > 30) info.push({ title: "عدد كبير من الأعمدة", detail: "قد يمثل الملف أداءً متعدد المواد أو أداة مركبة." });

    const normalization = sourceMeta?.normalization;
    if (normalization?.applied) {
      info.unshift({
        title: "تم تطبيع ملف Excel الطباعي تلقائيًا",
        detail: `حوّل محرك ملفات الوزارة ${normalization.originalColumns} عمودًا ماديًا إلى ${normalization.logicalColumns} حقول منطقية، واحتفظ بـ${normalization.retainedRows} سجلًا، مع معالجة ${normalization.mergeCount} خلية مدمجة.`
      });
      if (normalization.reportTitle) info.unshift({ title: "تم فصل عنوان التقرير عن الجدول", detail: normalization.reportTitle });
    }
    return { blockers, warnings, info, completeness, basisHeaders, missingRequirements: missingRequirements.map(item => item[0]) };
  }

  function redactRecognitionText(value) {
    return String(value || "")
      .replace(/\b\d{8,}\b/g, "[رقم محجوب]")
      .replace(/(الأستاذ|الاستاذ)\s+[\u0600-\u06ff]+(?:\s+[\u0600-\u06ff]+){1,4}/g, "$1 [اسم محجوب]")
      .slice(0, 16000);
  }

  function buildRecognitionPayload() {
    const maskedRows = state.rows.slice(0, 35).map((row, rowIndex) => {
      const output = {};
      state.headers.slice(0, 30).forEach(header => {
        const value = isSensitiveHeader(header) ? `سجل ${rowIndex + 1}` : String(row[header] ?? "").slice(0, 240);
        output[header] = value;
      });
      return output;
    });
    return {
      locale: "ar-OM",
      appVersion: "0.6.1",
      source: { name: state.sourceName, meta: state.sourceMeta || {}, mode: state.sourceMeta?.mode || "table" },
      localClassification: state.localRecognition ? {
        id: state.localRecognition.type.id,
        nameAr: state.localRecognition.type.name,
        confidence: state.localRecognition.confidence,
        rationale: state.localRecognition.rationale
      } : null,
      headers: state.headers.slice(0, 40),
      sampleRows: maskedRows,
      narrativeExcerpt: redactRecognitionText(state.narrativeText || state.rawText),
      knownFormTypes: formTypes.filter(type => type.id !== "unknown").map(type => ({ id: type.id, nameAr: type.name, purpose: type.purpose }))
    };
  }

  async function maybeVerifyRecognition(requestId) {
    const shouldVerify = aiReady() && (state.type.id === "unknown" || state.confidence < 90 || state.sourceMeta?.mode === "narrative" || state.sourceMeta?.normalization?.applied);
    if (!shouldVerify || !window.TaqareerAI?.classify) return;
    state.recognitionStatus = "جارٍ التحقق دلاليًا بواسطة Gemini…";
    renderReview();
    try {
      const result = await window.TaqareerAI.classify(buildRecognitionPayload());
      if (requestId !== state.recognitionRequestId) return;
      const classification = result?.classification || result;
      const known = typeById(String(classification?.id || ""));
      state.aiRecognition = classification || null;
      const aiConfidence = Math.max(0, Math.min(100, Math.round(Number(classification?.confidence) || 0)));
      const adopt = known && known.id !== "unknown" && (
        state.type.id === "unknown" || state.confidence < 85 || aiConfidence >= state.confidence + 8 ||
        (state.sourceMeta?.mode === "narrative" && known.id === "supervision_narrative")
      );
      if (adopt) {
        state.type = known;
        state.confidence = Math.max(state.confidence, aiConfidence);
        state.quality = assessQuality(state.headers, state.rows, state.type, state.sourceMeta);
      }
      state.recognitionStatus = known
        ? `تحقق هجين: المحرك المحلي + Gemini${adopt ? " · تم اعتماد التصنيف الدلالي" : " · التصنيف المحلي متسق"}`
        : "تحقق Gemini اقترح نوعًا جديدًا للمراجعة";
      state.quality.info = state.quality.info.filter(item => item.title !== "تحقق دلالي من النوع");
      state.quality.info.unshift({
        title: "تحقق دلالي من النوع",
        detail: `${classification?.nameAr || "نوع غير محدد"} (${aiConfidence}%). ${classification?.rationale || ""}`.trim()
      });
      renderReview();
    } catch (error) {
      if (requestId !== state.recognitionRequestId) return;
      state.recognitionStatus = "اكتمل التصنيف المحلي؛ تعذر التحقق الدلالي دون تعطيل العمل";
      state.quality.info = state.quality.info.filter(item => item.title !== "تعذر التحقق الدلالي");
      state.quality.info.push({ title: "تعذر التحقق الدلالي", detail: error.message || "استمر التطبيق بالتصنيف المحلي." });
      renderReview();
    }
  }

  function ingestTable(headers, rows, sourceName, sampleMaxScore = null, sourceMeta = null, rawText = "") {
    state.headers = headers;
    state.rows = rows;
    state.sourceName = sourceName;
    state.sampleMaxScore = sampleMaxScore;
    state.sourceMeta = sourceMeta;
    state.rawText = rawText || "";
    state.narrativeText = sourceMeta?.mode === "narrative"
      ? (rawText || rows.map(row => row["النص"] ?? Object.values(row).join(" ")).join("\n"))
      : "";
    const recognized = classify(state.headers, state.rows, sourceMeta || {}, state.rawText);
    state.localRecognition = recognized;
    state.aiRecognition = null;
    state.recognitionStatus = `تصنيف محلي: ${recognized.rationale}`;
    state.type = recognized.type;
    state.confidence = recognized.confidence;
    state.quality = assessQuality(state.headers, state.rows, state.type, sourceMeta || {});
    const recognitionRequestId = ++state.recognitionRequestId;
    if (sourceMeta?.headerRow) {
      state.quality.info.unshift({
        title: `تم اكتشاف صف العناوين في الصف ${sourceMeta.headerRow}`,
        detail: sourceMeta.sheetName ? `الورقة: ${sourceMeta.sheetName}. يمكنك مراجعة الأعمدة قبل التحليل.` : "راجع الأعمدة قبل التحليل."
      });
    }
    if (sourceMeta?.sourceType === "pdf") {
      state.quality.info.unshift({
        title: sourceMeta.mode === "table" ? "استخراج جدولي من PDF" : "استخراج نصي من PDF",
        detail: "راجع المعاينة لأن ترتيب النص في بعض ملفات PDF يعتمد على طريقة إنشاء التقرير."
      });
    }
    if (sourceMeta?.sourceType === "docx") {
      state.quality.info.unshift({
        title: sourceMeta.mode === "table" ? "تمت قراءة جدول Word" : "تمت قراءة النص السردي من Word",
        detail: "تم الاستخراج محليًا داخل المتصفح دون رفع المستند إلى خادم."
      });
    }
    renderReview();
    showPanel(2);
    maybeVerifyRecognition(recognitionRequestId);
  }

  function ingest(text, sourceName, sampleMaxScore = null) {
    clearMessage("inputMessage");
    try {
      const parsed = parseDelimited(text);
      state.delimiter = parsed.delimiter;
      state.rawText = text;
      ingestTable(parsed.headers, parsed.rows, sourceName, sampleMaxScore, { sourceType: "delimited", mode: "table" }, text);
    } catch (err) {
      setMessage("inputMessage", err.message || "تعذر قراءة البيانات.", true);
    }
  }

  function queueDatasets(source) {
    state.pendingSource = source;
    const datasets = source?.datasets || [];
    if (!datasets.length) throw new Error("لم يُعثر على محتوى واضح قابل للمراجعة.");
    if (datasets.length === 1) {
      applyPendingDataset(0);
      return;
    }
    $("sheetDialogTitle").textContent = source.kind === "excel" ? "اختر ورقة Excel" : "اختر المحتوى المطلوب تحليله";
    $("sheetSelectLabel").textContent = source.kind === "excel" ? "ورقة العمل" : "المحتوى المستخرج";
    $("sheetSelect").innerHTML = datasets.map((dataset, index) =>
      `<option value="${index}">${escapeHtml(dataset.name)} · ${dataset.rows.length} سجل · ${dataset.headers.length} أعمدة</option>`
    ).join("");
    $("sheetDialogSummary").textContent = source.kind === "excel"
      ? `عُثر على ${datasets.length} أوراق تحتوي جداول واضحة. اختر الورقة المطلوبة.`
      : `عُثر على ${datasets.length} خيارات قابلة للتحليل. اختر الجدول أو النص السردي الأنسب.`;
    clearMessage("inputMessage");
    $("sheetDialog").showModal();
  }

  function applyPendingDataset(index) {
    const source = state.pendingSource;
    const dataset = source?.datasets?.[Number(index)];
    if (!source || !dataset) return setMessage("inputMessage", "لم يُحدد محتوى صالح.", true);
    clearMessage("inputMessage");
    ingestTable(
      dataset.headers,
      dataset.rows,
      `${source.name} · ${dataset.name}`,
      null,
      { ...(dataset.meta || {}), fileName: source.name, datasetName: dataset.name, datasetCount: source.datasets.length },
      dataset.rawText || ""
    );
    state.pendingSource = null;
  }

  async function ingestExcel(file) {
    clearMessage("inputMessage");
    setMessage("inputMessage", "جارٍ قراءة مصنف Excel محليًا…");
    try {
      if (!window.TaqareerXlsx?.readWorkbook) throw new Error("وحدة قراءة Excel غير متاحة في هذه الصفحة.");
      const workbook = await window.TaqareerXlsx.readWorkbook(file);
      queueDatasets({
        name: workbook.name,
        kind: "excel",
        datasets: workbook.sheets.map((sheet, index) => ({
          id: `excel-sheet-${index}`,
          name: sheet.name,
          headers: sheet.headers,
          rows: sheet.rows,
          meta: {
            sourceType: "xlsx", mode: "table", sheetName: sheet.name, headerRow: sheet.headerRow,
            headerEndRow: sheet.headerEndRow, sheetCount: workbook.sheets.length,
            reportTitle: sheet.metadata?.title || "", preamble: sheet.metadata?.preamble || [],
            normalization: sheet.normalization || null
          }
        }))
      });
    } catch (err) {
      state.pendingSource = null;
      setMessage("inputMessage", err.message || "تعذر قراءة ملف Excel.", true);
    }
  }


  function normalizeVisionDataset(dataset, index) {
    const rawHeaders = Array.isArray(dataset?.headers) ? dataset.headers : [];
    const maxCells = Math.max(0, ...(dataset?.rows || []).map(row => Array.isArray(row?.cells) ? row.cells.length : 0));
    const headers = (rawHeaders.length ? rawHeaders : Array.from({ length: maxCells || 1 }, (_, i) => `عمود ${i + 1}`))
      .map((header, i) => String(header || `عمود ${i + 1}`).trim());
    const rows = (dataset?.rows || []).map(row => {
      const cells = Array.isArray(row?.cells) ? row.cells : [];
      return Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
    }).filter(row => Object.values(row).some(value => String(value).trim() !== ""));
    return {
      id: `ai-vision-${index}`,
      name: dataset?.name || `جدول مستخرج ${index + 1}`,
      headers,
      rows,
      meta: { sourceType: "ai-vision", mode: "table", extractionMode: "ai-vision" }
    };
  }

  function queueVisionResult(fileName, result, sourceKind = "image") {
    const datasets = (result?.datasets || []).map(normalizeVisionDataset).filter(dataset => dataset.rows.length);
    const narrative = String(result?.narrativeText || "").trim();
    if (narrative) {
      const lines = narrative.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      datasets.push({
        id: "ai-vision-narrative",
        name: "النص السردي المستخرج بالذكاء الاصطناعي",
        headers: ["م", "القسم", "النص"],
        rows: lines.map((line, index) => ({ "م": index + 1, "القسم": "نص مستخرج", "النص": line })),
        rawText: narrative,
        meta: { sourceType: "ai-vision", mode: "narrative", extractionMode: "ai-vision" }
      });
    }
    if (!datasets.length) throw new Error("لم يرجع الذكاء الاصطناعي نصًا أو جدولًا صالحًا للمراجعة.");
    state.pendingSource = {
      name: fileName,
      kind: sourceKind,
      datasets: datasets.map(dataset => ({
        ...dataset,
        meta: {
          ...dataset.meta,
          detectedType: result?.documentType?.nameAr || "غير محدد",
          detectionConfidence: result?.documentType?.confidence || 0,
          aiWarnings: result?.warnings || []
        }
      }))
    };
    queueDatasets(state.pendingSource);
  }

  async function extractVisualWithAi(fileName, images, sourceKind = "image") {
    if (!aiReady()) throw new Error("الذكاء الاصطناعي الحي غير مربوط بعد.");
    setMessage("inputMessage", `جارٍ قراءة ${sourceKind === "pdf" ? "صفحات PDF" : "الصورة"} بصريًا وتحويلها إلى محتوى منظم…`);
    const payload = {
      fileName,
      sourceKind,
      locale: "ar-OM",
      images: images.map(image => ({ label: image.label || fileName, dataUrl: image.dataUrl })),
      knownFormTypes: formTypes.filter(type => type.id !== "unknown").map(type => ({ id: type.id, nameAr: type.name, purpose: type.purpose }))
    };
    const result = await window.TaqareerAI.extractVisual(payload);
    queueVisionResult(fileName, result, sourceKind);
  }

  async function ingestDocument(file, readerName) {
    clearMessage("inputMessage");
    const label = readerName === "readPdf" ? "PDF" : "Word";
    setMessage("inputMessage", `جارٍ استخراج محتوى ${label} محليًا…`);
    try {
      const reader = window.TaqareerDocuments?.[readerName];
      if (!reader) throw new Error(`وحدة قراءة ${label} غير متاحة.`);
      const result = await reader(file);
      queueDatasets(result);
    } catch (err) {
      state.pendingSource = null;
      if (readerName === "readPdf") {
        if (aiReady() && window.TaqareerDocuments?.renderPdfPages) {
          try {
            setMessage("inputMessage", "لم تكفِ طبقة النص. جارٍ تجهيز أول صفحات PDF للقراءة البصرية الذكية…");
            const rendered = await window.TaqareerDocuments.renderPdfPages(file, 3);
            await extractVisualWithAi(file.name, rendered.images, "pdf");
          } catch (visionError) {
            openManualExtraction(file.name, visionError.message || err.message || "تعذر استخراج PDF آليًا.", "pdf");
          }
        } else {
          openManualExtraction(file.name, err.message || "تعذر استخراج PDF آليًا.", "pdf");
        }
      } else {
        setMessage("inputMessage", err.message || `تعذر قراءة ${label}.`, true);
      }
    }
  }

  function openManualExtraction(fileName, reason, sourceType = "image", previewDataUrl = "") {
    state.pendingManualFileName = fileName;
    $("manualDialogTitle").textContent = sourceType === "image" ? "مراجعة محتوى الصورة" : "استخراج يدوي احتياطي";
    $("manualDialogReason").textContent = reason;
    $("manualTextInput").value = "";
    $("manualImagePreview").src = previewDataUrl || "";
    $("manualImageWrap").classList.toggle("hidden", !previewDataUrl);
    $("manualSourceType").value = sourceType;
    clearMessage("inputMessage");
    $("manualDialog").showModal();
  }

  async function ingestImage(file) {
    clearMessage("inputMessage");
    setMessage("inputMessage", aiReady() ? "جارٍ تجهيز الصورة للقراءة البصرية الذكية…" : "جارٍ تجهيز الصورة للمراجعة المحلية…");
    try {
      const preview = await window.TaqareerDocuments.imagePreview(file);
      state.pendingVisualPreview = preview;
      if (aiReady()) {
        try {
          await extractVisualWithAi(file.name, [{ label: file.name, dataUrl: preview.dataUrl }], "image");
          return;
        } catch (aiError) {
          openManualExtraction(file.name, `تعذرت القراءة البصرية: ${aiError.message}. يمكنك متابعة العمل يدويًا.`, "image", preview.dataUrl);
          return;
        }
      }
      openManualExtraction(
        file.name,
        "تظهر الصورة للمراجعة. اربط الذكاء الاصطناعي للقراءة التلقائية، أو الصق النص أو الجدول يدويًا الآن.",
        "image",
        preview.dataUrl
      );
    } catch (err) {
      setMessage("inputMessage", err.message || "تعذر فتح الصورة.", true);
    }
  }

  function applyManualExtraction() {
    const text = $("manualTextInput").value.trim();
    const sourceType = $("manualSourceType").value || "manual";
    if (!text) {
      $("manualDialogReason").textContent = "أدخل النص أو الجدول أولًا. لن نخترع محتوى من فراغ، رغم أن بعض البرامج تبدع في هذه الرياضة.";
      return;
    }
    $("manualDialog").close();
    const looksTabular = /[\t,;|]/.test(text.split(/\r?\n/)[0] || "") && text.split(/\r?\n/).filter(Boolean).length >= 2;
    if (looksTabular) {
      try {
        const parsed = parseDelimited(text);
        state.delimiter = parsed.delimiter;
        ingestTable(parsed.headers, parsed.rows, state.pendingManualFileName || "استخراج يدوي", null,
          { sourceType, mode: "table", extractionMode: "manual-table" }, text);
      } catch (err) {
        setMessage("inputMessage", err.message || "تعذر قراءة الجدول الملصق.", true);
      }
      return;
    }
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const rows = lines.map((line, index) => ({ "م": index + 1, "القسم": "نص مستخرج", "النص": line }));
    ingestTable(["م", "القسم", "النص"], rows, state.pendingManualFileName || "استخراج يدوي", null,
      { sourceType, mode: "narrative", extractionMode: "manual-text" }, text);
  }

  async function handleInputFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (["csv", "tsv", "txt"].includes(ext)) return ingest(await file.text(), file.name);
    if (["xlsx", "xlsm"].includes(ext)) return ingestExcel(file);
    if (ext === "docx") return ingestDocument(file, "readDocx");
    if (ext === "pdf") return ingestDocument(file, "readPdf");
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) return ingestImage(file);
    if (ext === "xls") return setMessage("inputMessage", "صيغة XLS القديمة غير مدعومة. احفظ الملف بصيغة XLSX أو CSV ثم ارفعه.", false);
    if (ext === "doc") return setMessage("inputMessage", "صيغة DOC القديمة غير مدعومة محليًا. احفظ المستند بصيغة DOCX أو PDF.", false);
    return setMessage("inputMessage", `صيغة ${ext.toUpperCase()} غير مدعومة في هذه النسخة.`, false);
  }

  function renderReview() {
    $("recognizedType").textContent = state.type.name;
    $("recognizedPurpose").textContent = state.type.purpose;
    const recognitionSource = $("recognitionSource");
    if (recognitionSource) recognitionSource.textContent = state.recognitionStatus || "تصنيف محلي";
    const recognitionRationale = $("recognitionRationale");
    if (recognitionRationale) recognitionRationale.textContent = state.aiRecognition?.rationale || state.localRecognition?.rationale || "";
    $("recognitionConfidence").textContent = `${state.confidence}%`;
    $("recognitionBar").style.width = `${state.confidence}%`;
    $("rowCount").textContent = state.rows.length.toLocaleString("ar");
    $("columnCount").textContent = state.headers.length.toLocaleString("ar");
    $("completenessValue").textContent = `${state.quality.completeness}%`;
    $("sourceName").textContent = state.sourceName;
    $("headerTags").innerHTML = state.headers.slice(0, 12).map(h => `<span>${escapeHtml(h)}</span>`).join("");

    const table = $("previewTable");
    table.innerHTML = `<thead><tr>${state.headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${state.rows.slice(0,8).map(row => `<tr>${state.headers.map(h => `<td>${escapeHtml(row[h]) || "—"}</td>`).join("")}</tr>`).join("")}</tbody>`;

    const issues = [];
    state.quality.blockers.forEach(i => issues.push({ ...i, kind: "blocker", icon: "!" }));
    state.quality.warnings.forEach(i => issues.push({ ...i, kind: "warning", icon: "•" }));
    state.quality.info.forEach(i => issues.push({ ...i, kind: "info", icon: "✓" }));
    if (state.type.id === "unknown") issues.push({ kind: "warning", icon: "?", title: "نوع جديد غير مسجل", detail: "يمكن متابعة التحليل العام، ثم حفظ تعريف النوع لاحقًا بدل إجباره على قالب غير مناسب." });
    $("qualityIssues").innerHTML = issues.map(i => `<div class="issue ${i.kind}"><span class="issue-icon">${i.icon}</span><div><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(i.detail)}</span></div></div>`).join("");
    const status = $("qualityStatus");
    if (state.quality.blockers.length) { status.textContent = "يوجد مانع"; status.className = "quality-status block"; }
    else if (state.quality.warnings.length || state.type.id === "unknown") { status.textContent = "صالح مع تنبيهات"; status.className = "quality-status warn"; }
    else { status.textContent = "صالح للتحليل"; status.className = "quality-status good"; }
    $("toSetupBtn").disabled = state.quality.blockers.length > 0;
  }

  function numericColumns() {
    return state.headers.map(h => {
      const values = state.rows.map(r => parseNumber(r[h])).filter(v => Number.isFinite(v));
      return { h, ratio: values.length / Math.max(1, state.rows.length), values };
    }).filter(x => x.ratio >= .5);
  }

  function bestColumn(keywords, numeric = false) {
    const candidates = numeric ? numericColumns().map(x => x.h) : state.headers;
    const normalizedKeywords = keywords.map(normalize);
    return candidates.find(h => normalizedKeywords.some(k => normalize(h).includes(k))) || candidates[0] || "";
  }

  function isNarrativeMode() {
    return state.sourceMeta?.mode === "narrative" || state.type.id === "supervision_narrative";
  }

  function renderSetup() {
    const narrativeMode = isNarrativeMode();
    $("measurementCard").classList.toggle("hidden", narrativeMode);
    $("narrativeSetupCard").classList.toggle("hidden", !narrativeMode);
    if (narrativeMode) {
      $("narrativeTextReview").value = state.narrativeText || state.rows.map(row => row["النص"] ?? Object.values(row).join(" ")).join("\n");
    }

    const nums = numericColumns();
    const scoreSelect = $("scoreColumnSelect");
    scoreSelect.innerHTML = `<option value="">بدون عمود درجة</option>` + nums.map(x => `<option value="${escapeAttr(x.h)}">${escapeHtml(x.h)}</option>`).join("");
    const likelyScore = bestColumn(["الدرجه", "المتوسط", "النسبه", "المجموع", "score", "mark"], true);
    if (likelyScore) scoreSelect.value = likelyScore;

    const levelSelect = $("levelColumnSelect");
    levelSelect.innerHTML = `<option value="">لا يوجد</option>` + state.headers.map(h => `<option value="${escapeAttr(h)}">${escapeHtml(h)}</option>`).join("");
    const likelyLevel = bestColumn(["المستوي", "التقدير", "level", "grade"]);
    if (likelyLevel && normalize(likelyLevel).match(/مستوي|تقدير|level|grade/)) levelSelect.value = likelyLevel;
    $("maxScoreInput").value = state.sampleMaxScore ?? "";

    const plans = {
      single_subject: ["تحليل الدرجات والمؤشرات الوصفية", "حساب الإتقان بعد تأكيد الدرجة الكلية", "اكتشاف التشتت والقيم المفقودة", "اقتراح أولوية علاجية أولية"],
      assessment_component: ["تحليل مكوّن التقويم", "تحديد التفاوت بين الطلبة", "تهيئة البيانات للمقارنة مع مكوّن آخر لاحقًا", "رصد الحالات التي تحتاج مراجعة"],
      level_distribution: ["حساب نسب مستويات الأداء", "مقارنة الصفوف أو المجموعات", "تحديد المستويات الأكثر انتشارًا", "إنشاء قراءة تربوية دون افتراض درجات فردية"],
      cross_subject: ["تحليل الأداء عبر المواد", "تحديد المواد الأقوى والأضعف", "اكتشاف التفاوت داخل ملف الطالب", "تحديد التدخل الشامل أو التخصصي"],
      supervision_indicator: ["تحليل متوسطات المؤشرات", "ترتيب مواطن القوة وأولويات التطوير", "تحليل الفجوة عند تأكيد المقياس", "صياغة إجراءات تطوير قابلة للمتابعة"],
      student_work: ["تحليل جودة أعمال الطلبة", "تحديد أثر التغذية الراجعة والتمايز", "ترتيب البنود منخفضة الأداء", "اقتراح خطة تحسين للأعمال"],
      supervision_narrative: ["تصنيف الأحكام والأدلة", "ربط جوانب التطوير بالدعم والتوصيات", "فحص قوة الدليل واتساقه", "تحويل التوصيات إلى خطة نمو قابلة للمتابعة"],
      unknown: narrativeMode
        ? ["اكتشاف الأقسام والموضوعات المتكررة", "تمييز الحكم من الدليل", "تقدير قوة الأدلة وحدودها", "اقتراح تعريف تحليلي جديد للمراجعة"]
        : ["تحليل بنية الحقول وأنواع القيم", "استخراج المؤشرات الرقمية المتاحة", "تكوين استنتاجات عامة محدودة", "اقتراح تعريف تحليلي جديد للمراجعة"]
    };
    $("analysisPlan").innerHTML = plans[state.type.id].map(x => `<li>${escapeHtml(x)}</li>`).join("");
    updateAiStatusUi();
  }

  function parseNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return NaN;
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    const normalized = String(value).replace(/[٠-٩٫٬]/g, ch => map[ch]).replace(/%/g, "").trim();
    const n = Number(normalized); return Number.isFinite(n) ? n : NaN;
  }

  function median(values) {
    const a = [...values].sort((x,y) => x-y); const n = a.length; if (!n) return NaN;
    return n % 2 ? a[(n-1)/2] : (a[n/2-1] + a[n/2]) / 2;
  }


  function isSensitiveHeader(header) {
    const value = normalize(header);
    return /اسم.*طالب|اسم.*معلم|الرقم.*مدني|رقم.*طالب|هاتف|بريد|ايميل|عنوان|بطاقه|هوية|هويه|civil|student.?id|teacher.?id|phone|email/.test(value);
  }

  function sanitizeRowsForAi(maskPersonalData = true) {
    const headers = state.headers.slice(0, 35);
    const sensitive = new Set(headers.filter(isSensitiveHeader));
    const rows = state.rows.slice(0, 220).map((row, rowIndex) => {
      const clean = { _evidenceRef: `row:${rowIndex + 1}` };
      headers.forEach(header => {
        let value = String(row[header] ?? "").slice(0, 500);
        if (maskPersonalData && sensitive.has(header)) value = header.includes("اسم") ? `سجل ${rowIndex + 1}` : "[محجوب]";
        clean[header] = value;
      });
      return clean;
    });
    return {
      headers,
      rows,
      rowCount: state.rows.length,
      sentRowCount: rows.length,
      maskedHeaders: [...sensitive],
      truncated: state.rows.length > rows.length || state.headers.length > headers.length
    };
  }

  function narrativeLinesForAi(maskPersonalData = true) {
    const source = String(state.narrativeText || state.rawText || "").slice(0, 42000);
    const lines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 450);
    return lines.map((line, index) => ({
      ref: `line:${index + 1}`,
      text: maskPersonalData
        ? line.replace(/(اسم\s*(?:الطالب|المعلم)?\s*[:：-]?\s*)[^،؛\n]{3,80}/gi, "$1[محجوب]")
        : line
    }));
  }

  function compactDeterministicAnalysis(analysis) {
    if (!analysis) return null;
    const copy = JSON.parse(JSON.stringify(analysis));
    delete copy.localAnalysis;
    delete copy.ai;
    if (Array.isArray(copy.bins) && copy.bins.length > 12) copy.bins = copy.bins.slice(0, 12);
    return copy;
  }

  function buildEvidenceCatalog(dataset, narrativeLines, deterministicAnalysis) {
    const refs = [];
    (dataset?.rows || []).forEach(row => { if (row?._evidenceRef) refs.push(row._evidenceRef); });
    (narrativeLines || []).forEach(line => { if (line?.ref) refs.push(line.ref); });
    Object.entries(deterministicAnalysis || {}).forEach(([key, value]) => {
      if (["string", "number", "boolean"].includes(typeof value) || value === null) refs.push(`metric:${key}`);
    });
    return [...new Set(refs)];
  }

  function buildAiAnalysisPayload(maskPersonalData = true) {
    const dataset = sanitizeRowsForAi(maskPersonalData);
    const lines = narrativeLinesForAi(maskPersonalData);
    const deterministicAnalysis = compactDeterministicAnalysis(state.analysis);
    return {
      locale: "ar-OM",
      appVersion: "0.6.1",
      source: {
        name: state.sourceName,
        meta: state.sourceMeta || {},
        mode: isNarrativeMode() ? "narrative" : "table"
      },
      recognizedType: {
        id: state.type.id,
        nameAr: state.type.name,
        purpose: state.type.purpose,
        confidence: state.confidence
      },
      quality: state.quality,
      privacy: {
        personalDataMasked: maskPersonalData,
        maskedHeaders: dataset.maskedHeaders,
        note: maskPersonalData ? "أزيلت الحقول المباشرة المعروفة قبل الإرسال. قد تبقى إشارات شخصية داخل النصوص الحرة وتحتاج مراجعة." : "طلب المستخدم إرسال المحتوى دون إخفاء تلقائي."
      },
      data: isNarrativeMode()
        ? { lines, originalLineCount: String(state.narrativeText || state.rawText || "").split(/\r?\n/).length }
        : dataset,
      deterministicAnalysis,
      availableEvidenceRefs: buildEvidenceCatalog(isNarrativeMode() ? null : dataset, isNarrativeMode() ? lines : null, deterministicAnalysis),
      evidenceReferenceGuide: {
        rows: "row:N يشير إلى رقم السجل ضمن العينة المرسلة",
        lines: "line:N يشير إلى السطر النصي المرسل",
        metrics: "metric:NAME يشير إلى مؤشر محسوب داخل deterministicAnalysis"
      }
    };
  }

  const evidenceMetricLabels = {
    n: "عدد السجلات الصالحة",
    mean: "المتوسط الحسابي",
    med: "الوسيط",
    min: "أدنى قيمة",
    max: "أعلى قيمة",
    sd: "الانحراف المعياري",
    maxScore: "الدرجة الكلية المعتمدة",
    thresholdPct: "حد الإتقان المعتمد",
    masteryPct: "نسبة الإتقان",
    total: "إجمالي الحالات",
    evidenceRatio: "نسبة مؤشرات الأدلة",
    sentenceCount: "عدد الجمل المحللة",
    recommendationCount: "عدد التوصيات",
    developmentCount: "عدد جوانب التطوير"
  };

  function formatEvidenceMetric(key) {
    const value = state.analysis?.[key];
    if (value === undefined || value === null || value === "") return "غير متاح";
    if (typeof value === "number") return /Pct|Ratio/.test(key) ? `${round(value)}%` : String(round(value));
    return String(value);
  }

  function humanizeEvidenceRefs(refs) {
    const items = (Array.isArray(refs) ? refs : []).map(ref => {
      const value = String(ref || "");
      if (value.startsWith("metric:")) {
        const key = value.slice(7);
        return `${evidenceMetricLabels[key] || "مؤشر محسوب"}: ${formatEvidenceMetric(key)}`;
      }
      if (value.startsWith("row:")) return `السجل رقم ${value.slice(4)} من البيانات المحللة`;
      if (value.startsWith("line:")) return `السطر رقم ${value.slice(5)} من النص المصدر`;
      return "";
    }).filter(Boolean);
    return [...new Set(items)].join("، ") || "لم يحدد مرجع دليل واضح.";
  }

  function normalizeAiFinding(item) {
    return {
      title: item?.title || "استنتاج تربوي",
      statement: item?.statement || "",
      evidence: humanizeEvidenceRefs(item?.evidenceRefs || []),
      evidenceRefs: item?.evidenceRefs || [],
      confidence: item?.confidence || "متوسطة",
      impact: item?.educationalImpact || "أثر تربوي يحتاج مراجعة.",
      action: item?.recommendedAction || "مراجعة الاستنتاج وربطه بإجراء قابل للقياس.",
      limitations: item?.limitations || [],
      source: "ai"
    };
  }

  async function enrichAnalysisWithAi() {
    if (!aiReady()) return null;
    const maskPersonalData = $("maskPersonalDataInput")?.checked !== false;
    const payload = buildAiAnalysisPayload(maskPersonalData);
    const result = await window.TaqareerAI.analyze(payload);
    state.aiResult = result;
    state.aiUsed = true;
    state.aiError = "";
    return result;
  }

  async function runAnalysis() {
    clearMessage("setupMessage");
    state.aiResult = null;
    state.aiError = "";
    state.aiUsed = false;
    const runButton = $("runAnalysisBtn");
    runButton.disabled = true;

    try {
      if (isNarrativeMode()) {
        const text = $("narrativeTextReview").value.trim();
        if (text.length < 40) {
          setMessage("setupMessage", "النص قصير جدًا لإنتاج تحليل تربوي مفيد. أضف المحتوى المستخرج أو راجع الملف.", true);
          return;
        }
        state.narrativeText = text;
        state.analysis = analyzeNarrative(text);
      } else {
        const scoreColumn = $("scoreColumnSelect").value;
        const levelColumn = $("levelColumnSelect").value;
        const maxScore = parseNumber($("maxScoreInput").value);
        const thresholdPct = parseNumber($("masteryThresholdInput").value);
        if (!Number.isFinite(thresholdPct) || thresholdPct <= 0 || thresholdPct > 100) {
          setMessage("setupMessage", "حد الإتقان يجب أن يكون بين 1 و100.", true);
          return;
        }

        if (state.type.id === "level_distribution") {
          state.analysis = analyzeLevelDistribution();
        } else {
          const rawValues = scoreColumn ? state.rows.map(r => parseNumber(r[scoreColumn])).filter(Number.isFinite) : [];
          let excludedOutOfRange = 0;
          const values = rawValues.filter(v => {
            if (Number.isFinite(maxScore) && maxScore > 0 && (v < 0 || v > maxScore)) { excludedOutOfRange++; return false; }
            return true;
          });
          if (!values.length) {
            setMessage("setupMessage", "اختر عمودًا رقميًا صالحًا للتحليل، أو راجع الدرجة الكلية والقيم الخارجة عن نطاقها.", true);
            return;
          }
          state.analysis = analyzeScores(values, scoreColumn, levelColumn, maxScore, thresholdPct);
          if (excludedOutOfRange > 0) {
            state.analysis.findings.unshift(finding("استُبعدت قيم خارج النطاق", `استُبعدت ${excludedOutOfRange} قيمة أقل من صفر أو أعلى من الدرجة الكلية المؤكدة (${maxScore}).`, "مرتفعة", "إدخال هذه القيم كان سيشوّه المتوسط ونسبة الإتقان.", "مراجعة السجلات المستبعدة وتصحيحها قبل اعتماد التقرير النهائي."));
          }
        }
      }

      if (aiReady()) {
        setMessage("setupMessage", "اكتمل التحليل الحتمي. جارٍ تنفيذ القراءة التربوية العميقة وربط الاستنتاجات بالأدلة…");
        try {
          await enrichAnalysisWithAi();
        } catch (error) {
          state.aiError = error.message || "تعذر التحليل الذكي الحي.";
          state.aiResult = null;
          state.aiUsed = false;
        }
      }

      renderResults();
      showPanel(4);
    } finally {
      runButton.disabled = false;
      updateAiStatusUi();
    }
  }

  function analyzeScores(values, scoreColumn, levelColumn, maxScore, thresholdPct) {
    const n = values.length, sum = values.reduce((a,b) => a+b,0), mean = sum/n, med = median(values), min = Math.min(...values), max = Math.max(...values);
    const variance = values.reduce((a,v) => a + (v-mean)**2, 0) / n; const sd = Math.sqrt(variance);
    const hasMax = Number.isFinite(maxScore) && maxScore > 0;
    const masteryCut = hasMax ? maxScore * thresholdPct / 100 : NaN;
    const masteryCount = hasMax ? values.filter(v => v >= masteryCut).length : null;
    const masteryPct = hasMax ? masteryCount / n * 100 : null;
    const bins = buildBins(values, hasMax ? maxScore : null);
    const findings = [];

    if (state.quality.completeness < 90) findings.push(finding("اكتمال البيانات يحتاج حذرًا", `بلغ اكتمال الجدول ${state.quality.completeness}%.`, "متوسطة", "قد تؤثر القيم الناقصة في تمثيل الصورة العامة.", "مراجعة السجلات الناقصة قبل اعتماد التقرير النهائي."));
    if (hasMax) {
      if (masteryPct < 50) findings.push(finding("الإتقان منخفض ويستدعي تدخلًا", `حقق ${masteryCount} من أصل ${n} الحد المحدد (${thresholdPct}%).`, "مرتفعة", "أكثر من نصف الحالات لم تبلغ الحد المعتمد.", "تكوين مجموعة علاجية مركزة على المهارات أو الموضوعات المسببة للضعف."));
      else if (masteryPct < 75) findings.push(finding("الإتقان متوسط مع حاجة إلى دعم موجّه", `بلغت نسبة الإتقان ${round(masteryPct)}%.`, "مرتفعة", "توجد كتلة معتبرة تحتاج دعمًا دون أن يكون الضعف عامًا.", "تقسيم الطلبة إلى مجموعات دعم قصيرة وإثراء للمجيدين."));
      else findings.push(finding("مستوى الإتقان العام جيد", `بلغت نسبة الإتقان ${round(masteryPct)}%.`, "مرتفعة", "الغالبية بلغت الحد المحدد مع بقاء حالات فردية تحتاج متابعة.", "استمرار الممارسات الناجحة مع تدخل فردي للحالات الأقل أداءً."));
    } else findings.push(finding("لا يمكن حساب الإتقان بعد", "لم تُؤكّد الدرجة الكلية للمكوّن.", "مرتفعة", "المتوسطات الخام صالحة، لكن تحويلها إلى نسب أو مستويات سيكون تخمينًا.", "إدخال الدرجة الكلية قبل اعتماد حكم الإتقان."));

    const spreadRatio = hasMax ? sd / maxScore : sd / Math.max(1, Math.abs(mean));
    if (spreadRatio >= .18) findings.push(finding("تفاوت واضح في الأداء", `الانحراف المعياري ${round(sd)} والمدى ${round(max-min)}.`, "مرتفعة", "الصف أو المجموعة ليست متجانسة، والتدخل الموحد قد لا يخدم الجميع.", "استخدام تدخلات متدرجة بحسب مستوى الاحتياج."));
    else findings.push(finding("الأداء متقارب نسبيًا", `الانحراف المعياري ${round(sd)} والمدى ${round(max-min)}.`, "متوسطة", "الدرجات متقاربة نسبيًا داخل المجموعة.", "تنفيذ تدخل جماعي قصير مع متابعة الحالات الطرفية."));

    if (levelColumn) {
      const counts = {}; state.rows.forEach(r => { const level = String(r[levelColumn] ?? "").trim(); if (level) counts[level] = (counts[level]||0)+1; });
      if (Object.keys(counts).length) findings.push(finding("توزيع المستويات متاح للمقارنة", Object.entries(counts).map(([k,v]) => `${k}: ${v}`).join("، "), "مرتفعة", "يمكن استخدام المستويات الرسمية دون إعادة اشتقاقها من الدرجات.", "مراجعة الفئات الأدنى وربطها بأسماء الطلبة في التقرير المقيد."));
    }

    return { kind: "scores", n, mean, med, min, max, sd, hasMax, maxScore, thresholdPct, masteryPct, bins, findings,
      executiveTitle: hasMax ? `نسبة الإتقان ${round(masteryPct)}%` : "تحليل وصفي مكتمل",
      executiveSummary: hasMax ? `أظهر التحليل أن ${round(masteryPct)}% من السجلات ذات الدرجات الصالحة بلغت حد الإتقان المحدد. بلغ المتوسط ${round(mean)} من ${maxScore}، مع ${spreadRatio >= .18 ? "تفاوت واضح" : "تقارب نسبي"} بين الحالات.` : `تم تحليل ${n} قيمة رقمية في عمود «${scoreColumn}». بلغ المتوسط ${round(mean)} والوسيط ${round(med)}. لم يُحسب الإتقان لأن الدرجة الكلية لم تُؤكّد.`,
      action: hasMax && masteryPct < 75 ? { title: "بناء تدخل علاجي متدرج", text: "قسّم الحالات إلى ثلاث مجموعات بحسب قربها من حد الإتقان، وحدد لكل مجموعة نشاطًا قصيرًا ومؤشر متابعة أسبوعيًا.", priority: masteryPct < 50 ? "عالية" : "متوسطة", indicator: `ارتفاع الإتقان إلى ${Math.min(100, Math.ceil(masteryPct/5)*5 + 10)}% أو أكثر` } : { title: "متابعة الحالات الأقل أداءً", text: "حافظ على الممارسات الحالية، وحدد الحالات الواقعة في الربع الأدنى لتدخل فردي قصير.", priority: "محددة", indicator: "انخفاض عدد الحالات في الربع الأدنى في القياس التالي" }
    };
  }

  function analyzeLevelDistribution() {
    const levelHeaders = state.headers.filter(h => ["ا","أ","ب","ج","د","ه","هـ"].includes(normalize(h)));
    const totals = {}; levelHeaders.forEach(h => totals[h] = state.rows.reduce((s,r) => s + (parseNumber(r[h])||0), 0));
    const total = Object.values(totals).reduce((a,b) => a+b,0);
    const entries = Object.entries(totals).map(([label,count]) => ({ label, count, pct: total ? count/total*100 : 0 }));
    const sorted = [...entries].sort((a,b) => b.count-a.count); const top = sorted[0];
    const lower = entries.filter(e => ["د","ه","هـ"].includes(normalize(e.label))).reduce((s,e) => s+e.count,0);
    const lowerPct = total ? lower/total*100 : 0;
    const findings = [finding("المستوى الأكثر انتشارًا", `${top?.label || "—"}: ${top?.count || 0} طالبًا (${round(top?.pct || 0)}%).`, "مرتفعة", "يوضح مركز التوزيع العام دون الحكم على أسباب الأداء.", "ربط المستوى الأكثر انتشارًا ببيانات المهارات أو المفردات عند توفرها.")];
    if (lowerPct >= 30) findings.push(finding("كتلة منخفضة الأداء تستحق الأولوية", `تمثل المستويات الدنيا ${round(lowerPct)}% من الإجمالي.`, "مرتفعة", "النسبة كافية لتبرير تدخل جماعي منظم.", "بناء خطة علاجية على مستوى الصف أو المادة، ثم تحليل المهارات لتحديد المحتوى."));
    else findings.push(finding("المستويات الدنيا محدودة نسبيًا", `تمثل المستويات الدنيا ${round(lowerPct)}% من الإجمالي.`, "مرتفعة", "التدخل الفردي أو المجموعات الصغيرة أنسب من برنامج عام واسع.", "تحديد أسماء الحالات الأقل أداءً من كشف الدرجات الفردي."));
    return { kind: "levels", total, entries, findings, executiveTitle: `أكبر فئة: المستوى ${top?.label || "—"}`, executiveSummary: `يشمل التقرير ${total} طالبًا. المستوى الأكثر انتشارًا هو ${top?.label || "—"} بنسبة ${round(top?.pct || 0)}%، بينما تمثل المستويات الدنيا ${round(lowerPct)}% من الإجمالي.`, action: { title: lowerPct >= 30 ? "تحليل المهارات المسببة للضعف" : "متابعة الحالات الفردية", text: lowerPct >= 30 ? "اربط هذا التوزيع بنتائج المهارات أو مفردات الاختبار لتحديد المحتوى الذي يحتاج تدخلاً، لأن المستوى وحده يصف النتيجة ولا يشرح سببها." : "استخدم كشف النتائج الفردي لاستخراج الحالات في المستويات الدنيا وتصميم متابعة قصيرة لها.", priority: lowerPct >= 30 ? "عالية" : "محددة", indicator: "انخفاض نسبة المستويات الدنيا في القياس التالي" } };
  }

  function splitNarrativeSentences(text) {
    return String(text || "")
      .split(/\n+|(?<=[.!؟؛])\s+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length >= 12);
  }

  function analyzeNarrative(text) {
    const sentences = splitNarrativeSentences(text);
    const lines = String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const themes = [
      { id: "student-learning", label: "تعلم الطلبة", keys: ["الطلبه", "تحصيل", "فهم", "تعلم", "تقدم", "استيعاب", "مهارات"] },
      { id: "planning", label: "التخطيط", keys: ["تخطيط", "نواتج", "اهداف", "الخطة", "تسلسل"] },
      { id: "instruction", label: "التدريس", keys: ["استراتيجيات", "تدريس", "استقصاء", "تعلم نشط", "نشاط", "شرح"] },
      { id: "assessment", label: "التقويم", keys: ["تقويم", "تغذيه راجعه", "تقييم", "اسئله", "قياس"] },
      { id: "classroom", label: "إدارة الصف", keys: ["اداره الصف", "زمن", "سلوك", "دافعيه", "مشاركه"] },
      { id: "technology", label: "التقنية والموارد", keys: ["تقنيه", "رقمي", "محاكاه", "موارد", "عرض", "مختبر"] },
      { id: "differentiation", label: "التمايز والدعم", keys: ["تمايز", "فروق فرديه", "دعم", "علاجي", "اثراء", "فئه"] }
    ];
    const themeEntries = themes.map(theme => ({
      ...theme,
      count: sentences.filter(sentence => theme.keys.some(key => normalize(sentence).includes(key))).length
    })).filter(theme => theme.count > 0).sort((a, b) => b.count - a.count);

    const evidenceMarkers = ["من خلال", "حيث", "يظهر", "يتضح", "مما", "نتيجه", "استنادا", "اعتمادا", "%"];
    const evidenceSentences = sentences.filter(sentence => evidenceMarkers.some(marker => normalize(sentence).includes(normalize(marker))) || /\d/.test(sentence));
    const recommendationMarkers = ["يوصي", "اوصي", "اعداد", "تفعيل", "تعزيز", "متابعه", "تزويد", "تصميم", "توجيه", "تنفيذ", "مناقشه"];
    const recommendations = sentences.filter(sentence => recommendationMarkers.some(marker => normalize(sentence).includes(marker)));
    const developmentSentences = sentences.filter(sentence => /تحتاج|بحاجه|تحسين|تطوير|ضعف|محدود|تحديات/.test(normalize(sentence)));
    const strengthSentences = sentences.filter(sentence => /اجاده|قوه|متميز|فعال|فاعله|جيد|تحسن|اتقان/.test(normalize(sentence)));
    const evidenceRatio = sentences.length ? evidenceSentences.length / sentences.length * 100 : 0;
    const topTheme = themeEntries[0] || { label: "غير محدد", count: 0 };
    const findings = [];

    findings.push(finding(
      "المجال الأكثر حضورًا في التقرير",
      `${topTheme.label}: ظهر في ${topTheme.count} جملة من أصل ${sentences.length} جملة تحليلية.`,
      topTheme.count >= 3 ? "مرتفعة" : "متوسطة",
      "يوضح المجال الذي يستحوذ على معظم الأحكام والملاحظات، لكنه لا يثبت وحده أنه الأهم فعليًا.",
      "مقارنة حضور هذا المجال بأهداف الزيارة أو الاستمارة للتأكد من توازن التغطية."
    ));

    if (evidenceRatio >= 35) {
      findings.push(finding(
        "ربط مقبول بين الأحكام والأدلة",
        `احتوت ${evidenceSentences.length} جملة (${round(evidenceRatio)}%) على مؤشرات دليل مباشر أو وصف للممارسة والأثر.`,
        "متوسطة",
        "التقرير يتجاوز الأحكام العامة في جزء معتبر من محتواه، مع بقاء الحاجة إلى مراجعة بشرية لجودة كل دليل.",
        "اعتماد صيغة ثابتة: ممارسة محددة + دليل ملاحظ + أثر على تعلم الطلبة."
      ));
    } else {
      findings.push(finding(
        "الأدلة المباشرة محدودة",
        `لم يظهر مؤشر دليل واضح إلا في ${evidenceSentences.length} جملة (${round(evidenceRatio)}%).`,
        "متوسطة",
        "قد تكون بعض الأحكام صحيحة، لكن صياغتها الحالية لا تكفي لتتبعها أو الدفاع عنها مهنيًا.",
        "إعادة صياغة الأحكام العامة بإضافة ما شوهد أو قيس والفئة المتأثرة والأثر الناتج."
      ));
    }

    if (recommendations.length) {
      const actionable = recommendations.filter(sentence => /اسبوع|شهر|مره|مؤشر|بنسبه|خلال|كل|فئه|نشاط|ورقه|جلسه/.test(normalize(sentence))).length;
      findings.push(finding(
        "التوصيات موجودة وتحتاج ضبط قابلية القياس",
        `اكتُشفت ${recommendations.length} توصية أو إجراء، منها ${actionable} تتضمن عنصرًا تنفيذيًا أو زمنيًا أو مؤشرًا قابلًا للتتبع.`,
        actionable >= Math.max(1, recommendations.length / 2) ? "مرتفعة" : "متوسطة",
        "وجود التوصية لا يكفي؛ قيمتها ترتفع عندما تحدد الفئة والزمن والمسؤول ومؤشر النجاح.",
        "تحويل التوصيات المختارة إلى جدول تنفيذ: الإجراء، المسؤول، الزمن، الدليل، مؤشر النجاح."
      ));
    } else {
      findings.push(finding(
        "لا توجد توصيات تنفيذية واضحة",
        "لم يكتشف المحرك أفعالًا إجرائية صريحة في النص.",
        "متوسطة",
        "قد يبقى التقرير وصفيًا دون أن يقود إلى تحسين قابل للمتابعة.",
        "إضافة إجراء واحد على الأقل لكل جانب تطوير، مع مسؤول وزمن ومؤشر نجاح."
      ));
    }

    if (developmentSentences.length && !recommendations.length) {
      findings.push(finding(
        "جوانب التطوير غير مرتبطة بإجراء",
        `ظهر ${developmentSentences.length} وصفًا لحاجة أو فرصة تحسين دون توصية تنفيذية مقابلة.`,
        "متوسطة",
        "الفجوة بين التشخيص والإجراء تقلل قيمة التقرير في المتابعة.",
        "ربط كل جانب تطوير بإجراء واحد محدد على الأقل."
      ));
    }

    const action = evidenceRatio < 35
      ? { title: "تقوية سلسلة الحكم والدليل", text: "اختر أهم ثلاثة أحكام في التقرير وأعد صياغة كل واحد بصيغة: الممارسة، الدليل المشاهد، الفئة المتأثرة، الأثر، ثم الإجراء التالي.", priority: "عالية", indicator: "ارتباط كل حكم رئيس بدليل مباشر قابل للمراجعة" }
      : { title: "تحويل التوصيات إلى خطة متابعة", text: "اعتمد التوصيات الأعلى أثرًا وحولها إلى إجراءات لها مسؤول وزمن ومؤشر نجاح، ثم اربطها بالزيارة أو القياس اللاحق.", priority: recommendations.length ? "متوسطة" : "عالية", indicator: "وجود مؤشر متابعة واضح لكل توصية معتمدة" };

    return {
      kind: "narrative",
      sentenceCount: sentences.length,
      lineCount: lines.length,
      evidenceCount: evidenceSentences.length,
      recommendationCount: recommendations.length,
      strengthCount: strengthSentences.length,
      developmentCount: developmentSentences.length,
      evidenceRatio,
      themes: themeEntries.slice(0, 7),
      findings,
      executiveTitle: evidenceRatio >= 35 ? "تقرير غني نسبيًا بالأدلة" : "التقرير يحتاج تقوية الأدلة",
      executiveSummary: `تم تحليل ${sentences.length} جملة. برز مجال «${topTheme.label}» أكثر من غيره، وظهرت مؤشرات دليل مباشر في ${round(evidenceRatio)}% من الجمل، مع ${recommendations.length} توصية أو إجراء مكتشف. هذه قراءة لغوية تربوية أولية وليست اعتمادًا نهائيًا للحكم.`,
      action
    };
  }

  function buildBins(values, maxScore) {
    const min = Math.min(...values), max = Math.max(...values);
    const start = maxScore ? 0 : min; const end = maxScore || max; const steps = 5; const width = (end-start)/steps || 1;
    return Array.from({length: steps}, (_,i) => {
      const lo = start + i*width, hi = i===steps-1 ? end : start+(i+1)*width;
      const count = values.filter(v => v >= lo && (i===steps-1 ? v <= hi : v < hi)).length;
      return { label: `${round(lo)}–${round(hi)}`, count };
    });
  }

  function finding(title, evidence, confidence, impact, action) { return { title, evidence, confidence, impact, action }; }
  function round(v) { return Number.isFinite(v) ? Math.round(v*10)/10 : "—"; }

  function renderResults() {
    const a = state.analysis;
    const ai = state.aiResult;
    if (a.kind === "scores") {
      const metrics = [
        ["السجلات الصالحة", a.n, "قيمة رقمية"], ["المتوسط", round(a.mean), a.hasMax ? `من ${a.maxScore}` : "قيمة خام"],
        ["الوسيط", round(a.med), "منتصف التوزيع"], [a.hasMax ? "الإتقان" : "المدى", a.hasMax ? `${round(a.masteryPct)}%` : round(a.max-a.min), a.hasMax ? `حد ${a.thresholdPct}%` : "أعلى - أدنى"]
      ];
      $("metrics").innerHTML = metrics.map(m => `<div class="metric"><small>${m[0]}</small><strong>${m[1]}</strong><span>${m[2]}</span></div>`).join("");
      renderBars(a.bins.map(b => ({label:b.label,count:b.count})), "توزيع الدرجات");
    } else if (a.kind === "narrative") {
      const metrics = [
        ["الجمل المحللة", a.sentenceCount, "جملة ذات معنى"],
        ["جمل الأدلة", a.evidenceCount, `${round(a.evidenceRatio)}% من النص`],
        ["التوصيات", a.recommendationCount, "إجراء مكتشف"],
        ["جوانب التطوير", a.developmentCount, "حاجة أو فرصة تحسين"]
      ];
      $("metrics").innerHTML = metrics.map(m => `<div class="metric"><small>${m[0]}</small><strong>${m[1]}</strong><span>${m[2]}</span></div>`).join("");
      const themeItems = a.themes.length ? a.themes.map(theme => ({ label: theme.label, count: theme.count })) : [{ label: "النص العام", count: a.sentenceCount }];
      renderBars(themeItems, "الموضوعات التربوية الأكثر حضورًا");
    } else {
      const top = [...a.entries].sort((x,y)=>y.count-x.count)[0];
      const metrics = [["إجمالي الطلبة", a.total, "كل المستويات"], ["عدد المستويات", a.entries.length, "فئات مكتشفة"], ["الفئة الأكبر", top?.label||"—", `${top?.count||0} طالبًا`], ["نسبتها", `${round(top?.pct||0)}%`, "من الإجمالي"]];
      $("metrics").innerHTML = metrics.map(m => `<div class="metric"><small>${m[0]}</small><strong>${m[1]}</strong><span>${m[2]}</span></div>`).join("");
      renderBars(a.entries.map(e => ({label:e.label,count:e.count})), "توزيع مستويات الأداء");
    }

    $("analysisModeChip").textContent = ai ? "تحليل هجين: حتمي + ذكاء اصطناعي" : "تحليل محلي حتمي";
    $("analysisModeChip").className = ai ? "success-chip ai-result-chip" : "success-chip";
    const notice = $("aiResultNotice");
    if (ai) {
      notice.classList.remove("hidden", "error");
      notice.innerHTML = `<strong>تمت القراءة التربوية العميقة</strong><span>صاغ الذكاء الاصطناعي الاستنتاجات وربطها بمراجع أدلة، بينما بقيت الحسابات من المحرك الحتمي.</span>`;
    } else if (state.aiError) {
      notice.classList.remove("hidden");
      notice.classList.add("error");
      notice.innerHTML = `<strong>اكتمل التحليل المحلي</strong><span>تعذر التحليل الذكي الحي: ${escapeHtml(state.aiError)}. لم تُفقد النتائج.</span>`;
    } else {
      notice.classList.add("hidden");
      notice.classList.remove("error");
    }

    $("executiveTitle").textContent = ai?.executiveTitle || a.executiveTitle;
    $("executiveSummary").textContent = ai?.executiveSummary || a.executiveSummary;

    const aiFindings = (ai?.findings || []).map(normalizeAiFinding);
    const localFindings = (a.findings || []).map(item => ({ ...item, source: "deterministic", statement: item.title, limitations: [] }));
    const allFindings = [...aiFindings, ...localFindings];
    $("findings").innerHTML = allFindings.map((f,i) => {
      const sourceLabel = f.source === "ai" ? "تحليل ذكي" : "تحليل حتمي";
      const limitationHtml = f.limitations?.length
        ? `<h5>الحدود</h5><p>${f.limitations.map(escapeHtml).join("، ")}</p>` : "";
      const statementHtml = f.statement && f.statement !== f.title ? `<p class="finding-statement">${escapeHtml(f.statement)}</p>` : "";
      return `<details class="finding" ${i===0?'open':''}><summary><div class="finding-title"><strong>${escapeHtml(f.title)}</strong><small>${escapeHtml(f.impact)}</small></div><div class="finding-badges"><span class="source-pill ${f.source}">${sourceLabel}</span><span class="confidence-pill">ثقة ${escapeHtml(f.confidence)}</span></div></summary><div class="finding-body">${statementHtml}<h5>الدليل</h5><p>${escapeHtml(f.evidence)}</p><h5>الإجراء المرتبط</h5><p>${escapeHtml(f.action)}</p>${limitationHtml}</div></details>`;
    }).join("");

    const tools = ai?.qualityTools || [];
    $("qualityToolsSection").classList.toggle("hidden", !tools.length);
    $("qualityToolsGrid").innerHTML = tools.map(tool => `<article class="quality-tool-card"><strong>${escapeHtml(tool.name)}</strong><p>${escapeHtml(tool.reason)}</p><span>${tool.conditionsMet ? "الشروط متحققة" : "مقترحة للمراجعة"}</span></article>`).join("");

    const plan = ai?.improvementPlan || [];
    $("improvementPlanSection").classList.toggle("hidden", !plan.length);
    $("improvementPlanBody").innerHTML = plan.map(item => `<tr><td>${escapeHtml(item.priority)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.responsibleRole)}</td><td>${escapeHtml(item.timeframe)}</td><td>${escapeHtml(item.successIndicator)}</td></tr>`).join("");

    const firstPlan = plan[0];
    const action = firstPlan ? {
      title: firstPlan.action,
      text: `${firstPlan.responsibleRole} · ${firstPlan.timeframe}`,
      priority: firstPlan.priority,
      indicator: firstPlan.successIndicator
    } : a.action;
    $("actionTitle").textContent = action.title;
    $("actionText").textContent = action.text;
    $("actionPriority").textContent = action.priority;
    $("actionIndicator").textContent = action.indicator;

    const cautions = ai?.cautions || [];
    $("aiCautions").classList.toggle("hidden", !cautions.length);
    $("aiCautionsList").innerHTML = cautions.map(item => `<li>${escapeHtml(item)}</li>`).join("");

    const suggested = ai?.suggestedNewType;
    const showSuggested = Boolean(suggested?.needed);
    $("aiSuggestedType").classList.toggle("hidden", !showSuggested);
    if (showSuggested) {
      $("aiSuggestedTypeName").textContent = suggested.nameAr || "نوع تحليلي جديد";
      $("aiSuggestedTypePurpose").textContent = suggested.purpose || "يحتاج الغرض التربوي إلى مراجعة المستخدم.";
      const tags = [...(suggested.requiredFields || []).map(item => `حقل: ${item}`), ...(suggested.analysisFamily || []).map(item => `تحليل: ${item}`)];
      $("aiSuggestedTypeMeta").innerHTML = tags.map(item => `<span>${escapeHtml(item)}</span>`).join("");
    }
  }

  function renderBars(items, title) {
    $("chartTitle").textContent = title; const max = Math.max(1, ...items.map(x=>x.count)); $("chartMeta").textContent = `${items.reduce((s,x)=>s+x.count,0)} سجل`;
    $("chartArea").innerHTML = items.map(x => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(5, x.count/max*180)}px" title="${x.count}"></div><strong>${escapeHtml(x.label)}</strong><span>${x.count}</span></div>`).join("");
  }

  function openOfficialReport() {
    if (!state.analysis) {
      alert("نفّذ التحليل أولًا قبل إنشاء التقرير الرسمي.");
      return;
    }
    try {
      window.TaqareerReports.openReport({
        analysis: state.analysis,
        aiResult: state.aiResult,
        aiError: state.aiError,
        type: state.type,
        sourceName: state.sourceName,
        sourceMeta: state.sourceMeta,
        quality: state.quality,
        confidence: state.confidence,
        recognitionStatus: state.recognitionStatus,
        headers: state.headers,
        rows: state.rows
      });
    } catch (error) {
      alert(error.message || "تعذر إنشاء التقرير الرسمي.");
    }
  }

  function exportAnalysis() {
    const payload = {
      app: "تقارير",
      version: "0.6.1",
      generatedAt: new Date().toISOString(),
      source: state.sourceName,
      sourceMeta: state.sourceMeta,
      recognizedType: { id: state.type.id, name: state.type.name, confidence: state.confidence },
      quality: state.quality,
      analysis: state.analysis,
      aiAnalysis: state.aiResult,
      aiError: state.aiError || null
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="taqareer-analysis-v0.6.1.json"; a.click(); URL.revokeObjectURL(url);
  }

  function escapeHtml(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(v) { return escapeHtml(v); }

  function reset() {
    Object.assign(state, {
      headers: [], rows: [], sourceName: "", rawText: "", narrativeText: "", delimiter: ",",
      type: formTypes.at(-1), confidence: 0,
      quality: { blockers: [], warnings: [], info: [], completeness: 0 },
      analysis: null, aiResult: null, aiError: "", aiUsed: false,
      localRecognition: null, aiRecognition: null, recognitionStatus: "محلي", recognitionRequestId: state.recognitionRequestId + 1,
      sampleMaxScore: null, pendingSource: null, sourceMeta: null, pendingManualFileName: "", pendingVisualPreview: null
    });
    $("fileInput").value = ""; $("pasteInput").value = ""; $("manualTextInput").value = "";
    clearMessage("inputMessage"); clearMessage("setupMessage"); showPanel(1);
  }

  function init() {
    $("sampleGrid").innerHTML = samples.map(s => `<button class="sample-card" data-sample="${s.id}" type="button"><strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.desc)}</span></button>`).join("");
    $("typeSelect").innerHTML = formTypes.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");

    document.querySelectorAll(".input-tab").forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll(".input-tab").forEach(b=>b.classList.toggle("active", b===btn));
      document.querySelectorAll(".input-mode").forEach(m=>m.classList.toggle("active-input-mode", m.id === `input-${btn.dataset.inputMode}`));
    }));
    $("sampleGrid").addEventListener("click", e => { const btn=e.target.closest("[data-sample]"); if(!btn)return; const s=samples.find(x=>x.id===btn.dataset.sample); ingest(s.text, `نموذج: ${s.title}`, s.maxScore); });
    $("parsePasteBtn").addEventListener("click", () => ingest($("pasteInput").value, "جدول ملصق"));
    $("fileInput").addEventListener("change", async e => handleInputFile(e.target.files[0]));
    const zone=$("uploadZone"); ["dragenter","dragover"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add("dragover");})); ["dragleave","drop"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove("dragover");}));
    zone.addEventListener("drop", async e => { const file=e.dataTransfer.files[0]; if(file) await handleInputFile(file); });
    $("applySheetBtn").addEventListener("click", e => { e.preventDefault(); const index=$("sheetSelect").value; $("sheetDialog").close(); applyPendingDataset(index); });
    $("cancelSheetBtn").addEventListener("click", () => { state.pendingSource=null; clearMessage("inputMessage"); });
    $("applyManualBtn").addEventListener("click", e => { e.preventDefault(); applyManualExtraction(); });
    $("cancelManualBtn").addEventListener("click", () => {
      state.pendingManualFileName = "";
      $("manualTextInput").value = "";
      $("manualImagePreview").removeAttribute("src");
      clearMessage("inputMessage");
    });

    $("backToInputBtn").addEventListener("click",()=>showPanel(1));
    $("toSetupBtn").addEventListener("click",()=>{renderSetup();showPanel(3);});
    $("backToReviewBtn").addEventListener("click",()=>showPanel(2));
    $("runAnalysisBtn").addEventListener("click",runAnalysis);
    $("restartBtn").addEventListener("click",reset); $("resetTopBtn").addEventListener("click",reset); $("exportBtn").addEventListener("click",exportAnalysis); $("officialReportBtn").addEventListener("click",openOfficialReport);
    $("openAiSettingsBtn").addEventListener("click", openAiSettings);
    $("openAiSettingsTopBtn").addEventListener("click", openAiSettings);
    $("saveAiSettingsBtn").addEventListener("click", e => { e.preventDefault(); saveAndTestAiSettings(); });
    $("clearAiSettingsBtn").addEventListener("click", e => {
      e.preventDefault();
      window.TaqareerAI.clearConfig();
      $("aiEndpointInput").value = "";
      $("aiAnonKeyInput").value = "";
      $("aiAccessCodeInput").value = "";
      updateAiStatusUi();
      const message = $("aiSettingsMessage");
      message.classList.remove("hidden", "error");
      message.textContent = "حُذفت إعدادات الاتصال من هذا المتصفح.";
    });
    $("aiModeToggle").addEventListener("change", e => {
      window.TaqareerAI.saveConfig({ enabled: e.target.checked });
      updateAiStatusUi();
    });
    $("changeTypeBtn").addEventListener("click",()=>{ $("typeSelect").value=state.type.id; $("typeDialog").showModal(); });
    $("applyTypeBtn").addEventListener("click", e => { e.preventDefault(); const chosen=formTypes.find(t=>t.id===$("typeSelect").value); if(chosen){state.type=chosen;state.confidence=100;state.recognitionStatus="اعتماد يدوي من المستخدم";state.quality=assessQuality(state.headers,state.rows,state.type,state.sourceMeta||{});renderReview();} $("typeDialog").close(); });
    updateAiStatusUi();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
