const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function loadDocuments() {
  const sandbox = {
    window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
    Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone,
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'document-lite.js'), 'utf8'), sandbox, { filename: 'document-lite.js' });
  return sandbox.window.TaqareerDocuments;
}

const labels = [
  'تحصيل الطلبة في العمال الصفية وغير الصفية',
  'التقدم الدراسي للطلبة بما فيهم الطلبة ذوي العاقة / الحتياجات التعليمية.',
  'تطبيق مهارات التعلم ( الذاتي - التعاوني – الرقمي - التفكير العليا ) وربطها بالواقع.',
  'تمسك الطلبة بالهوية العمانية والقيم النسانية.',
  'متابعة جوانب المن والسلمة والنظافة في بيئة التعلم.',
  'تخطيط المنهاج الدراسي لتحقيق نواتج التعلم.',
  'فاعلية الدارة لصفية',
  'توظيف استراتيجيات التدريس الفعالة',
  'تفعيل المصادر والموارد التعليمية',
  'توظيف أساليب تقويم متنوعة.',
  'توظيف التقويم الذاتي والتطوير المهني في تحسين الداء.',
  'تطبيق السياسات والنظمة واللوائح المنظمة للعمل.',
  'تنفيذ مبادرات وأنشطة تربوية في المجتمع المدرسي.',
];

function line(text, cells = [text], lineIndex = 1) { return { text, cells, lineIndex }; }

function visitPage(pageNumber, teacher, fileNumber, visitNumber, date, subject, grade, lesson, ratings) {
  const lines = [
    line('التاريخ : 2026/08/02', ['التاريخ', ':', '2026/08/02']),
    line('محافظة جنوب الباطنة العام الدراسى : 2026/2025', ['محافظة جنوب الباطنة', 'العام الدراسى', ':', '2026/2025']),
    line('استمارة الزيارة الشرافية لمعلم مجال / مادة'),
    line('مدرسة : الباسط للبنين الصفوف 8( - )10', ['مدرسة :', 'الباسط للبنين الصفوف 8(', '- )10']),
    line(`السم : ${teacher} رقم الملف : ${fileNumber}`, ['السم', ':', teacher, 'رقم الملف', ':', fileNumber]),
    line(`${visitNumber} ${date}`, [visitNumber, date]),
    line('تاريخ الزيارة : رقم الزيارة :', ['تاريخ الزيارة :', 'رقم الزيارة', ':']),
    line(`المرحلة : أساسي 5( - )10 الصف : ${grade} الفصل : 6`, ['المرحلة', ':', 'أساسي 5(', '- )10', 'الصف :', grade, 'الفصل', ':', '6']),
    line(`المجال / المادة : ${subject} الحصة : 3 عنوان الدرس : ${lesson}`, ['المجال / المادة :', subject, 'الحصة :', '3', 'عنوان الدرس :', lesson]),
    line('متميز (1) جيد (2) ملئم (3) غير ملئم (4) يحتاج إلى تدخل (5)'),
    line('م بنود التقويم المستوى', ['م', 'بنود التقويم', 'المستوى']),
  ];
  labels.forEach((labelText, index) => lines.push(line(`${index + 1} ${labelText} ${ratings[index]}`, [String(index + 1), labelText, String(ratings[index])], lines.length + 1)));
  return { pageNumber, lines };
}

function narrativePage(pageNumber, developmentText) {
  return { pageNumber, lines: [
    line('جوانب الجادة في الداء وأدلتها'),
    line('يوظف المعلم التقنيات الرقمية والمحاكاة التفاعلية بصورة متميزة.'),
    line('الجوانب التى تحتاج إلى تطوير في الداء وأدلتها'),
    line(developmentText),
    line('الدعم المقدم'),
    line('تقديم دعم إشرافي مرتبط بالممارسة المستهدفة.'),
    line('التوصيات'),
    line('إعادة الملاحظة في زيارة لاحقة باستخدام الأداة نفسها.'),
  ] };
}

