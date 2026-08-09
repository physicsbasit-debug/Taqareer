const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { packageVersion } = require('../scripts/version-contract.cjs');

const root = path.resolve(__dirname, '..');
const reportSource = fs.readFileSync(path.join(root, 'assets', 'report-system.js'), 'utf8');
const v2Source = fs.readFileSync(path.join(root, 'assets', 'print-report-v2.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function load() {
  const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
  vm.createContext(sandbox);
  vm.runInContext(reportSource, sandbox, { filename: 'report-system.js' });
  vm.runInContext(v2Source, sandbox, { filename: 'print-report-v2.js' });
  return sandbox.window;
}

function sampleContext() {
  const subjects = ['الرياضيات','اللغة العربية','اللغة الإنجليزية'];
  const subjectTopTen = Object.fromEntries(subjects.map((subject, si) => [subject, Array.from({length:10}, (_,i) => ({
    rankLabel: i < 2 ? 'الأول مكرر' : String(i+1),
    name: `طالب ${i+1} بن سالم بن محمد ${['الحوسني','المعولي','الفليحي'][si]}`,
    scoreDisplay: String(100 - i),
    level: 'أ',
  }))]));
  return {
    analysis: {
      n: 318,
      kind: 'scores',
      family: 'scores',
      metrics: [
        ['n','عدد الطلبة',318,'number'],['mean','المتوسط',82.7,'number'],['median','الوسيط',84,'number'],['sd','الانحراف المعياري',10.1,'number'],['masteryPct','الإتقان',68.3,'percent'],['lowPct','د/هـ',10.1,'percent'],
        ['min','الأدنى',11,'number'],['max','الأعلى',100,'number'],['q1','الربيع الأول',74,'number'],['q3','الربيع الثالث',92,'number'],
      ].map(([id,label,value,format]) => ({id,label,value,format,evidenceRef:`metric:${id}`})),
      charts: [
        {id:'score-histogram',type:'histogram',title:'شرائح الدرجات',xKey:'label',yKey:'count',data:[['0-49',27],['50-64',78],['65-79',124],['80-89',49],['90-100',40]].map(([label,count])=>({label,count}))},
        {id:'levels',type:'stacked100',title:'توزيع مستويات الأداء',xKey:'label',yKey:'count',data:[['أ',126],['ب',91],['ج',69],['د',28],['هـ',4]].map(([label,count])=>({label,count}))},
        {id:'subjects',type:'bar',title:'متوسطات المواد',xKey:'label',yKey:'value',data:[['الرياضيات',67.7],['العربية',82.6],['الإنجليزية',78.6],['العلوم',76.4],['الرياضة',92.3]].map(([label,value])=>({label,value}))},
        {id:'status',type:'stacked100',title:'حالة القيد أو النتيجة',xKey:'label',yKey:'count',data:[['منقول',315],['مستجد',3]].map(([label,count])=>({label,count}))},
      ],
      evidenceMap: {'metric:mean':'المتوسط العام: 82.7','metric:sd':'الانحراف المعياري: 10.1','metric:lowPct':'د/هـ: 10.1%'},
      analysisProfile: {family:'scores',method:'تحليل تشخيصي للنتائج',dataSufficiency:'كافية للتحليل الوصفي',decisionUse:['ترتيب الأولويات']},
      executiveTitle:'المؤشرات مستقرة مع أولوية واضحة لمادة الرياضيات',
      executiveSummary:'تظهر النتائج مستوى عامًا جيدًا مع تفاوت بين المواد وفئة تحتاج دعمًا موجهًا، مع بقاء الأسباب المحتملة رهينة أدلة إضافية.',
      diagnosticSections: [
        {title:'تفاوت مستويات التحصيل',analysis:'تظهر البيانات تفاوتًا وصفيًا بين المواد يستدعي ترتيب الأولويات.',claimType:'fact',confidence:'مرتفعة',evidenceRefs:['metric:mean'],implications:['ترتيب مواد الدعم'],limitations:['الفروق لا تثبت السبب'],dataRequests:[]},
        {title:'فئة منخفضة التحصيل',analysis:'توجد فئة تحتاج دعمًا مخصصًا بدل تدخل موحد.',claimType:'inference',confidence:'متوسطة',evidenceRefs:['metric:lowPct'],implications:['تقسيم الدعم'],limitations:[],dataRequests:['اختبار تشخيصي قصير']},
        {title:'الدافعية والبيئة التعليمية',analysis:'قد ترتبط بعض الفروق بعوامل دافعية أو بيئية، لكنها غير مقاسة في الملف الحالي.',claimType:'hypothesis',confidence:'منخفضة',evidenceRefs:['metric:sd'],implications:[],limitations:['العامل غير مقاس مباشرة'],dataRequests:['أداة قياس مستقلة']},
      ],
      findings: [
        {title:'الرياضيات أولوية تحسين',statement:'متوسط الرياضيات أدنى من المتوسط العام.',claimType:'fact',confidence:'مرتفعة',evidenceRefs:['metric:mean'],educationalImpact:'تحديد أولوية المتابعة.',recommendedAction:'تحليل مهارات الرياضيات.',limitations:[]},
        {title:'فئة التحصيل المنخفض تحتاج مسارًا مستقلًا',statement:'تحتاج الفئة الأقل أداءً إلى دعم متمايز.',claimType:'inference',confidence:'متوسطة',evidenceRefs:['metric:lowPct'],educationalImpact:'تحسين دقة التدخل.',recommendedAction:'مجموعات دعم صغيرة.',limitations:[]},
        {title:'الدافعية تحتاج تحققًا',statement:'العامل غير مقاس.',claimType:'hypothesis',confidence:'منخفضة',evidenceRefs:['metric:sd'],educationalImpact:'لا يعتمد سببيًا.',recommendedAction:'جمع دليل مباشر.',limitations:['غير مقاس']},
        {title:'إعادة القياس ضرورة',statement:'يلزم مقارنة الأثر بخط أساس.',claimType:'inference',confidence:'متوسطة',evidenceRefs:['metric:mean'],educationalImpact:'ضبط القرار.',recommendedAction:'إعادة القياس بعد أربعة أسابيع.',limitations:[]},
      ],
      qualityTools: [{name:'فحص التشتت والميل التوزيعي',reason:'وجود تباين بين الفئات.',interpretation:'يدعم التمايز في التدخل.'}],
      improvementPlan: [
        {priority:'عالية',issue:'رفع التحصيل في الرياضيات',targetGroup:'طلبة د/هـ',action:'تنفيذ دعم علاجي مركز.',implementationSteps:['تحليل اختبار قصير','بناء مجموعات علاجية','إعادة قياس أسبوعية'],responsibleRole:'معلم المادة',timeframe:'4 أسابيع',successIndicator:'انخفاض د/هـ',monitoringMethod:'اختبار أسبوعي',contingency:'تعديل التدخل',basisClaimType:'fact',basisConfidence:'مرتفعة'},
        {priority:'متوسطة',issue:'تثبيت الأداء المرتفع',targetGroup:'المواد الأعلى أداءً',action:'مراجعة الممارسات القابلة للنقل.',implementationSteps:['مراجعة الأدلة','اختيار ممارسة','تجريبها'],responsibleRole:'المعلم الأول',timeframe:'شهر',successIndicator:'أثر قابل للقياس',monitoringMethod:'مراجعة شهرية',contingency:'إيقاف الممارسة غير المؤثرة',basisClaimType:'inference',basisConfidence:'متوسطة'},
      ],
      monitoringPlan: [
        {timing:'قبل التدخل',stage:'خط الأساس',measure:'تثبيت المؤشرات.',owner:'المعلم الأول'},
        {timing:'بعد أسبوعين',stage:'متابعة مرحلية',measure:'قياس الاستجابة.',owner:'معلم المادة'},
        {timing:'نهاية الشهر',stage:'قياس الأثر',measure:'مقارنة النتائج.',owner:'فريق التحسين'},
      ],
      limitations:['الدرجات لا تشخص المهارة المفقودة وحدها.','الفروق بين المواد لا تثبت سببًا نفسيًا أو اجتماعيًا أو تدريسيا دون قياس مباشر.'],
      privateTables: {
        rankingFormulaLabel:'70% متوسط المواد الأساسية + 30% متوسط جميع المواد',
        schoolTopTen:Array.from({length:10},(_,i)=>({rankLabel:String(i+1),name:`محمد بن أحمد بن سالم الطالب${i+1}`,coreMeanDisplay:String(99-i/4),allMeanDisplay:String(98-i/4),rankingScoreDisplay:String(98.7-i/4)})),
        subjectTopTen,
        incompleteRankingCount:0,
      },
      scopeContext:{analysisMode:'all'},
      _reconciliation:{aiPrimary:true,aiApplied:true},
    },
    type:{id:'multi_subject_results',name:'نتائج طلاب فردية متعددة المواد'},
    sourceName:'results.pdf',
    sourceMeta:{sourceType:'pdf',pages:Array.from({length:21},(_,i)=>i+1),metadata:{school:'مدرسة الباسط للبنين (8-10)',analyzedGrade:'الثامن',subject:'متعدد المواد',academicYear:'2025/2026',period:'الفصل الأول'}},
    quality:{completeness:100}, recognitionStatus:'معتمد',
  };
}

test('Print Report V2 is loaded after the trusted report data layer and before app.js', () => {
  const v2Pos = indexSource.indexOf('assets/print-report-v2.js');
  const legacyPos = indexSource.indexOf('assets/report-system.js');
  const appPos = indexSource.indexOf('assets/app.js');
  assert.ok(legacyPos >= 0 && v2Pos > legacyPos && appPos > v2Pos);
  assert.match(appSource, /window\.TaqareerPrintReportV2\?\.openReport/);
  assert.match(appSource, /Print Report V2 failed; opening the stable legacy renderer/);
});

test('Print Report V2 consumes buildReportData instead of re-implementing analysis or ranking logic', () => {
  assert.match(v2Source, /legacy\(\)\.buildReportData\(context\)/);
  assert.doesNotMatch(v2Source, /function\s+calculate|masteryCount\s*=|rankingScore\s*=/);
  assert.match(reportSource, /window\.TaqareerReports=\{[^}]*renderChart[^}]*selectMetricGroups[^}]*metricValue/);
});

