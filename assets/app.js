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
    { id: "survey", name: "استبانة اتجاهات أو رضا", purpose: "تحليل توزيع الاستجابات والاتجاه العام والبنود ذات الأولوية وجودة المقياس عند تحقق شروطها.", keywords: ["أوافق بشدة", "محايد", "الرضا", "الاستبانة", "المتوسط"], min: 2 },
    { id: "training_needs", name: "استمارة احتياجات تدريبية", purpose: "تحليل أهمية الكفايات وفجوة الأداء وترتيب الأولويات وقياس أثر التدريب.", keywords: ["الكفاية", "الأهمية", "المستوى الحالي", "المستوى المستهدف", "الاحتياج التدريبي"], min: 2 },
    { id: "program_evaluation", name: "تقييم برنامج أو مبادرة", purpose: "تحليل التنفيذ والمخرجات والنتائج والأثر والفجوات والاستدامة.", keywords: ["نسبة التنفيذ", "الهدف", "المؤشر", "الأثر", "المستهدف"], min: 2 },
    { id: "behavior_attendance", name: "سلوك وغياب وانضباط", purpose: "تحليل التكرارات والاتجاهات الزمنية والحالات المتكررة وأولويات الوقاية والمتابعة.", keywords: ["الغياب", "السلوك", "المخالفة", "التاريخ", "التكرار"], min: 2 },
    { id: "unknown", name: "نوع جديد غير مسجل", purpose: "سيُبنى له تعريف تحليلي تكيفي خاص دون فرض قالب معروف.", keywords: [], min: 0 }
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
    analysis: null, reconciledAnalysis: null, aiResult: null, aiError: "", aiWarning: "", aiUsed: false, aiPending: false,
    aiSegments: { results: {}, failures: {}, statuses: {}, taskResults: {}, taskFailures: {}, taskStatuses: {}, taskPlan: [], failedTaskIds: [], recovery: null },
    performance: { spans: [], cacheHit: false, payloadChars: 0, aiUsage: null, aiModel: "", aiServerTiming: null, segmentTimings: {} },
    localRecognition: null, aiRecognition: null, recognitionStatus: "محلي", recognitionRequestId: 0, analysisRequestId: 0,
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

  function perfApi() { return window.TaqareerPerformance || null; }
  function resetPerformance() { state.performance = { spans: [], cacheHit: false, payloadChars: 0, aiUsage: null, aiModel: "", aiServerTiming: null, segmentTimings: {} }; }
  function recordSpan(span) { if (span) state.performance.spans.push(span); return span; }
  function formatDuration(ms) { return perfApi()?.formatDuration?.(ms) || `${Math.round(Number(ms) || 0)} مللي ثانية`; }
  function yieldToUi() { return new Promise(resolve => requestAnimationFrame(() => resolve())); }


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
    supervision_narrative: [["النص"]],
    survey: [["البند", "السؤال", "العبارة", "المجال"]],
    training_needs: [["الكفاية", "المهارة", "الاحتياج", "المجال"], ["المستوى الحالي", "الأداء الحالي", "الدرجة الحالية"]],
    program_evaluation: [["الهدف", "المؤشر", "النشاط", "المخرج"]],
    behavior_attendance: [["السلوك", "نوع الحالة", "المخالفة", "سبب الغياب", "التاريخ"]]
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

    const likertLabels = ["اوافق بشده", "اوافق", "محايد", "لا اوافق", "لا اوافق بشده"].filter(label => has(label)).length;
    if (likertLabels >= 3) add("survey", 58, `وجود ${likertLabels} فئات ليكرت`);
    if (has("استبانه") || has("استبانة") || has("رضا المستفيدين") || has("اتجاهات")) add("survey", 28, "عنوان أو سياق استبانة");
    if (headerHas("البند") && (headerHas("المتوسط") || headerHas("نسبه الاتفاق") || headerHas("نسبة الاتفاق"))) add("survey", 24, "بنود ومتوسطات استبانة");

    if ((headerHas("الكفايه") || headerHas("الكفاية") || headerHas("المهاره") || headerHas("المهارة")) && (headerHas("المستوي الحالي") || headerHas("المستوى الحالي"))) add("training_needs", 58, "كفايات ومستوى حالي");
    if (has("الاحتياجات التدريبيه") || has("الاحتياجات التدريبية") || has("اولوية التدريب") || has("أولوية التدريب")) add("training_needs", 34, "سياق احتياجات تدريبية");
    if (headerHas("الاهميه") || headerHas("الأهمية")) add("training_needs", 16, "وجود درجة أهمية");

    if ((headerHas("الهدف") || headerHas("المؤشر") || headerHas("النشاط")) && (headerHas("نسبه التنفيذ") || headerHas("نسبة التنفيذ") || headerHas("الاثر") || headerHas("الأثر"))) add("program_evaluation", 54, "أهداف أو مؤشرات مع تنفيذ أو أثر");
    if (has("تقييم برنامج") || has("تقييم مبادره") || has("تقييم مبادرة") || has("تحقق الاهداف") || has("تحقق الأهداف")) add("program_evaluation", 34, "سياق تقويم برنامج أو مبادرة");
    if (headerHas("المستهدف") && (headerHas("النتيجه") || headerHas("النتيجة") || headerHas("الفعلي"))) add("program_evaluation", 22, "مستهدف ونتيجة فعلية");

    if (has("الغياب") || has("المخالفات السلوكيه") || has("المخالفات السلوكية") || has("السلوك والانضباط")) add("behavior_attendance", 40, "سياق غياب أو سلوك");
    if ((headerHas("السلوك") || headerHas("نوع الحاله") || headerHas("نوع الحالة") || headerHas("المخالفه") || headerHas("المخالفة")) && (headerHas("التاريخ") || headerHas("التكرار") || headerHas("العدد"))) add("behavior_attendance", 52, "نوع حالة مع تاريخ أو تكرار");
    if (headerHas("ايام الغياب") || headerHas("أيام الغياب")) add("behavior_attendance", 36, "حقل أيام الغياب");

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
      appVersion: "0.9.4",
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
    const knownHighConfidence = state.type.id !== "unknown" && state.confidence >= 95;
    const shouldVerify = aiReady() && !knownHighConfidence && (
      state.type.id === "unknown" || state.confidence < 90 || state.sourceMeta?.mode === "narrative" || state.sourceMeta?.normalization?.applied
    );
    if (!shouldVerify || !window.TaqareerAI?.classify) return;
    state.recognitionStatus = "جارٍ التحقق دلاليًا بواسطة Gemini…";
    renderReview();
    try {
      const payload = buildRecognitionPayload();
      const cacheKey = perfApi() ? await perfApi().makeKey("classification", payload) : "";
      const cached = cacheKey ? perfApi().cacheGet(cacheKey) : null;
      const timer = perfApi()?.startSpan?.("التصنيف الذكي");
      const result = cached || await window.TaqareerAI.classify(payload);
      recordSpan(timer ? perfApi().endSpan(timer, { cacheHit: Boolean(cached) }) : null);
      if (!cached && cacheKey) perfApi().cacheSet(cacheKey, result, 30 * 24 * 60 * 60 * 1000);
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
        ? `تحقق هجين: المحرك المحلي + Gemini${adopt ? " · تم اعتماد التصنيف الدلالي" : " · التصنيف المحلي متسق"}${cached ? " · من الذاكرة المؤقتة" : ""}`
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
      single_subject: ["تحليل وصفي متقدم: الربيعات والمئينات والالتواء والتشتت", "تحليل الإتقان وحساسية المعيار وفئات التدخل", "اكتشاف القيم المتطرفة وبناء خط أساس", "أدوات جودة وخطة علاج وإثراء وإعادة قياس"],
      assessment_component: ["تحليل عميق لمكوّن التقويم وتوزيع الدرجات", "فئات القرب من الإتقان والتعثر الشديد", "مراجعة القيم المتطرفة واتساق الحكم", "خطة تدخل متعددة المستويات قابلة للمقارنة لاحقًا"],
      level_distribution: ["تحليل المستويات العليا والدنيا ومركز التوزيع", "مقارنة الصفوف أو الشعب وترتيب الأولوية", "مصفوفة فجوة وانتقال المستويات", "خطة تدخل جماعي وفردي وإثرائي"],
      cross_subject: ["ترتيب المواد ونسب الإتقان والتفاوت", "تمييز التعثر الشامل من التعثر التخصصي", "تحليل العلاقات الوصفية بين المواد", "خريطة تدخل مشتركة ومتابعة متعددة التخصصات"],
      supervision_indicator: ["تجميع المؤشرات في مجالات إشرافية", "رادار الأداء وتحليل الفجوة وباريتو الأولويات", "مصفوفة أولوية الأثر والجهد", "خطة نمو مهني ودورة PDCA وإعادة ملاحظة"],
      student_work: ["تحليل جودة الإنجاز والتغذية الراجعة والتمايز", "رادار المجالات وفجوات الأعمال والأنشطة", "باريتو البنود ذات الأثر الأعلى", "خطة تحسين للأعمال ومؤشرات متابعة قبل/بعد"],
      supervision_narrative: ["تحليل أقسام الإجادة والتطوير والدعم والتوصيات", "مصفوفة الحكم والدليل والأثر", "اكتشاف التكرار والتعارض ومشكلات التواريخ", "فحص قابلية التوصيات للقياس وبناء خطة متابعة"],
      survey: ["تحليل ليكرت والاتجاه العام وتوزيع الاستجابات", "ترتيب البنود وفجوات الرضا أو الاتفاق", "فحص الاتساق الداخلي عند تحقق شروطه", "باريتو الأولويات وخطة استجابة وإعادة قياس"],
      training_needs: ["حساب فجوة الكفايات وأهمية الاحتياج", "ترتيب الأولوية حسب الفجوة والأهمية وحجم الفئة", "اختيار نوع التدخل: تدريب أو توجيه أو تعلم ذاتي", "قياس قبلي وبعدي ونقل أثر التدريب"],
      program_evaluation: ["فصل التنفيذ عن النتائج والأثر", "نموذج منطق البرنامج وتحليل فجوات الأهداف", "باريتو الاختناقات ودورة PDCA", "قرار الاستمرار أو التعديل وخطة قياس الاستدامة"],
      behavior_attendance: ["باريتو أنواع الحالات والغياب", "الاتجاه الزمني والحالات المتكررة", "مؤشرات إنذار مبكر مع حماية الخصوصية", "تدخل وقائي وفردي وقياس أثر"],
      unknown: narrativeMode
        ? ["تحليل بنيوي للنص والأقسام", "تحقق دلالي عبر Gemini لتحديد النوع", "بناء عقد تحليل جديد بدل فرض قالب معروف", "تحديد الأدلة والأدوات والحدود المناسبة للنوع"]
        : ["ملف تعريف للحقول الرقمية والفئوية", "تحقق دلالي عبر Gemini لتحديد الهدف", "بناء خطة تحليل متخصصة جديدة", "حفظ النوع لاحقًا في السجل الديناميكي"]
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

  function isSensitiveHeader(header) {
    const value = normalize(header);
    return /اسم.*طالب|اسم.*معلم|الرقم.*مدني|رقم.*طالب|هاتف|بريد|ايميل|عنوان|بطاقه|هوية|هويه|civil|student.?id|teacher.?id|phone|email/.test(value);
  }

  function tableAiLimit() {
    if (state.type.id === "unknown") return 60;
    if (["supervision_indicator", "student_work", "survey", "training_needs", "program_evaluation", "behavior_attendance", "level_distribution", "cross_subject"].includes(state.type.id)) return 70;
    return 16;
  }

  function sanitizeRowsForAi(maskPersonalData = true) {
    const headers = state.headers.slice(0, 28);
    const sensitive = new Set(headers.filter(isSensitiveHeader));
    const limit = tableAiLimit();
    const sourceRows = state.rows.length <= limit
      ? state.rows
      : [...state.rows.slice(0, Math.ceil(limit / 2)), ...state.rows.slice(-Math.floor(limit / 2))];
    const rows = sourceRows.map((row, rowIndex) => {
      const originalIndex = state.rows.indexOf(row);
      const clean = { _evidenceRef: `row:${Math.max(0, originalIndex) + 1}` };
      headers.forEach(header => {
        let value = String(row[header] ?? "").slice(0, 280);
        if (maskPersonalData && sensitive.has(header)) value = header.includes("اسم") ? `سجل ${Math.max(0, originalIndex) + 1}` : "[محجوب]";
        clean[header] = value;
      });
      return clean;
    });
    return {
      headers,
      sampleRows: rows,
      rowCount: state.rows.length,
      sentRowCount: rows.length,
      maskedHeaders: [...sensitive],
      sampling: state.rows.length > rows.length ? "بداية ونهاية البيانات مع الاعتماد على المؤشرات الحتمية لجميع السجلات" : "كل السجلات",
      truncated: state.rows.length > rows.length || state.headers.length > headers.length
    };
  }

  function narrativeLinesForAi(maskPersonalData = true) {
    const source = String(state.narrativeText || state.rawText || "").slice(0, 30000);
    const allLines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const limit = 260;
    const chosen = allLines.length <= limit
      ? allLines.map((text, index) => ({ text, index }))
      : [
          ...allLines.slice(0, 180).map((text, index) => ({ text, index })),
          ...allLines.slice(-80).map((text, offset) => ({ text, index: allLines.length - 80 + offset }))
        ];
    return chosen.map(item => ({
      ref: `line:${item.index + 1}`,
      text: maskPersonalData
        ? item.text.replace(/(اسم\s*(?:الطالب|المعلم)?\s*[:：-]?\s*)[^،؛\n]{3,80}/gi, "$1[محجوب]")
        : item.text
    }));
  }

  function compactDeterministicAnalysis(analysis) {
    if (!analysis) return null;
    const metrics = (analysis.metrics || []).slice(0, 28).map(item => ({
      id: item.id, label: item.label, value: item.value, note: item.note, format: item.format,
      evidenceRef: item.evidenceRef || `metric:${item.id}`
    }));
    const keyIndicators = Object.fromEntries(metrics.map(item => [item.id, item.value]));
    const charts = (analysis.charts || []).slice(0, 8).map(item => ({
      id: item.id, type: item.type, title: item.title, description: item.description,
      xKey: item.xKey, yKey: item.yKey, valueSuffix: item.valueSuffix,
      data: Array.isArray(item.data) ? item.data.slice(0, 24) : item.data
    }));
    return {
      version: analysis.version,
      kind: analysis.kind,
      typeId: analysis.typeId,
      analysisProfile: analysis.analysisProfile,
      executiveTitle: analysis.executiveTitle,
      executiveSummary: analysis.executiveSummary,
      keyIndicators,
      metrics,
      charts,
      limitations: (analysis.limitations || []).slice(0, 12),
      evidenceCatalog: Object.entries(analysis.evidenceMap || {}).slice(0, 100).map(([ref, text]) => ({ ref, text }))
    };
  }

  function buildEvidenceCatalog(dataset, narrativeLines, deterministicAnalysis) {
    const refs = [];
    (dataset?.sampleRows || []).forEach(row => { if (row?._evidenceRef) refs.push(row._evidenceRef); });
    (narrativeLines || []).forEach(line => { if (line?.ref) refs.push(line.ref); });
    (deterministicAnalysis?.metrics || []).forEach(item => refs.push(item.evidenceRef || `metric:${item.id}`));
    (deterministicAnalysis?.evidenceCatalog || []).forEach(item => { if (item?.ref) refs.push(item.ref); });
    return [...new Set(refs)];
  }

  function buildAiAnalysisPayload(maskPersonalData = true) {
    const dataset = sanitizeRowsForAi(maskPersonalData);
    const lines = narrativeLinesForAi(maskPersonalData);
    const deterministicAnalysis = compactDeterministicAnalysis(state.analysis);
    const reconciliationContract = window.TaqareerReconciliation?.buildContract?.(state.analysis);
    if (!reconciliationContract) throw new Error("محرك المصالحة التحليلية غير محمل.");
    const payload = {
      locale: "ar-OM",
      appVersion: "0.9.4",
      pipeline: {
        mode: "segmented-deep-analysis-v4",
        instruction: "المحرك الحتمي يثبت الحسابات والبنية. يقسم Gemini التحليل إلى قراءة تشخيصية واستنتاجات وتدخلات وحوكمة، ثم تُدمج الأجزاء الآمنة في عقد واحد دون إنشاء عناصر موازية."
      },
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
      quality: {
        completeness: state.quality?.completeness,
        blockers: state.quality?.blockers || [],
        warnings: (state.quality?.warnings || []).slice(0, 12),
        info: (state.quality?.info || []).slice(0, 8)
      },
      privacy: {
        personalDataMasked: maskPersonalData,
        maskedHeaders: dataset.maskedHeaders,
        note: maskPersonalData ? "أزيلت الحقول المباشرة المعروفة قبل الإرسال." : "طلب المستخدم إرسال المحتوى دون إخفاء تلقائي."
      },
      data: isNarrativeMode()
        ? { lines, originalLineCount: String(state.narrativeText || state.rawText || "").split(/\r?\n/).length, sentLineCount: lines.length }
        : dataset,
      deterministicAnalysis,
      reconciliationContract,
      availableEvidenceRefs: buildEvidenceCatalog(isNarrativeMode() ? null : dataset, isNarrativeMode() ? lines : null, deterministicAnalysis),
      evidenceReferenceGuide: {
        rows: "row:N يشير إلى سجل من العينة السياقية فقط",
        lines: "line:N يشير إلى السطر النصي المرسل",
        metrics: "metric:NAME يشير إلى مؤشر محسوب حتميًا من كامل البيانات"
      }
    };
    state.performance.payloadChars = JSON.stringify(payload).length;
    return payload;
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
    masteryCutoffScore: "درجة حد الإتقان",
    masteryCount: "عدد من حققوا حد الإتقان",
    nonMasteryCount: "عدد من لم يحققوا الإتقان",
    masteryPct: "نسبة انتشار الإتقان",
    masteryJudgement: "الحكم وفق سلم بوصلة الإتقان",
    additionalStudentsNeeded: "عدد الطلبة المطلوب للمستوى التالي",
    singleStudentImpact: "أثر الطالب الواحد في نسبة الانتشار",
    nearMasteryPct: "نسبة القريبين من الإتقان",
    deepGapPct: "نسبة الفجوة العميقة",
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
    const evidenceMap = state.analysis?.evidenceMap || {};
    const items = (Array.isArray(refs) ? refs : []).map(ref => {
      const value = String(ref || "");
      if (evidenceMap[value]) return evidenceMap[value];
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


  function segmentLabels() {
    return window.TaqareerDeepOrchestrator?.LABELS || {
      diagnostic: "القراءة التشخيصية",
      findings: "الاستنتاجات التربوية",
      interventions: "التدخلات التنفيذية",
      governance: "الجودة والمتابعة"
    };
  }

  function taskLabels() {
    return window.TaqareerDeepOrchestrator?.TASK_LABELS || {
      "diagnostic.full": "القراءة التشخيصية",
      "findings.full": "الاستنتاجات التربوية",
      "interventions.full": "التدخلات التنفيذية",
      "governance.quality": "أدوات الجودة",
      "governance.monitoring": "المتابعة والحوكمة"
    };
  }

  function segmentProgressText(statuses = {}, taskStatuses = {}) {
    const labels = segmentLabels();
    const entries = Object.entries(statuses);
    const done = entries.filter(([, value]) => value?.status === "success").length;
    const partial = entries.filter(([, value]) => value?.status === "partial");
    const failed = entries.filter(([, value]) => value?.status === "failed");
    const isolating = entries.filter(([, value]) => value?.status === "isolating");
    const pending = entries.filter(([, value]) => value?.status === "pending").map(([key]) => labels[key] || key);
    const taskEntries = Object.values(taskStatuses || {});
    const activeTasks = taskEntries.filter(value => ["pending", "recovering"].includes(value?.status)).map(value => value?.label).filter(Boolean);
    if (isolating.length) return `اكتمل ${done} من 4 · يجري عزل الجزء المتعثر: ${isolating.map(([key]) => labels[key] || key).join("، ")}`;
    if (activeTasks.length) return `اكتمل ${done} من 4 · يجري الآن: ${[...new Set(activeTasks)].join("، ")}`;
    if (pending.length) return `اكتمل ${done} من 4 · يجري الآن: ${pending.join("، ")}`;
    if (partial.length || failed.length) return `اكتمل ${done} من 4 · بقيت ${partial.length + failed.length} مهمة معزولة تحتاج مراجعة`;
    return `اكتملت المحاور الأربعة`;
  }

  function failureSummary(taskStatuses = {}, failedTaskIds = []) {
    const labels = taskLabels();
    return (failedTaskIds || []).map(id => {
      const item = taskStatuses[id] || {};
      const reason = item.failureType === "output_exhausted" ? "توقف عند حد الإخراج"
        : item.failureType === "json_invalid" ? "رجع JSON غير مكتمل"
        : item.failureType === "transient" ? "تعطل اتصال مؤقت"
        : item.error || "تعذر إكمال المهمة";
      return `${item.label || labels[id] || id}: ${reason}`;
    }).join("، ");
  }

  function applyAiDelta(delta, payload) {
    state.aiResult = delta;
    state.reconciledAnalysis = window.TaqareerReconciliation.reconcile(state.analysis, delta, {
      availableEvidenceRefs: payload.availableEvidenceRefs || []
    });
    const countCheck = window.TaqareerReconciliation.validateCounts(state.analysis, state.reconciledAnalysis);
    if (!countCheck.ok) throw new Error(`رفض محرك المصالحة نتيجة غيّرت بنية العقد: ${countCheck.errors.join("، ")}`);
    state.aiUsed = Boolean(state.reconciledAnalysis?._reconciliation?.aiApplied);
    return state.reconciledAnalysis;
  }

  async function enrichAnalysisWithAi({ force = false, requestId = state.analysisRequestId } = {}) {
    if (!aiReady()) return null;
    if (!window.TaqareerReconciliation?.reconcile) throw new Error("محرك المصالحة التحليلية غير محمل.");
    if (!window.TaqareerDeepOrchestrator?.run) throw new Error("منسق عزل مهام التحليل غير محمل.");
    const maskPersonalData = $("maskPersonalDataInput")?.checked !== false;
    const payload = buildAiAnalysisPayload(maskPersonalData);
    const previous = state.aiSegments?.results || {};
    const previousTaskResults = state.aiSegments?.taskResults || {};
    const previousTaskPlan = state.aiSegments?.taskPlan || [];
    const failedTaskIds = state.aiSegments?.failedTaskIds || [];
    const previousFailures = Object.keys(state.aiSegments?.failures || {});
    const retryFailedOnly = force && (failedTaskIds.length > 0 || previousFailures.length > 0);
    state.aiWarning = "";

    const outcome = await window.TaqareerDeepOrchestrator.run({
      basePayload: payload,
      ai: window.TaqareerAI,
      performanceApi: perfApi(),
      previousResults: retryFailedOnly ? previous : {},
      previousTaskResults: retryFailedOnly ? previousTaskResults : {},
      previousTaskPlan: retryFailedOnly ? previousTaskPlan : [],
      retrySegments: retryFailedOnly && !failedTaskIds.length ? previousFailures : undefined,
      retryTaskIds: retryFailedOnly && failedTaskIds.length ? failedTaskIds : undefined,
      force: force && !retryFailedOnly,
      isolationPolicy: { concurrency: 3, transientRetries: 1, transientDelayMs: 1200, jitterMs: 250 },
      onProgress: progress => {
        if (requestId !== state.analysisRequestId) return;
        state.aiSegments = {
          results: progress.results || state.aiSegments.results || {},
          failures: progress.failures || state.aiSegments.failures || {},
          statuses: progress.statuses || {},
          taskResults: progress.taskResults || state.aiSegments.taskResults || {},
          taskFailures: progress.taskFailures || state.aiSegments.taskFailures || {},
          taskStatuses: progress.taskStatuses || {},
          taskPlan: progress.taskPlan || state.aiSegments.taskPlan || [],
          failedTaskIds: Object.keys(progress.taskFailures || {}),
          recovery: progress.isolation || state.aiSegments.recovery || null
        };
        if (progress.delta && (progress.delta.deepAnalysisUnits?.length || progress.delta.patches?.length)) {
          try { applyAiDelta(progress.delta, payload); } catch { /* لا نوقف بقية المهام بسبب تحديث مرحلي */ }
        }
        if (state.aiPending) renderResults();
      }
    });

    if (requestId !== state.analysisRequestId) return null;
    state.aiSegments = {
      results: outcome.results,
      failures: outcome.failures,
      statuses: outcome.statuses,
      taskResults: outcome.taskResults,
      taskFailures: outcome.taskFailures,
      taskStatuses: outcome.taskStatuses,
      taskPlan: outcome.taskPlan,
      failedTaskIds: outcome.failedTaskIds,
      recovery: outcome.automaticRecovery || null
    };
    applyAiDelta(outcome.delta, payload);
    state.performance.cacheHit = outcome.succeededTasks.length > 0 && outcome.cacheHits === outcome.succeededTasks.length;
    state.performance.payloadChars = outcome.payloadChars;
    state.performance.segmentTimings = outcome.taskStatuses;
    state.performance.aiModel = Object.values(outcome.taskResults).find(item => item?.model)?.model || "Gemini";
    state.performance.aiUsage = Object.fromEntries(Object.entries(outcome.taskResults).map(([key, item]) => [key, item?.usage || null]));
    state.performance.aiServerTiming = {
      segmented: true,
      isolated: true,
      protocolVersion: outcome.protocolVersion,
      isolationVersion: outcome.isolationVersion,
      succeededSegments: outcome.succeededSegments,
      failedSegments: outcome.failedSegments,
      succeededTasks: outcome.succeededTasks,
      failedTaskIds: outcome.failedTaskIds,
      cacheHits: outcome.cacheHits,
      totalSegments: 4,
      totalTasks: outcome.taskPlan.length,
      taskTimings: Object.fromEntries(Object.entries(outcome.taskResults).map(([key, item]) => [key, item?.serverTiming || null])),
      taskStatuses: outcome.taskStatuses,
      automaticRecovery: outcome.automaticRecovery || null
    };
    recordSpan({ name: "Gemini المعزول", durationMs: outcome.durationMs, segmented: true, isolated: true });
    state.aiError = "";
    if (outcome.partialSuccess) {
      const details = failureSummary(outcome.taskStatuses, outcome.failedTaskIds);
      state.aiWarning = `اكتملت المصالحة جزئيًا؛ بقيت مهمة معزولة فقط: ${details || "تعذر إكمال جزء محدود"}. لا تعاد الحسابات ولا المهام الناجحة.`;
    }
    return state.reconciledAnalysis;
  }

  async function retryAiOnly() {
    if (!state.analysis || !aiReady()) return;
    state.aiPending = true;
    state.aiError = "";
    state.aiWarning = "";
    renderResults();
    try {
      await enrichAnalysisWithAi({ force: true, requestId: state.analysisRequestId });
    } catch (error) {
      state.aiError = error.message || "تعذر التفسير الذكي الحي.";
      if (!state.aiUsed) {
        state.aiResult = null;
        state.reconciledAnalysis = window.TaqareerReconciliation?.canonicalize?.(state.analysis) || state.analysis;
      }
    } finally {
      state.aiPending = false;
      renderResults();
      updateAiStatusUi();
    }
  }

  async function runAnalysis() {
    clearMessage("setupMessage");
    state.aiResult = null;
    state.reconciledAnalysis = null;
    state.aiError = "";
    state.aiWarning = "";
    state.aiUsed = false;
    state.aiPending = false;
    state.aiSegments = { results: {}, failures: {}, statuses: {}, taskResults: {}, taskFailures: {}, taskStatuses: {}, taskPlan: [], failedTaskIds: [], recovery: null };
    resetPerformance();
    const analysisRequestId = ++state.analysisRequestId;
    const runButton = $("runAnalysisBtn");
    runButton.disabled = true;

    try {
      const totalTimer = perfApi()?.startSpan?.("الزمن الكلي");
      const narrativeMode = isNarrativeMode();
      const narrativeText = narrativeMode ? $("narrativeTextReview").value.trim() : "";
      if (narrativeMode && narrativeText.length < 40) {
        setMessage("setupMessage", "النص قصير جدًا لإنتاج تحليل تربوي عميق. راجع المحتوى المستخرج.", true);
        return;
      }
      if (narrativeMode) state.narrativeText = narrativeText;

      const scoreColumn = $("scoreColumnSelect").value;
      const levelColumn = $("levelColumnSelect").value;
      const maxScore = parseNumber($("maxScoreInput").value);
      const thresholdPct = parseNumber($("masteryThresholdInput").value);
      if (!narrativeMode && (!Number.isFinite(thresholdPct) || thresholdPct <= 0 || thresholdPct > 100)) {
        setMessage("setupMessage", "حد الإتقان يجب أن يكون بين 1 و100.", true);
        return;
      }
      if (!window.TaqareerDeepAnalytics?.analyze) {
        throw new Error("محرك التحليل العميق غير محمل. أعد تحميل الصفحة بعد تحديث الملفات.");
      }

      const localTimer = perfApi()?.startSpan?.("التحليل المحلي والرسوم");
      state.analysis = window.TaqareerDeepAnalytics.analyze({
        typeId: state.type.id,
        headers: state.headers,
        rows: state.rows,
        sourceMeta: state.sourceMeta,
        narrativeText,
        scoreColumn,
        levelColumn,
        maxScore,
        thresholdPct,
        quality: state.quality
      });
      recordSpan(localTimer ? perfApi().endSpan(localTimer) : null);
      state.reconciledAnalysis = window.TaqareerReconciliation?.canonicalize?.(state.analysis) || state.analysis;

      // أظهر النتائج الحتمية فورًا؛ لا نجعل Gemini بوابة تعطل كل شيء.
      state.aiPending = aiReady();
      renderResults();
      showPanel(4);
      await yieldToUi();

      if (aiReady()) {
        try {
          await enrichAnalysisWithAi({ requestId: analysisRequestId });
          if (analysisRequestId !== state.analysisRequestId) return;
        } catch (error) {
          state.aiError = error.message || "تعذر التحليل الذكي الحي.";
          if (!state.aiUsed) {
            state.aiResult = null;
            state.reconciledAnalysis = window.TaqareerReconciliation?.canonicalize?.(state.analysis) || state.analysis;
          }
        } finally {
          if (analysisRequestId === state.analysisRequestId) {
            state.aiPending = false;
            renderResults();
          }
        }
      }
      if (totalTimer) recordSpan(perfApi().endSpan(totalTimer));
      renderPerformanceSummary();
    } catch (error) {
      setMessage("setupMessage", error.message || "تعذر تنفيذ التحليل العميق.", true);
    } finally {
      runButton.disabled = false;
      updateAiStatusUi();
    }
  }

  function round(v) { return Number.isFinite(v) ? Math.round(v*10)/10 : "—"; }

  function formatMetricValue(item) {
    if (item?.value === null || item?.value === undefined || item?.value === "") return "—";
    if (item.format === "percent") return `${round(Number(item.value))}%`;
    return typeof item.value === "number" ? round(item.value) : String(item.value);
  }

  function chartValue(item, key) {
    const value = Number(item?.[key]);
    return Number.isFinite(value) ? value : 0;
  }

  function renderBarChart(chart, compact = false) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const xKey = chart.xKey || "label";
    const yKey = chart.yKey || "count";
    const max = Math.max(1, ...data.map(item => chartValue(item, yKey)));
    return `<div class="deep-bar-list">${data.slice(0, compact ? 8 : 20).map(item => {
      const value = chartValue(item, yKey);
      const label = item?.[xKey] ?? item?.label ?? "—";
      const suffix = chart.valueSuffix || "";
      return `<div class="deep-bar-row"><span class="deep-bar-label" title="${escapeAttr(label)}">${escapeHtml(label)}</span><div class="deep-bar-track"><span style="width:${Math.max(2, value / max * 100)}%"></span></div><strong class="deep-bar-value">${round(value)}${escapeHtml(suffix)}</strong></div>`;
    }).join("")}</div>`;
  }

  function renderLineChart(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const xKey = chart.xKey || "label", yKey = chart.yKey || "value";
    const values = data.map(item => chartValue(item, yKey));
    const min = Math.min(...values, 0), max = Math.max(...values, 1), width = 640, height = 210, pad = 28;
    const points = data.map((item, index) => {
      const x = pad + (data.length <= 1 ? 0 : index / (data.length - 1) * (width - pad * 2));
      const y = height - pad - ((chartValue(item, yKey) - min) / Math.max(1e-9, max - min)) * (height - pad * 2);
      return { x, y, label: item?.[xKey] ?? index + 1, value: chartValue(item, yKey) };
    });
    return `<div class="deep-line-chart"><svg viewBox="0 0 ${width} ${height}" role="img"><line class="axis" x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}"/><line class="axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${height-pad}"/><polyline class="series" points="${points.map(p=>`${p.x},${p.y}`).join(" ")}"/>${points.map(p=>`<circle class="point" cx="${p.x}" cy="${p.y}" r="4"><title>${escapeHtml(p.label)}: ${round(p.value)}${escapeHtml(chart.valueSuffix||"")}</title></circle><text x="${p.x}" y="${height-8}" font-size="10" text-anchor="middle">${escapeHtml(p.label)}${escapeHtml(chart.xSuffix||"")}</text>`).join("")}</svg></div>`;
  }

  function renderRadarChart(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const width = 420, height = 250, cx = width/2, cy = height/2+6, radius = 88, max = chart.max || 100;
    if (data.length < 3) return renderBarChart({ ...chart, xKey: "label", yKey: "value" });
    const angle = index => -Math.PI/2 + index * Math.PI * 2 / data.length;
    const point = (value, index, r=radius) => [cx + Math.cos(angle(index)) * r * (value/max), cy + Math.sin(angle(index)) * r * (value/max)];
    const outer = data.map((_,i)=>point(max,i)).map(p=>p.join(",")).join(" ");
    const values = data.map((item,i)=>point(Number(item.value ?? item.mean ?? 0),i)).map(p=>p.join(",")).join(" ");
    return `<div class="deep-radar-chart"><svg viewBox="0 0 ${width} ${height}"><polygon points="${outer}" fill="none" stroke="#cdd5e2"/><polygon points="${values}" fill="rgba(36,71,150,.18)" stroke="#244796" stroke-width="2"/>${data.map((item,i)=>{const [x,y]=point(max,i,radius+22);const [px,py]=point(Number(item.value ?? item.mean ?? 0),i);return `<line class="axis" x1="${cx}" y1="${cy}" x2="${point(max,i)[0]}" y2="${point(max,i)[1]}"/><circle class="point" cx="${px}" cy="${py}" r="3"/><text x="${x}" y="${y}" font-size="10" text-anchor="middle">${escapeHtml(item.label||item.domain||"")}</text>`}).join("")}</svg></div>`;
  }

  function renderBoxChart(chart) {
    const item = Array.isArray(chart.data) ? chart.data[0] : null;
    if (!item) return "";
    const values = [item.min,item.q1,item.median,item.q3,item.max].map(Number); const min=Math.min(...values), max=Math.max(...values); const width=640, height=150, pad=45;
    const x = value => pad + (value-min)/Math.max(1e-9,max-min)*(width-pad*2);
    return `<div class="deep-box-chart"><svg viewBox="0 0 ${width} ${height}"><line class="axis" x1="${x(item.min)}" y1="75" x2="${x(item.max)}" y2="75"/><line stroke="#244796" stroke-width="3" x1="${x(item.min)}" y1="60" x2="${x(item.min)}" y2="90"/><line stroke="#244796" stroke-width="3" x1="${x(item.max)}" y1="60" x2="${x(item.max)}" y2="90"/><rect x="${x(item.q1)}" y="48" width="${Math.max(2,x(item.q3)-x(item.q1))}" height="54" fill="rgba(22,135,126,.2)" stroke="#16877e" stroke-width="2"/><line stroke="#244796" stroke-width="4" x1="${x(item.median)}" y1="48" x2="${x(item.median)}" y2="102"/>${[['الأدنى',item.min],['ر1',item.q1],['الوسيط',item.median],['ر3',item.q3],['الأعلى',item.max]].map(([label,value])=>`<text x="${x(value)}" y="125" font-size="10" text-anchor="middle">${label} ${round(Number(value))}</text>`).join("")}</svg><p>القيم المتطرفة المكتشفة: ${Number(item.outlierCount||0)}</p></div>`;
  }

  function renderHeatmap(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const columns = chart.columns || ["strengths","development","support","recommendations"];
    const labels = {strengths:"الإجادة",development:"التطوير",support:"الدعم",recommendations:"التوصيات"};
    const max = Math.max(1,...data.flatMap(row=>columns.map(c=>Number(row[c]||0))));
    return `<div class="deep-heatmap"><table><thead><tr><th>المجال</th>${columns.map(c=>`<th>${labels[c]||escapeHtml(c)}</th>`).join("")}<th>الاتساق</th></tr></thead><tbody>${data.map(row=>`<tr><th>${escapeHtml(row.theme||row.label||row.group||"")}</th>${columns.map(c=>{const v=Number(row[c]||0);const level=Math.min(5,Math.ceil(v/max*5));return `<td class="heat-${level}">${v}</td>`}).join("")}<td>${row.alignment!==undefined?`${round(Number(row.alignment))}%`:"—"}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderTableChart(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    if (!data.length) return "";
    const keys = Object.keys(data[0]).slice(0,6);
    return `<div class="deep-heatmap"><table class="deep-chart-table"><thead><tr>${keys.map(k=>`<th>${escapeHtml(k)}</th>`).join("")}</tr></thead><tbody>${data.slice(0,12).map(row=>`<tr>${keys.map(k=>`<td>${escapeHtml(row[k]??"—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function renderChartContent(chart, compact = false) {
    if (!chart) return "";
    if (chart.type === "line") return renderLineChart(chart);
    if (chart.type === "radar") return renderRadarChart(chart);
    if (chart.type === "box") return renderBoxChart(chart);
    if (chart.type === "heatmap") return renderHeatmap(chart);
    if (chart.type === "table") return renderTableChart(chart);
    if (chart.type === "stacked") return renderHeatmap({ ...chart, columns: chart.series || [] });
    if (chart.type === "pareto") return renderBarChart({ ...chart, yKey: chart.yKey || "gap" }, compact);
    return renderBarChart(chart, compact);
  }


  function renderPerformanceSummary() {
    const panel = $("analysisTimingPanel");
    if (!panel) return;
    const spans = state.performance.spans || [];
    const local = spans.find(item => item.name === "التحليل المحلي والرسوم");
    const gemini = spans.find(item => String(item.name || "").startsWith("Gemini"));
    const total = spans.findLast ? spans.findLast(item => item.name === "الزمن الكلي") : [...spans].reverse().find(item => item.name === "الزمن الكلي");
    const items = [];
    if (local) items.push(`<span><strong>الحسابات والرسوم</strong>${formatDuration(local.durationMs)}</span>`);
    const server = state.performance.aiServerTiming || {};
    if (server.segmented) {
      const succeeded = server.succeededSegments?.length || 0;
      const succeededTasks = server.succeededTasks?.length || 0;
      const totalTasks = Number(server.totalTasks || 0);
      const cached = Number(server.cacheHits || 0);
      if (state.performance.cacheHit) items.push(`<span><strong>Gemini المعزول</strong>المهام الناجحة من الذاكرة المؤقتة</span>`);
      else if (gemini) items.push(`<span><strong>Gemini المعزول</strong>${succeeded}/4 محاور · ${succeededTasks}/${totalTasks || succeededTasks} مهام · ${formatDuration(gemini.durationMs)}</span>`);
      if (cached) items.push(`<span><strong>الذاكرة</strong>${cached} مهمة مستعادة</span>`);
      const recovery = server.automaticRecovery || {};
      const isolated = Array.isArray(recovery.isolatedSegments) ? recovery.isolatedSegments.length : 0;
      if (isolated) items.push(`<span><strong>عزل الفشل</strong>فُكك ${isolated} محور بدل تكرار الطلب نفسه</span>`);
      if (recovery.transientRetriesUsed) items.push(`<span><strong>استعادة الاتصال</strong>${recovery.transientRetriesUsed} محاولة مؤقتة فقط</span>`);
    } else {
      if (state.performance.cacheHit) items.push(`<span><strong>التفسير الذكي</strong>مستعاد فورًا من الذاكرة المؤقتة</span>`);
      else if (gemini) items.push(`<span><strong>Gemini</strong>${formatDuration(gemini.durationMs)}</span>`);
      if (server.compactRetryUsed) items.push(`<span><strong>المصالحة</strong>نجحت بعد محاولة مختصرة آمنة</span>`);
      if (server.acceptedDeepAnalysisUnits !== undefined) items.push(`<span><strong>العمق المطبق</strong>${server.acceptedDeepAnalysisUnits} قراءات · ${server.acceptedPatches || 0} تحسينات</span>`);
    }
    if (state.performance.payloadChars) items.push(`<span><strong>حمولة الذكاء</strong>${Math.max(1, Math.round(state.performance.payloadChars / 1024))} كيلوبايت موزعة</span>`);
    if (total) items.push(`<span><strong>الإجمالي</strong>${formatDuration(total.durationMs)}</span>`);
    panel.innerHTML = items.join("");
    panel.classList.toggle("hidden", !items.length);
  }

  function bindRetryAiButton() {
    const button = $("retryAiOnlyBtn");
    if (button) button.onclick = retryAiOnly;
  }

  function renderResults() {
    const a = state.reconciledAnalysis || state.analysis;
    const delta = state.aiResult;
    const aiApplied = Boolean(a?._reconciliation?.aiApplied);
    const metrics = (a.metrics || []).slice(0, 8);
    $("metrics").innerHTML = metrics.map(item => `<div class="metric"><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(formatMetricValue(item))}</strong><span>${escapeHtml(item.note || "")}</span></div>`).join("");

    const charts = a.charts || [];
    const primary = charts[0];
    $("chartTitle").textContent = primary?.title || "التحليل البصري";
    $("chartMeta").textContent = primary?.description || "";
    $("chartArea").innerHTML = primary ? renderChartContent(primary, true) : `<div class="soft-note">لا يوجد رسم مناسب لهذا النوع من البيانات.</div>`;

    const extraCharts = charts.slice(1);
    $("deepChartsSection").classList.toggle("hidden", !extraCharts.length);
    $("deepChartsGrid").innerHTML = extraCharts.map(chart=>`<article class="deep-chart-card ${chart.type==='heatmap'||chart.type==='table'?'wide':''}"><h5>${escapeHtml(chart.title)}</h5><p>${escapeHtml(chart.description||"")}</p>${renderChartContent(chart)}</article>`).join("");

    const profile = a.analysisProfile || {};
    const profileDimensions = profile.dimensions || [];
    const decisionUses = profile.decisionUse || profile.decisionUses || [];
    const profileCards = [
      { title:"عائلة التحليل", value:profile.method || profile.purpose || a.kind, items:profileDimensions },
      { title:"كفاية البيانات", value:profile.dataAdequacy || profile.dataSufficiency || "غير محددة", items:profile.assumptions || [] },
      { title:"القرارات التي يدعمها", value:`${decisionUses.length} استخدامات`, items:decisionUses },
      { title:"نطاق التحليل", value:state.type.name, items:[`المصدر: ${state.sourceName}`,`الثقة في النوع: ${state.confidence}%`,`طريقة التصنيف: ${state.recognitionStatus}`] }
    ];
    $("diagnosticProfileSection").classList.toggle("hidden", !profileCards.length);
    $("diagnosticProfileGrid").innerHTML = profileCards.map(card=>`<article class="diagnostic-card"><h5>${escapeHtml(card.title)}</h5><strong>${escapeHtml(card.value)}</strong><ul>${card.items.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`).join("");

    const diagnosticSections = (a.diagnosticSections || []).slice(0, 10);
    $("diagnosticSectionsSection").classList.toggle("hidden", !diagnosticSections.length);
    $("diagnosticSectionsGrid").innerHTML = diagnosticSections.map(section => {
      const evidence = humanizeEvidenceRefs(section.evidenceRefs || []);
      const implications = Array.isArray(section.implications) ? section.implications : [];
      const source = String(section.source || "deterministic").includes("gemini") ? "محرك متخصص + Gemini" : "محرك متخصص";
      const alternatives = Array.isArray(section.alternativeExplanations) ? section.alternativeExplanations : [];
      const requests = Array.isArray(section.dataRequests) ? section.dataRequests : [];
      return `<article class="diagnostic-section-card"><div class="diagnostic-section-meta"><span>${source}</span><span>ثقة ${escapeHtml(section.confidence || "متوسطة")}</span></div><h5>${escapeHtml(section.title || "قراءة تفسيرية")}</h5><p>${escapeHtml(section.analysis || "")}</p>${evidence && evidence !== "لم يحدد مرجع دليل واضح." ? `<div class="soft-note">الدليل: ${escapeHtml(evidence)}</div>` : ""}${implications.length ? `<h6>الآثار العملية</h6><ul>${implications.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}${alternatives.length ? `<h6>تفسيرات بديلة محتملة</h6><ul>${alternatives.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}${requests.length ? `<h6>بيانات مطلوبة للتحقق</h6><ul>${requests.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}</article>`;
    }).join("");

    const segmentStatus = state.aiSegments?.statuses || {};
    $("analysisModeChip").textContent = state.aiPending
      ? `ظهرت النتائج المحلية · ${segmentProgressText(segmentStatus, state.aiSegments?.taskStatuses || {})}`
      : (aiApplied ? "تحليل حتمي متخصص مصالَح مع Gemini" : "تحليل متخصص حتمي عميق");
    $("analysisModeChip").className = aiApplied ? "success-chip ai-result-chip" : "success-chip";
    const notice = $("aiResultNotice");
    if (state.aiPending) {
      notice.classList.remove("hidden", "error", "warning");
      notice.innerHTML = `<strong>ظهرت الحسابات والرسوم فورًا</strong><span>${escapeHtml(segmentProgressText(segmentStatus, state.aiSegments?.taskStatuses || {}))}. تُنفذ الأجزاء الصغيرة بالتوازي، ويُدمج كل جزء ناجح فور وصوله دون انتظار بقية الأجزاء.</span>`;
    } else if (state.aiWarning) {
      const meta = a._reconciliation || {};
      notice.classList.remove("hidden", "error"); notice.classList.add("warning");
      notice.innerHTML = `<strong>اكتملت مصالحة جزئية آمنة</strong><span>${escapeHtml(state.aiWarning)} طُبقت ${meta.appliedDeepAnalyses || 0} قراءات و${meta.appliedPatches || 0} تحسينات دون تغيير الحسابات.</span><button id="retryAiOnlyBtn" class="secondary compact" type="button">إعادة المهام المتعثرة فقط</button>`;
    } else if (aiApplied) {
      const meta = a._reconciliation || {};
      notice.classList.remove("hidden", "error", "warning");
      const recovery = state.performance.aiServerTiming?.automaticRecovery || {};
      const isolatedCount = Array.isArray(recovery.isolatedSegments) ? recovery.isolatedSegments.length : 0;
      notice.innerHTML = `<strong>اكتملت المصالحة التحليلية المعزولة${state.performance.cacheHit ? " من الذاكرة المؤقتة" : ""}</strong><span>أضيفت ${meta.appliedDeepAnalyses || 0} قراءات تربوية عميقة وطُبقت ${meta.appliedPatches || 0} تحسينات حقلية، مع بقاء ${a.improvementPlan?.length || 0} تدخلات و${a.monitoringPlan?.length || 0} مراحل متابعة فقط.${isolatedCount ? ` عُزل ${isolatedCount} محور متعثر إلى مهام أصغر بدل تكرار الطلب نفسه.` : ""}</span>`;
    } else if (state.aiError) {
      notice.classList.remove("hidden", "warning"); notice.classList.add("error");
      notice.innerHTML = `<strong>اكتمل المحرك المتخصص المحلي</strong><span>تعذر تحسين Gemini: ${escapeHtml(state.aiError)}. لم تُفقد النتائج أو أدوات الجودة.</span><button id="retryAiOnlyBtn" class="secondary compact" type="button">إعادة تحسين Gemini فقط</button>`;
    } else { notice.classList.add("hidden"); notice.classList.remove("error", "warning"); }
    bindRetryAiButton();
    renderPerformanceSummary();

    $("executiveTitle").textContent = a.executiveTitle;
    $("executiveSummary").textContent = a.executiveSummary;

    const findings = (a.findings || []).slice(0, 18);
    $("findings").innerHTML = findings.map((f,i)=>{
      const sourceLabel=String(f.source||"").includes("gemini")?"محرك متخصص + Gemini":"محرك متخصص";
      const severity=f.severity||"medium";
      const limitations=f.limitations||[];
      const limitationHtml=limitations.length?`<h5>الحدود</h5><p>${limitations.map(escapeHtml).join("، ")}</p>`:"";
      const statement=f.statement||f.title||"";
      const statementHtml=statement&&statement!==f.title?`<p class="finding-statement">${escapeHtml(statement)}</p>`:"";
      const evidence=f.evidence||humanizeEvidenceRefs(f.evidenceRefs||[]);
      const impact=f.educationalImpact||f.impact||"";
      const action=f.recommendedAction||f.action||"";
      return `<details class="finding" ${i<2?'open':''}><summary><div class="finding-title"><strong>${escapeHtml(f.title)}</strong><small>${escapeHtml(impact)}</small></div><div class="finding-badges"><span class="source-pill ${String(f.source||"").includes("gemini")?'ai':'deterministic'}">${sourceLabel}</span><span class="confidence-pill severity-${severity}">ثقة ${escapeHtml(f.confidence)}</span></div></summary><div class="finding-body">${statementHtml}<h5>الدليل</h5><p>${escapeHtml(evidence)}</p><h5>الإجراء المرتبط</h5><p>${escapeHtml(action)}</p>${limitationHtml}</div></details>`;
    }).join("");

    const tools=(a.qualityTools||[]).filter(tool=>tool.conditionsMet!==false).slice(0,12);
    $("qualityToolsSection").classList.toggle("hidden",!tools.length);
    $("qualityToolsGrid").innerHTML=tools.map(tool=>`<article class="quality-tool-card"><strong>${escapeHtml(tool.name)}</strong><p>${escapeHtml(tool.reason||"")}</p><span>مطبقة فعليًا</span>${tool.interpretation?`<div class="tool-output">${escapeHtml(tool.interpretation)}</div>`:""}</article>`).join("");

    const plans=(a.improvementPlan||[]).slice(0,10);
    $("improvementPlanSection").classList.toggle("hidden",!plans.length);
    $("improvementPlanBody").innerHTML=plans.map(item=>`<tr><td>${escapeHtml(item.priority)}</td><td><strong>${escapeHtml(item.issue)}</strong><small>${escapeHtml(item.targetGroup)}</small></td><td>${escapeHtml(item.action)}<small>بديل عند عدم التحسن: ${escapeHtml(item.contingency)}</small></td><td>${escapeHtml(item.responsibleRole)}<small>${escapeHtml(item.timeframe)}</small></td><td>${escapeHtml(item.successIndicator)}<small>${escapeHtml(item.monitoringMethod)}</small></td></tr>`).join("");

    const monitoring=(a.monitoringPlan||[]).slice(0,8);
    $("monitoringPlanSection").classList.toggle("hidden",!monitoring.length);
    $("monitoringPlanGrid").innerHTML=monitoring.map(item=>`<article class="monitoring-card"><small>${escapeHtml(item.timing||"")}</small><h5>${escapeHtml(item.stage||"")}</h5><p>${escapeHtml(item.measure||"")}</p><p class="owner">${escapeHtml(item.owner||"")}</p></article>`).join("");

    const limitations=a.limitations||[];
    $("analysisLimitations").classList.toggle("hidden",!limitations.length);
    $("analysisLimitationsList").innerHTML=limitations.map(item=>`<li>${escapeHtml(item)}</li>`).join("");

    const firstPlan=plans[0];
    const action=firstPlan?{title:firstPlan.action,text:`${firstPlan.responsibleRole} · ${firstPlan.timeframe}`,priority:firstPlan.priority,indicator:firstPlan.successIndicator}:a.action;
    $("actionTitle").textContent=action?.title||"مراجعة النتائج";
    $("actionText").textContent=action?.text||"";
    $("actionPriority").textContent=action?.priority||"متوسطة";
    $("actionIndicator").textContent=action?.indicator||"مؤشر متابعة";

    const cautions=a.cautions||[];
    $("aiCautions").classList.toggle("hidden",!cautions.length);
    $("aiCautionsList").innerHTML=cautions.map(item=>`<li>${escapeHtml(item)}</li>`).join("");

    const suggested=delta?.suggestedNewType || a.suggestedNewType; const showSuggested=Boolean(suggested?.needed);
    $("aiSuggestedType").classList.toggle("hidden",!showSuggested);
    if(showSuggested){$("aiSuggestedTypeName").textContent=suggested.nameAr||"نوع تحليلي جديد";$("aiSuggestedTypePurpose").textContent=suggested.purpose||"يحتاج الغرض التربوي إلى مراجعة المستخدم.";const tags=[...(suggested.requiredFields||[]).map(item=>`حقل: ${item}`),...(suggested.analysisFamily||[]).map(item=>`تحليل: ${item}`)];$("aiSuggestedTypeMeta").innerHTML=tags.map(item=>`<span>${escapeHtml(item)}</span>`).join("");}
  }

  function openOfficialReport() {
    if (!state.analysis) {
      alert("نفّذ التحليل أولًا قبل إنشاء التقرير الرسمي.");
      return;
    }
    try {
      window.TaqareerReports.openReport({
        analysis: state.reconciledAnalysis || state.analysis,
        aiResult: null,
        aiDelta: state.aiResult,
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
      version: "0.9.4",
      generatedAt: new Date().toISOString(),
      source: state.sourceName,
      sourceMeta: state.sourceMeta,
      recognizedType: { id: state.type.id, name: state.type.name, confidence: state.confidence },
      quality: state.quality,
      localAnalysis: state.analysis,
      aiDelta: state.aiResult,
      analysis: state.reconciledAnalysis || state.analysis,
      aiError: state.aiError || null
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="taqareer-analysis-v0.9.4.json"; a.click(); URL.revokeObjectURL(url);
  }

  function escapeHtml(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(v) { return escapeHtml(v); }

  function reset() {
    Object.assign(state, {
      headers: [], rows: [], sourceName: "", rawText: "", narrativeText: "", delimiter: ",",
      type: formTypes.at(-1), confidence: 0,
      quality: { blockers: [], warnings: [], info: [], completeness: 0 },
      analysis: null, reconciledAnalysis: null, aiResult: null, aiError: "", aiWarning: "", aiUsed: false, aiPending: false,
      aiSegments: { results: {}, failures: {}, statuses: {}, taskResults: {}, taskFailures: {}, taskStatuses: {}, taskPlan: [], failedTaskIds: [], recovery: null },
      performance: { spans: [], cacheHit: false, payloadChars: 0, aiUsage: null, aiModel: "", aiServerTiming: null, segmentTimings: {} },
      localRecognition: null, aiRecognition: null, recognitionStatus: "محلي", recognitionRequestId: state.recognitionRequestId + 1,
      analysisRequestId: state.analysisRequestId + 1,
      sampleMaxScore: null, pendingSource: null, sourceMeta: null, pendingManualFileName: "", pendingVisualPreview: null
    });
    $("fileInput").value = ""; $("pasteInput").value = ""; $("manualTextInput").value = "";
    $("analysisTimingPanel")?.classList.add("hidden");
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
      perfApi()?.clearCache?.();
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