test('detects and separates a multi-visit supervisory PDF with reversed scale', () => {
  const docs = loadDocuments();
  const pages = [
    visitPage(1, 'المعلم الأول', '16140001', '43', '2026/03/05', 'الفيزياء', 'العاشر', 'الصوت', [1,2,1,2,1,1,2,1,1,1,2,1,1]),
    narrativePage(2, 'لا يوجد'),
    visitPage(3, 'المعلم الثاني', '16140002', '44', '2026/04/16', 'العلوم', 'الثامن', 'الشحنات', [1,2,1,1,2,1,1,2,1,1,1,2,1]),
    narrativePage(4, 'يطبق عدد قليل من الطلبة مهارات التعلم الرقمي ويحتاجون إلى توجيه إضافي.'),
  ];
  const parsed = docs._test.detectMultiVisitSupervisionPdf(pages);
  assert.ok(parsed);
  assert.equal(parsed.dataset.meta.visitCount, 2);
  assert.equal(parsed.dataset.meta.ratingCount, 26);
  assert.equal(parsed.dataset.meta.expectedRatingCount, 26);
  assert.equal(parsed.dataset.meta.scaleDirection, 'lower-is-better');
  assert.equal(parsed.dataset.meta.metadata.school, 'الباسط للبنين الصفوف (8-10)');
  assert.equal(parsed.dataset.meta.metadata.academicYear, '2025/2026');
  assert.equal(parsed.dataset.rows[0]['المادة'], 'الفيزياء');
  assert.equal(parsed.dataset.rows[1]['عنوان الدرس'], 'الشحنات');
  assert.match(parsed.dataset.rows[1]['جوانب التطوير'], /عدد قليل/);
});

test('multi-visit analyzer preserves reversed-scale arithmetic and flags only within-visit evidence tension', () => {
  const docs = loadDocuments();
  const pages = [
    visitPage(1, 'المعلم الأول', '16140001', '43', '2026/03/05', 'الفيزياء', 'العاشر', 'الصوت', Array(13).fill(1)),
    narrativePage(2, 'لا يوجد'),
    visitPage(3, 'المعلم الثاني', '16140002', '44', '2026/04/16', 'العلوم', 'الثامن', 'الشحنات', Array(13).fill(1)),
    narrativePage(4, 'يطبق عدد قليل من الطلبة مهارات التعلم الرقمي ويحتاجون إلى توجيه إضافي.'),
  ];
  const parsed = docs._test.detectMultiVisitSupervisionPdf(pages);
  const window = {};
  const sandbox = { window, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'mastery-metrics.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'deep-analysis.js'), 'utf8'), sandbox);
  const analysis = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'supervision_multi_visit',
    headers: parsed.dataset.headers,
    rows: parsed.dataset.rows,
    sourceMeta: parsed.dataset.meta,
  });
  assert.equal(analysis.kind, 'supervision_multi_visit');
  assert.equal(analysis.metrics.find(item => item.id === 'visitCount').value, 2);
  assert.equal(analysis.metrics.find(item => item.id === 'ratingCount').value, 26);
  assert.equal(analysis.metrics.find(item => item.id === 'excellentPct').value, 100);
  assert.ok(analysis.metrics.find(item => item.id === 'numericNarrativeMismatchCount').value >= 1);
  assert.equal(analysis.scopeContext.departmentLabel, 'قسم العلوم');
  assert.equal(analysis.scopeContext.populationLabel, 'معلمو قسم العلوم المشمولون بالزيارات');
  assert.equal(analysis.scopeContext.visitCount, 2);
  assert.equal(analysis.diagnosticSections.length, 0);
  assert.equal(analysis.findings.length, 0);
});

test('frontend and Edge contract explicitly protect multi-visit context and personal fields', () => {
  const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
  const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze-educational-form', 'index.ts'), 'utf8');
  assert.match(app, /supervision_multi_visit/);
  assert.match(app, /teacher: maskPersonalData \? `المعلم \$\{index \+ 1\}`/);
  assert.match(app, /fileNumber: maskPersonalData \? "\[محجوب\]"/);
  assert.match(edge, /recognizedType\.id = supervision_multi_visit/);
  assert.match(edge, /المقياس معكوس: 1 متميز و5 يحتاج إلى تدخل/);
  assert.match(edge, /داخل نفس الزيارة|بالزيارة نفسها|الزيارة نفسها/);
});

test('multi-visit metadata summarizes contiguous grades for the official report header', () => {
  const docs = loadDocuments();
  const pages = [
    visitPage(1, 'المعلم الأول', '16140001', '43', '2026/03/05', 'الفيزياء', 'الثامن', 'الصوت', Array(13).fill(1)),
    narrativePage(2, 'لا يوجد'),
    visitPage(3, 'المعلم الثاني', '16140002', '44', '2026/04/16', 'العلوم', 'التاسع', 'الشحنات', Array(13).fill(1)),
    narrativePage(4, 'لا يوجد'),
    visitPage(5, 'المعلم الثالث', '16140003', '45', '2026/04/17', 'الأحياء', 'العاشر', 'النتح', Array(13).fill(1)),
    narrativePage(6, 'لا يوجد'),
  ];
  const parsed = docs._test.detectMultiVisitSupervisionPdf(pages);
  assert.ok(parsed);
  assert.equal(parsed.dataset.meta.metadata.grade, '8-10');
});

