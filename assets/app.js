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
      id: "unknown",
      title: "نوع جديد",
      desc: "نموذج متابعة خطة علاجية غير موجود في السجل الحالي.",
      maxScore: 100,
      text: `اسم الخطة,الفئة المستهدفة,نسبة التنفيذ,الأثر الملحوظ,الإجراء القادم\nخطة القراءة,الطلبة المتعثرون,70,تحسن جزئي,تدريب فردي\nخطة الحساب,الصف التاسع,55,تقدم محدود,زيادة الممارسة\nخطة الحضور,الحالات المتكررة,82,تحسن واضح,متابعة أسبوعية`
    }
  ];

  const state = {
    headers: [], rows: [], sourceName: "", rawText: "", delimiter: ",", type: formTypes.at(-1), confidence: 0,
    quality: { blockers: [], warnings: [], info: [], completeness: 0 },
    analysis: null, sampleMaxScore: null
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

  function classify(headers, rows) {
    const sampleText = normalize(headers.join(" ") + " " + rows.slice(0, 12).map(r => Object.values(r).join(" ")).join(" "));
    let best = formTypes.at(-1), bestScore = 0;
    formTypes.slice(0, -1).forEach(type => {
      const matches = type.keywords.filter(k => sampleText.includes(normalize(k))).length;
      const score = type.keywords.length ? matches / type.keywords.length : 0;
      if (matches >= type.min && score > bestScore) { best = type; bestScore = score; }
    });
    if (best.id === "unknown") return { type: best, confidence: 48 };
    const confidence = Math.min(97, Math.round(60 + bestScore * 38));
    return { type: best, confidence };
  }

  function assessQuality(headers, rows) {
    const blockers = [], warnings = [], info = [];
    if (!headers.length) blockers.push({ title: "لا توجد عناوين أعمدة", detail: "لا يمكن فهم بنية البيانات دون عناوين." });
    if (!rows.length) blockers.push({ title: "لا توجد سجلات", detail: "الملف لا يحتوي بيانات بعد صف العناوين." });
    const total = Math.max(1, headers.length * rows.length);
    let missing = 0;
    rows.forEach(r => headers.forEach(h => { if (String(r[h] ?? "").trim() === "") missing++; }));
    const completeness = Math.round((1 - missing / total) * 1000) / 10;
    if (missing > 0) warnings.push({ title: `${missing} قيمة مفقودة`, detail: `اكتمال البيانات ${completeness}%. سيستمر التحليل مع توضيح أثر النقص.` });
    else info.push({ title: "لا توجد قيم مفقودة", detail: "جميع الخلايا في نطاق الجدول المرفوع مكتملة." });

    const signatures = rows.map(r => headers.map(h => normalize(r[h])).join("|"));
    const duplicates = signatures.length - new Set(signatures).size;
    if (duplicates > 0) warnings.push({ title: `${duplicates} سجل مكرر`, detail: "لم تُحذف السجلات تلقائيًا. راجعها قبل الاعتماد النهائي." });
    if (headers.length > 30) info.push({ title: "عدد كبير من الأعمدة", detail: "قد يمثل الملف أداءً متعدد المواد أو أداة مركبة." });
    return { blockers, warnings, info, completeness };
  }

  function ingest(text, sourceName, sampleMaxScore = null) {
    clearMessage("inputMessage");
    try {
      const parsed = parseDelimited(text);
      state.headers = parsed.headers; state.rows = parsed.rows; state.delimiter = parsed.delimiter; state.rawText = text;
      state.sourceName = sourceName; state.sampleMaxScore = sampleMaxScore;
      const recognized = classify(state.headers, state.rows); state.type = recognized.type; state.confidence = recognized.confidence;
      state.quality = assessQuality(state.headers, state.rows);
      renderReview(); showPanel(2);
    } catch (err) { setMessage("inputMessage", err.message || "تعذر قراءة البيانات.", true); }
  }

  function renderReview() {
    $("recognizedType").textContent = state.type.name;
    $("recognizedPurpose").textContent = state.type.purpose;
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

  function renderSetup() {
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
      supervision_narrative: ["تصنيف الأحكام والأدلة", "ربط جوانب التطوير بالدعم والتوصيات", "فحص قوة الدليل واتساقه", "إنشاء خطة نمو مهني"],
      unknown: ["تحليل بنية الحقول وأنواع القيم", "استخراج المؤشرات الرقمية المتاحة", "تكوين استنتاجات عامة محدودة", "اقتراح تعريف تحليلي جديد للمراجعة"]
    };
    $("analysisPlan").innerHTML = plans[state.type.id].map(x => `<li>${escapeHtml(x)}</li>`).join("");
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

  function runAnalysis() {
    clearMessage("setupMessage");
    const scoreColumn = $("scoreColumnSelect").value;
    const levelColumn = $("levelColumnSelect").value;
    const maxScore = parseNumber($("maxScoreInput").value);
    const thresholdPct = parseNumber($("masteryThresholdInput").value);
    if (!Number.isFinite(thresholdPct) || thresholdPct <= 0 || thresholdPct > 100) return setMessage("setupMessage", "حد الإتقان يجب أن يكون بين 1 و100.", true);

    if (state.type.id === "level_distribution") {
      state.analysis = analyzeLevelDistribution();
    } else {
      const rawValues = scoreColumn ? state.rows.map(r => parseNumber(r[scoreColumn])).filter(Number.isFinite) : [];
      let excludedOutOfRange = 0;
      const values = rawValues.filter(v => {
        if (Number.isFinite(maxScore) && maxScore > 0 && (v < 0 || v > maxScore)) { excludedOutOfRange++; return false; }
        return true;
      });
      if (!values.length) return setMessage("setupMessage", "اختر عمودًا رقميًا صالحًا للتحليل، أو راجع الدرجة الكلية والقيم الخارجة عن نطاقها.", true);
      state.analysis = analyzeScores(values, scoreColumn, levelColumn, maxScore, thresholdPct);
      if (excludedOutOfRange > 0) {
        state.analysis.findings.unshift(finding("استُبعدت قيم خارج النطاق", `استُبعدت ${excludedOutOfRange} قيمة أقل من صفر أو أعلى من الدرجة الكلية المؤكدة (${maxScore}).`, "مرتفعة", "إدخال هذه القيم كان سيشوّه المتوسط ونسبة الإتقان.", "مراجعة السجلات المستبعدة وتصحيحها قبل اعتماد التقرير النهائي."));
      }
    }
    renderResults(); showPanel(4);
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
    if (a.kind === "scores") {
      const metrics = [
        ["السجلات الصالحة", a.n, "قيمة رقمية"], ["المتوسط", round(a.mean), a.hasMax ? `من ${a.maxScore}` : "قيمة خام"],
        ["الوسيط", round(a.med), "منتصف التوزيع"], [a.hasMax ? "الإتقان" : "المدى", a.hasMax ? `${round(a.masteryPct)}%` : round(a.max-a.min), a.hasMax ? `حد ${a.thresholdPct}%` : "أعلى - أدنى"]
      ];
      $("metrics").innerHTML = metrics.map(m => `<div class="metric"><small>${m[0]}</small><strong>${m[1]}</strong><span>${m[2]}</span></div>`).join("");
      renderBars(a.bins.map(b => ({label:b.label,count:b.count})), "توزيع الدرجات");
    } else {
      const top = [...a.entries].sort((x,y)=>y.count-x.count)[0];
      const metrics = [["إجمالي الطلبة", a.total, "كل المستويات"], ["عدد المستويات", a.entries.length, "فئات مكتشفة"], ["الفئة الأكبر", top?.label||"—", `${top?.count||0} طالبًا`], ["نسبتها", `${round(top?.pct||0)}%`, "من الإجمالي"]];
      $("metrics").innerHTML = metrics.map(m => `<div class="metric"><small>${m[0]}</small><strong>${m[1]}</strong><span>${m[2]}</span></div>`).join("");
      renderBars(a.entries.map(e => ({label:e.label,count:e.count})), "توزيع مستويات الأداء");
    }
    $("executiveTitle").textContent = a.executiveTitle; $("executiveSummary").textContent = a.executiveSummary;
    $("findings").innerHTML = a.findings.map((f,i) => `<details class="finding" ${i===0?'open':''}><summary><div class="finding-title"><strong>${escapeHtml(f.title)}</strong><small>${escapeHtml(f.impact)}</small></div><span class="confidence-pill">ثقة ${escapeHtml(f.confidence)}</span></summary><div class="finding-body"><h5>الدليل</h5><p>${escapeHtml(f.evidence)}</p><h5>الإجراء المرتبط</h5><p>${escapeHtml(f.action)}</p></div></details>`).join("");
    $("actionTitle").textContent = a.action.title; $("actionText").textContent = a.action.text; $("actionPriority").textContent = a.action.priority; $("actionIndicator").textContent = a.action.indicator;
  }

  function renderBars(items, title) {
    $("chartTitle").textContent = title; const max = Math.max(1, ...items.map(x=>x.count)); $("chartMeta").textContent = `${items.reduce((s,x)=>s+x.count,0)} سجل`;
    $("chartArea").innerHTML = items.map(x => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(5, x.count/max*180)}px" title="${x.count}"></div><strong>${escapeHtml(x.label)}</strong><span>${x.count}</span></div>`).join("");
  }

  function exportAnalysis() {
    const payload = { app: "تقارير", version: "0.2.0", generatedAt: new Date().toISOString(), source: state.sourceName, recognizedType: { id: state.type.id, name: state.type.name, confidence: state.confidence }, quality: state.quality, analysis: state.analysis };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="taqareer-analysis.json"; a.click(); URL.revokeObjectURL(url);
  }

  function escapeHtml(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(v) { return escapeHtml(v); }

  function reset() {
    Object.assign(state, { headers: [], rows: [], sourceName: "", rawText: "", delimiter: ",", type: formTypes.at(-1), confidence: 0, quality: { blockers: [], warnings: [], info: [], completeness: 0 }, analysis: null, sampleMaxScore: null });
    $("fileInput").value = ""; $("pasteInput").value = ""; clearMessage("inputMessage"); clearMessage("setupMessage"); showPanel(1);
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
    $("fileInput").addEventListener("change", async e => {
      const file=e.target.files[0]; if(!file)return; const ext=file.name.split(".").pop().toLowerCase();
      if (!["csv","tsv","txt"].includes(ext)) return setMessage("inputMessage", `صيغة ${ext.toUpperCase()} مدرجة في الخطة لكنها غير مفعلة في هذه النسخة. استخدم CSV حاليًا أو نموذجًا جاهزًا.`, false);
      const text=await file.text(); ingest(text, file.name);
    });
    const zone=$("uploadZone"); ["dragenter","dragover"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add("dragover");})); ["dragleave","drop"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove("dragover");}));
    zone.addEventListener("drop", async e => { const file=e.dataTransfer.files[0]; if(!file)return; const ext=file.name.split(".").pop().toLowerCase(); if(!["csv","tsv","txt"].includes(ext)) return setMessage("inputMessage", `صيغة ${ext.toUpperCase()} غير مفعلة بعد.`, false); ingest(await file.text(), file.name); });

    $("backToInputBtn").addEventListener("click",()=>showPanel(1));
    $("toSetupBtn").addEventListener("click",()=>{renderSetup();showPanel(3);});
    $("backToReviewBtn").addEventListener("click",()=>showPanel(2));
    $("runAnalysisBtn").addEventListener("click",runAnalysis);
    $("restartBtn").addEventListener("click",reset); $("resetTopBtn").addEventListener("click",reset); $("exportBtn").addEventListener("click",exportAnalysis);
    $("changeTypeBtn").addEventListener("click",()=>{ $("typeSelect").value=state.type.id; $("typeDialog").showModal(); });
    $("applyTypeBtn").addEventListener("click", e => { e.preventDefault(); const chosen=formTypes.find(t=>t.id===$("typeSelect").value); if(chosen){state.type=chosen;state.confidence=100;renderReview();} $("typeDialog").close(); });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
