(() => {
  "use strict";

  const VERSION = "1.2.33";

  const FAMILY_LABELS = Object.freeze({
    adaptive_profile_analysis: "بناء تحليل تكيفي وفق البنية الدلالية",
    aggregate_consistency_check: "مطابقة المجاميع والنسب مع الصف الإجمالي",
    comparative_analysis: "مقارنة المقاييس أو الفئات وفق بنية الملف",
    component_analysis: "تحليل مكوّنات الأداء وتحديد الفجوات",
    concentration_analysis: "قياس التركّز والتفاوت بين المستويات",
    consistency_analysis: "فحص الاتساق والتباين السياقي بين الأقسام",
    criterion_analysis: "تحليل بنود التقويم وفق المعيار المعتمد",
    cross_subject_comparison: "مقارنة الأداء بين المواد",
    cross_subject_relationships: "تحليل العلاقات الوصفية بين المواد",
    descriptive_statistics: "التحليل الوصفي للتوزيع والتشتت",
    distribution_analysis: "تحليل توزيع الفئات ومركز التوزيع",
    domain_comparison: "مقارنة المجالات وترتيب الفجوات",
    enrollment_status_summary: "تلخيص حالات القيد أو النتيجة دون تفسير سببي",
    evidence_analysis: "تحليل الأدلة وقوة الاستناد",
    gap_analysis: "تحليل الفجوات عن المستوى المرجعي",
    gap_analysis_if_target: "تحليل الفجوات عند توفر هدف أو مرجع معتمد",
    group_comparison: "مقارنة المجموعات وترتيب الأولوية",
    improvement_planning: "بناء خطة تحسين قابلة للمتابعة",
    indicator_analysis: "تحليل المؤشرات وترتيب الفجوات",
    indicator_comparison: "مقارنة المؤشرات والمجالات",
    indicator_descriptive_analysis: "وصف المؤشرات وتوزيع قيمها دون حكم اتجاهي",
    level_distribution: "تحليل توزيع مستويات الأداء",
    longitudinal_analysis: "تحليل التغير عبر الزمن عند توفر قياسات متتابعة",
    mastery_analysis: "تحليل الإتقان وحساسية المعيار",
    mean_mode_consistency: "فحص اتساق المتوسط مع القيمة الأكثر تكرارًا",
    narrative_evidence: "تحليل الأدلة السردية وقوة الاستدلال",
    paired_comparison_if_linked: "مقارنة القياسات المترابطة عند ثبوت الارتباط",
    priority_analysis: "ترتيب أولويات التحسين وفق حجم الفجوة",
    priority_ranking: "ترتيب الأولويات حسب الفجوة والأثر",
    professional_growth_planning: "بناء خطة نمو مهني قابلة للقياس",
    ranking: "ترتيب القيم أو الفئات وفق المقياس المعتمد",
    recommendation_quality: "فحص جودة الدعم والتوصيات وقابليتها للتنفيذ والقياس",
    relationship_analysis_if_valid: "تحليل العلاقات عند تحقق شروطها الإحصائية",
    reverse_scale_distribution: "تحليل توزيع المقياس العكسي وفق دلالته المعتمدة",
    school_level_subject_analysis: "تحليل المواد على مستوى المدرسة أو الدفعة",
    score_level_consistency: "فحص اتساق الدرجة الرقمية مع مستوى الأداء",
    student_grouping: "تقسيم الطلبة إلى فئات تدخل قابلة للمتابعة",
    student_profile: "بناء ملف أداء الطالب عبر المؤشرات المتاحة",
    student_profile_segmentation: "فصل التعثر متعدد المواد عن التعثر التخصصي",
    subject_comparison: "مقارنة المواد وترتيب الأداء والأولوية",
    visit_separation: "فصل الزيارات إلى وحدات تحليل مستقلة",
    within_visit_numeric_narrative_alignment: "مطابقة التقدير الرقمي بالدليل السردي داخل الزيارة"
  });

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function unique(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = clean(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function familyLabel(value) {
    const key = clean(value);
    return FAMILY_LABELS[key] || "";
  }

  function resolvePlan({ semanticFamilies = [], fallbackPlan = [], maxItems = 4 } = {}) {
    const semantic = unique((Array.isArray(semanticFamilies) ? semanticFamilies : []).map(familyLabel).filter(Boolean));
    const fallback = unique(Array.isArray(fallbackPlan) ? fallbackPlan.map(clean).filter(Boolean) : []);
    return unique([...semantic, ...fallback]).slice(0, Math.max(1, Number(maxItems) || 4));
  }

  function evidencePolicy({ typeId = "unknown", semanticProfile = {}, narrativeMode = false, requiresScoreSettings = false } = {}) {
    const shape = clean(semanticProfile?.shape);
    const dataNature = clean(semanticProfile?.dataNature);
    const measureType = clean(semanticProfile?.measureType);

    if (narrativeMode || shape === "narrative_document" || /narrative/.test(dataNature)) {
      return {
        title: "الأدلة البنيوية والسردية",
        items: [
          "عدّ العبارات وربط كل عبارة بالقسم الذي وردت فيه دون تحويل النص إلى جدول درجات.",
          "فحص حضور الأقسام المتوقعة واتساقها السياقي مع الاحتفاظ بمرجع الصفحة أو السطر.",
          "كشف التكرار الموضوعي والتباين السياقي دون اعتباره تناقضًا مؤكدًا ما لم تتطابق وحدة التحليل والزمن.",
          "إسناد الاستنتاجات إلى أدلة ثابتة، وفحص قابلية الدعم والتوصيات للتنفيذ والقياس."
        ]
      };
    }

    if (shape === "ordinal_indicator_summary" || ["supervision_indicator", "student_work"].includes(typeId) || measureType.startsWith("ordinal_")) {
      return {
        title: "الحسابات والأدلة المؤشرية",
        items: [
          "عدّ المؤشرات وحساب المتوسطات والتوزيع من الجدول المعتمد فقط، دون إدخال الترويسة أو بيانات المصدر في الحسابات.",
          "فحص اكتمال بنود المؤشرات والقيم غير الصالحة واتساق القيم المجمعة عند توفرها.",
          "تفسير الفجوات والأولويات وفق دلالة المقياس التي أكدها المستخدم؛ ولا يُفترض اتجاه المقياس أو مفهوم الإتقان من تلقاء التطبيق.",
          "إسناد القراءة التفسيرية إلى المؤشرات والأرقام والرسوم ومراجع أدلة ثابتة قابلة للمراجعة."
        ]
      };
    }

    if (typeId === "supervision_multi_visit") {
      return {
        title: "الحسابات والأدلة عبر الزيارات",
        items: [
          "فصل كل زيارة كوحدة تحليل مستقلة قبل أي تجميع أو مقارنة.",
          "حساب المؤشرات داخل كل زيارة وربط التقدير الرقمي بالدليل السردي الموافق له.",
          "فحص اتساق المقياس بين الزيارات ومنع دمج سجلات غير متجانسة في متوسط واحد.",
          "إسناد المقارنات والتدخلات إلى الزيارة والمعلم والمادة والزمن عند توفرها."
        ]
      };
    }

    if (typeId === "multi_subject_results") {
      return {
        title: "الحسابات والأدلة الأكاديمية",
        items: [
          "حساب مؤشرات المواد والطلبة من الدرجات والمستويات الصالحة فقط.",
          "فحص الدرجات الناقصة والقيم غير الصالحة قبل الترتيب أو المقارنة.",
          "تطبيق قواعد الترتيب والتعادل واكتمال المواد الأساسية بصورة حتمية وقابلة للمراجعة.",
          "إسناد القراءة التفسيرية إلى الجداول والرسوم ومراجع الأدلة الرقمية الثابتة."
        ]
      };
    }

    if (typeId === "level_distribution" || shape === "aggregated_level_distribution") {
      return {
        title: "الحسابات والأدلة التوزيعية",
        items: [
          "حساب أعداد ونسب مستويات الأداء من الفئات المجمعة دون اختراع درجات فردية.",
          "فحص اتساق المجاميع والنسب وصفوف الإجمالي واستبعادها من التجميع عند الحاجة.",
          "مقارنة التوزيعات والفجوات بين المجموعات وفق وحدة التحليل الموجودة في المصدر.",
          "إسناد الاستنتاجات إلى الفئات والنسب والرسوم ومراجع الأدلة الثابتة."
        ]
      };
    }

    if (requiresScoreSettings) {
      return {
        title: "الحسابات والأدلة",
        items: [
          "العد والمتوسط والوسيط والتشتت والمئينات وفق الأعمدة الرقمية المعتمدة.",
          "فحص الاكتمال والتكرار والقيم غير الصالحة والقيم المتطرفة قبل التفسير.",
          "حساب الإتقان وفئات التدخل فقط بعد تأكيد الدرجة الكلية أو معيار القياس المطلوب.",
          "إسناد القراءة التفسيرية إلى أرقام ورسوم ومراجع أدلة ثابتة لا تتغير أثناء التحليل."
        ]
      };
    }

    return {
      title: "الحسابات والأدلة المناسبة للبنية",
      items: [
        "اختيار الحسابات الملائمة لطبيعة الحقول ووحدة التحليل بدل فرض إحصاءات درجات على كل ملف.",
        "فحص الاكتمال والتكرار والقيم غير الصالحة داخل البيانات التحليلية الفعلية فقط.",
        "عدم تطبيق الإتقان أو اتجاهات المقاييس أو المقارنات السببية إلا عند وجود عقد قياس يبررها.",
        "إسناد القراءة التفسيرية إلى المؤشرات والجداول والرسوم ومراجع أدلة ثابتة قابلة للمراجعة."
      ]
    };
  }

  window.TaqareerSetupPolicy = Object.freeze({
    VERSION,
    FAMILY_LABELS,
    familyLabel,
    resolvePlan,
    evidencePolicy
  });
})();
