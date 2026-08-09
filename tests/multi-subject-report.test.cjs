const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadModules() {
  const sandbox = {
    window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
    Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone, Intl, Date,
  };
  vm.createContext(sandbox);
  for (const file of ['xlsx-lite.js', 'analysis-profile.js', 'display-terms.js', 'mastery-metrics.js', 'visualization-policy.js', 'deep-analysis.js', 'report-system.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window;
}

function analysisFixture(mode = 'all', subject = '') {
  const window = loadModules();
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'multi-subject-results-grade10-matrix.json'), 'utf8'));
  const sheet = window.TaqareerXlsx.normalizeMatrix(raw.matrix, { rightToLeft: true });
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const local = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet,
    analysisProfile: profile, analysisOptions: { mode, subject, includeSubjectTopTen: true, includeSchoolRanking: mode === 'all' },
  });
  const analysis = {
    ...local,
    _reconciliation: { aiApplied: true },
    executiveTitle: mode === 'subject' ? `تحليل مادة ${subject}` : 'تحليل شامل متعدد المواد',
    executiveSummary: 'تحليل موثق مبني على الحسابات المحلية والأدلة المرسلة.',
    diagnosticSections: [], findings: [], qualityTools: [], improvementPlan: [], monitoringPlan: [],
  };
  return { window, sheet, analysis };
}

test('official report shows grade metadata, school formula and local ranking tables without losing ties', () => {
  const { window, sheet, analysis } = analysisFixture();
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false });
  assert.match(html, /نوع المصدر<\/span><strong>كشف نتائج متعدد المواد/);
  assert.match(html, /نطاق التحليل<\/span><strong>تحليل شامل/);
  assert.match(html, /الصف \/ الفئة<\/span><strong>العاشر/);
  assert.match(html, /2025\/2026 - الدور الأول/);
  assert.match(html, /المادة<\/span><strong>متعدد المواد/);
  assert.match(html, /60% متوسط المواد الأساسية \+ 40% متوسط جميع المواد/);
  assert.match(html, /العشرة الأوائل على مستوى المدرسة \/ الدفعة/);
  assert.match(html, /العشرة الأوائل حسب الدرجة/);
  assert.match(html, /طالب اختبار 136/);
  assert.match(html, /تقارير v1\.2\.44/);
});

test('subject report includes only the selected subject top-ten table and selected-subject metadata', () => {
  const { window, sheet, analysis } = analysisFixture('subject', 'الرياضيات');
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false });
  assert.match(html, /نوع المصدر<\/span><strong>كشف نتائج متعدد المواد/);
  assert.match(html, /نطاق التحليل<\/span><strong>مادة واحدة/);
  assert.match(html, /المادة<\/span><strong>الرياضيات/);
  assert.doesNotMatch(html, /نوع الاستمارة<\/span><strong>نتائج طلاب فردية متعددة المواد/);
  assert.match(html, /الأوائل في الرياضيات|>الرياضيات<\/h3>/);
  assert.doesNotMatch(html, /العشرة الأوائل على مستوى الدفعة/);
  assert.doesNotMatch(html, /الأوائل في الفيزياء/);
});


test('executive report keeps the school ranking but omits per-subject ranking appendices', () => {
  const { window, sheet, analysis } = analysisFixture();
  const context = {
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  };
  const fullHtml = window.TaqareerReports.buildReportHtml(context, { autoPrint: false, reportMode: 'full' });
  const executiveHtml = window.TaqareerReports.buildReportHtml(context, { autoPrint: false, reportMode: 'executive' });
  const fullPages = (fullHtml.match(/class="report-sheet"/g) || []).length;
  const executivePages = (executiveHtml.match(/class="report-sheet"/g) || []).length;
  assert.match(executiveHtml, /التقرير التنفيذي المختصر/);
  assert.match(executiveHtml, /العشرة الأوائل على مستوى المدرسة \/ الدفعة/);
  assert.doesNotMatch(executiveHtml, /العشرة الأوائل حسب الدرجة/);
  assert.doesNotMatch(executiveHtml, /<div class="ranking-companion">/);
  assert.ok(executivePages < fullPages);
  assert.match(fullHtml, /التقرير الكامل مع الجداول/);
  assert.match(fullHtml, /العشرة الأوائل حسب الدرجة/);
});