test('multi-visit report moves all four charts to print-safe analytical pages and keeps every bar row', () => {
  const docs = loadDocuments();
  const pages = [
    visitPage(1, 'المعلم الأول', '16140001', '43', '2026/03/05', 'الفيزياء', 'الثامن', 'الصوت', [1,2,1,2,1,1,2,1,1,1,2,1,1]),
    narrativePage(2, 'لا يوجد'),
    visitPage(3, 'المعلم الثاني', '16140002', '44', '2026/04/16', 'العلوم', 'التاسع', 'الشحنات', [1,2,1,1,2,1,1,2,1,1,1,2,1]),
    narrativePage(4, 'لا يوجد'),
    visitPage(5, 'المعلم الثالث', '16140003', '45', '2026/04/17', 'الأحياء', 'العاشر', 'النتح', [1,1,2,1,1,2,1,1,1,2,1,2,1]),
    narrativePage(6, 'لا يوجد'),
  ];
  const parsed = docs._test.detectMultiVisitSupervisionPdf(pages);
  const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
  vm.createContext(sandbox);
  for (const file of ['mastery-metrics.js', 'deep-analysis.js', 'report-system.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
  }
  const analysis = sandbox.window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'supervision_multi_visit',
    headers: parsed.dataset.headers,
    rows: parsed.dataset.rows,
    sourceMeta: parsed.dataset.meta,
  });
  analysis._reconciliation = { aiApplied: true };
  analysis.executiveTitle = 'اختبار تقرير الزيارات المتعددة';
  analysis.executiveSummary = 'اختبار توزيع الرسوم بعيدًا عن الصفحة التنفيذية المكتظة.';
  const html = sandbox.window.TaqareerReports.buildReportHtml({
    analysis,
    type: { id: 'supervision_multi_visit', name: 'زيارات إشرافية متعددة' },
    sourceName: 'multi.pdf',
    sourceMeta: parsed.dataset.meta,
  });
  const sheets = html.split('<section class="report-sheet">').slice(1);
  assert.equal(sandbox.window.TaqareerReports.VERSION, '1.2.3');
  assert.doesNotMatch(sheets[0], /supervision-level-distribution|supervision-indicator-performance/);
  assert.match(sheets.slice(1).join('\n'), /supervision-level-distribution/);
  assert.match(sheets.slice(1).join('\n'), /supervision-indicator-performance/);
  assert.match(html, /الصف \/ الفئة<\/span><strong>8-10<\/strong>/);
  assert.equal((html.match(/class="bar-row"/g) || []).length, 5 + 13 + 3 + 3);
  assert.match(html, /chart-card chart-wide chart-dense[^>]*data-chart-id="supervision-indicator-performance"/);
});


