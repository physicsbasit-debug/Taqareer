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
  for (const file of ['xlsx-lite.js', 'analysis-profile.js', 'mastery-metrics.js', 'visualization-policy.js', 'deep-analysis.js', 'analysis-reconciliation.js', 'report-system.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window;
}

async function readFixture() {
  const window = loadModules();
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'multi-subject-results-grade10-matrix.json'), 'utf8'));
  const sheet = window.TaqareerXlsx.normalizeMatrix(fixture.matrix, { rightToLeft: true });
  sheet.name = 'Sheet1';
  sheet.path = 'synthetic-structure-fixture';
  return { window, sheet };
}

test('multi-subject normalizer reconstructs the Crystal-style workbook into student rows and subject pairs', async () => {
  const { sheet } = await readFixture();
  assert.equal(sheet.specializedType, 'multi_subject_results');
  assert.equal(sheet.headers.length, 31);
  assert.equal(sheet.rows.length, 252);
  assert.equal(sheet.normalization.subjectCount, 13);
  assert.equal(sheet.normalization.scoreCount, 3276);
  assert.equal(sheet.normalization.repeatedHeaderRows, 2);
  assert.equal(sheet.metadata.grade, 'العاشر');
  assert.equal(sheet.metadata.period, 'الدور الأول');
  assert.equal(sheet.metadata.academicYear, '2025/2026');
  assert.match(sheet.metadata.subject, /مواد متعددة \(13\)/);
  assert.ok(sheet.headers.includes('الرياضيات - الدرجة'));
  assert.ok(sheet.headers.includes('الرياضيات - المستوى'));
  assert.ok(sheet.rows.every(row => row['اسم الطالب'] && row['حالة القيد']));
});

test('semantic profiler routes individual multi-subject results without a manual score-column selector', async () => {
  const { window, sheet } = await readFixture();
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  assert.equal(profile.shape, 'multi_subject_individual_results');
  assert.equal(profile.unitOfAnalysis, 'student');
  assert.equal(profile.aggregationLevel, 'individual');
  assert.equal(profile.analyzerId, 'multi_subject_results');
  assert.equal(profile.recommendedTypeId, 'multi_subject_results');
  assert.equal(profile.requiresScoreSettings, false);
  assert.equal(profile.columnRoles.subjects.length, 13);
  assert.ok(profile.analysisFamilies.includes('subject_comparison'));
  assert.ok(profile.analysisFamilies.includes('student_profile_segmentation'));
});

test('multi-subject analyzer computes all subjects, student profiles, and score-level consistency from the complete file', async () => {
  const { window, sheet } = await readFixture();
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const analysis = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet, analysisProfile: profile,
  });
  const metric = id => analysis.metrics.find(item => item.id === id)?.value;
  assert.equal(metric('studentCount'), 252);
  assert.equal(metric('subjectCount'), 13);
  assert.equal(metric('scoreCount'), 3276);
  assert.equal(metric('overallMean'), 75.23);
  assert.equal(metric('broadRiskCount'), 50);
  assert.equal(metric('focusedRiskCount'), 147);
  assert.equal(metric('stableHighCount'), 29);
  assert.equal(metric('studentsWithFailLevel'), 14);
  assert.equal(metric('scoreLevelMismatchCount'), 0);
  assert.equal(metric('strongestSubjectMean'), 92.03);
  assert.equal(metric('weakestSubjectMean'), 60.01);
  assert.equal(metric('highestLowSubjectPct'), 70.6);
  assert.equal(analysis.analysisRouting.analyzerId, 'multi_subject_results');
  assert.equal(analysis.subjects.length, 13);
  assert.equal(analysis.charts.length, 5);
  const maths = analysis.subjects.find(item => item.subject === 'الرياضيات');
  assert.equal(maths.lowCount, 178);
  assert.equal(maths.failCount, 9);
  assert.equal(maths.ref, 'subject:10');
  assert.match(analysis.evidenceMap['subject:10'], /الرياضيات/);
});

test('multi-subject analysis preserves enrollment statuses and avoids using nationality as a comparison dimension', async () => {
  const { window, sheet } = await readFixture();
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const analysis = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet, analysisProfile: profile,
  });
  assert.deepEqual(Array.from(analysis.statusDistribution, item => [item.label, item.count]), [['منقول', 249], ['مرفع', 2], ['باق', 1]]);
  assert.match(analysis.limitations.join(' '), /الجنسية حقول حساسة|الأسماء والجنسية حقول حساسة/);
  assert.ok(!analysis.charts.some(chart => JSON.stringify(chart).includes('الجنسية')));
});