test('executive subject report keeps only the selected subject ranking table', () => {
  const { window, sheet, analysis } = analysisFixture('subject', 'الرياضيات');
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'executive' });
  assert.match(html, /التقرير التنفيذي المختصر/);
  assert.match(html, /العشرة الأوائل حسب الدرجة/);
  assert.match(html, />الرياضيات<\/h3>/);
  assert.doesNotMatch(html, /العشرة الأوائل على مستوى المدرسة \/ الدفعة/);
  assert.doesNotMatch(html, />الفيزياء<\/h3>/);
  assert.doesNotMatch(html, /<div class="ranking-companion">/);
});


test('full multi-subject report compacts ranking appendices and safely splits very long ties', () => {
  const { window, sheet, analysis } = analysisFixture();
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'full' });
  const fullPages = (html.match(/class="report-sheet"/g) || []).length;
  const rankingPages = (html.match(/class="ranking-stack ranking-stack-/g) || []).length;
  assert.match(html, /المهارات الحياتية - متابعة 1\/3/);
  assert.match(html, /المهارات الحياتية - متابعة 3\/3/);
  assert.ok(rankingPages <= 8, `expected dynamically packed ranking pages, got ${rankingPages}`);
  assert.ok(fullPages <= 12, `expected the representative full report to fit within 12 pages, got ${fullPages}`);
  assert.match(html, /<div class="ranking-companion">/);
  assert.match(html, /data-ranking-budget="5[0-5]"/);
  assert.doesNotMatch(html, /TQR-/);
});


test('official report sanitizes internal analysis ids and technical evidence fallbacks', () => {
  const { window, sheet, analysis } = analysisFixture();
  analysis.analysisProfile = {
    ...(analysis.analysisProfile || {}),
    method: 'multi_subject_individual_analysis',
    dimensions: ['subject_comparison', 'student_profile_segmentation'],
    decisionUse: ['ranking_decision_support'],
  };
  analysis.diagnosticSections = [{
    id: 'diagnostic.internal.1',
    title: 'قراءة اختبارية',
    analysis: 'قراءة تربوية صالحة للعرض.',
    source: 'قراءة موثقة بالأدلة',
    confidence: 'مرتفعة',
    evidenceRefs: ['metric:missing_internal_metric'],
    implications: [], alternativeExplanations: [], limitations: [], dataRequests: [],
  }];
  analysis.qualityTools = [{ id: 'scope_consistency_guard', conditionsMet: true, reason: 'تحقق بنيوي.', interpretation: 'اكتمل التحقق.' }];
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'full' });
  assert.match(html, /تحليل نتائج طلاب فردية متعددة المواد/);
  assert.match(html, /مؤشر محسوب/);
  assert.match(html, /أداة جودة/);
  assert.doesNotMatch(html, /multi_subject_individual_analysis|subject_comparison|student_profile_segmentation|ranking_decision_support|missing_internal_metric|scope_consistency_guard/);
});


