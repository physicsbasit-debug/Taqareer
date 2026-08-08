(() => {
  "use strict";

  const formTypes = [
    { id: "single_subject", name: "نتائج الطلبة في مادة واحدة", purpose: "تحليل درجات الطلبة في مادة محددة وتحديد أنماط الأداء والاحتياج.", keywords: ["اسم الطالب", "الدرجة", "المستوى", "حالة القيد", "المادة"], min: 2 },
    { id: "assessment_component", name: "درجات مكوّن تقويمي", purpose: "تحليل درجات التقويم المستمر أو الاختبار أو أي عنصر تقويمي محدد.", keywords: ["عنصر المادة", "اختبار", "التقويم المستمر", "درجة عنصر"], min: 2 },
    { id: "level_distribution", name: "توزيع مستويات الأداء", purpose: "تحليل أعداد ونسب الطلبة حسب مستويات الأداء ومقارنة المجموعات.", keywords: ["أ", "ب", "ج", "د", "هـ", "المجموع", "النسبة"], min: 4 },
    { id: "multi_subject_results", name: "نتائج طلاب فردية متعددة المواد", purpose: "تحليل درجات ومستويات كل طالب عبر عدة مواد مع مقارنة المواد وفصل التعثر الشامل عن التخصصي.", keywords: ["اسم الطالب", "حالة القيد", "المستوى", "الدرجة", "اللغة العربية", "الرياضيات", "الفيزياء"], min: 4 },
    { id: "cross_subject", name: "الأداء عبر المواد", purpose: "بناء صورة شاملة لأداء الطالب أو الصف في عدة مواد.", keywords: ["اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الدراسات الاجتماعية"], min: 3 },
    { id: "supervision_indicator", name: "ملخص مؤشرات زيارة إشرافية", purpose: "تحليل مؤشرات الأداء الإشرافي ومواطن القوة وأولويات التطوير.", keywords: ["بنود التقويم", "المتوسط", "التخطيط", "إدارة الصف", "استراتيجيات التدريس"], min: 2 },
    { id: "supervision_multi_visit", name: "زيارات إشرافية متعددة", purpose: "تحليل عدة زيارات إشرافية مع فصل المعلمين والزيارات وربط التقدير الرقمي بالدليل السردي.", keywords: ["معرف الزيارة", "رقم الزيارة", "تاريخ الزيارة", "المادة", "جوانب الإجادة", "التوصيات"], min: 4 },
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
    localRecognition: null, aiRecognition: null, recognitionConflict: null, semanticProfile: null, recognitionStatus: "محلي", recognitionRequestId: 0, analysisRequestId: 0,
    sampleMaxScore: null, pendingSource: null, sourceMeta: null, pendingManualFileName: "", pendingVisualPreview: null, inputRecovery: null,
    multiSubjectOptions: { mode: "all", subject: "", includeSubjectTopTen: true, includeSchoolRanking: true },
    scaleSemantics: null,
    previewExpanded: false
  };

  const $ = (id) => document.getElementById(id);
  const panels = [1,2,3,4];

  function normalize(value) {
    return String(value ?? "").trim().replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").toLowerCase();
  }

  function displayTerms() { return window.TaqareerDisplayTerms || null; }
  function recognitionPolicy() { return window.TaqareerRecognitionPolicy || null; }
  function confirmedScaleDirectionFromMeta(sourceMeta = {}) {
    const policy = recognitionPolicy();
    if (policy?.confirmedScaleDirection) {
      return policy.confirmedScaleDirection({ sourceScaleSemantics: sourceMeta?.scaleSemantics || null });
    }
    const semantics = sourceMeta?.scaleSemantics;
    const allowed = new Set(["lower-is-better", "higher-is-better", "descriptive-only"]);
    return semantics?.confirmed === true && allowed.has(String(semantics.direction || "")) ? String(semantics.direction) : "unknown";
  }
  function publicAnalysisMethod(value, fallback = "تحليل تربوي متخصص") {
    return displayTerms()?.analysisMethod?.(value, fallback) || String(value || fallback);
  }
  function publicDisplayLabel(value, fallback = "بيان تحليلي") {
    return displayTerms()?.publicLabel?.(value, fallback) || String(value || fallback);
  }
  function publicText(value, fallback = "") {
    return displayTerms()?.publicText?.(value, fallback) || String(value ?? fallback);
  }
  function displaySourceLabel(value = state.sourceName) {
    const reportTitle = String(state.sourceMeta?.reportTitle || state.sourceMeta?.metadata?.title || "").trim();
    if (reportTitle) return reportTitle;
    let text = String(value || "").trim();
    text = text.replace(/\s*[·•]\s*(?:sheet|ورقة)\s*\d+.*$/i, "");
    text = text.replace(/\.(?:xlsx|xlsm|xls|csv|tsv|txt|docx|doc|pdf)$/i, "");
    return text || "ملف مرفوع";
  }
  function reviewHeaders() {
    if (state.previewExpanded || state.headers.length <= 7) return state.headers;
    return state.headers.slice(0, 7);
  }

  function scaleGuardApplies(typeId = state.type?.id) {
    return ["student_work", "supervision_indicator"].includes(String(typeId || ""));
  }

  function scaleMeasureHeader() {
    return state.semanticProfile?.columnRoles?.mean || findHeader(state.headers, ["المتوسط", "الدرجة", "القيمة"]);
  }

  function inferObservedScale() {
    const header = scaleMeasureHeader();
    const indexes = Array.isArray(state.semanticProfile?.rowRoles?.dataRowIndexes)
      ? state.semanticProfile.rowRoles.dataRowIndexes
      : state.rows.map((_, index) => index);
    const values = indexes.map(index => parseNumber(state.rows[index]?.[header])).filter(Number.isFinite);
    return {
      header,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      values: [...new Set(values)].sort((a, b) => a - b)
    };
  }

  function currentScaleBounds() {
    const observed = inferObservedScale();
    const semantics = state.scaleSemantics || state.sourceMeta?.scaleSemantics || state.semanticProfile?.scale || {};
    const min = Number.isFinite(Number(semantics.minObserved)) ? Number(semantics.minObserved) : observed.min;
    const max = Number.isFinite(Number(semantics.maxObserved)) ? Number(semantics.maxObserved) : observed.max;
    return { min, max };
  }

  function currentScaleDirection() {
    if (scaleGuardApplies()) {
      const policy = recognitionPolicy();
      if (policy?.confirmedScaleDirection) {
        return policy.confirmedScaleDirection({
          localScaleSemantics: state.scaleSemantics || null,
          sourceScaleSemantics: state.sourceMeta?.scaleSemantics || null
        });
      }
      const local = state.scaleSemantics;
      const source = state.sourceMeta?.scaleSemantics;
      const allowed = new Set(["lower-is-better", "higher-is-better", "descriptive-only"]);
      if (local?.confirmed === true && allowed.has(String(local.direction || ""))) return String(local.direction);
      if (source?.confirmed === true && allowed.has(String(source.direction || ""))) return String(source.direction);
      return "unknown";
    }
    return String(state.semanticProfile?.scaleDirection || "unknown");
  }

  function applyScaleSemanticsToProfile() {
    if (!state.semanticProfile || !scaleGuardApplies()) return;
    const observed = inferObservedScale();
    const bounds = currentScaleBounds();
    const direction = currentScaleDirection();
    state.semanticProfile.scaleDirection = direction;
    state.semanticProfile.requiresScaleConfirmation = direction === "unknown";
    state.semanticProfile.scale = {
      ...(state.semanticProfile.scale || {}),
      direction,
      source: state.scaleSemantics?.source || state.sourceMeta?.scaleSemantics?.source || (direction === "unknown" ? "unconfirmed" : "source"),
      minObserved: bounds.min,
      maxObserved: bounds.max,
      distinctObserved: observed.values
    };
  }

  function setScaleDirection(direction) {
    if (!scaleGuardApplies()) return;
    const allowed = new Set(["lower-is-better", "higher-is-better", "descriptive-only"]);
    if (!allowed.has(direction)) return;
    const observed = inferObservedScale();
    const inputMin = parseNumber($("scaleMinInput")?.value);
    const inputMax = parseNumber($("scaleMaxInput")?.value);
    const minObserved = Number.isFinite(inputMin) ? inputMin : observed.min;
    const maxObserved = Number.isFinite(inputMax) ? inputMax : observed.max;
    if (!Number.isFinite(minObserved) || !Number.isFinite(maxObserved) || maxObserved < minObserved || maxObserved <= 0) {
      $("scaleSemanticsNote").textContent = "راجع نطاق المقياس: يجب أن تكون القيمتان صالحتين وأن تكون القيمة العليا أكبر من أو مساوية للدنيا.";
      return;
    }
    state.scaleSemantics = {
      direction,
      source: "user",
      minObserved,
      maxObserved,
      confirmed: true
    };
    state.sourceMeta = {
      ...(state.sourceMeta || {}),
      scaleDirection: direction,
      scaleSemantics: { ...state.scaleSemantics }
    };
    applyScaleSemanticsToProfile();
    state.quality = assessQuality(state.headers, state.rows, state.type, state.sourceMeta || {}, state.semanticProfile);
    renderReview();
  }

  function renderScaleSemanticsGuard() {
    const card = $("scaleSemanticsCard");
    if (!card) return;
    const applies = scaleGuardApplies() && state.semanticProfile?.measureType?.startsWith?.("ordinal_");
    card.classList.toggle("hidden", !applies);
    if (!applies) return;
    const observed = inferObservedScale();
    const bounds = currentScaleBounds();
    const direction = currentScaleDirection();
    if ($("scaleMinInput")) $("scaleMinInput").value = Number.isFinite(bounds.min) ? String(bounds.min) : "";
    if ($("scaleMaxInput")) $("scaleMaxInput").value = Number.isFinite(bounds.max) ? String(bounds.max) : "";
    $("scaleObservedRange").textContent = Number.isFinite(observed.min) && Number.isFinite(observed.max)
      ? `القيم المرصودة: ${observed.min}–${observed.max}`
      : "القيم المرصودة غير مكتملة";
    $("scaleSemanticsSummary").textContent = direction === "unknown"
      ? "اتجاه المقياس غير موضح في المصدر، لذلك لن يصدر «تقارير» حكم قوة أو ضعف قبل تأكيده."
      : direction === "descriptive-only"
        ? "سيعرض «تقارير» المتوسطات والتوزيع واتساق المتوسط مع الأكثر تكرارًا دون تصنيف قوة أو ضعف أو بناء أولويات علاجية."
        : direction === "lower-is-better"
          ? "تم اعتماد أن القيمة الأقل تمثل أداءً أفضل لهذا الملف."
          : "تم اعتماد أن القيمة الأعلى تمثل أداءً أفضل لهذا الملف.";
    document.querySelectorAll('input[name="scaleDirection"]').forEach(input => { input.checked = input.value === direction; });
    $("scaleSemanticsNote").textContent = direction === "unknown"
      ? "اختر دلالة المقياس كما تعرفها من الأداة الأصلية، أو اختر التحليل الوصفي فقط. لن يخمّن التطبيق الاتجاه."
      : "اختيارك يخص هذا الملف فقط ويُحفظ ضمن سياق التحليل، ولا يغيّر القيم الأصلية.";
  }

  function showPanel(number) {
    document.body.dataset.activeStep = String(number);
    panels.forEach(n => $("panel-" + n).classList.toggle("active-panel", n === number));
    document.querySelectorAll(".step").forEach(btn => {
      const stepNumber = Number(btn.dataset.step);
      btn.classList.toggle("active", stepNumber === number);
      btn.classList.toggle("completed", stepNumber < number);
      if (stepNumber === number) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setMessage(id, text, error = false) {
    const el = $(id); el.textContent = text; el.classList.remove("hidden", "error"); if (error) el.classList.add("error");
  }
  function clearMessage(id) { $(id).classList.add("hidden"); }

  function friendlyAiError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    if (code === "AI_OFFLINE") return "الجهاز غير متصل بالإنترنت حاليًا. لم يُرسل التحليل إلى الخادم. تحقق من الاتصال ثم أعد المحاولة.";
    if (code === "AI_NETWORK_FETCH_FAILED" || /failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
      return "تعذر الوصول إلى وظيفة Supabase. فحص التطبيق الرابط قبل التحليل، لكن الاتصال انقطع أو حُجبت الاستجابة. افتح إعداد خدمة التحليل واضغط «حفظ واختبار»؛ لن يعتمد التطبيق نتيجة ناقصة.";
    }
    if (code === "AI_ENDPOINT_INVALID") return message || "رابط وظيفة Supabase غير صالح.";
    if (code === "GEMINI_TRANSIENT" || /high demand|spikes in demand|service unavailable|overload(?:ed)?|\b503\b/i.test(message)) {
      return "خدمة التحليل مزدحمة مؤقتًا. حاول التطبيق تلقائيًا إعادة الطلب واستخدام مسار بديل، لكن الخدمة لم تستجب الآن. أعد المحاولة بعد قليل.";
    }
    if (code === "GEMINI_RATE_LIMIT" || /RESOURCE_EXHAUSTED|rate limit|quota|\b429\b/i.test(message)) {
      return "تم بلوغ حد طلبات خدمة التحليل مؤقتًا. انتظر قليلًا ثم أعد المحاولة.";
    }
    if (code === "AI_PRIMARY_TIMEOUT") return "لم تصل استجابة تحليل صالحة ضمن المهلة السريعة المعتمدة. أوقف التطبيق الانتظار بدل إبقائك عالقًا، ولم يعتمد نتيجة ناقصة.";
    return message || "تعذر تنفيذ التحليل التربوي.";
  }

  function isRetryableAiError(error) {
    const code = String(error?.code || "");
    return Boolean(error?.retryable) || ["AI_OFFLINE", "AI_NETWORK_FETCH_FAILED", "GEMINI_TRANSIENT", "GEMINI_RATE_LIMIT", "AI_PRIMARY_TIMEOUT"].includes(code);
  }

  function clearInputRecovery() {
    state.inputRecovery = null;
    const actions = $("inputRecoveryActions");
    if (actions) actions.classList.add("hidden");
    const retry = $("retryInputBtn");
    if (retry) retry.disabled = false;
  }

  function showInputRecovery({ file, sourceType, reason, previewDataUrl = "" }) {
    state.inputRecovery = { file, sourceType, reason: String(reason || "تعذر إكمال القراءة الآلية."), previewDataUrl };
    setMessage("inputMessage", `${friendlyAiError({ message: reason })} الملف محفوظ في هذه الجلسة؛ أعد القراءة دون رفعه من جديد، أو استخدم الإدخال اليدوي فقط إذا رغبت.` , true);
    const actions = $("inputRecoveryActions");
    if (actions) actions.classList.remove("hidden");
    const retry = $("retryInputBtn");
    if (retry) retry.disabled = !aiReady();
  }

  async function retryInputRecovery() {
    const recovery = state.inputRecovery;
    if (!recovery?.file) return;
    if (!aiReady()) {
      setMessage("inputMessage", "القراءة البصرية تحتاج خدمة التحليل. فعّل الخدمة ثم أعد المحاولة؛ لن يطلب منك التطبيق إعادة رفع الملف.", true);
      return;
    }
    const button = $("retryInputBtn");
    if (button) { button.disabled = true; button.textContent = "جارٍ إعادة القراءة…"; }
    try {
      if (recovery.sourceType === "pdf") {
        const rendered = await window.TaqareerDocuments.renderPdfPages(recovery.file, 3);
        await extractVisualWithAi(recovery.file.name, rendered.images, "pdf");
      } else {
        const preview = recovery.previewDataUrl ? { dataUrl: recovery.previewDataUrl } : await window.TaqareerDocuments.imagePreview(recovery.file);
        await extractVisualWithAi(recovery.file.name, [{ label: recovery.file.name, dataUrl: preview.dataUrl }], "image");
      }
      clearInputRecovery();
      clearMessage("inputMessage");
    } catch (error) {
      const message = friendlyAiError(error);
      state.inputRecovery.reason = message;
      setMessage("inputMessage", `${message} الملف ما زال محفوظًا؛ يمكنك إعادة المحاولة لاحقًا دون رفعه من جديد.`, true);
    } finally {
      if (button) { button.disabled = !aiReady(); button.textContent = "إعادة القراءة الآلية"; }
    }
  }

  function openInputManualFallback() {
    const recovery = state.inputRecovery;
    if (!recovery?.file) return;
    openManualExtraction(
      recovery.file.name,
      `${recovery.reason || "تعذرت القراءة الآلية."} الإدخال اليدوي اختياري ولا يفتح تلقائيًا.`,
      recovery.sourceType || "manual",
      recovery.previewDataUrl || ""
    );
  }

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
    const health = window.TaqareerAI?.getHealth?.() || { status: "unknown" };
    const header = $("aiHeaderStatus");
    const card = $("aiConnectionStatus");
    const mode = $("aiModeToggle");
    if (mode) mode.checked = enabled;

    let text = "خدمة التحليل غير مربوطة";
    let cardText = "يتطلب التحليل التربوي تفعيل خدمة التحليل؛ ولن يعتمد التطبيق نتيجة ناقصة أو بديلة.";
    let liveClass = false;
    if (configured && !enabled) {
      text = "خدمة التحليل متوقفة";
      cardText = "إعداد الاتصال محفوظ، لكن خدمة التحليل متوقفة من مفتاح التشغيل.";
    } else if (configured && enabled && health.status === "checking") {
      text = "جارٍ فحص خدمة التحليل";
      cardText = "يجري التحقق من اتصال خدمة التحليل قبل إعلان الجاهزية.";
    } else if (configured && enabled && health.status === "live") {
      text = "خدمة التحليل جاهزة";
      liveClass = true;
      cardText = "الخدمة متصلة وجاهزة. تُبنى الحسابات محليًا ثم تبدأ القراءة التربوية من الأدلة.";
    } else if (configured && enabled && health.status === "failed") {
      text = "تعذر اتصال خدمة التحليل";
      cardText = "إعداد الربط محفوظ، لكن فحص الاتصال الحي فشل. افتح إعداد خدمة التحليل واضغط «حفظ واختبار» قبل إعادة التحليل.";
    } else if (configured && enabled) {
      text = "ربط خدمة التحليل محفوظ";
      cardText = "إعداد الاتصال محفوظ، وسيُفحص تلقائيًا قبل بدء التحليل.";
    }

    if (header) {
      header.textContent = text;
      header.className = liveClass ? "version-badge ai-live" : "version-badge";
    }
    if (card) card.textContent = cardText;
    const runButton = $("runAnalysisBtn");
    if (runButton) runButton.textContent = "تنفيذ التحليل التربوي";
  }

  async function verifyAiConnectionOnLoad() {
    if (!aiReady() || !window.TaqareerAI?.health) return;
    try { await window.TaqareerAI.health({ maxAgeMs: 120000 }); }
    catch { /* تعرض حالة الاتصال في الشارة دون إزعاج المستخدم عند فتح الصفحة. */ }
    finally { updateAiStatusUi(); }
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
      const result = await window.TaqareerAI.ping({ force: true });
      if (result.aiKeyConfigured === false) {
        message.textContent = "تم الوصول إلى وظيفة Supabase، لكن سر GEMINI_API_KEY غير مضبوط بعد.";
        message.classList.add("error");
        return;
      }
      message.textContent = `تم الاتصال بنجاح${result.edgeVersion ? ` · Edge ${result.edgeVersion}` : ""}${result.model ? ` · النموذج ${result.model}` : ""}.`;
      updateAiStatusUi();
      setTimeout(() => $("aiSettingsDialog").close(), 650);
    } catch (error) {
      message.textContent = friendlyAiError(error);
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
    level_distribution: [["الصف", "الشعبة", "المجموعة", "البيان", "الفئة"], ["المجموع", "الإجمالي", "جملة عامة", "العدد الكلي"]],
    multi_subject_results: [["اسم الطالب", "الطالب"], ["حالة القيد", "القيد"]],
    cross_subject: [["اسم الطالب", "الطالب"]],
    supervision_indicator: [["بنود التقويم", "البند"], ["المتوسط"]],
    supervision_multi_visit: [["معرف الزيارة"], ["تاريخ الزيارة"], ["المادة"], ["جوانب الإجادة"], ["التوصيات"]],
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

  function dynamicTypeFromRecognition(classification, semanticProfile) {
    const name = String(classification?.nameAr || semanticProfile?.typeNameAr || "نوع بيانات جديد").trim();
    const purpose = String(classification?.purpose || semanticProfile?.purpose || classification?.rationale || semanticProfile?.rationale || "تحليل تكيفي وفق البنية والأدلة الفعلية.").trim();
    const analyzerId = String(semanticProfile?.analyzerId || "adaptive_generic");
    const safeId = String(classification?.id || semanticProfile?.recommendedTypeId || "dynamic")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "dynamic";
    return { id: safeId.startsWith("dynamic_") ? safeId : `dynamic_${safeId}`, name, purpose, keywords: [], min: 0, dynamic: true, analyzerId };
  }

  function classify(headers, rows, sourceMeta = {}, rawText = "", semanticProfile = null) {
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
    const explicitLock = recognitionPolicy()?.explicitTypeLock?.({ headers, rows, sourceMeta, rawText }) || null;
    if (explicitLock?.typeId) {
      const lockedType = typeById(explicitLock.typeId);
      if (lockedType) {
        return {
          type: lockedType,
          confidence: Math.max(98, Number(explicitLock.confidence || 0)),
          rationale: explicitLock.reason || "عنوان المصدر يحدد نوع الوثيقة صراحةً.",
          source: "local",
          lockedTypeId: lockedType.id,
          lockAuthority: explicitLock.authority || "explicit-source-title"
        };
      }
    }

    if (semanticProfile?.recommendedTypeId && semanticProfile.recommendedTypeId !== "unknown") {
      add(semanticProfile.recommendedTypeId, Math.max(36, Math.round(Number(semanticProfile.confidence || 0) * 0.72)), `ملف دلالي: ${semanticProfile.rationale || semanticProfile.shape || "بنية مكتشفة"}`);
    }

    if (sourceMeta?.specializedType === "supervision_multi_visit") {
      add("supervision_multi_visit", 140, "اكتشاف بنية PDF متعددة الزيارات والجداول");
    }
    if (sourceMeta?.specializedType === "multi_subject_results") {
      add("multi_subject_results", 160, "اكتشاف سجل نتائج فردي متعدد المواد بدرجات صريحة ومستويات أصلية أو مشتقة محليًا");
    }
    const subjectScoreHeaders = headers.filter(header => /-\s*الدرجه$/i.test(normalize(header)));
    const subjectLevelHeaders = headers.filter(header => /-\s*المستوي$/i.test(normalize(header)));
    if (subjectScoreHeaders.length >= 3 && subjectLevelHeaders.length >= 3 && exactHeader(headers, ["اسم الطالب"])) {
      add("multi_subject_results", 96, `وجود ${Math.min(subjectScoreHeaders.length, subjectLevelHeaders.length)} مواد قابلة للتحليل بدرجات ومستويات`);
    }
    if (exactHeader(headers, ["معرف الزيارة"]) && exactHeader(headers, ["تاريخ الزيارة"]) && exactHeader(headers, ["المادة"])) {
      add("supervision_multi_visit", 76, "وجود سجلات زيارات منفصلة ببيانات المعلم والمادة والتاريخ");
    }
    if (exactHeader(headers, ["جوانب الإجادة"]) && exactHeader(headers, ["جوانب التطوير"]) && exactHeader(headers, ["التوصيات"])) {
      add("supervision_multi_visit", 42, "ربط التقديرات الرقمية بأقسام سردية لكل زيارة");
    }

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
    if (headerHas("بنود التقويم") && headerHas("المتوسط") && (headerHas("الاكثر تكرارا") || headerHas("الأكثر تكرارا"))) {
      add("student_work", 46, "بنية فحص أعمال الطلبة: بند + متوسط + الأكثر تكرارًا");
    }
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

  function assessQuality(headers, rows, type, sourceMeta = {}, semanticProfile = null) {
    const blockers = [], warnings = [], info = [];
    if (!headers.length) blockers.push({ title: "لا توجد عناوين أعمدة", detail: "لا يمكن فهم بنية البيانات دون عناوين." });
    if (!rows.length) blockers.push({ title: "لا توجد سجلات", detail: "الملف لا يحتوي بيانات بعد صف العناوين." });

    const narrativeQuality = sourceMeta?.mode === "narrative" || type?.id === "supervision_narrative" || semanticProfile?.dataNature === "narrative";
    if (narrativeQuality) {
      const textHeader = findHeader(headers, ["النص", "المحتوى", "العبارة"]);
      const sectionHeader = findHeader(headers, ["القسم", "المحور", "النوع"]);
      const narrativeRows = textHeader ? rows.filter(row => String(row[textHeader] ?? "").trim()) : [];
      if (!textHeader) blockers.push({ title: "لم يُحدد حقل النص السردي", detail: "يحتاج التقرير السردي إلى حقل نص واضح قبل التحليل." });
      if (textHeader && !narrativeRows.length) blockers.push({ title: "لا توجد عبارات سردية قابلة للتحليل", detail: "لم يعثر التطبيق على نصوص فعلية داخل التقرير." });

      const sections = new Set(sectionHeader ? narrativeRows.map(row => String(row[sectionHeader] ?? "").trim()).filter(Boolean) : []);
      const expectedSections = type?.id === "supervision_narrative"
        ? ["جوانب الإجادة", "جوانب التطوير", "الدعم المقدم", "المداولة الإشرافية", "التوصيات"]
        : [];
      const foundExpected = expectedSections.filter(label => [...sections].some(value => normalize(value) === normalize(label)));
      const completeness = expectedSections.length ? Math.round((foundExpected.length / expectedSections.length) * 1000) / 10 : (narrativeRows.length ? 100 : 0);

      if (expectedSections.length) {
        if (foundExpected.length >= 3) info.push({ title: "اكتملت بنية التقرير السردي", detail: `تم فصل ${foundExpected.length} من ${expectedSections.length} أقسام إشرافية رئيسية وربط كل عبارة بقسمها.` });
        else warnings.push({ title: "بنية سردية جزئية", detail: `تم التعرف على ${foundExpected.length} من ${expectedSections.length} أقسام إشرافية متوقعة. سيقتصر التحليل على الأقسام الموجودة.` });
      }
      const metadata = sourceMeta?.metadata || {};
      const metadataItems = [metadata.school, metadata.subject, metadata.grade, metadata.academicYear].filter(Boolean);
      if (metadataItems.length) info.unshift({ title: "تم فصل بيانات الترويسة عن النص", detail: metadataItems.join(" · ") });
      if (sourceMeta?.documentContext?.aggregatedReport || metadata.aggregatedReport) {
        info.push({ title: "تقرير تجميعي متعدد السياقات", detail: "يعامل اختلاف العبارات كتباين سياقي حتى يثبت أنها تخص المعلم والزيارة والزمن نفسها." });
      }
      for (const warning of sourceMeta?.sourceWarnings || []) warnings.push({ title: "تنبيه استخراج PDF", detail: String(warning) });
      return { blockers, warnings, info, completeness, basisHeaders: textHeader ? [textHeader] : [], missingRequirements: [] };
    }

    const requirements = REQUIRED_FIELDS[type?.id] || [];
    const requiredHeaders = requirements.map(aliases => findHeader(headers, aliases)).filter(Boolean);
    const activeHeaders = headers.filter(header => rows.some(row => String(row[header] ?? "").trim() !== ""));
    const basisHeaders = requiredHeaders.length ? [...new Set(requiredHeaders)] : activeHeaders;
    const denominator = Math.max(1, basisHeaders.length * rows.length);
    let missing = 0;
    rows.forEach(row => basisHeaders.forEach(header => { if (String(row[header] ?? "").trim() === "") missing++; }));
    const completeness = Math.round((1 - missing / denominator) * 1000) / 10;

    let missingRequirements = requirements.filter(aliases => !findHeader(headers, aliases));
    if (type?.id === "level_distribution" && semanticProfile?.shape === "categorical_distribution" && (semanticProfile?.columnRoles?.levels || []).length >= 2) {
      missingRequirements = [];
      info.push({
        title: "اكتملت بنية توزيع المستويات دلاليًا",
        detail: `حدد التطبيق ${semanticProfile.columnRoles.levels.length} أعمدة مستويات، ووحدة المقارنة «${semanticProfile.columnRoles.group || "المجموعة"}»، دون الحاجة إلى عمود درجات فردية.`
      });
    }
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

    if (["student_work", "supervision_indicator"].includes(type?.id) && semanticProfile?.measureType?.startsWith?.("ordinal_")) {
      const direction = confirmedScaleDirectionFromMeta(sourceMeta);
      if (direction === "unknown") {
        blockers.push({
          title: "اتجاه مقياس التقويم غير محدد",
          detail: "يعرض المصدر القيم الرقمية دون توضيح هل القيمة الأقل أم الأعلى تمثل أداءً أفضل. أكّد دلالة المقياس أو اختر التحليل الوصفي فقط قبل المتابعة."
        });
      } else if (direction === "descriptive-only") {
        warnings.push({
          title: "سيُنفذ تحليل وصفي فقط",
          detail: "لن تُصنَّف البنود إلى قوة أو ضعف، ولن تُبنى فجوات أو أولويات علاجية لأن اتجاه المقياس غير معتمد."
        });
      } else {
        const minScale = Number(sourceMeta?.scaleSemantics?.minObserved);
        const maxScale = Number(sourceMeta?.scaleSemantics?.maxObserved);
        if (!Number.isFinite(minScale) || !Number.isFinite(maxScale) || maxScale < minScale || maxScale <= 0) {
          blockers.push({ title: "نطاق المقياس غير صالح", detail: "أكّد أدنى وأعلى قيمة في المقياس قبل التحليل التفسيري." });
        } else {
          info.push({
            title: "تم تأكيد اتجاه ونطاق مقياس التقويم",
            detail: `${direction === "lower-is-better" ? "القيمة الأقل تمثل أداءً أفضل" : "القيمة الأعلى تمثل أداءً أفضل"}، والنطاق المعتمد ${minScale}–${maxScale}.`
          });
        }
      }
    }

    const normalization = sourceMeta?.normalization;
    if (normalization?.applied) {
      info.unshift({
        title: "تم تطبيع ملف Excel الطباعي تلقائيًا",
        detail: `حوّل محرك ملفات الوزارة ${normalization.originalColumns} عمودًا ماديًا إلى ${normalization.logicalColumns} حقول منطقية، واحتفظ بـ${normalization.retainedRows} سجلًا${Number.isFinite(Number(normalization.mergeCount)) ? `، مع معالجة ${normalization.mergeCount} خلية مدمجة` : ""}.`
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
      appVersion: "1.2.25",
      source: { name: state.sourceName, meta: state.sourceMeta || {}, mode: state.sourceMeta?.mode || "table" },
      localClassification: state.localRecognition ? {
        id: state.localRecognition.type.id,
        nameAr: state.localRecognition.type.name,
        confidence: state.localRecognition.confidence,
        rationale: state.localRecognition.rationale
      } : null,
      semanticProfile: state.semanticProfile || null,
      headers: state.headers.slice(0, 40),
      sampleRows: maskedRows,
      narrativeExcerpt: redactRecognitionText(state.narrativeText || state.rawText),
      knownFormTypes: formTypes.filter(type => type.id !== "unknown").map(type => ({ id: type.id, nameAr: type.name, purpose: type.purpose }))
    };
  }

  async function maybeVerifyRecognition(requestId) {
    // كل ملف يمر بتحقق دلالي من Gemini عند توفر الاتصال؛ الملف المحلي البنيوي يبقى حارسًا للأعمدة والحسابات.
    const shouldVerify = aiReady();
    if (!shouldVerify || !window.TaqareerAI?.classify) return;
    state.recognitionStatus = "جارٍ التحقق الدلالي من بنية الملف…";
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
      const aiProfile = result?.analysisProfile || classification?.analysisProfile || null;
      const routedId = String(aiProfile?.recommendedTypeId || aiProfile?.analyzerId || classification?.id || "");
      const known = typeById(String(classification?.id || routedId));
      const localTypeBeforeVerify = String(state.type?.id || "unknown");
      const localProfileBeforeVerify = state.semanticProfile;
      const localTitleLock = String(state.localRecognition?.lockedTypeId || "") === localTypeBeforeVerify;
      const localStructuralAuthority = localTitleLock || (
        state.confidence >= 90
        && Number(localProfileBeforeVerify?.confidence || 0) >= 90
        && String(localProfileBeforeVerify?.recommendedTypeId || "") === localTypeBeforeVerify
        && !["", "unknown", "unknown_table"].includes(String(localProfileBeforeVerify?.shape || ""))
      );
      const conflictsLocalAuthority = Boolean(known && known.id !== "unknown" && known.id !== localTypeBeforeVerify && localStructuralAuthority);
      state.aiRecognition = classification || null;
      state.recognitionConflict = conflictsLocalAuthority ? {
        proposedTypeId: known.id,
        proposedName: classification?.nameAr || known.name,
        retainedTypeId: localTypeBeforeVerify
      } : null;
      if (window.TaqareerAnalysisProfiler?.mergeProfiles) {
        state.semanticProfile = window.TaqareerAnalysisProfiler.mergeProfiles(state.semanticProfile, aiProfile, state.headers);
      }
      if (conflictsLocalAuthority && state.semanticProfile) {
        state.semanticProfile.recommendedTypeId = localTypeBeforeVerify;
        state.semanticProfile.analyzerId = localProfileBeforeVerify?.analyzerId || localTypeBeforeVerify;
        state.semanticProfile.scaleDirection = currentScaleDirection();
      }
      const aiConfidence = Math.max(0, Math.min(100, Math.round(Number(classification?.confidence ?? aiProfile?.confidence) || 0)));
      const structurallyAllowed = known?.id !== "multi_subject_results" || hasUsableMultiSubjectStructure();
      const adoptKnown = !conflictsLocalAuthority && structurallyAllowed && known && known.id !== "unknown" && (
        state.type.id === "unknown" || state.confidence < 85 || aiConfidence >= state.confidence + 5 ||
        state.semanticProfile?.recommendedTypeId === known.id ||
        (state.sourceMeta?.mode === "narrative" && known.id === "supervision_narrative")
      );
      let adoptedDynamic = false;
      if (adoptKnown) {
        state.type = known;
        state.confidence = Math.max(state.confidence, aiConfidence);
      } else if ((!known || known.id === "unknown") && (classification?.nameAr || aiProfile?.typeNameAr || classification?.suggestedNewType?.nameAr)) {
        const dynamicClassification = classification?.suggestedNewType?.nameAr
          ? { ...classification, nameAr: classification.suggestedNewType.nameAr, purpose: classification.suggestedNewType.purpose || classification.purpose }
          : classification;
        state.type = dynamicTypeFromRecognition(dynamicClassification, state.semanticProfile);
        state.confidence = Math.max(state.confidence, aiConfidence || Number(state.semanticProfile?.confidence || 0));
        adoptedDynamic = true;
      }
      applyScaleSemanticsToProfile();
      state.quality = assessQuality(state.headers, state.rows, state.type, state.sourceMeta, state.semanticProfile);
      state.recognitionStatus = conflictsLocalAuthority
        ? `تحقق دلالي هجين: احتُفظ بنوع الملف الذي تثبته بنية المصدر ولم يُعتمد اقتراح خارجي متعارض${cached ? " · من الذاكرة المؤقتة" : ""}`
        : adoptedDynamic
          ? `تحقق دلالي تكيفي: بُني نوع ومسار تحليل خاصان بالملف${cached ? " · من الذاكرة المؤقتة" : ""}`
          : known
            ? `تحقق دلالي هجين: ملف البنية + التحقق الخارجي${adoptKnown ? " · تم اعتماد نوع الملف" : " · المسار المحلي متسق"}${cached ? " · من الذاكرة المؤقتة" : ""}`
            : "التحقق الدلالي بنى ملفًا لنوع جديد بدل إجباره على قالب معروف";
      if (scaleGuardApplies() && currentScaleDirection() === "unknown") {
        state.recognitionStatus += " · ينتظر تأكيد دلالة المقياس";
      }
      state.quality.info = state.quality.info.filter(item => item.title !== "تحقق دلالي من النوع");
      state.quality.info.unshift({
        title: "تحقق دلالي من النوع",
        detail: conflictsLocalAuthority
          ? `اقترحت الخدمة «${classification?.nameAr || known?.name || "نوعًا آخر"}»، لكن احتُفظ بـ«${state.type.name}» لأن عنوان/بنية المصدر أكثر حسمًا.`
          : `${classification?.nameAr || "نوع غير محدد"} (${aiConfidence}%). ${classification?.rationale || ""}`.trim()
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
    state.sourceMeta = sourceMeta ? { ...sourceMeta } : {};
    state.scaleSemantics = recognitionPolicy()?.isConfirmedScaleSemantics?.(state.sourceMeta?.scaleSemantics)
      ? { ...state.sourceMeta.scaleSemantics }
      : null;
    if (!state.scaleSemantics && state.sourceMeta?.scaleSemantics && state.sourceMeta.scaleSemantics.confirmed !== true) {
      delete state.sourceMeta.scaleSemantics;
      delete state.sourceMeta.scaleDirection;
    }
    state.rawText = rawText || "";
    state.narrativeText = sourceMeta?.mode === "narrative"
      ? (rawText || rows.map(row => row["النص"] ?? Object.values(row).join(" ")).join("\n"))
      : "";
    const initialProfile = window.TaqareerAnalysisProfiler?.profileTable?.({
      headers: state.headers,
      rows: state.rows,
      sourceMeta: state.sourceMeta || {},
      typeId: "unknown"
    }) || null;
    const recognized = classify(state.headers, state.rows, state.sourceMeta || {}, state.rawText, initialProfile);
    state.localRecognition = recognized;
    state.aiRecognition = null;
    state.recognitionConflict = null;
    state.recognitionStatus = `تصنيف محلي: ${recognized.rationale}`;
    state.type = recognized.type;
    state.confidence = recognized.confidence;
    state.semanticProfile = window.TaqareerAnalysisProfiler?.profileTable?.({
      headers: state.headers,
      rows: state.rows,
      sourceMeta: state.sourceMeta || {},
      typeId: state.type.id
    }) || initialProfile;
    if (state.semanticProfile && (!state.semanticProfile.recommendedTypeId || state.semanticProfile.recommendedTypeId === "unknown")) {
      state.semanticProfile.recommendedTypeId = recognized.type.id;
      state.semanticProfile.analyzerId = state.semanticProfile.analyzerId || recognized.type.id;
    }
    applyScaleSemanticsToProfile();
    state.quality = assessQuality(state.headers, state.rows, state.type, state.sourceMeta || {}, state.semanticProfile);
    const recognitionRequestId = ++state.recognitionRequestId;
    if (state.semanticProfile) {
      state.quality.info.unshift({
        title: "ملف دلالي لبنية البيانات",
        detail: `${state.semanticProfile.rationale || "تم تحديد وحدة التحليل والمقاييس."} مسار الحساب: ${publicAnalysisMethod(state.semanticProfile.analyzerId || state.type.id)}.`
      });
    }
    if (sourceMeta?.headerRow) {
      state.quality.info.unshift({
        title: `تم اكتشاف صف العناوين في الصف ${sourceMeta.headerRow}`,
        detail: sourceMeta.sheetName ? `الورقة: ${sourceMeta.sheetName}. يمكنك مراجعة الأعمدة قبل التحليل.` : "راجع الأعمدة قبل التحليل."
      });
    }
    if (sourceMeta?.sourceType === "pdf") {
      state.quality.info.unshift({
        title: sourceMeta.specializedType === "supervision_multi_visit"
          ? "تم فصل الزيارات والجداول داخل PDF"
          : sourceMeta.mode === "table" ? "استخراج جدولي من PDF" : "استخراج نصي من PDF",
        detail: sourceMeta.specializedType === "supervision_multi_visit"
          ? `استُخرجت ${sourceMeta.visitCount || state.rows.length} زيارات و${sourceMeta.ratingCount || 0} تقديرًا مع مقياس 1 متميز إلى 5 يحتاج إلى تدخل.`
          : "راجع المعاينة لأن ترتيب النص في بعض ملفات PDF يعتمد على طريقة إنشاء التقرير."
      });
      const metadata = sourceMeta.metadata || {};
      const extracted = [metadata.school, metadata.grade, metadata.academicYear].filter(Boolean);
      if (extracted.length) state.quality.info.unshift({ title: "تم استخراج بيانات PDF المنظمة", detail: extracted.join(" · ") });
      for (const warning of sourceMeta.sourceWarnings || []) state.quality.warnings.unshift({ title: "تنبيه استخراج PDF", detail: String(warning) });
    }
    if (sourceMeta?.sourceType === "docx") {
      state.quality.info.unshift({
        title: sourceMeta.mode === "table" ? "تمت قراءة جدول Word" : "تمت قراءة النص السردي من Word",
        detail: "تم الاستخراج محليًا داخل المتصفح دون رفع المستند إلى خادم."
      });
      const metadata = sourceMeta.metadata || {};
      const extracted = [metadata.school, metadata.subject, metadata.grade, metadata.academicYear].filter(Boolean);
      if (extracted.length) {
        state.quality.info.unshift({
          title: "تم استخراج بيانات ترويسة Word",
          detail: [metadata.school, metadata.subject, metadata.grade ? `الصفوف ${metadata.grade}` : "", metadata.academicYear].filter(Boolean).join(" · ")
        });
      }
      for (const warning of sourceMeta.sourceWarnings || []) {
        state.quality.warnings.unshift({ title: "تنبيه تطبيع بيانات الترويسة", detail: String(warning) });
      }
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
    const preferredIndex = source?.preferredDatasetId ? datasets.findIndex(dataset => dataset.id === source.preferredDatasetId) : -1;
    if (preferredIndex >= 0) {
      applyPendingDataset(preferredIndex);
      return;
    }
    if (datasets.length === 1) {
      applyPendingDataset(0);
      return;
    }
    $("sheetDialogTitle").textContent = source.kind === "excel" ? "اختر ورقة Excel" : "اختر المحتوى المطلوب تحليله";
    $("sheetSelectLabel").textContent = source.kind === "excel" ? "ورقة العمل" : "المحتوى المستخرج";
    $("sheetSelect").innerHTML = datasets.map((dataset, index) => {
      const subjectCount = Number(dataset.meta?.normalization?.subjectCount || dataset.meta?.metadata?.subjects?.length || 0);
      const kind = dataset.meta?.specializedType === "multi_subject_results" && subjectCount
        ? ` · نتائج متعددة المواد (${subjectCount} مادة)`
        : "";
      return `<option value="${index}">${escapeHtml(dataset.name)} · ${dataset.rows.length} سجل · ${dataset.headers.length} أعمدة${escapeHtml(kind)}</option>`;
    }).join("");
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
      { ...(dataset.meta || {}), fileName: source.name, datasetName: dataset.name, datasetCount: source.datasets.length, sourceWarnings: source.warnings || [] },
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
      const datasets = workbook.sheets.map((sheet, index) => ({
        id: `excel-sheet-${index}`,
        name: sheet.name,
        headers: sheet.headers,
        rows: sheet.rows,
        meta: {
          sourceType: "xlsx", mode: "table", sheetName: sheet.name, headerRow: sheet.headerRow,
          headerEndRow: sheet.headerEndRow, sheetCount: workbook.sheets.length,
          reportTitle: sheet.metadata?.title || "", preamble: sheet.metadata?.preamble || [],
          specializedType: sheet.specializedType || "",
          metadata: sheet.metadata || {},
          normalization: sheet.normalization || null
        }
      }));
      const multiSubject = datasets.filter(dataset => dataset.meta.specializedType === "multi_subject_results");
      const dominant = multiSubject[0];
      const runnerUp = multiSubject[1];
      const preferredDatasetId = multiSubject.length === 1 || (dominant && dominant.rows.length >= Math.max(12, (runnerUp?.rows.length || 0) * 2))
        ? dominant?.id || ""
        : "";
      queueDatasets({ name: workbook.name, kind: "excel", datasets, preferredDatasetId });
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
        name: "النص السردي المستخرج تلقائيًا",
        headers: ["م", "القسم", "النص"],
        rows: lines.map((line, index) => ({ "م": index + 1, "القسم": "نص مستخرج", "النص": line })),
        rawText: narrative,
        meta: { sourceType: "ai-vision", mode: "narrative", extractionMode: "ai-vision" }
      });
    }
    if (!datasets.length) throw new Error("لم تُرجع خدمة التحليل نصًا أو جدولًا صالحًا للمراجعة.");
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
    if (!aiReady()) throw new Error("خدمة التحليل غير مربوطة بعد.");
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
            showInputRecovery({
              file,
              sourceType: "pdf",
              reason: visionError.message || err.message || "تعذر استخراج PDF آليًا."
            });
          }
        } else {
          showInputRecovery({
            file,
            sourceType: "pdf",
            reason: err.message || "تعذر استخراج PDF آليًا."
          });
        }
      } else {
        setMessage("inputMessage", err.message || `تعذر قراءة ${label}.`, true);
      }
    }
  }

  function openManualExtraction(fileName, reason, sourceType = "image", previewDataUrl = "") {
    state.pendingManualFileName = fileName;
    $("manualDialogTitle").textContent = sourceType === "image" ? "إدخال يدوي للصورة عند الحاجة" : "إدخال يدوي عند الحاجة";
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
          showInputRecovery({
            file,
            sourceType: "image",
            reason: aiError.message || "تعذرت القراءة البصرية للصورة.",
            previewDataUrl: preview.dataUrl
          });
          return;
        }
      }
      showInputRecovery({
        file,
        sourceType: "image",
        reason: "الصورة تحتاج قراءة بصرية آلية، وخدمة التحليل غير مفعلة حاليًا.",
        previewDataUrl: preview.dataUrl
      });
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
    const typeSelect = $("typeSelect");
    if (state.type?.dynamic && typeSelect && ![...typeSelect.options].some(option => option.value === state.type.id)) {
      typeSelect.add(new Option(`${state.type.name} (نوع تكيفي)`, state.type.id));
    }
    if (typeSelect && [...typeSelect.options].some(option => option.value === state.type.id)) typeSelect.value = state.type.id;
    $("recognizedType").textContent = state.type.name;
    $("recognizedPurpose").textContent = state.type.purpose;
    const recognitionSource = $("recognitionSource");
    if (recognitionSource) recognitionSource.textContent = state.recognitionStatus || "تصنيف محلي";
    const recognitionRationale = $("recognitionRationale");
    if (recognitionRationale) recognitionRationale.textContent = state.recognitionConflict
      ? `${state.localRecognition?.rationale || "تثبيت النوع من بنية المصدر."} لم يُعتمد اقتراح خارجي متعارض.`
      : state.aiRecognition?.rationale || state.localRecognition?.rationale || "";
    $("recognitionConfidence").textContent = `${state.confidence}%`;
    $("recognitionBar").style.width = `${state.confidence}%`;
    $("rowCount").textContent = state.rows.length.toLocaleString("ar");
    $("columnCount").textContent = state.headers.length.toLocaleString("ar");
    $("completenessValue").textContent = `${state.quality.completeness}%`;
    const sourceLabel = displaySourceLabel();
    $("sourceName").textContent = sourceLabel;
    $("sourceName").title = state.sourceName || sourceLabel;
    const tagHeaders = state.headers.slice(0, 8);
    const hiddenTagCount = Math.max(0, state.headers.length - tagHeaders.length);
    $("headerTags").innerHTML = tagHeaders.map(h => `<span>${escapeHtml(h)}</span>`).join("") + (hiddenTagCount ? `<span class="tag-more">+${hiddenTagCount} حقول</span>` : "");

    const visibleHeaders = reviewHeaders();
    const table = $("previewTable");
    table.innerHTML = `<thead><tr>${visibleHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${state.rows.slice(0,8).map(row => `<tr>${visibleHeaders.map(h => `<td>${escapeHtml(row[h]) || "—"}</td>`).join("")}</tr>`).join("")}</tbody>`;
    const previewWrap = $("previewTableWrap");
    previewWrap?.classList.toggle("expanded-preview", state.previewExpanded);
    const previewToggle = $("togglePreviewColumnsBtn");
    const previewMeta = $("previewColumnsMeta");
    if (previewMeta) previewMeta.textContent = state.previewExpanded ? `عرض جميع الحقول (${state.headers.length})` : `عرض ${visibleHeaders.length} من ${state.headers.length} حقلاً`;
    if (previewToggle) {
      previewToggle.classList.toggle("hidden", state.headers.length <= 7);
      previewToggle.textContent = state.previewExpanded ? "عرض المعاينة المختصرة" : "عرض كل الحقول";
    }
    renderScaleSemanticsGuard();

    const issues = [];
    state.quality.blockers.forEach(i => issues.push({ ...i, kind: "blocker", icon: "!" }));
    state.quality.warnings.forEach(i => issues.push({ ...i, kind: "warning", icon: "•" }));
    state.quality.info.forEach(i => issues.push({ ...i, kind: "info", icon: "✓" }));
    if (state.type.id === "unknown") issues.push({ kind: "warning", icon: "?", title: "نوع جديد غير مسجل", detail: "يمكن متابعة التحليل العام، ثم حفظ تعريف النوع لاحقًا بدل إجباره على قالب غير مناسب." });
    $("qualityIssues").innerHTML = issues.map(i => `<div class="issue ${i.kind}"><span class="issue-icon">${i.icon}</span><div><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(i.detail)}</span></div></div>`).join("");
    const qualityDetails = $("qualityDetails");
    const qualityIssueCount = $("qualityIssueCount");
    if (qualityIssueCount) qualityIssueCount.textContent = `${issues.length} نقاط`;
    if (qualityDetails) qualityDetails.open = Boolean(state.quality.blockers.length || state.quality.warnings.length || state.type.id === "unknown");
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

  function multiSubjectGradeNumber(value) {
    const text = normalize(value).replace(/الصف/g, "").trim();
    const direct = parseInt(text, 10);
    if (Number.isFinite(direct)) return direct;
    const map = { "الخامس":5, "السادس":6, "السابع":7, "الثامن":8, "التاسع":9, "العاشر":10, "الحادي عشر":11, "الحادي عشر":11, "الثاني عشر":12 };
    return map[text] || 0;
  }

  function multiSubjectSubjects() {
    const candidates = [];
    const add = value => {
      const text = String(value || "").trim();
      if (text && !candidates.some(item => normalize(item) === normalize(text))) candidates.push(text);
    };
    const profileSubjects = state.semanticProfile?.columnRoles?.subjects;
    if (Array.isArray(profileSubjects)) profileSubjects.forEach(item => add(typeof item === "string" ? item : item?.subject));
    const metadataSubjects = state.sourceMeta?.metadata?.subjects;
    if (Array.isArray(metadataSubjects)) metadataSubjects.forEach(add);
    const normalizedSubjects = state.sourceMeta?.normalization?.subjects;
    if (Array.isArray(normalizedSubjects)) normalizedSubjects.forEach(add);
    for (const header of state.headers || []) {
      const match = String(header).match(/^(.+?)\s*-\s*(?:الدرجة|الدرجه)$/i);
      if (match) {
        const subject = match[1].trim();
        const hasLevel = (state.headers || []).some(candidate => normalize(candidate) === normalize(`${subject} - المستوى`));
        if (hasLevel) add(subject);
      }
    }
    return candidates;
  }

  function hasUsableMultiSubjectStructure() {
    return multiSubjectSubjects().length >= 2;
  }

  function currentMultiSubjectOptions() {
    if (state.type.id !== "multi_subject_results") return null;
    const subjects = multiSubjectSubjects();
    const requestedMode = $("multiSubjectScopeSelect")?.value === "subject" ? "subject" : "all";
    const selected = String($("multiSubjectSubjectSelect")?.value || "").trim();
    const subject = subjects.includes(selected) ? selected : subjects[0] || "";
    return {
      mode: requestedMode === "subject" && subject ? "subject" : "all",
      subject: requestedMode === "subject" ? subject : "",
      includeSubjectTopTen: $("includeSubjectTopTenInput")?.checked !== false,
      includeSchoolRanking: requestedMode !== "subject" && $("includeSchoolRankingInput")?.checked !== false,
    };
  }

  function renderMultiSubjectWorkspace() {
    const card = $("multiSubjectWorkspaceCard");
    const active = state.type.id === "multi_subject_results";
    card.classList.toggle("hidden", !active);
    if (!active) return;
    const subjects = multiSubjectSubjects();
    const scope = $("multiSubjectScopeSelect");
    const subjectSelect = $("multiSubjectSubjectSelect");
    const previous = subjectSelect.value || state.multiSubjectOptions?.subject || "";
    subjectSelect.innerHTML = subjects.length
      ? subjects.map(subject => `<option value="${escapeAttr(subject)}">${escapeHtml(subject)}</option>`).join("")
      : `<option value="">لم تُكتشف مواد في الورقة المختارة</option>`;
    subjectSelect.disabled = !subjects.length;
    if (previous && subjects.includes(previous)) subjectSelect.value = previous;
    else if (subjects.length) subjectSelect.value = subjects[0];
    if (!subjects.length && scope.value === "subject") scope.value = "all";
    const mode = scope.value === "subject" ? "subject" : "all";
    $("multiSubjectSubjectLabel").classList.toggle("hidden", mode !== "subject");
    $("includeSchoolRankingLabel").classList.toggle("hidden", mode !== "all");
    const grade = multiSubjectGradeNumber(state.sourceMeta?.metadata?.grade || state.sourceMeta?.normalization?.grade || state.semanticProfile?.metadata?.grade || "");
    const formula = grade >= 10 ? "60% من متوسط المواد الأساسية + 40% من متوسط جميع المواد" : "70% من متوسط المواد الأساسية + 30% من متوسط جميع المواد";
    $("multiSubjectFormulaNote").textContent = !subjects.length
      ? "الورقة الحالية لا تحتوي درجات مواد قابلة للتحليل. ارجع واختر ورقة النتائج الشاملة أو أعد رفع المصنف بعد تحديث الصفحة."
      : mode === "subject"
        ? `سيحلل التطبيق مادة «${subjectSelect.value}» كاملة، ويحسب أوائلها محليًا مع إظهار جميع المتعادلين في المركز العاشر.`
        : grade >= 5 && grade <= 12
          ? `اكتُشفت ${subjects.length} مادة. الترتيب العام للصف ${grade}: ${formula}. لا كسر للتعادل، ومن تنقصه مادة أساسية يظهر «غير مكتمل للترتيب».`
          : `اكتُشفت ${subjects.length} مادة. يتطلب ترتيب المدرسة تحديد صف من 5 إلى 12 داخل بيانات الملف، بينما يبقى تحليل المواد متاحًا.`;
    state.multiSubjectOptions = currentMultiSubjectOptions() || state.multiSubjectOptions;
  }

  function renderSetup() {
    const narrativeMode = isNarrativeMode();
    const multiVisitMode = state.type.id === "supervision_multi_visit";
    const descriptiveOnly = scaleGuardApplies() && currentScaleDirection() === "descriptive-only";
    const requiresScoreSettings = state.semanticProfile?.requiresScoreSettings ?? ["single_subject", "assessment_component", "cross_subject"].includes(state.type.id);
    $("measurementCard").classList.toggle("hidden", narrativeMode || multiVisitMode || !requiresScoreSettings);
    $("narrativeSetupCard").classList.toggle("hidden", !narrativeMode);
    $("aiAnalysisCard")?.classList.toggle("hidden", descriptiveOnly);
    $("runAnalysisBtn").textContent = descriptiveOnly ? "تنفيذ التحليل الوصفي" : "تنفيذ التحليل التربوي";
    renderMultiSubjectWorkspace();
    if (narrativeMode) {
      $("narrativeTextReview").value = state.narrativeText || state.rows.map(row => row["النص"] ?? Object.values(row).join(" ")).join("\n");
    }
    const evidenceTitle = $("deterministicEvidenceTitle");
    const evidenceList = $("deterministicEvidenceList");
    if (evidenceTitle && evidenceList) {
      evidenceTitle.textContent = narrativeMode ? "الأدلة البنيوية والسردية" : "الحسابات والأدلة";
      const evidenceItems = narrativeMode
        ? [
            "عدّ العبارات وربط كل عبارة بالقسم الذي وردت فيه دون تحويل النص إلى جدول درجات.",
            "فحص حضور أقسام الإجادة والتطوير والدعم والمداولة والتوصيات واتساقها السياقي.",
            "كشف التكرار الموضوعي والتباين السياقي دون اعتباره تناقضًا مؤكدًا ما لم تتطابق الزيارة والمعلم والزمن.",
            "إسناد الاستنتاجات إلى أسطر وأقسام ثابتة، وفحص قابلية الدعم والتوصيات للتنفيذ والقياس."
          ]
        : [
            "العد والمتوسط والوسيط والمدى.",
            "فحص الاكتمال والتكرار والقيم غير الصالحة.",
            "نسبة الإتقان عند تأكيد الدرجة الكلية.",
            "إسناد القراءة التفسيرية بأرقام ورسوم ومراجع أدلة ثابتة لا تتغير أثناء التحليل."
          ];
      evidenceList.innerHTML = evidenceItems.map(item => `<li>${escapeHtml(item)}</li>`).join("");
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
      multi_subject_results: state.multiSubjectOptions?.mode === "subject"
        ? [
            `تحليل مادة ${state.multiSubjectOptions.subject || "محددة"}: المتوسط والتشتت وتوزيع أ-هـ`,
            "استخراج العشرة الأوائل محليًا مع تطبيق المراكز المكررة",
            "تحديد مواطن القوة والضعف والفئات العلاجية والإثرائية",
            "خطة متابعة للمادة دون تعميم نتائجها على بقية المواد",
          ]
        : [
            "تحليل شامل لدرجات ومستويات الطلبة عبر جميع المواد",
            "مقارنة المواد وترتيب أولويات الدعم والإثراء",
            "استخراج أوائل كل مادة وترتيب الدفعة بالمعادلة المعتمدة",
            "فصل التعثر متعدد المواد عن التخصصي مع تصنيفات متبادلة",
          ],
      cross_subject: ["ترتيب المواد ونسب الإتقان والتفاوت", "تمييز التعثر الشامل من التعثر التخصصي", "تحليل العلاقات الوصفية بين المواد", "خريطة تدخل مشتركة ومتابعة متعددة التخصصات"],
      supervision_indicator: ["تجميع المؤشرات في مجالات إشرافية", "رادار الأداء وتحليل الفجوة وباريتو الأولويات", "مصفوفة أولوية الأثر والجهد", "خطة نمو مهني ودورة PDCA وإعادة ملاحظة"],
      supervision_multi_visit: ["فصل الزيارات والمعلمين والمواد إلى سجلات مستقلة", "تحليل المقياس المعكوس 1 متميز إلى 5 يحتاج إلى تدخل", "ربط التقدير الرقمي بالدليل السردي داخل كل زيارة", "مقارنة المؤشرات والزيارات وبناء تدخلات جماعية وفردية دون خلط السجلات"],
      student_work: ["تحليل جودة الإنجاز والتغذية الراجعة والتمايز", "رادار المجالات وفجوات الأعمال والأنشطة", "باريتو البنود ذات الأثر الأعلى", "خطة تحسين للأعمال ومؤشرات متابعة قبل/بعد"],
      supervision_narrative: ["تحليل أقسام الإجادة والتطوير والدعم والتوصيات", "مصفوفة الحكم والدليل والأثر", "اكتشاف التكرار والتعارض ومشكلات التواريخ", "فحص قابلية التوصيات للقياس وبناء خطة متابعة"],
      survey: ["تحليل ليكرت والاتجاه العام وتوزيع الاستجابات", "ترتيب البنود وفجوات الرضا أو الاتفاق", "فحص الاتساق الداخلي عند تحقق شروطه", "باريتو الأولويات وخطة استجابة وإعادة قياس"],
      training_needs: ["حساب فجوة الكفايات وأهمية الاحتياج", "ترتيب الأولوية حسب الفجوة والأهمية وحجم الفئة", "اختيار نوع التدخل: تدريب أو توجيه أو تعلم ذاتي", "قياس قبلي وبعدي ونقل أثر التدريب"],
      program_evaluation: ["فصل التنفيذ عن النتائج والأثر", "نموذج منطق البرنامج وتحليل فجوات الأهداف", "باريتو الاختناقات ودورة PDCA", "قرار الاستمرار أو التعديل وخطة قياس الاستدامة"],
      behavior_attendance: ["باريتو أنواع الحالات والغياب", "الاتجاه الزمني والحالات المتكررة", "مؤشرات إنذار مبكر مع حماية الخصوصية", "تدخل وقائي وفردي وقياس أثر"],
      unknown: narrativeMode
        ? ["تحليل بنيوي للنص والأقسام", "تحقق دلالي خارجي لتحديد النوع", "بناء عقد تحليل جديد بدل فرض قالب معروف", "تحديد الأدلة والأدوات والحدود المناسبة للنوع"]
        : ["ملف تعريف للحقول الرقمية والفئوية", "تحقق دلالي خارجي لتحديد الهدف", "بناء خطة تحليل متخصصة جديدة", "حفظ النوع لاحقًا في السجل الديناميكي"]
    };

    const semanticFamilies = Array.isArray(state.semanticProfile?.analysisFamilies) ? state.semanticProfile.analysisFamilies : [];
    const familyLabels = {
      distribution_analysis: "تحليل توزيع الفئات ومركز التوزيع",
      group_comparison: "مقارنة المجموعات وترتيب الأولوية",
      concentration_analysis: "قياس التركّز والتفاوت بين المستويات",
      aggregate_consistency_check: "مطابقة المجاميع والنسب مع الصف الإجمالي",
      subject_comparison: "مقارنة المواد وترتيب الأداء والأولوية",
      student_profile_segmentation: "فصل التعثر متعدد المواد عن التعثر التخصصي",
      score_level_consistency: "فحص اتساق الدرجة الرقمية مع المستوى الحرفي",
      cross_subject_relationships: "تحليل العلاقات الوصفية بين المواد",
      enrollment_status_summary: "تلخيص حالات القيد أو النتيجة دون تفسير سببي",
      comparative_analysis: "مقارنة المقاييس أو الفئات وفق بنية الملف",
      indicator_analysis: "تحليل المؤشرات وترتيب الفجوات",
      narrative_evidence: "تحليل الأدلة السردية وقوة الاستدلال",
      consistency_analysis: "فحص الاتساق والتباين السياقي بين الأقسام",
      recommendation_quality: "فحص جودة الدعم والتوصيات وقابليتها للتنفيذ والقياس",
      adaptive_profile_analysis: "بناء تحليل تكيفي وفق ملف البنية الدلالي"
    };
    const selectedPlan = semanticFamilies.length
      ? semanticFamilies.map(item => familyLabels[item] || publicDisplayLabel(item, "مسار تحليلي")).slice(0, 4)
      : (plans[state.type.id] || plans.unknown);
    $("analysisPlan").innerHTML = selectedPlan.map(x => `<li>${escapeHtml(x)}</li>`).join("");
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
    return /اسم.*طالب|اسم.*معلم|^المعلم$|الجنسيه|الجنسية|الرقم.*مدني|رقم.*طالب|رقم.*ملف|هاتف|بريد|ايميل|عنوان|بطاقه|هوية|هويه|civil|nationality|student.?id|teacher.?id|phone|email/.test(value);
  }

  function tableAiLimit() {
    // ملفات الدرجات تُفهم أساسًا من المؤشرات والرسوم المحسوبة من كامل البيانات؛
    // إرسال عشرات السجلات المتشابهة يبطئ النموذج دون إضافة معنى تحليلي حقيقي.
    if (["single_subject", "assessment_component"].includes(state.type.id)) return 24;
    if (state.type.id === "multi_subject_results") return 48;
    if (state.type.id === "supervision_multi_visit") return 120;
    if (state.type.id === "unknown") return 60;
    if (["supervision_indicator", "student_work", "survey", "training_needs", "program_evaluation", "behavior_attendance", "level_distribution", "cross_subject", "multi_subject_results"].includes(state.type.id)) return 60;
    return 40;
  }

  function sanitizeRowsForAi(maskPersonalData = true) {
    const headers = state.headers.slice(0, 20);
    const sensitive = new Set(headers.filter(isSensitiveHeader));
    const limit = tableAiLimit();
    const sourceRows = state.rows.length <= limit
      ? state.rows
      : [...state.rows.slice(0, Math.ceil(limit / 2)), ...state.rows.slice(-Math.floor(limit / 2))];
    const rows = sourceRows.map((row, rowIndex) => {
      const originalIndex = state.rows.indexOf(row);
      const clean = { _evidenceRef: `row:${Math.max(0, originalIndex) + 1}` };
      headers.forEach(header => {
        let value = String(row[header] ?? "").slice(0, 180);
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
    const source = String(state.narrativeText || state.rawText || "").slice(0, 18000);
    const allLines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const limit = 120;
    const chosen = allLines.length <= limit
      ? allLines.map((text, index) => ({ text, index }))
      : [
          ...allLines.slice(0, 80).map((text, index) => ({ text, index })),
          ...allLines.slice(-40).map((text, offset) => ({ text, index: allLines.length - 40 + offset }))
        ];
    return chosen.map(item => ({
      ref: `line:${item.index + 1}`,
      text: maskPersonalData
        ? item.text.replace(/(اسم\s*(?:الطالب|المعلم)?\s*[:：-]?\s*)[^،؛\n]{3,80}/gi, "$1[محجوب]")
        : item.text
    }));
  }


  function buildMultiVisitSupervisionAiData(maskPersonalData = true) {
    const catalog = Array.isArray(state.sourceMeta?.indicatorCatalog) ? state.sourceMeta.indicatorCatalog : [];
    const indicatorLabels = catalog.map(item => item.label).filter(Boolean);
    const visits = state.rows.map((row, index) => {
      const ratings = catalog.map(item => ({
        id: item.id,
        label: item.label,
        level: Number(row[item.label]) || null,
      })).filter(item => Number.isInteger(item.level));
      return {
        _evidenceRef: `row:${index + 1}`,
        visitId: row["معرف الزيارة"] || `زيارة ${index + 1}`,
        visitNumber: row["رقم الزيارة"] || "",
        visitDate: row["تاريخ الزيارة"] || "",
        teacher: maskPersonalData ? `المعلم ${index + 1}` : String(row["المعلم"] || ""),
        fileNumber: maskPersonalData ? "[محجوب]" : String(row["رقم الملف"] || ""),
        subject: row["المادة"] || "",
        grade: row["الصف"] || "",
        classSection: row["الفصل"] || "",
        period: row["الحصة"] || "",
        lessonTitle: row["عنوان الدرس"] || "",
        ratings,
        narrative: {
          strengths: String(row["جوانب الإجادة"] || "").slice(0, 1400),
          development: String(row["جوانب التطوير"] || "").slice(0, 1000),
          support: String(row["الدعم المقدم"] || "").slice(0, 1000),
          recommendations: String(row["التوصيات"] || "").slice(0, 1200),
        },
      };
    });
    return {
      structure: "multi-visit-supervision",
      scale: state.sourceMeta?.scale || { 1: "متميز", 2: "جيد", 3: "ملائم", 4: "غير ملائم", 5: "يحتاج إلى تدخل" },
      scaleDirection: "lower-is-better",
      indicatorCatalog: catalog,
      visits,
      visitCount: visits.length,
      ratingCount: visits.reduce((sum, visit) => sum + visit.ratings.length, 0),
      maskedHeaders: maskPersonalData ? ["المعلم", "رقم الملف"] : [],
      sampling: "جميع الزيارات المنظمة",
      truncated: false,
      headers: ["بيانات الزيارة", ...indicatorLabels, "جوانب الإجادة", "جوانب التطوير", "الدعم المقدم", "التوصيات"],
    };
  }

  function compactDeterministicAnalysis(analysis) {
    if (!analysis) return null;
    const metrics = (analysis.metrics || []).slice(0, 24).map(item => ({
      id: item.id, label: item.label, value: item.value, note: item.note, format: item.format,
      evidenceRef: item.evidenceRef || `metric:${item.id}`
    }));
    const keyIndicators = Object.fromEntries(metrics.map(item => [item.id, item.value]));
    const charts = (analysis.charts || []).slice(0, 6).map(item => ({
      id: item.id, type: item.type, title: item.title, description: item.description,
      xKey: item.xKey, yKey: item.yKey, valueSuffix: item.valueSuffix,
      data: Array.isArray(item.data) ? item.data.slice(0, 18) : item.data
    }));
    return {
      version: analysis.version,
      kind: analysis.kind,
      typeId: analysis.typeId,
      keyIndicators,
      metrics,
      charts,
      calculationLimitations: (analysis.limitations || []).slice(0, 12),
      scaleSemantics: analysis.scaleSemantics && typeof analysis.scaleSemantics === "object" ? structuredClone(analysis.scaleSemantics) : null,
      scopeContext: analysis.scopeContext && typeof analysis.scopeContext === "object" ? structuredClone(analysis.scopeContext) : null,
      interventionMathContext: Array.isArray(analysis.segments) && analysis.segments.length ? {
        totalCount: Number(analysis.n || 0),
        baselineMasteryCount: Number(analysis.masteryCount || 0),
        baselineMasteryRate: Number(analysis.masteryPctDisplay ?? analysis.masteryPct ?? 0),
        groups: analysis.segments.slice(0, 4).map(item => ({
          id: String(item.id || ""),
          label: String(item.label || ""),
          count: Number(item.count || 0),
          percentage: Number(item.percentage || 0)
        }))
      } : null,
      evidenceCatalog: Object.entries(analysis.evidenceMap || {}).slice(0, 80).map(([ref, text]) => ({ ref, text }))
    };
  }

  function buildEvidenceCatalog(dataset, narrativeLines, deterministicAnalysis) {
    const refs = [];
    (dataset?.sampleRows || []).forEach(row => { if (row?._evidenceRef) refs.push(row._evidenceRef); });
    (dataset?.visits || []).forEach(row => { if (row?._evidenceRef) refs.push(row._evidenceRef); });
    (narrativeLines || []).forEach(line => { if (line?.ref) refs.push(line.ref); });
    (deterministicAnalysis?.metrics || []).forEach(item => refs.push(item.evidenceRef || `metric:${item.id}`));
    (deterministicAnalysis?.evidenceCatalog || []).forEach(item => { if (item?.ref) refs.push(item.ref); });
    return [...new Set(refs)];
  }

  function buildAiAnalysisPayload(maskPersonalData = true) {
    const multiVisitData = state.type.id === "supervision_multi_visit" ? buildMultiVisitSupervisionAiData(maskPersonalData) : null;
    const dataset = multiVisitData || sanitizeRowsForAi(maskPersonalData);
    const lines = narrativeLinesForAi(maskPersonalData);
    const deterministicAnalysis = compactDeterministicAnalysis(state.analysis);
    if (!window.TaqareerReconciliation?.composePrimary) throw new Error("محرك التحقق من التحليل الذكي غير محمل.");
    const payload = {
      locale: "ar-OM",
      appVersion: "1.2.25",
      pipeline: {
        mode: "ai-primary-analysis-v1",
        instruction: "المحرك المحلي يحسب المؤشرات والرسوم فقط. يبني الذكاء الاصطناعي التشخيص والاستنتاجات والتدخلات من الأدلة، ثم تتحقق البوابة من المراجع قبل عرض التقرير."
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
        confidence: state.confidence,
        semanticProfile: state.semanticProfile || null
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
      evidenceAnalysis: deterministicAnalysis,
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
    developmentCount: "عدد جوانب التطوير",
    visitCount: "عدد الزيارات",
    ratingCount: "عدد التقديرات الرقمية",
    excellentGoodPct: "نسبة التقديرات متميز أو جيد",
    supportRatingPct: "نسبة التقديرات ملائم أو أقل",
    numericNarrativeMismatchCount: "حالات عدم الاتساق بين التقدير والدليل السردي"
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
      "governance.quality": "أدوات الجودة (توافق قديم)",
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


  function evidenceProgressSummary() {
    const metrics = Array.isArray(state.analysis?.metrics) ? state.analysis.metrics : [];
    const read = id => metrics.find(item => item?.id === id);
    const pieces = [];
    const n = read("n");
    const mastery = read("masteryPct");
    const mean = read("mean");
    if (n?.value !== undefined) pieces.push(`${n.label || "السجلات"}: ${formatMetricValue(n)}`);
    if (mastery?.value !== undefined) pieces.push(`${mastery.label || "الإتقان"}: ${formatMetricValue(mastery)}`);
    else if (mean?.value !== undefined) pieces.push(`${mean.label || "المتوسط"}: ${formatMetricValue(mean)}`);
    return pieces.slice(0, 2).join(" · ");
  }

  function startPrimaryAnalysisTicker(runButton) {
    const startedAt = Date.now();
    const evidenceSummary = evidenceProgressSummary();
    const update = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      runButton.textContent = `جارٍ بناء التحليل الذكي… ${seconds}ث`;
      const stage = seconds < 6
        ? "يبني المحلل الذكي القراءة التشخيصية من الأدلة."
        : seconds < 14
          ? "يربط الاستنتاجات بالأدلة ويرتب الأولويات."
          : seconds < 20
            ? "يصوغ التدخلات ضمن عقد موجز مضبوط."
            : "إذا تعثرت الاستجابة، ينتقل الخادم تلقائيًا إلى نموذج أسرع ضمن المهلة نفسها.";
      setMessage("setupMessage", `${evidenceSummary ? `اكتملت الحسابات: ${evidenceSummary}. ` : "اكتملت الحسابات. "}${stage}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }

  async function enrichAnalysisWithAi({ force = false, requestId = state.analysisRequestId } = {}) {
    if (!aiReady()) throw new Error("التحليل الذكي الأساسي غير مربوط أو غير مفعّل.");
    if (!window.TaqareerReconciliation?.composePrimary) throw new Error("محرك التحقق من التحليل الذكي غير محمل.");
    if (!window.TaqareerDeepOrchestrator?.run) throw new Error("منسق التحليل الذكي الأساسي غير محمل.");
    const maskPersonalData = $("maskPersonalDataInput")?.checked !== false;
    const payload = buildAiAnalysisPayload(maskPersonalData);
    state.aiWarning = "";
    state.aiSegments = { status: "pending" };

    const outcome = await window.TaqareerDeepOrchestrator.run({
      basePayload: payload,
      ai: window.TaqareerAI,
      performanceApi: perfApi(),
      force,
      onProgress: progress => {
        if (requestId !== state.analysisRequestId) return;
        state.aiSegments = { status: progress.status || "pending", cacheHit: Boolean(progress.cacheHit) };
      }
    });

    if (requestId !== state.analysisRequestId) return null;
    state.aiResult = outcome.result;
    state.reconciledAnalysis = window.TaqareerReconciliation.composePrimary(state.analysis, outcome.result, {
      availableEvidenceRefs: payload.availableEvidenceRefs || []
    });
    state.aiUsed = true;
    state.performance.cacheHit = Boolean(outcome.cacheHit);
    state.performance.payloadChars = outcome.payloadChars;
    state.performance.segmentTimings = {};
    state.performance.aiModel = outcome.model || "Gemini";
    state.performance.aiUsage = outcome.usage || null;
    state.performance.aiServerTiming = { aiPrimary: true, ...(outcome.serverTiming || {}), cacheHit: Boolean(outcome.cacheHit) };
    recordSpan({ name: "التحليل الذكي الأساسي", durationMs: outcome.durationMs, aiPrimary: true });
    state.aiError = "";
    state.aiWarning = "";
    return state.reconciledAnalysis;
  }

  async function runAnalysis() {
    clearMessage("setupMessage");
    state.aiResult = null;
    state.reconciledAnalysis = null;
    state.aiError = "";
    state.aiWarning = "";
    state.aiUsed = false;
    state.aiPending = false;
    state.aiSegments = { status: "idle" };
    resetPerformance();
    const analysisRequestId = ++state.analysisRequestId;
    const runButton = $("runAnalysisBtn");
    let stopPrimaryTicker = null;
    runButton.disabled = true;

    try {
      const descriptiveOnly = scaleGuardApplies() && currentScaleDirection() === "descriptive-only";
      if (!descriptiveOnly && !aiReady()) {
        setMessage("setupMessage", "التحليل التربوي في هذه النسخة يعتمد على خدمة التحليل الخادمية. اربط وظيفة Supabase وفعّلها أولًا.", true);
        return;
      }
      const totalTimer = perfApi()?.startSpan?.("الزمن الكلي");
      const narrativeMode = isNarrativeMode();
      const narrativeText = narrativeMode ? $("narrativeTextReview").value.trim() : "";
      if (narrativeMode && narrativeText.length < 40) {
        setMessage("setupMessage", "النص قصير جدًا لإنتاج تحليل تربوي عميق. راجع المحتوى المستخرج.", true);
        return;
      }
      if (narrativeMode) state.narrativeText = narrativeText;

      if (scaleGuardApplies() && currentScaleDirection() === "unknown") {
        setMessage("setupMessage", "ارجع إلى مراجعة الفهم وحدد دلالة مقياس التقويم أو اختر التحليل الوصفي فقط قبل تنفيذ التحليل.", true);
        return;
      }

      const scoreColumn = $("scoreColumnSelect").value;
      const levelColumn = $("levelColumnSelect").value;
      const maxScore = parseNumber($("maxScoreInput").value);
      const thresholdPct = parseNumber($("masteryThresholdInput").value);
      const requiresScoreSettings = state.semanticProfile?.requiresScoreSettings ?? ["single_subject", "assessment_component", "cross_subject"].includes(state.type.id);
      if (state.type.id === "multi_subject_results") {
        const options = currentMultiSubjectOptions();
        if (!hasUsableMultiSubjectStructure()) {
          setMessage("setupMessage", "الورقة المختارة لا تحتوي درجات صالحة لمادتين على الأقل. ارجع واختر ورقة النتائج الشاملة؛ لن ينفذ التطبيق تحليلًا على بنية ناقصة.", true);
          return;
        }
        if (options?.mode === "subject" && !options.subject) {
          setMessage("setupMessage", "اختر مادة صالحة قبل تنفيذ تحليل المادة.", true);
          return;
        }
      }
      if (requiresScoreSettings && !narrativeMode && state.type.id !== "supervision_multi_visit" && (!Number.isFinite(thresholdPct) || thresholdPct <= 0 || thresholdPct > 100)) {
        setMessage("setupMessage", "حد الإتقان يجب أن يكون بين 1 و100.", true);
        return;
      }
      if (!window.TaqareerDeepAnalytics?.analyzeEvidence || !window.TaqareerDeepAnalytics?.analyze) throw new Error("محرك الحساب والأدلة غير محمل.");

      runButton.textContent = descriptiveOnly ? "جارٍ بناء الوصف الإحصائي…" : "جارٍ بناء حزمة الأدلة…";
      setMessage("setupMessage", descriptiveOnly
        ? "يجري الآن حساب المؤشرات الوصفية كما وردت في المصدر، دون تفسير اتجاهي أو أحكام قوة وضعف."
        : "يجري الآن حساب المؤشرات وتجهيز الأدلة، ثم ستبني خدمة التحليل القراءة التربوية من الأدلة.");
      await yieldToUi();
      const localTimer = perfApi()?.startSpan?.(descriptiveOnly ? "التحليل الوصفي المحلي" : "الحسابات وحزمة الأدلة");
      const analyzeFn = descriptiveOnly ? window.TaqareerDeepAnalytics.analyze : window.TaqareerDeepAnalytics.analyzeEvidence;
      state.analysis = analyzeFn({
        typeId: state.type.id,
        headers: state.headers,
        rows: state.rows,
        sourceMeta: state.sourceMeta,
        analysisProfile: state.semanticProfile,
        narrativeText,
        scoreColumn,
        levelColumn,
        maxScore,
        thresholdPct,
        quality: state.quality,
        analysisOptions: currentMultiSubjectOptions()
      });
      recordSpan(localTimer ? perfApi().endSpan(localTimer) : null);

      if (descriptiveOnly) {
        state.reconciledAnalysis = state.analysis;
        state.aiUsed = false;
        state.aiPending = false;
        clearMessage("setupMessage");
        renderResults();
        showPanel(4);
        if (totalTimer) recordSpan(perfApi().endSpan(totalTimer));
        renderPerformanceSummary();
        return;
      }

      state.aiPending = true;
      stopPrimaryTicker = startPrimaryAnalysisTicker(runButton);
      await yieldToUi();
      await enrichAnalysisWithAi({ requestId: analysisRequestId });
      if (analysisRequestId !== state.analysisRequestId) return;

      state.aiPending = false;
      clearMessage("setupMessage");
      renderResults();
      showPanel(4);
      if (totalTimer) recordSpan(perfApi().endSpan(totalTimer));
      renderPerformanceSummary();
    } catch (error) {
      console.error("taqareer-ai-primary-analysis", error);
      state.aiPending = false;
      state.aiResult = null;
      state.reconciledAnalysis = null;
      state.aiUsed = false;
      state.aiError = friendlyAiError(error);
      const recoveryHint = isRetryableAiError(error)
        ? "الحسابات والأدلة والملف ما زالت محفوظة. أعد الضغط على «تنفيذ التحليل التربوي» بعد لحظات؛ لا حاجة لإعادة رفع الملف أو إدخال أي نص يدويًا."
        : "الحسابات والأدلة والملف ما زالت محفوظة. يمكنك إعادة تشغيل التحليل مباشرة؛ لن يطلب منك التطبيق إدخال المحتوى يدويًا بسبب فشل التحليل الخارجي.";
      setMessage("setupMessage", `${state.aiError} ${recoveryHint}`, true);
    } finally {
      if (stopPrimaryTicker) stopPrimaryTicker();
      runButton.disabled = false;
      runButton.textContent = scaleGuardApplies() && currentScaleDirection() === "descriptive-only" ? "تنفيذ التحليل الوصفي" : "تنفيذ التحليل التربوي";
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


  function renderHistogramChart(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const xKey = chart.xKey || "label", yKey = chart.yKey || "count";
    const max = Math.max(1, ...data.map(item => chartValue(item, yKey)));
    return `<div class="deep-histogram" data-chart-id="${escapeAttr(chart.id||"")}">${data.map(item => {
      const value = chartValue(item, yKey), label = item?.[xKey] ?? item?.label ?? "—";
      return `<div class="deep-hist-bin" title="${escapeAttr(`${label}: ${round(value)}${chart.valueSuffix||""}`)}"><strong>${round(value)}</strong><div class="deep-hist-column"><span style="height:${Math.max(3, value/max*100)}%"></span></div><small>${escapeHtml(label)}</small></div>`;
    }).join("")}</div>`;
  }

  function renderStacked100Chart(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const xKey = chart.xKey || "label";
    const series = Array.isArray(chart.series) ? chart.series : [];
    const segment = (label, value, total, index) => {
      const pct = total > 0 ? value / total * 100 : 0;
      return value > 0 ? `<span class="deep-stack-segment seg-${index%6}" style="width:${pct}%" title="${escapeAttr(`${label}: ${round(value)} (${round(pct)}%)`)}"></span>` : "";
    };
    if (series.length) {
      return `<div class="deep-stacked-list">${data.map(row => {
        const values = series.map(key => Math.max(0, chartValue(row,key))), total = values.reduce((a,b)=>a+b,0) || 1;
        return `<div class="deep-stacked-row"><strong>${escapeHtml(row?.[xKey] ?? "—")}</strong><div class="deep-stacked-track">${series.map((key,i)=>segment(key,values[i],total,i)).join("")}</div><small>${series.map((key,i)=>`${escapeHtml(key)} ${round(values[i]/total*100)}%`).join(" · ")}</small></div>`;
      }).join("")}</div>`;
    }
    const yKey = chart.yKey || "count", values = data.map(row => Math.max(0, chartValue(row,yKey))), total = values.reduce((a,b)=>a+b,0) || 1;
    return `<div class="deep-stacked-single"><div class="deep-stacked-track">${data.map((row,i)=>segment(row?.[xKey] ?? row?.label ?? `فئة ${i+1}`,values[i],total,i)).join("")}</div><div class="deep-stack-legend">${data.map((row,i)=>`<span><i class="seg-${i%6}"></i>${escapeHtml(row?.[xKey] ?? row?.label ?? `فئة ${i+1}`)} <strong>${round(values[i]/total*100)}%</strong></span>`).join("")}</div></div>`;
  }

  function renderBulletChart(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const labelKey = chart.xKey || "label", currentKey = chart.currentKey || chart.yKey || "current", targetKey = chart.targetKey || "target";
    const values = data.flatMap(row => [chartValue(row,currentKey), Number.isFinite(Number(chart.targetValue)) ? Number(chart.targetValue) : chartValue(row,targetKey)]);
    const max = Math.max(1, chart.max || 0, ...values);
    return `<div class="deep-bullet-list">${data.slice(0,16).map(row=>{
      const current=chartValue(row,currentKey), target=Number.isFinite(Number(chart.targetValue))?Number(chart.targetValue):chartValue(row,targetKey);
      const currentPct=Math.max(0,Math.min(100,current/max*100)), targetPct=Math.max(0,Math.min(100,target/max*100));
      return `<div class="deep-bullet-row"><span>${escapeHtml(row?.[labelKey] ?? row?.label ?? "—")}</span><div class="deep-bullet-track"><i style="width:${currentPct}%"></i><b style="right:${targetPct}%" title="المستهدف ${round(target)}"></b></div><strong>${round(current)} / ${round(target)}</strong></div>`;
    }).join("")}</div>`;
  }

  function renderDumbbellChart(chart) {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const labelKey=chart.xKey||"label", beforeKey=chart.beforeKey||"before", afterKey=chart.afterKey||"after";
    const vals=data.flatMap(row=>[chartValue(row,beforeKey),chartValue(row,afterKey)]), min=Math.min(...vals,0), max=Math.max(...vals,1), span=Math.max(1e-9,max-min);
    return `<div class="deep-dumbbell-list">${data.slice(0,14).map(row=>{const before=chartValue(row,beforeKey),after=chartValue(row,afterKey),bp=(before-min)/span*100,ap=(after-min)/span*100,left=Math.min(bp,ap),width=Math.max(1,Math.abs(ap-bp));return `<div class="deep-dumbbell-row"><span>${escapeHtml(row?.[labelKey]??"—")}</span><div class="deep-dumbbell-track"><i style="right:${left}%;width:${width}%"></i><b class="before" style="right:${bp}%" title="قبل ${round(before)}"></b><b class="after" style="right:${ap}%" title="بعد ${round(after)}"></b></div><strong>${round(before)} ← ${round(after)}</strong></div>`}).join("")}</div>`;
  }

  function renderParetoChart(chart, compact=false) {
    const data=Array.isArray(chart.data)?chart.data:[], xKey=chart.xKey||"label", yKey=chart.yKey||"gap", max=Math.max(1,...data.map(row=>chartValue(row,yKey))), total=data.reduce((sum,row)=>sum+Math.max(0,chartValue(row,yKey)),0)||1; let running=0;
    return `<div class="deep-pareto-list">${data.slice(0,compact?8:20).map(row=>{const value=Math.max(0,chartValue(row,yKey));running+=value;const cumulative=Number.isFinite(Number(row?.[chart.cumulativeKey]))?Number(row[chart.cumulativeKey]):running/total*100;return `<div class="deep-pareto-row"><span title="${escapeAttr(row?.[xKey]??"—")}">${escapeHtml(row?.[xKey]??"—")}</span><div class="deep-pareto-track"><i style="width:${Math.max(2,value/max*100)}%"></i></div><strong>${round(value)}${escapeHtml(chart.valueSuffix||"")} <em>${round(cumulative)}%</em></strong></div>`}).join("")}</div>`;
  }

  function renderScatterChart(chart) {
    const data=Array.isArray(chart.data)?chart.data:[], xKey=chart.xKey||"x", yKey=chart.yKey||"y"; if(!data.length)return "";
    const xs=data.map(row=>chartValue(row,xKey)), ys=data.map(row=>chartValue(row,yKey)), minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=640,h=220,p=32;
    const sx=x=>p+(x-minX)/Math.max(1e-9,maxX-minX)*(w-p*2), sy=y=>h-p-(y-minY)/Math.max(1e-9,maxY-minY)*(h-p*2);
    return `<div class="deep-scatter-chart"><svg viewBox="0 0 ${w} ${h}" role="img"><line class="axis" x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}"/><line class="axis" x1="${p}" y1="${p}" x2="${p}" y2="${h-p}"/>${data.slice(0,40).map((row,i)=>`<circle class="point" cx="${sx(xs[i])}" cy="${sy(ys[i])}" r="4"><title>${round(xs[i])}, ${round(ys[i])}</title></circle>`).join("")}</svg></div>`;
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
    if (chart.type === "histogram") return renderHistogramChart(chart);
    if (chart.type === "stacked100" || chart.type === "stacked") return renderStacked100Chart(chart);
    if (chart.type === "bullet") return renderBulletChart(chart);
    if (chart.type === "dumbbell") return renderDumbbellChart(chart);
    if (chart.type === "pareto") return renderParetoChart(chart, compact);
    if (chart.type === "scatter") return renderScatterChart(chart);
    if (chart.type === "line") return renderLineChart(chart);
    if (chart.type === "radar") return renderRadarChart(chart);
    if (chart.type === "box") return renderBoxChart(chart);
    if (chart.type === "heatmap") return renderHeatmap(chart);
    if (chart.type === "table") return renderTableChart(chart);
    return renderBarChart(chart, compact);
  }


  function renderPerformanceSummary() {
    const panel = $("analysisTimingPanel");
    if (!panel) return;
    if (window.TAQAREER_CONFIG?.showPerformanceDiagnostics !== true) {
      panel.innerHTML = "";
      panel.classList.add("hidden");
      return;
    }
    const spans = state.performance.spans || [];
    const local = spans.find(item => item.name === "الحسابات وحزمة الأدلة");
    const gemini = [...spans].reverse().find(item => String(item.name || "").startsWith("Gemini"));
    const items = [];
    if (local) items.push(`<span><strong>الحسابات والأدلة</strong>${formatDuration(local.durationMs)}</span>`);
    if (state.performance.cacheHit) {
      items.push(`<span><strong>التحليل التفسيري</strong>مستعاد من الذاكرة</span>`);
    } else if (gemini) {
      items.push(`<span><strong>التحليل التفسيري</strong>${formatDuration(gemini.durationMs)}</span>`);
    }
    const server = state.performance.aiServerTiming || {};
    if (server.acceptedDiagnosticSections !== undefined) {
      items.push(`<span><strong>بنية التحليل</strong>${server.acceptedDiagnosticSections || 0} قراءات · ${server.acceptedFindings || 0} استنتاجات · ${server.acceptedInterventions || 0} تدخلات</span>`);
    }
    if (state.performance.payloadChars) items.push(`<span><strong>حمولة الخدمة</strong>${Math.max(1, Math.round(state.performance.payloadChars / 1024))} كيلوبايت</span>`);
    panel.innerHTML = items.join("");
    panel.classList.toggle("hidden", !items.length);
  }

  function rankingTableHtml(title, rows, columns, note = "") {
    if (!Array.isArray(rows) || !rows.length) return "";
    return `<article class="ranking-table-card"><header><h5>${escapeHtml(title)}</h5>${note ? `<span>${escapeHtml(note)}</span>` : ""}</header><div class="ranking-table-wrap"><table class="ranking-table"><thead><tr>${columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td class="${column.key === "rankLabel" ? "rank-cell" : ""}">${escapeHtml(row[column.key] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div></article>`;
  }

  function renderRankingResults(analysis) {
    const section = $("rankingResultsSection");
    const target = $("rankingResultsContent");
    const tables = analysis?.privateTables;
    if (!tables || analysis?.typeId !== "multi_subject_results") {
      section.classList.add("hidden"); target.innerHTML = ""; return;
    }
    const summary = tables.summary || {};
    const parts = [`<div class="ranking-summary-grid">${[
      ["نطاق التحليل", summary.scopeLabel || "—"],
      ["الطلبة", summary.studentCount ?? "—"],
      ["المواد", summary.subjectCount ?? "—"],
      ["المكتملون للترتيب", summary.rankingEligibleCount ?? "—"],
    ].map(([label,value]) => `<article class="ranking-summary-card"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`).join("")}</div>`];
    if (tables.schoolTopTen?.length) parts.push(rankingTableHtml("العشرة الأوائل على مستوى المدرسة / الدفعة", tables.schoolTopTen, [
      { key:"rankLabel", label:"المركز" }, { key:"name", label:"اسم الطالب" }, { key:"coreMeanDisplay", label:"متوسط الأساسية" }, { key:"allMeanDisplay", label:"متوسط جميع المواد" }, { key:"rankingScoreDisplay", label:"درجة الترتيب" }
    ], tables.rankingFormulaLabel || ""));
    if (tables.incompleteRankingCount) parts.push(`<div class="soft-note">استُبعد ${escapeHtml(tables.incompleteRankingCount)} سجلًا من ترتيب الدفعة لعدم اكتمال مادة أساسية. لم يُحسب لهم متوسط ناقص.</div>`);
    const subjectLists = tables.subjectTopTen || {};
    Object.entries(subjectLists).forEach(([subject, rows]) => {
      const table = rankingTableHtml(`الأوائل في ${subject}`, rows, [
        { key:"rankLabel", label:"المركز" }, { key:"name", label:"اسم الطالب" }, { key:"scoreDisplay", label:"الدرجة" }, { key:"level", label:"المستوى" }
      ]);
      if (table) { const countLabel = rows.length > 10 ? `${rows.length} طالبًا بسبب التعادلات` : `${rows.length} طلاب`; parts.push(`<details class="ranking-subject-details" ${Object.keys(subjectLists).length === 1 ? "open" : ""}><summary>${escapeHtml(subject)} · ${countLabel}</summary>${table}</details>`); }
    });
    target.innerHTML = parts.join("");
    section.classList.remove("hidden");
  }

  function renderResults() {
    const a = state.reconciledAnalysis;
    if (!a) return;
    const descriptiveOnly = a.scaleSemantics?.direction === "descriptive-only";
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
    $("deepChartsGrid").innerHTML = extraCharts.map(chart=>`<article class="deep-chart-card ${['heatmap','table','bullet','dumbbell','scatter'].includes(chart.type)?'wide':''}" data-chart-type="${escapeAttr(chart.type||'bar')}"><h5>${escapeHtml(chart.title)}</h5><p>${escapeHtml(chart.description||"")}</p>${renderChartContent(chart)}</article>`).join("");
    renderRankingResults(a);

    const profile = a.analysisProfile || {};
    const profileDimensions = profile.dimensions || [];
    const decisionUses = profile.decisionUse || profile.decisionUses || [];
    const profileCards = [
      { title:"عائلة التحليل", value:publicAnalysisMethod(profile.method || profile.purpose || a.kind), items:profileDimensions.map(item=>publicDisplayLabel(item,"بعد تحليلي")) },
      { title:"كفاية البيانات", value:publicDisplayLabel(profile.dataAdequacy || profile.dataSufficiency || "غير محددة","غير محددة"), items:(profile.assumptions || []).map(item=>publicDisplayLabel(item,"افتراض تحليلي")) },
      { title:"القرارات التي يدعمها", value:`${decisionUses.length} استخدامات`, items:decisionUses.map(item=>publicDisplayLabel(item,"استخدام تحليلي")) },
      { title:"نطاق التحليل", value:state.type.name, items:[`المصدر: ${displaySourceLabel()}`,`الثقة في النوع: ${state.confidence}%`,`طريقة التصنيف: ${state.recognitionStatus}`] }
    ];
    $("diagnosticProfileSection").classList.toggle("hidden", !profileCards.length);
    $("diagnosticProfileGrid").innerHTML = profileCards.map(card=>`<article class="diagnostic-card"><h5>${escapeHtml(card.title)}</h5><strong>${escapeHtml(card.value)}</strong><ul>${card.items.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`).join("");

    const diagnosticSections = (a.diagnosticSections || []).slice(0, 10);
    $("diagnosticSectionsSection").classList.toggle("hidden", !diagnosticSections.length);
    $("diagnosticSectionsGrid").innerHTML = diagnosticSections.map(section => {
      const evidence = humanizeEvidenceRefs(section.evidenceRefs || []);
      const implications = Array.isArray(section.implications) ? section.implications : [];
      const source = descriptiveOnly ? "تحليل وصفي" : "تحليل تربوي موثق";
      const alternatives = Array.isArray(section.alternativeExplanations) ? section.alternativeExplanations : [];
      const requests = Array.isArray(section.dataRequests) ? section.dataRequests : [];
      return `<article class="diagnostic-section-card"><div class="diagnostic-section-meta"><span>${source}</span><span>ثقة ${escapeHtml(section.confidence || "متوسطة")}</span></div><h5>${escapeHtml(section.title || "قراءة تفسيرية")}</h5><p>${escapeHtml(publicText(section.analysis || ""))}</p>${evidence && evidence !== "لم يحدد مرجع دليل واضح." ? `<div class="soft-note">الدليل: ${escapeHtml(evidence)}</div>` : ""}${implications.length ? `<h6>الآثار العملية</h6><ul>${implications.map(item=>`<li>${escapeHtml(publicText(item))}</li>`).join("")}</ul>` : ""}${alternatives.length ? `<h6>تفسيرات بديلة محتملة</h6><ul>${alternatives.map(item=>`<li>${escapeHtml(publicText(item))}</li>`).join("")}</ul>` : ""}${requests.length ? `<h6>بيانات مطلوبة للتحقق</h6><ul>${requests.map(item=>`<li>${escapeHtml(publicText(item))}</li>`).join("")}</ul>` : ""}</article>`;
    }).join("");

    // التحسين الخارجي جزء تلقائي من مسار التحليل ولا يظهر للمستخدم كمرحلة مستقلة.
    // تبقى واجهة النتائج هادئة: لا رسائل انتظار، لا أسماء مزودين، ولا أزرار إعادة.
    $("analysisModeChip").textContent = descriptiveOnly ? "تحليل وصفي مكتمل" : "تحليل تربوي مكتمل";
    $("analysisModeChip").className = "success-chip";
    const notice = $("aiResultNotice");
    notice.innerHTML = "";
    notice.classList.add("hidden");
    notice.classList.remove("error", "warning");
    renderPerformanceSummary();

    $("executiveTitle").textContent = a.executiveTitle;
    $("executiveSummary").textContent = a.executiveSummary;

    const findings = (a.findings || []).slice(0, 18);
    $("findings").innerHTML = findings.map((f,i)=>{
      const sourceLabel=descriptiveOnly ? "تحليل وصفي" : "تحليل تربوي موثق";
      const severity=f.severity||"medium";
      const limitations=f.limitations||[];
      const limitationHtml=limitations.length?`<h5>الحدود</h5><p>${limitations.map(escapeHtml).join("، ")}</p>`:"";
      const statement=f.statement||f.title||"";
      const statementHtml=statement&&statement!==f.title?`<p class="finding-statement">${escapeHtml(statement)}</p>`:"";
      const evidence=f.evidence||humanizeEvidenceRefs(f.evidenceRefs||[]);
      const impact=f.educationalImpact||f.impact||"";
      const action=f.recommendedAction||f.action||"";
      return `<details class="finding" ${i<2?'open':''}><summary><div class="finding-title"><strong>${escapeHtml(f.title)}</strong><small>${escapeHtml(impact)}</small></div><div class="finding-badges"><span class="source-pill ai">${sourceLabel}</span><span class="confidence-pill severity-${severity}">ثقة ${escapeHtml(f.confidence)}</span></div></summary><div class="finding-body">${statementHtml}<h5>الدليل</h5><p>${escapeHtml(evidence)}</p><h5>الإجراء المرتبط</h5><p>${escapeHtml(action)}</p>${limitationHtml}</div></details>`;
    }).join("");

    const tools=(a.qualityTools||[]).filter(tool=>tool.conditionsMet!==false).slice(0,12);
    $("qualityToolsSection").classList.toggle("hidden",!tools.length);
    $("qualityToolsGrid").innerHTML=tools.map(tool=>`<article class="quality-tool-card"><strong>${escapeHtml(publicDisplayLabel(tool.name,"أداة جودة"))}</strong><p>${escapeHtml(publicText(tool.reason||""))}</p><span>مطبقة فعليًا</span>${tool.interpretation?`<div class="tool-output">${escapeHtml(publicText(tool.interpretation))}</div>`:""}</article>`).join("");

    const plans=(a.improvementPlan||[]).slice(0,10);
    $("improvementPlanSection").classList.toggle("hidden",!plans.length);
    $("improvementPlanBody").innerHTML=plans.map(item=>`<tr><td data-label="الأولوية">${escapeHtml(publicText(item.priority))}</td><td data-label="المشكلة والفئة"><strong>${escapeHtml(publicText(item.issue))}</strong><small>${escapeHtml(publicText(item.targetGroup))}</small></td><td data-label="الإجراء">${escapeHtml(publicText(item.action))}<small>بديل عند عدم التحسن: ${escapeHtml(publicText(item.contingency))}</small></td><td data-label="المسؤول والزمن">${escapeHtml(publicText(item.responsibleRole))}<small>${escapeHtml(publicText(item.timeframe))}</small></td><td data-label="مؤشر النجاح والمتابعة">${escapeHtml(publicText(item.successIndicator))}<small>${escapeHtml(publicText(item.monitoringMethod))}</small></td></tr>`).join("");

    const monitoring=(a.monitoringPlan||[]).slice(0,8);
    $("monitoringPlanSection").classList.toggle("hidden",!monitoring.length);
    $("monitoringPlanGrid").innerHTML=monitoring.map(item=>`<article class="monitoring-card"><small>${escapeHtml(publicText(item.timing||""))}</small><h5>${escapeHtml(publicText(item.stage||""))}</h5><p>${escapeHtml(publicText(item.measure||""))}</p><p class="owner">${escapeHtml(publicText(item.owner||""))}</p></article>`).join("");

    const cautions=a.cautions||[];
    const limitations=[...new Set([...(a.limitations||[]), ...cautions].map(item => publicText(item)).filter(Boolean))];
    $("analysisLimitations").classList.toggle("hidden",!limitations.length);
    $("analysisLimitationsList").innerHTML=limitations.map(item=>`<li>${escapeHtml(item)}</li>`).join("");
    $("aiCautions").classList.add("hidden");
    $("aiCautionsList").innerHTML="";

    const firstPlan=plans[0];
    const action=firstPlan?{title:firstPlan.action,text:`${firstPlan.responsibleRole} · ${firstPlan.timeframe}`,priority:firstPlan.priority,indicator:firstPlan.successIndicator}:a.action;
    $("actionTitle").textContent=publicText(action?.title||"مراجعة النتائج");
    $("actionText").textContent=publicText(action?.text||"");
    $("actionPriority").textContent=publicText(action?.priority||"متوسطة");
    $("actionIndicator").textContent=publicText(action?.indicator||"مؤشر متابعة");
    $("primaryActionCard")?.classList.toggle("hidden", plans.length > 0);

    const suggested=delta?.suggestedNewType || a.suggestedNewType; const showSuggested=Boolean(suggested?.needed);
    $("aiSuggestedType").classList.toggle("hidden",!showSuggested);
    if(showSuggested){$("aiSuggestedTypeName").textContent=suggested.nameAr||"نوع تحليلي جديد";$("aiSuggestedTypePurpose").textContent=suggested.purpose||"يحتاج الغرض التربوي إلى مراجعة المستخدم.";const tags=[...(suggested.requiredFields||[]).map(item=>`حقل: ${item}`),...(suggested.analysisFamily||[]).map(item=>`تحليل: ${item}`)];$("aiSuggestedTypeMeta").innerHTML=tags.map(item=>`<span>${escapeHtml(item)}</span>`).join("");}
  }

  function openOfficialReport(reportMode = "full") {
    if (!state.reconciledAnalysis?._reconciliation?.aiPrimary) {
      alert("لا يوجد تحليل تربوي مكتمل لإنشاء التقرير الرسمي.");
      return;
    }
    try {
      window.TaqareerReports.openReport({
        analysis: state.reconciledAnalysis,
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
      }, { reportMode: reportMode === "executive" ? "executive" : "full" });
    } catch (error) {
      alert(error.message || "تعذر إنشاء التقرير الرسمي.");
    }
  }

  function exportAnalysis() {
    const payload = {
      app: "تقارير",
      version: "1.2.25",
      generatedAt: new Date().toISOString(),
      source: state.sourceName,
      sourceMeta: state.sourceMeta,
      recognizedType: { id: state.type.id, name: state.type.name, confidence: state.confidence, semanticProfile: state.semanticProfile },
      quality: state.quality,
      localAnalysis: state.analysis,
      aiDelta: state.aiResult,
      analysis: state.reconciledAnalysis,
      aiError: state.aiError || null
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="taqareer-analysis-v1.2.25.json"; a.click(); URL.revokeObjectURL(url);
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
      localRecognition: null, aiRecognition: null, semanticProfile: null, recognitionStatus: "محلي", recognitionRequestId: state.recognitionRequestId + 1,
      analysisRequestId: state.analysisRequestId + 1,
      sampleMaxScore: null, pendingSource: null, sourceMeta: null, pendingManualFileName: "", pendingVisualPreview: null, inputRecovery: null,
      multiSubjectOptions: { mode: "all", subject: "", includeSubjectTopTen: true, includeSchoolRanking: true },
      scaleSemantics: null,
      previewExpanded: false,
      inputRecovery: null
    });
    clearInputRecovery();
    $("fileInput").value = ""; $("pasteInput").value = ""; $("manualTextInput").value = "";
    if ($("multiSubjectScopeSelect")) $("multiSubjectScopeSelect").value = "all";
    if ($("includeSubjectTopTenInput")) $("includeSubjectTopTenInput").checked = true;
    if ($("includeSchoolRankingInput")) $("includeSchoolRankingInput").checked = true;
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
    });
    $("retryInputBtn")?.addEventListener("click", retryInputRecovery);
    $("manualFallbackBtn")?.addEventListener("click", openInputManualFallback);

    $("backToInputBtn").addEventListener("click",()=>showPanel(1));
    $("togglePreviewColumnsBtn").addEventListener("click", () => { state.previewExpanded = !state.previewExpanded; renderReview(); });
    document.querySelectorAll('input[name="scaleDirection"]').forEach(input => input.addEventListener("change", event => {
      if (event.target.checked) setScaleDirection(event.target.value);
    }));
    [$("scaleMinInput"), $("scaleMaxInput")].filter(Boolean).forEach(input => input.addEventListener("change", () => {
      const direction = currentScaleDirection();
      if (direction !== "unknown") setScaleDirection(direction);
    }));
    $("toSetupBtn").addEventListener("click",()=>{
      if (scaleGuardApplies() && currentScaleDirection() === "unknown") {
        renderReview();
        $("scaleSemanticsCard")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        return;
      }
      if (state.quality.blockers.length) return;
      renderSetup();
      showPanel(3);
    });
    $("multiSubjectScopeSelect").addEventListener("change", renderMultiSubjectWorkspace);
    $("multiSubjectSubjectSelect").addEventListener("change", renderMultiSubjectWorkspace);
    $("includeSubjectTopTenInput").addEventListener("change", renderMultiSubjectWorkspace);
    $("includeSchoolRankingInput").addEventListener("change", renderMultiSubjectWorkspace);
    $("backToReviewBtn").addEventListener("click",()=>showPanel(2));
    $("runAnalysisBtn").addEventListener("click",runAnalysis);
    $("restartBtn").addEventListener("click",reset); $("resetTopBtn").addEventListener("click",reset); $("exportBtn").addEventListener("click",exportAnalysis); $("executiveReportBtn").addEventListener("click",()=>openOfficialReport("executive")); $("officialReportBtn").addEventListener("click",()=>openOfficialReport("full"));
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
      if (e.target.checked) verifyAiConnectionOnLoad();
    });
    window.addEventListener?.("taqareer-ai-health", updateAiStatusUi);
    $("changeTypeBtn").addEventListener("click",()=>{ $("typeSelect").value=state.type.id; $("typeDialog").showModal(); });
    $("applyTypeBtn").addEventListener("click", e => { e.preventDefault(); const chosen=formTypes.find(t=>t.id===$("typeSelect").value) || (state.type?.id === $("typeSelect").value ? state.type : null); if(chosen){state.type=chosen;state.confidence=100;state.recognitionStatus="اعتماد يدوي من المستخدم";if(!scaleGuardApplies(chosen.id)){state.scaleSemantics=null;if(state.sourceMeta){delete state.sourceMeta.scaleSemantics;delete state.sourceMeta.scaleDirection;}}state.semanticProfile=window.TaqareerAnalysisProfiler?.profileTable?.({headers:state.headers,rows:state.rows,sourceMeta:state.sourceMeta||{},typeId:state.type.id})||state.semanticProfile;applyScaleSemanticsToProfile();state.quality=assessQuality(state.headers,state.rows,state.type,state.sourceMeta||{},state.semanticProfile);renderReview();} $("typeDialog").close(); });
    document.body.dataset.activeStep = "1";
    updateAiStatusUi();
    verifyAiConnectionOnLoad();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
