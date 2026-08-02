const types = [
  {
    id: "single-subject",
    icon: "▦",
    short: "نتائج مادة واحدة",
    desc: "درجات ومستويات الطلبة في مادة محددة",
    name: "نتائج الطلبة في مادة واحدة",
    purpose: "تشخيص مستوى الأداء، تحديد مجموعات العلاج والإثراء، واكتشاف الحالات التي تحتاج مراجعة.",
    confidence: 94,
    fields: ["اسم الطالب", "الدرجة", "المستوى", "حالة القيد", "المادة", "الصف"],
    plan: ["تحليل توزيع الدرجات والمستويات", "حساب المؤشرات الوصفية بعد تأكيد الدرجة الكلية", "تحديد الفئات العلاجية والإثرائية", "مراجعة الدرجات غير المعتادة وحالات القيد"],
    tools: [["توزيع الأداء", "أساسي"], ["خريطة حرارة", "عند توفر الشعب"], ["مصفوفة الأولوية", "لخطة التدخل"]],
    metrics: [["عدد السجلات", "268", "بيانات تجريبية"], ["المستوى الأكثر شيوعًا", "ج", "فئة متوسطة"], ["حالات تحتاج مراجعة", "18", "تنبيه لا حكم"], ["الثقة", "94%", "مرتفعة"]],
    chartLabel: "توزيع مستويات الأداء",
    chart: [["أ",17],["ب",27],["ج",33],["د",15],["هـ",8]],
    summary: "يتركز معظم الطلبة في المستويين ب وج، مع فئة محدودة في المستوى هـ تحتاج إلى مراجعة حالة القيد والدرجة قبل إدراجها في أي برنامج علاجي. الأولوية ليست رفع المتوسط العام فقط، بل تقليص الفئة المنخفضة دون إهمال الإثراء للمستويات العليا.",
    findings: [
      ["تجمع واضح في المستوى ج", "مرتفعة", "يمثل المستوى ج النسبة الأكبر من التوزيع التجريبي.", "توجيه التدخل نحو نقل هذه الفئة إلى مستوى ب عبر مهام قصيرة مركزة."],
      ["وجود حالات منخفضة تحتاج تحققًا", "متوسطة", "ظهرت درجات منخفضة وصفرية محتملة، لكن حالة القيد والغياب قد تفسر بعضها.", "مراجعة الحالات قبل وصفها بالتعثر الأكاديمي."],
      ["الحاجة إلى مسارين لا مسار واحد", "مرتفعة", "التوزيع يجمع بين فئة علاجية وفئة عالية الأداء.", "تنفيذ علاج قصير وإثراء متوازٍ بدل برنامج موحد للجميع."]
    ],
    action: ["برنامج علاجي قصير قائم على المهارات", "أربعة أسابيع", "انخفاض نسبة المستوى هـ وتحسن انتقال فئة ج إلى ب"],
  },
  {
    id: "supervision",
    icon: "◉",
    short: "زيارة إشرافية",
    desc: "مؤشرات رقمية وأدلة سردية وتوصيات",
    name: "تقرير زيارة إشرافية قائم على الأدلة",
    purpose: "تحليل الممارسة التدريسية، قوة الأدلة، واتساق جوانب التطوير مع الدعم والتوصيات.",
    confidence: 91,
    fields: ["بنود التقويم", "المتوسط", "جوانب الإجادة", "أدلة الأداء", "الدعم", "التوصيات"],
    plan: ["تجميع البنود في مجالات تدريسية", "فصل الحكم عن الدليل الملاحظ", "تحليل اتساق جوانب التطوير مع الدعم", "بناء خطة نمو مهني قابلة للمتابعة"],
    tools: [["تحليل الفجوة", "عند وجود مستوى مستهدف"], ["مصفوفة الأدلة", "أساسي"], ["PDCA", "لخطة النمو"]],
    metrics: [["مجالات الأداء", "8", "تجريبية"], ["أدلة مباشرة", "72%", "قابلة للتتبع"], ["أولوية التطوير", "التقويم", "بحاجة دعم"], ["الثقة", "91%", "مرتفعة"]],
    chartLabel: "مستوى المجالات التدريسية",
    chart: [["التخطيط",78],["التنفيذ",86],["التقويم",62],["الإدارة",88],["التقنية",84]],
    summary: "تظهر الممارسة قوة في إدارة التعلم وتوظيف المصادر، بينما تحتاج أدوات التقويم وقياس فهم كل طالب إلى تطوير أكثر تحديدًا. بعض عبارات الثناء تحتاج أدلة أوضح حتى تتحول من وصف عام إلى حكم مهني قابل للدفاع.",
    findings: [
      ["قوة في إدارة التعلم", "مرتفعة", "توجد ممارسات محددة تتعلق بتوزيع الوقت وإدارة النشاط العملي.", "نقل الممارسة المتميزة لزملاء المادة عبر زيارة تبادلية."],
      ["ضعف نسبي في التقويم الفردي", "مرتفعة", "التوصيات تشير إلى الحاجة إلى مهام فردية قصيرة وأدوات متنوعة.", "اعتماد أداة تحقق قصيرة في نهاية كل درس."],
      ["بعض الأحكام أوسع من أدلتها", "متوسطة", "وردت أوصاف عامة مثل متميز وفعال دون أثر تعلم محدد في جميع المواضع.", "ربط كل حكم بممارسة وأثر على تعلم الطلبة."]
    ],
    action: ["تحسين التقويم الفردي وربطه بالأدلة", "ثلاث زيارات متابعة", "ارتفاع نسبة الأدلة المباشرة وتحسن مؤشر التقويم"],
  },
  {
    id: "student-work",
    icon: "▤",
    short: "أعمال الطلبة",
    desc: "جودة الأعمال والتغذية الراجعة والتمايز",
    name: "ملخص فحص أعمال الطلبة",
    purpose: "تحليل جودة الأعمال، أثر التغذية الراجعة، التمايز، ومدى تقدم الطلبة عبر الزمن.",
    confidence: 93,
    fields: ["بند التقويم", "المتوسط", "الأكثر تكرارًا", "التغذية الراجعة", "التمايز", "مهارات التعلم"],
    plan: ["تصنيف البنود إلى جودة المهمة وجودة أداء الطالب", "تحديد البنود المتكررة منخفضة الأداء", "تحليل أثر التغذية الراجعة", "اقتراح تحسينات قابلة للملاحظة"],
    tools: [["باريتو", "للبنود المتكررة"], ["تحليل الفجوة", "عند وجود معيار"], ["خريطة حرارة", "للمجالات"]],
    metrics: [["بنود التقويم", "17", "نموذج مرجعي"], ["أولوية أولى", "التمايز", "أثر مباشر"], ["قوة بارزة", "التقدم", "قابل للتتبع"], ["الثقة", "93%", "مرتفعة"]],
    chartLabel: "مستوى مجالات أعمال الطلبة",
    chart: [["الجودة",70],["التقدم",82],["التغذية",64],["التمايز",55],["التنوع",72]],
    summary: "تظهر الأعمال تقدمًا مقبولًا بمرور الوقت، لكن التمايز وجودة التغذية الراجعة لا يزالان أقل من بقية المجالات. تحسين تصميم المهمة وحده لن يكفي ما لم يعرف الطالب تحديدًا كيف يطوّر عمله في المحاولة التالية.",
    findings: [
      ["التمايز هو الفجوة الأوضح", "مرتفعة", "مؤشر التمايز أقل من بقية المجالات في النموذج التجريبي.", "تقديم مستويات مختلفة للمهمة مع معيار نجاح واضح."],
      ["التغذية الراجعة تحتاج أثرًا ظاهرًا", "مرتفعة", "وجود تعليق المعلم لا يعني أن الطالب حسّن عمله بناء عليه.", "توثيق نسخة قبل وبعد في عينة من الأعمال."],
      ["التقدم موجود لكنه غير متساوٍ", "متوسطة", "بعض البنود تشير إلى تحسن بينما تبقى مهارات رقمية وتطبيقية أقل ثباتًا.", "متابعة عينة ممثلة بدل الاكتفاء بمتوسط عام."]
    ],
    action: ["نموذج تغذية راجعة متبوع بتحسين فعلي", "مهمتان دراسيتان", "وجود نسخة محسنة في 80% من العينة"],
  },
  {
    id: "cross-subject",
    icon: "▥",
    short: "أداء عبر المواد",
    desc: "ملف الطالب ومقارنة المواد والفئات",
    name: "ملف الأداء الأكاديمي عبر المواد",
    purpose: "التمييز بين الضعف العام والضعف التخصصي وتحديد التدخل الأكثر ملاءمة لكل طالب أو فئة.",
    confidence: 89,
    fields: ["اسم الطالب", "مواد متعددة", "درجة كل مادة", "المستوى", "الصف", "حالة القيد"],
    plan: ["توحيد المقاييس قبل المقارنة", "بناء ملف أداء لكل طالب", "اكتشاف أنماط الضعف المشتركة بين المواد", "تحديد التدخل الفردي أو العام"],
    tools: [["خريطة حرارة", "أساسي"], ["ملف راداري", "بعد التوحيد"], ["مصفوفة الأولوية", "للتدخلات"]],
    metrics: [["المواد", "11", "متعددة"], ["أنماط مشتركة", "3", "تحتاج تفسيرًا"], ["تفاوت مرتفع", "14%", "من الطلبة"], ["الثقة", "89%", "جيدة"]],
    chartLabel: "متوسطات المواد بعد التوحيد",
    chart: [["العربية",74],["الإنجليزية",69],["الرياضيات",61],["العلوم",67],["الدراسات",76]],
    summary: "تظهر فروق بين المواد، لكن المقارنة المباشرة لا تعتمد قبل توحيد المقاييس والتأكد من اختلاف طبيعة التقويم. الأهم هو اكتشاف الطلبة ذوي الضعف العام مقابل من يواجهون صعوبة في مادة أو مهارة محددة.",
    findings: [
      ["الرياضيات أقل نسبيًا", "متوسطة", "المتوسط الموحد أقل من بقية المواد في البيانات التجريبية.", "تحليل المهارات قبل إطلاق برنامج علاجي عام."],
      ["وجود تفاوت حاد لدى بعض الطلبة", "مرتفعة", "عدد من الملفات يظهر قوة عالية في مواد وضعفًا واضحًا في أخرى.", "تدخل تخصصي بدل تصنيف الطالب بضعف عام."],
      ["المقارنة تحتاج توحيدًا", "مرتفعة", "الدرجات والمقاييس وطبيعة التقويم تختلف بين المواد.", "توحيد الدرجات أو استخدام المستويات قبل المقارنة."]
    ],
    action: ["تشخيص مهاري للطلبة ذوي التفاوت المرتفع", "أسبوعان", "تحديد سبب واضح وخطة تدخل لكل حالة ذات أولوية"],
  }
];