test('frontend and Edge recognize the new type, hide score settings semantically, and mask nationality', () => {
  const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
  const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze-educational-form', 'index.ts'), 'utf8');
  assert.match(app, /id: "multi_subject_results"/);
  assert.match(app, /sourceMeta\?\.specializedType === "multi_subject_results"/);
  assert.match(app, /student_profile_segmentation/);
  assert.match(app, /الجنسيه\|الجنسية/);
  assert.match(edge, /multi_subject_results/);
  assert.match(edge, /سجل نتائج فردي متعدد المواد/);
  assert.match(edge, /EDGE_VERSION = "0\.15\.5"/);
});


test('official report keeps all thirteen subject comparison rows and uses semantic composition charts', async () => {
  const { window, sheet } = await readFixture();
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const local = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet, analysisProfile: profile,
  });
  const primary = {
    contractVersion: '6.6.0',
    analysisProfile: { method: 'تحليل نتائج فردية متعددة المواد', dataAdequacy: 'مرتفعة', dimensions: ['المواد', 'أنماط الاحتياج'], decisionUses: ['ترتيب الأولويات'] },
    executive: { title: 'فجوات متفاوتة بين المواد', summary: 'توضح الأدلة تفاوت الأداء بين المواد والحاجة إلى دعم متمايز.', overallJudgement: 'تحسين موجه', confidence: 'مرتفعة', evidenceRefs: ['metric:studentCount', 'subject:10'], limitations: [] },
    diagnosticSections: [
      { id: 'd1', title: 'تفاوت المواد', analysis: 'تتركز المستويات الدنيا في مادة محددة أكثر من بقية المواد.', claimType: 'fact', evidenceRefs: ['subject:10'], confidence: 'مرتفعة', implications: ['ترتيب الدعم حسب المادة'], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { id: 'd2', title: 'أنماط الاحتياج', analysis: 'تختلف الحالات متعددة المواد عن الحالات التخصصية.', claimType: 'inference', evidenceRefs: ['metric:broadRiskCount', 'metric:focusedRiskCount'], confidence: 'مرتفعة', implications: ['فصل مسارات الدعم'], alternativeExplanations: [], limitations: [], dataRequests: [] },
    ],
    findings: [
      { id: 'f1', title: 'أولوية مادة', statement: 'تحتاج المادة ذات المستويات الدنيا الأعلى إلى تحليل مهاري.', claimType: 'fact', evidenceRefs: ['subject:10'], confidence: 'مرتفعة', severity: 'high', educationalImpact: 'تحديد تدخل أدق.', recommendedAction: 'تنفيذ تشخيص مهاري.', limitations: [] },
      { id: 'f2', title: 'دعم متعدد المسارات', statement: 'تتطلب أنماط الاحتياج تدخلات مختلفة.', claimType: 'inference', evidenceRefs: ['metric:broadRiskCount', 'metric:focusedRiskCount'], confidence: 'مرتفعة', severity: 'medium', educationalImpact: 'منع تعميم علاج واحد.', recommendedAction: 'تقسيم الدعم.', limitations: [] },
    ],
    qualityTools: [{ id: 'q1', name: 'اتساق الدرجة والمستوى', reason: 'الدرجة والمستوى زوجان قابلان للتحقق.', interpretation: 'لا توجد اختلافات.', requiredData: [], evidenceRefs: ['metric:scoreLevelMismatchCount'] }],
    interventions: [
      { id: 'i1', priority: 'عالية', issue: 'مادة ذات مستويات دنيا مرتفعة', targetGroup: 'الطلبة ذوو د أو هـ في الرياضيات', action: 'تنفيذ اختبار تشخيصي قصير.', implementationSteps: ['تحليل النتائج', 'تدريس علاجي', 'إعادة قياس'], responsibleRole: 'معلم المادة', timeframe: '3 أسابيع', successIndicator: 'انخفاض د وهـ', monitoringMethod: 'اختبار قبلي وبعدي', contingency: 'مراجعة الأداة', resources: [], evidenceRefs: ['subject:10'] },
      { id: 'i2', priority: 'متوسطة', issue: 'انخفاض متعدد المواد', targetGroup: 'الحالات متعددة المواد ضمن الكشف', action: 'بناء خطة دعم مشتركة.', implementationSteps: ['تحديد الحالات', 'تنسيق المواد'], responsibleRole: 'فريق الدعم', timeframe: '4 أسابيع', successIndicator: 'تحسن مادتين', monitoringMethod: 'سجل سري', contingency: 'تشخيص أعمق', resources: [], evidenceRefs: ['metric:broadRiskCount'] },
    ],
    monitoringPlan: [
      { id: 'm1', stage: 'خط الأساس', timing: 'الآن', measure: 'متوسطات المواد', owner: 'أخصائي التقويم', evidenceRefs: ['metric:overallMean'] },
      { id: 'm2', stage: 'متابعة مرحلية', timing: 'بعد أسبوعين', measure: 'المهارات المستهدفة', owner: 'معلمو المواد', evidenceRefs: ['subject:10'] },
      { id: 'm3', stage: 'قياس الأثر', timing: 'بعد شهر', measure: 'تغير أنماط الاحتياج', owner: 'فريق الدعم', evidenceRefs: ['metric:broadRiskCount'] },
    ],
    additionalCautions: [], missingDataRequests: [], suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
  const analysis = window.TaqareerReconciliation.composePrimary(local, primary, { availableEvidenceRefs: Object.keys(local.evidenceMap) });
  const html = window.TaqareerReports.buildReportHtml({
    analysis, type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'كشف نتائج الطلاب العاشر.xlsx', sourceMeta: sheet, quality: { completeness: 100 }, recognitionStatus: 'معتمد',
  }, { autoPrint: false });
  assert.match(html, /الصف \/ الفئة<\/span><strong>العاشر/);
  assert.match(html, /2025\/2026 - الدور الأول/);
  assert.match(html, /المادة<\/span><strong>متعدد المواد/);
  assert.match(html, /data-chart-id="multi-subject-means"[^>]*data-expected-rows="13"/);
  assert.equal((html.match(/class="bar-row"/g) || []).length >= 26, true);
  assert.match(html, /data-chart-type="stacked100"/);
  assert.match(html, /class="stack-track"/);
});