test('Print Report V2 produces page-centric A4 HTML with inference ranks and full student names', () => {
  const win = load();
  assert.equal(win.TaqareerPrintReportV2.VERSION, packageVersion(root));
  const html = win.TaqareerPrintReportV2.buildReportHtml(sampleContext(), {reportMode:'full'});
  const pages = [...html.matchAll(/<section class="sheet /g)].length;
  assert.ok(pages >= 7 && pages <= 12, `unexpected V2 full page count: ${pages}`);
  assert.match(html, /Print Report V2/);
  assert.match(html, /@page\{size:A4 portrait;margin:0\}/);
  assert.match(html, /مؤكد من البيانات/);
  assert.match(html, /استنتاج مدعوم/);
  assert.match(html, /فرضية تحتاج تحققًا/);
  assert.match(html, /محمد بن أحمد بن سالم الطالب1/);
  assert.match(html, /70% متوسط المواد الأساسية/);
  assert.doesNotMatch(html, /flowPaginateA4|paginatePackableRun|report-sheet-flow-packed/);
});

test('Print Report V2 executive report stays within five A4 pages and excludes ranking appendix', () => {
  const html = load().TaqareerPrintReportV2.buildReportHtml(sampleContext(), {reportMode:'executive'});
  const pages = [...html.matchAll(/<section class="sheet /g)].length;
  assert.ok(pages >= 3 && pages <= 5, `unexpected V2 executive page count: ${pages}`);
  assert.doesNotMatch(html, /العشرة الأوائل على مستوى المدرسة/);
  assert.match(html, /خطة التحسين والمتابعة/);
});

test('Print Report V2 contains a runtime integrity guard for page overflow and semantic block counts', () => {
  assert.match(v2Source, /dataset\.reportV2Integrity=failures\.length\?'fail':'pass'/);
  assert.match(v2Source, /page-overflow:/);
  assert.match(v2Source, /actual=\{diagnostic:count\('\.diagnostic'\),finding:count\('\.decision-table tbody tr'\),plan:count\('\.plan-row'\),monitoring:count\('\.stage'\),ranking:/);
  assert.match(v2Source, /failures\.push\('count:'\+key/);
});
