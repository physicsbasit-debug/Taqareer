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