test('score-only variant is analyzed with derived levels without a false score-level consistency claim', () => {
  const window = loadModules();
  const subjects = ['التربية الاسلامية', 'اللغة العربية', 'اللغة الانجليزية', 'الرياضيات', 'الفيزياء', 'الكيمياء', 'الاحياء', 'الدراسات الاجتماعية'];
  const matrix = [[
    'الكــل', 'الشعبة :', 'العاشر', 'الصف :', 'الدور الأول', 'الفترة :', 'م', 2026, '/', 2025, 'العام الدراسي :',
    ...subjects, 'الاسم', 'الجنسية', 'القيد'
  ]];
  for (let index = 1; index <= 20; index++) {
    matrix.push([
      '', '', '', '', '', '', index, '', '', '', '',
      ...subjects.map((_, subjectIndex) => 50 + ((index * 7 + subjectIndex * 9) % 51)),
      `طالب تجريبي ${index}`, 'عماني', 'منقول'
    ]);
  }
  const sheet = window.TaqareerXlsx.normalizeMatrix(matrix, { rightToLeft: true });
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  assert.equal(profile.dataNature, 'individual_scores_with_derived_levels');
  assert.equal(profile.measureType, 'subject_scores_with_derived_levels');
  assert.ok(!profile.analysisFamilies.includes('score_level_consistency'));
  const analysis = window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet, analysisProfile: profile,
    analysisOptions: { mode: 'all', includeSubjectTopTen: true, includeSchoolRanking: true },
  });
  assert.ok(analysis.metrics.some(item => item.id === 'levelSource'));
  assert.ok(!analysis.metrics.some(item => item.id === 'scoreLevelMismatchCount'));
  assert.equal(analysis.privateTables.schoolTopTen.length > 0, true);
  assert.equal(Object.keys(analysis.privateTables.subjectTopTen).length, 8);
  assert.equal(analysis.scopeContext.levelSource, 'derived_from_score');
  assert.match(analysis.limitations.join(' '), /مشتقة محليًا من الدرجات الرقمية/);
  const primary = {
    contractVersion: '6.6.0',
    analysisProfile: {
      method: 'تحليل نتائج متعدد المواد',
      dataAdequacy: 'كافية وصفيًا',
      dimensions: ['أداء المواد', 'اتساق الدرجة والمستوى'],
      decisionUses: ['ترتيب الأولويات', 'فحص اختلافات الدرجة والمستوى'],
    },
    executive: {
      title: 'تحليل درجات متعدد المواد',
      summary: 'تحليل وصفي موثق للدرجات والمستويات المشتقة محليًا.',
      overallJudgement: 'تحسين موجه',
      confidence: 'مرتفعة',
      evidenceRefs: ['metric:studentCount', 'metric:overallMean'],
      limitations: [],
    },
    diagnosticSections: [
      { id: 'd1', title: 'تفاوت المواد', analysis: 'تختلف المتوسطات بين المواد.', claimType: 'fact', evidenceRefs: ['metric:overallMean'], confidence: 'مرتفعة', implications: ['ترتيب الأولويات'], alternativeExplanations: [], limitations: [], dataRequests: [] },
      { id: 'd2', title: 'مصدر المستويات', analysis: 'المستويات مشتقة من الدرجات وفق الحدود المعتمدة.', claimType: 'fact', evidenceRefs: ['metric:levelSource'], confidence: 'مرتفعة', implications: ['تفسير المستويات بحذر'], alternativeExplanations: [], limitations: [], dataRequests: [] },
    ],
    findings: [
      { id: 'f1', title: 'فروق بين المواد', statement: 'توجد فروق وصفية بين متوسطات المواد.', claimType: 'fact', evidenceRefs: ['metric:overallMean'], confidence: 'مرتفعة', severity: 'medium', educationalImpact: 'تحديد مواد الأولوية.', recommendedAction: 'تحليل المواد الأدنى.', limitations: [] },
      { id: 'f2', title: 'مستويات مشتقة', statement: 'المستويات ليست حقلاً مستقلاً في المصدر.', claimType: 'fact', evidenceRefs: ['metric:levelSource'], confidence: 'مرتفعة', severity: 'low', educationalImpact: 'منع ادعاء مقارنة مصدرين مستقلين.', recommendedAction: 'عرض حدود الاشتقاق.', limitations: [] },
    ],
    qualityTools: [
      { id: 'q1', name: 'فحص اتساق الدرجة والمستوى', reason: 'مقارنة الدرجة بالمستوى.', interpretation: 'لا اختلافات.', requiredData: [], evidenceRefs: ['metric:levelSource'] },
      { id: 'q2', name: 'فحص تفاوت المواد', reason: 'تختلف المتوسطات بين المواد.', interpretation: 'ترتب المواد حسب المتوسط.', requiredData: [], evidenceRefs: ['metric:overallMean'] },
    ],
    interventions: [
      { id: 'i1', priority: 'عالية', issue: 'مادة منخفضة المتوسط', targetGroup: 'طلبة المادة ذات الأولوية', action: 'تنفيذ تشخيص قصير.', implementationSteps: ['تشخيص', 'تدخل', 'قياس'], responsibleRole: 'معلم المادة', timeframe: '3 أسابيع', successIndicator: 'تحسن المتوسط', monitoringMethod: 'اختبار قبلي وبعدي', contingency: 'مراجعة الخطة', resources: [], evidenceRefs: ['metric:overallMean'] },
      { id: 'i2', priority: 'متوسطة', issue: 'تفاوت في الأداء', targetGroup: 'الحالات ذات الأولوية', action: 'تقسيم الدعم حسب النمط.', implementationSteps: ['تصنيف', 'دعم'], responsibleRole: 'فريق الدعم', timeframe: '4 أسابيع', successIndicator: 'انخفاض الحالات ذات الأولوية', monitoringMethod: 'متابعة دورية', contingency: 'تشخيص أعمق', resources: [], evidenceRefs: ['metric:broadRiskCount'] },
    ],
    monitoringPlan: [
      { id: 'm1', stage: 'خط الأساس', timing: 'الآن', measure: 'متوسطات المواد', owner: 'أخصائي التقويم', evidenceRefs: ['metric:overallMean'] },
      { id: 'm2', stage: 'متابعة مرحلية', timing: 'بعد أسبوعين', measure: 'نتائج التدخل', owner: 'معلمو المواد', evidenceRefs: ['metric:broadRiskCount'] },
      { id: 'm3', stage: 'قياس الأثر', timing: 'بعد شهر', measure: 'تغير المؤشرات', owner: 'فريق الدعم', evidenceRefs: ['metric:studentCount'] },
    ],
    additionalCautions: [], missingDataRequests: [], suggestedNewType: { needed: false, nameAr: '', purpose: '' },
  };
  const reportAnalysis = window.TaqareerReconciliation.composePrimary(analysis, primary, { availableEvidenceRefs: Object.keys(analysis.evidenceMap) });
  assert.equal(reportAnalysis._reconciliation.levelProvenanceGuardApplied, true);
  assert.ok(reportAnalysis.analysisProfile.dimensions.includes('مصدر المستويات وحدود اشتقاقها'));
  assert.ok(!reportAnalysis.analysisProfile.dimensions.includes('اتساق الدرجة والمستوى'));
  assert.ok(!reportAnalysis.analysisProfile.decisionUse.some(item => /اتساق|اختلافات/.test(item)));
  assert.ok(!reportAnalysis.qualityTools.some(item => /اتساق الدرجة والمستوى/.test(item.name)));
  const html = window.TaqareerReports.buildReportHtml({
    analysis: reportAnalysis,
    type: { id: 'multi_subject_results', name: 'نتائج طلاب فردية متعددة المواد' },
    sourceName: 'score-only.xlsx',
    sourceMeta: sheet,
    quality: { completeness: 100 },
    recognitionStatus: 'معتمد',
  }, { autoPrint: false, reportMode: 'full' });
  assert.match(html, /مصدر المستويات/);
  assert.match(html, /مشتقة محليًا من الدرجات/);
  assert.doesNotMatch(html, /اختلافات الدرجة والمستوى/);
  assert.doesNotMatch(html, /اتساق الدرجة والمستوى/);
});