let current = types[0];

const sampleGrid = document.getElementById('sampleGrid');
const fileInput = document.getElementById('fileInput');
const typeDialog = document.getElementById('typeDialog');
const typeSelect = document.getElementById('typeSelect');

types.forEach((item) => {
  const button = document.createElement('button');
  button.className = 'sample-card';
  button.innerHTML = `<span class="sample-icon">${item.icon}</span><strong>${item.short}</strong><span>${item.desc}</span>`;
  button.addEventListener('click', () => selectType(item.id));
  sampleGrid.appendChild(button);

  const option = document.createElement('option');
  option.value = item.id;
  option.textContent = item.name;
  typeSelect.appendChild(option);
});

function selectType(id) {
  current = types.find((t) => t.id === id) || types[0];
  renderRecognition();
  showStep(2);
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const name = file.name.toLowerCase();
  if (name.includes('visit') || name.includes('super') || name.includes('اشراف')) current = types[1];
  else if (name.includes('work') || name.includes('اعمال')) current = types[2];
  else if (name.includes('all') || name.includes('مواد')) current = types[3];
  else current = types[0];
  renderRecognition();
  showStep(2);
});

function showStep(step) {
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active-panel'));
  document.getElementById(`panel-${step}`).classList.add('active-panel');
  document.querySelectorAll('.step').forEach((el) => el.classList.toggle('active', Number(el.dataset.step) === step));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderRecognition() {
  document.getElementById('recognizedName').textContent = current.name;
  document.getElementById('recognizedPurpose').textContent = current.purpose;
  document.getElementById('confidenceValue').textContent = `${current.confidence}%`;
  document.getElementById('confidenceBar').style.width = `${current.confidence}%`;
  document.getElementById('detectedFields').innerHTML = current.fields.map((f) => `<span>${f}</span>`).join('');
  typeSelect.value = current.id;
}

function renderPlan() {
  document.getElementById('analysisPlan').innerHTML = current.plan.map((p) => `<li>${p}</li>`).join('');
  document.getElementById('qualityTools').innerHTML = current.tools.map(([name, note]) => `<div class="tool-item"><strong>${name}</strong><span>${note}</span></div>`).join('');
}

function renderResults() {
  document.getElementById('metrics').innerHTML = current.metrics.map(([label, value, note]) => `<div class="metric"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`).join('');
  document.getElementById('chartLabel').textContent = current.chartLabel;
  const max = Math.max(...current.chart.map(([,v]) => v), 1);
  document.getElementById('miniChart').innerHTML = current.chart.map(([label, value]) => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(10,(value/max)*160)}px"></div><strong>${value}</strong><span>${label}</span></div>`).join('');
  document.getElementById('executiveSummary').textContent = current.summary;
  document.getElementById('findings').innerHTML = current.findings.map(([title, confidence, evidence, action], i) => `
    <details class="finding" ${i === 0 ? 'open' : ''}>
      <summary><div class="finding-title"><strong>${title}</strong><small>استنتاج رقم ${i+1}</small></div><span class="confidence-pill">ثقة ${confidence}</span></summary>
      <div class="finding-body"><strong>الدليل</strong><p>${evidence}</p><strong>الإجراء المقترح</strong><p>${action}</p></div>
    </details>`).join('');
  document.getElementById('nextActionTitle').textContent = current.action[0];
  document.getElementById('nextActionText').textContent = current.findings[0][3];
  document.getElementById('actionPeriod').textContent = current.action[1];
  document.getElementById('actionIndicator').textContent = current.action[2];
}

document.getElementById('toPlanBtn').addEventListener('click', () => { renderPlan(); showStep(3); });
document.getElementById('runAnalysisBtn').addEventListener('click', () => { renderResults(); showStep(4); });
document.getElementById('backToUpload').addEventListener('click', () => showStep(1));
document.getElementById('backToRecognition').addEventListener('click', () => showStep(2));
document.getElementById('restartBtn').addEventListener('click', () => showStep(1));
document.getElementById('changeTypeBtn').addEventListener('click', () => typeDialog.showModal());
document.getElementById('confirmTypeBtn').addEventListener('click', (event) => {
  event.preventDefault();
  current = types.find((t) => t.id === typeSelect.value) || current;
  renderRecognition();
  typeDialog.close();
});

document.querySelectorAll('.step').forEach((el) => {
  el.addEventListener('click', () => {
    const target = Number(el.dataset.step);
    if (target === 1) showStep(1);
    if (target === 2) { renderRecognition(); showStep(2); }
    if (target === 3) { renderPlan(); showStep(3); }
    if (target === 4) { renderResults(); showStep(4); }
  });
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
  const payload = {
    app: 'تقارير',
    previewVersion: '0.1.1',
    formType: current.name,
    confidence: current.confidence,
    summary: current.summary,
    findings: current.findings.map(([title, confidence, evidence, action]) => ({ title, confidence, evidence, action })),
    nextAction: { title: current.action[0], period: current.action[1], indicator: current.action[2] }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'taqareer-preview-analysis.json';
  a.click();
  URL.revokeObjectURL(url);
});

renderRecognition();
