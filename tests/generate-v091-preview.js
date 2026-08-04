const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.join(__dirname,'..');
const sandbox={window:{},console,Intl,Date,Math,Set,Map,structuredClone,Array,Object,String,Number,RegExp,JSON};
vm.createContext(sandbox);
for(const file of ['mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','report-system.js']){
  vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
}
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','aaaa-scores.json'),'utf8'));
const local=sandbox.window.TaqareerDeepAnalytics.analyze({
  typeId:'assessment_component',headers:['م','اسم الطالب','عنصر المادة','درجة عنصر المادة','ملاحظات'],
  rows:fixture.scores.map((score,index)=>({م:index+1,'اسم الطالب':`طالب ${index+1}`,'عنصر المادة':'اختبار','درجة عنصر المادة':score,'ملاحظات':''})),
  scoreColumn:'درجة عنصر المادة',maxScore:40,thresholdPct:75
});
const refs=Object.keys(local.evidenceMap||{});
const delta={
 contractVersion:'3.0.0',
 deepAnalysisUnits:[
  {targetId:'diagnostic.measurement_quality',analysis:'تسمح البيانات بتقدير حجم فجوة الإتقان وتوزيعها بدرجة ثقة مرتفعة، لكنها لا تكشف المهارات أو المفاهيم المسببة للتعثر. تربويًا، يصلح هذا المستوى من البيانات لتحديد جرعة التدخل والفئات المستهدفة، بينما يتطلب تشخيص المحتوى تحليل مفردات الاختبار وعينات من أعمال الطلبة.',evidenceRefs:['metric:n','metric:masteryPct'],confidence:'مرتفعة',implications:['اعتماد التجزئة العلاجية الحالية بوصفها قرار فرز أولي.','جمع أدلة أداء نوعية قبل تحديد المحتوى العلاجي.'],alternativeExplanations:['قد تعكس النتيجة صعوبة أداة القياس أو عدم اتساقها مع فرص التعلم، وليس ضعف الفهم وحده.'],limitations:['الدرجات الإجمالية لا تحدد موضع الخطأ المعرفي.'],dataRequests:['تحليل مفردات الاختبار وربطها بالمهارات.']},
  {targetId:'diagnostic.distribution_center',analysis:'تقارب المتوسط والوسيط يشير إلى مركز أداء واضح، لكن التشتت الواسع يعني أن المتوسط لا يمثل احتياجات جميع الطلبة. وجود كتلة كبيرة في الفجوة العميقة مع مجموعة متقنة يفرض تدخلًا متمايزًا لا برنامجًا موحدًا.',evidenceRefs:['metric:mean','metric:median','metric:sd'],confidence:'مرتفعة',implications:['استخدام الربيعات وفئات الإتقان لتوزيع الطلبة إلى مسارات تدخل مختلفة.'],alternativeExplanations:['قد يرتبط التشتت بتفاوت الخبرة السابقة أو الحضور أو فرص الممارسة.'],limitations:['لا تتوافر متغيرات تفسيرية لاختبار أسباب التفاوت.'],dataRequests:['بيانات الحضور والنتائج السابقة وعينات الأعمال.']},
  {targetId:'diagnostic.mastery_segments',analysis:'تكشف الفئات الأربع اختلافًا نوعيًا في الاحتياجات: فجوة عميقة تحتاج إعادة بناء متطلبات سابقة، وفجوة متوسطة تحتاج ممارسة موجهة، وقريبون من الإتقان يحتاجون تصحيحًا قصيرًا، ومتقنون يحتاجون تثبيتًا وإثراءً.',evidenceRefs:['metric:masteryPct','metric:deepGapPct','metric:nearMasteryPct'],confidence:'مرتفعة',implications:['منع البرنامج العلاجي الواحد لجميع الطلبة.'],alternativeExplanations:['قد يتغير حجم الفئات إذا تغير حد الإتقان، لذا ينبغي قراءة الحساسية بجانب التجزئة.'],limitations:['الفئات تصف شدة الفجوة ولا تحدد سببها.'],dataRequests:['نتائج قياس قصير مكافئ بعد أسبوعين.']},
  {targetId:'diagnostic.judgement_stability',analysis:'يبقى الحكم العام منخفضًا عبر نطاق واسع من حدود الإتقان، ما يدل على أن الحاجة إلى التدخل ليست نتيجة اختيار حد واحد فقط. مع ذلك، تتغير أحجام الفئات عند تحريك المعيار، ولذلك يجب تثبيت الحد قبل المقارنة الزمنية.',evidenceRefs:['metric:masteryPct','metric:cv'],confidence:'مرتفعة',implications:['اعتماد حد ثابت عند إعادة القياس.'],alternativeExplanations:['قد تتأثر الحساسية بجودة توزيع صعوبة الاختبار.'],limitations:['لا تتوافر بيانات صدق وثبات للأداة.'],dataRequests:['مواصفات الاختبار وتحليل صعوبته وتمييزه.']}
 ],
 patches:[
  {targetType:'executive',targetId:'executive',field:'executiveTitle',text:'انتشار الإتقان 17.9% — تدخل سريع متعدد المسارات',items:[],evidenceRefs:['metric:masteryPct']},
  {targetType:'executive',targetId:'executive',field:'executiveSummary',text:'تتطلب النتيجة تدخلًا سريعًا متعدد المسارات، مع حماية المتقنين من الركود وفصل التشخيص المحتوائي عن قرار التجزئة الأولي. الحسابات تحدد من يحتاج أي جرعة من الدعم، بينما يلزم تحليل مفردات الاختبار لتحديد ماذا نعيد تدريسه.',items:[],evidenceRefs:['metric:masteryPct','metric:n']},
  {targetType:'finding',targetId:'finding.mastery_spread',field:'educationalImpact',text:'انخفاض الانتشار بهذا الحجم يعني أن التدخل الصفي العام وحده غير كافٍ، ويجب الجمع بين إعادة التدريس المكثف ومسار قريب من الإتقان وإثراء المتقنين.',items:[],evidenceRefs:['metric:masteryPct','metric:n']},
  {targetType:'intervention',targetId:'intervention.deep_gap',field:'implementationSteps',text:'',items:['اختبار تشخيصي قصير للمتطلبات السابقة.','إعادة تدريس في مجموعات صغيرة.','اختبارات خروج أسبوعية وتعديل المجموعات.'],evidenceRefs:['metric:deepGapPct']},
  {targetType:'intervention',targetId:'intervention.deep_gap',field:'resources',text:'',items:['بنك أسئلة تشخيصي.','سجل انتقال أسبوعي بين الفئات.'],evidenceRefs:['metric:deepGapPct']},
  {targetType:'intervention',targetId:'intervention.moderate_gap',field:'implementationSteps',text:'',items:['نمذجة الحل والتفكير بصوت عالٍ.','ممارسة موجهة ثم مستقلة.','مهمتان قصيرتان أسبوعيًا.'],evidenceRefs:['metric:masteryPct']},
  {targetType:'monitoring',targetId:'monitoring.short_followup',field:'measure',text:'قياس انتقال الطلبة بين الفئات الأربع أسبوعيًا مع مقارنة نتائج مهمات قصيرة متكافئة.',items:[],evidenceRefs:[]}
 ],
 additionalCautions:['لا يجوز تفسير التفاوت بوصفه أثرًا للمعلم أو المنهج دون بيانات إضافية.'],
 missingDataRequests:['تحليل مفردات الاختبار وربطها بالمهارات.']
};
const reconciled=sandbox.window.TaqareerReconciliation.reconcile(local,delta,{availableEvidenceRefs:refs});
const check=sandbox.window.TaqareerReconciliation.validateCounts(local,reconciled);
if(!check.ok) throw new Error(check.errors.join(','));
const context={analysis:reconciled,type:{name:'درجات مكوّن تقويمي'},sourceName:'aaaa.xlsx · Sheet1',sourceMeta:{reportTitle:'كشف مراجعة إدخال الدرجات لمادة دراسية ( الأحياء ) - الصف التاسع',metadata:{preamble:'المدرسة: الباسط للتعليم الأساسي (8-10) | المادة: الأحياء | الصف: التاسع | العام الدراسي: 2025/2026 | الفصل الدراسي: الثاني'}},quality:{completeness:100},recognitionStatus:'تصنيف هجين معتمد'};
const html=sandbox.window.TaqareerReports.buildReportHtml(context,{autoPrint:false});
fs.writeFileSync(path.join(root,'docs','taqareer_v0_9_1_deep_analysis_delta_preview.html'),html);
fs.writeFileSync(path.join(root,'tests','fixtures','deep-analysis-delta-v091.json'),JSON.stringify(reconciled,null,2));
console.log(JSON.stringify({findings:reconciled.findings.length,plans:reconciled.improvementPlan.length,monitoring:reconciled.monitoringPlan.length,deep:reconciled._reconciliation.appliedDeepAnalyses,patches:reconciled._reconciliation.appliedPatches}));