test('three detailed improvement interventions share one professionally packed page when capacity allows', () => {
  const { window, sheet, analysis } = analysisFixture();
  const plans = [
    {
      priority: 'عالية', issue: 'رفع إتقان الطلبة في المواد ذات الأداء الأدنى', targetGroup: 'الطلبة دون مستوى الإتقان',
      action: 'تنفيذ تدخل تعليمي قصير ومركز قائم على المهارات الأكثر فجوة، ثم إعادة قياس الأثر على نفس المؤشرات.',
      implementationSteps: ['تحديد المهارات ذات الأولوية من نتائج التحليل.', 'تنفيذ مجموعات علاجية صغيرة بمهام متدرجة.', 'إعادة القياس ومقارنة التحسن بخط الأساس.'],
      resources: ['أنشطة علاجية', 'أسئلة قصيرة موجهة'], responsibleRole: 'معلم المادة والمنسق', timeframe: '4 أسابيع',
      successIndicator: 'ارتفاع نسبة الإتقان في الفئة المستهدفة', monitoringMethod: 'قياس أسبوعي ومراجعة كل أسبوعين', contingency: 'تعديل نوع التدخل عند غياب التحسن المتوقع.',
    },
    {
      priority: 'متوسطة', issue: 'تقليص فجوة الأداء بين المواد', targetGroup: 'المواد الأقل أداءً',
      action: 'استخدام ممارسات صفية مشتركة ومقارنة تقدم المواد الأقل أداءً بمتوسط المدرسة.',
      implementationSteps: ['تحديد الممارسات الأعلى أثرًا.', 'تطبيقها في المواد المستهدفة.', 'مراجعة المؤشرات بعد دورة قصيرة.'],
      resources: ['اجتماع مهني قصير'], responsibleRole: 'الفريق الأكاديمي', timeframe: '3 أسابيع',
      successIndicator: 'انخفاض الفجوة بين المواد', monitoringMethod: 'مراجعة نصف شهرية', contingency: 'إعادة تحديد الأولوية حسب البيانات الجديدة.',
    },
    {
      priority: 'متوسطة', issue: 'الحفاظ على تفوق الطلبة المتميزين وتطويرهم', targetGroup: 'الطلبة مرتفعو الأداء',
      action: 'تقديم مهام إثرائية ممتدة تحافظ على مستوى التحدي وتمنع ثبات الأداء عند مستوى واحد.',
      implementationSteps: ['اختيار مهام إثرائية مناسبة.', 'توزيع أنشطة ممتدة بحسب المادة.', 'توثيق التقدم ومراجعة جودة المخرجات.'],
      resources: ['مهام إثرائية'], responsibleRole: 'معلمو المواد', timeframe: 'مستمر',
      successIndicator: 'استمرار الأداء المرتفع مع تقدم نوعي', monitoringMethod: 'مراجعة شهرية', contingency: 'رفع مستوى التحدي أو تنويع المهمة عند ثبات الأداء.',
    },
  ];
  analysis.improvementPlan = plans;
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'full' });

  assert.equal((html.match(/<h2>خطة التحسين والتدخل<\/h2>/g) || []).length, 1);
  assert.equal((html.match(/class="plan-card"/g) || []).length, 3);
  assert.match(html, /class="plan-cards plan-cards-3(?: plan-cards-dense)?" data-plan-budget="\d+"/);
  assert.match(html, /plan-clip:/);
});

test('official report normalizes leaked mixed-language narrative fragments before rendering', () => {
  const { window, sheet, analysis } = analysisFixture();
  analysis.diagnosticSections = [{
    title: 'level distribution',
    analysis: 'مراجعة undefined للحالة خلال 6 semanas.',
    confidence: 'متوسطة',
    implications: ['متابعة خلال 2 weeks'],
    alternativeExplanations: ['مقارنة بعد 1 month'],
    limitations: ['لا يعتمد على undefined بيانات'],
    dataRequests: ['إعادة القياس خلال 3 semanas'],
  }];
  analysis.findings = [{
    title: 'استنتاج تجريبي',
    statement: 'تحقق level distribution دون undefined.',
    confidence: 'مرتفعة',
    educationalImpact: 'متابعة خلال 2 weeks',
    recommendedAction: 'مراجعة خلال 1 month',
    limitations: ['لا يوجد undefined حقل'],
  }];
  analysis.qualityTools = [{ id: 'scope_consistency_guard', conditionsMet: true, reason: 'مراجعة خلال 1 week', interpretation: 'لا يوجد undefined.' }];
  analysis.improvementPlan = [{
    priority: 'عالية', issue: 'رفع الأداء', targetGroup: 'الفئة المستهدفة', action: 'تنفيذ خطة خلال 6 semanas',
    implementationSteps: ['قياس بعد 2 weeks'], resources: ['ورقة undefined عمل'], responsibleRole: 'معلم المادة',
    timeframe: '6 semanas', successIndicator: 'تحسن خلال 1 month', monitoringMethod: 'متابعة كل 2 weeks', contingency: 'مراجعة undefined الخطة',
  }];
  analysis.monitoringPlan = [{ timing: 'بعد 2 weeks', stage: 'متابعة مرحلية', measure: 'قياس خلال 1 month', owner: 'معلم المادة' }];
  analysis.limitations = ['لا تتوفر undefined بيانات إضافية خلال 3 semanas'];

  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet,
    quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'full' });

  assert.match(html, /توزيع مستويات الأداء/);
  assert.match(html, /6 أسابيع/);
  assert.match(html, /2 أسابيع/);
  assert.match(html, /1 أشهر/);
  assert.doesNotMatch(html, /\blevel distribution\b|\bsemanas?\b|\bweeks?\b|\bmonths?\b|\bundefined\b/i);
});