test('client scope guard rejects school-wide targets and accepts the server-narrowed multi-visit population', () => {
  const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'analysis-reconciliation.js'), 'utf8'), sandbox, { filename: 'analysis-reconciliation.js' });
  const refs = ['metric:visitCount', 'metric:ratingCount', 'metric:excellentPct', 'metric:excellentGoodPct', 'metric:supportRatingPct', 'metric:numericNarrativeMismatchCount'];
  const local = {
    typeId: 'supervision_multi_visit', kind: 'supervision_multi_visit', metrics: [], charts: [], evidenceMap: {}, limitations: [],
    scopeContext: { scopeType: 'sampled-multi-visit', sampleOnly: true, visitCount: 7, subjects: ['الفيزياء', 'الكيمياء', 'العلوم', 'الأحياء'], departmentLabel: 'قسم العلوم', populationLabel: 'معلمو قسم العلوم المشمولون بالزيارات' },
  };
  const primary = {
    contractVersion: '6.6.0',
    analysisProfile: { method: 'تحليل الزيارات', dataAdequacy: 'كافية وصفيًا', dimensions: ['الأداء', 'الاتساق'], decisionUses: ['المتابعة'] },
    executive: { title: 'تحليل عينة الزيارات', summary: 'تحليل محصور في معلمي قسم العلوم المشمولين بسبع زيارات، ولا يمتد إلى بقية الهيئة التدريسية.', overallJudgement: 'تحسين موجه', confidence: 'مرتفعة', evidenceRefs: refs.slice(0, 2), limitations: [] },
    diagnosticSections: [
      { id: 'd1', title: 'الأداء', analysis: 'تظهر المؤشرات أداءً قويًا في غالبية الزيارات.', claimType: 'fact', evidenceRefs: [refs[2]], confidence: 'مرتفعة', implications: [], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { id: 'd2', title: 'الاتساق', analysis: 'تحتاج حالتان إلى مراجعة داخل الزيارة نفسها.', claimType: 'inference', evidenceRefs: [refs[5]], confidence: 'متوسطة', implications: [], alternativeExplanations: [], limitations: [], dataRequests: [] },
    ],
    findings: [
      { id: 'f1', title: 'أداء قوي', statement: 'غالبية التقديرات متميزة أو جيدة.', claimType: 'fact', evidenceRefs: [refs[3]], confidence: 'مرتفعة', severity: 'low', educationalImpact: 'يدعم نقل الممارسات داخل القسم.', recommendedAction: 'توثيق الممارسات.', limitations: [] },
      { id: 'f2', title: 'مراجعة الاتساق', statement: 'توجد حالتان تحتاجان مراجعة.', claimType: 'inference', evidenceRefs: [refs[5]], confidence: 'متوسطة', severity: 'medium', educationalImpact: 'يحسن دقة التوجيه.', recommendedAction: 'مراجعة السجلات.', limitations: [] },
    ],
    qualityTools: [],
    interventions: [
      { id: 'i1', priority: 'عالية', issue: 'الاتساق', targetGroup: 'معلمو قسم العلوم المشمولون بالزيارات', targetGroupIds: [], action: 'مراجعة الحالات.', implementationSteps: [], responsibleRole: 'المعلم الأول', timeframe: 'أسبوعان', successIndicator: 'مراجعة الحالات كاملة', successMetric: { mode: 'custom', targetValue: 0, targetSegmentId: '' }, monitoringMethod: 'محضر مراجعة', contingency: 'إعادة الزيارة', resources: [], evidenceRefs: [refs[5]], scopeGuard: { applied: true, adjusted: true, visitCount: 7, populationLabel: 'معلمو قسم العلوم المشمولون بالزيارات', finalTargetGroup: 'معلمو قسم العلوم المشمولون بالزيارات' } },
      { id: 'i2', priority: 'متوسطة', issue: 'النمو المهني', targetGroup: 'معلمو مادة العلوم للصف الثامن', targetGroupIds: [], action: 'تبادل الممارسة.', implementationSteps: [], responsibleRole: 'المعلم الأول', timeframe: 'خلال الفصل', successIndicator: 'تنفيذ لقاء مهني', successMetric: { mode: 'custom', targetValue: 0, targetSegmentId: '' }, monitoringMethod: 'محضر اللقاء', contingency: 'دعم فردي', resources: [], evidenceRefs: [refs[0]], scopeGuard: { applied: true, adjusted: false, visitCount: 7, populationLabel: 'معلمو قسم العلوم المشمولون بالزيارات', finalTargetGroup: 'معلمو مادة العلوم للصف الثامن' } },
    ],
    monitoringPlan: [
      { id: 'm1', stage: 'خط الأساس', timing: 'الآن', measure: 'توثيق المؤشرات', owner: 'المعلم الأول', evidenceRefs: [refs[0]] },
      { id: 'm2', stage: 'متابعة مرحلية', timing: 'منتصف الفصل', measure: 'مراجعة التنفيذ', owner: 'الإدارة', evidenceRefs: [refs[4]] },
      { id: 'm3', stage: 'قياس الأثر', timing: 'نهاية الفصل', measure: 'إعادة حساب المؤشرات', owner: 'المشرف', evidenceRefs: [refs[2]] },
    ],
    additionalCautions: [], missingDataRequests: [], suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
  const analysis = sandbox.window.TaqareerReconciliation.composePrimary(local, primary, { availableEvidenceRefs: refs });
  assert.equal(analysis.improvementPlan[0].targetGroup, 'معلمو قسم العلوم المشمولون بالزيارات');
  const tampered = structuredClone(primary);
  tampered.interventions[0].targetGroup = 'الهيئة التدريسية بمدرسة الباسط';
  tampered.interventions[0].scopeGuard.finalTargetGroup = 'الهيئة التدريسية بمدرسة الباسط';
  assert.throws(() => sandbox.window.TaqareerReconciliation.composePrimary(local, tampered, { availableEvidenceRefs: refs }), /يوسع الفئة المستهدفة/);
});
