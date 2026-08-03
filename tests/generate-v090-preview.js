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
 executiveEnhancement:{title:'انتشار الإتقان 17.9% - تدخل سريع متعدد المستويات',summary:'تؤكد القراءة المصالحة أن المجموعة تحتاج تدخلًا سريعًا، لكن التنفيذ يجب أن يتوزع على أربع فئات ثابتة بدل إنشاء خطط موازية.',rationale:'تحسين صياغة الحكم دون تغيير الحساب'},
 profileEnhancement:{method:'تحليل تشخيصي حتمي مع تفسير تربوي مصالَح',dataAdequacy:'مرتفعة للتحليل الوصفي والتجزئة، ومحدودة لتحديد المهارة المتعثرة.',dimensions:['الاستجابة للتدخل','ثبات الحكم'],decisionUses:['تحديد شدة التدخل','إعادة القياس']},
 diagnosticEnhancements:[
  {targetId:'diagnostic.measurement_quality',analysis:'البيانات كافية للحكم على حجم الفجوة وتوزيعها، لكنها لا تكفي لتحديد المهارة أو المفهوم المسبب؛ لذلك يجب فصل قرار التدخل عن تشخيص المحتوى.',evidenceRefs:['metric:n','metric:masteryPct'],confidence:'مرتفعة',implications:['استخدام النتائج للتجزئة العلاجية.','جمع تحليل مفردات الاختبار قبل تشخيص السبب.'],limitations:[]},
  {targetId:'diagnostic.distribution_center',analysis:'تقارب المتوسط والوسيط مع تشتت مرتفع يعني أن مركز الأداء واضح، لكن الاحتياجات حوله واسعة؛ المتوسط وحده لا يصلح لتصميم برنامج موحد.',evidenceRefs:['metric:mean','metric:median','metric:sd'],confidence:'مرتفعة',implications:['تثبيت الربيعات كحدود تشغيلية للفئات.'],limitations:[]}
 ],
 findingEnhancements:[
  {targetId:'finding.mastery_spread',statement:'الانتشار المنخفض واسع بما يكفي لتبرير تدخل مؤسسي سريع، مع تمايز داخلي بحسب شدة الفجوة.',evidenceRefs:['metric:masteryPct','metric:n'],confidence:'مرتفعة',educationalImpact:'قرار جماعي منظم بدل استجابات فردية متناثرة.',recommendedAction:'البدء بالفجوة العميقة، مع مسار سريع للقريبين من الإتقان.',limitations:[],severity:'high'},
  {targetId:'finding.segmented_intervention',statement:'الفئات الأربع تمثل جرعات تدخل مختلفة، وليست أربع خطط منفصلة عن المحرك المحلي.',evidenceRefs:['metric:masteryPct','metric:n'],confidence:'مرتفعة',educationalImpact:'تحسين كفاءة توزيع الوقت والموارد.',recommendedAction:'ربط كل فئة بمؤشر انتقال محدد في إعادة القياس.',limitations:[],severity:'high'}
 ],
 additionalFindings:[],
 qualityToolEnhancements:[
  {targetId:'gap',reason:'تفسير الفجوة بوصفها قرار انتقال لا مجرد نسبة.',interpretation:'الوصول إلى المستوى التالي يتطلب انتقال 60 طالبًا على الأقل إلى حد الإتقان.',requiredData:[]},
  {targetId:'segmentation',reason:'تثبيت الفئات الأربع كعقد تنفيذي.',interpretation:'كل فئة مرتبطة بشدة تدخل ومؤشر انتقال مستقل.',requiredData:[]}
 ],
 interventionEnhancements:[
  {targetId:'intervention.deep_gap',action:'تشخيص موجز ثم إعادة تدريس مكثفة بمجموعات صغيرة تركز على المتطلبات السابقة، مع اختبارات خروج أسبوعية.',responsibleRole:'معلم المادة مع أخصائي التقويم والدعم',timeframe:'3 أسابيع',successIndicator:'انتقال 20% على الأقل من الفجوة العميقة إلى الفجوة المتوسطة أو أعلى.',monitoringMethod:'اختبار قبلي وبعدي وسجل انتقال أسبوعي.',contingency:'تحليل الحضور والصعوبات وعينات الأعمال عند ضعف الاستجابة.',evidenceRefs:['metric:deepGapPct']},
  {targetId:'intervention.moderate_gap',action:'دعم جماعي موجّه مع نمذجة الحل وتغذية راجعة فورية ومهمتين قصيرتين أسبوعيًا.',responsibleRole:'معلم المادة',timeframe:'أسبوعان',successIndicator:'انتقال 50% من الفئة إلى قريب من الإتقان أو الإتقان.',monitoringMethod:'مهمتان قصيرتان أسبوعيًا ومقارنة الاتجاه.',contingency:'تقليل حجم المجموعة أو تغيير الاستراتيجية عند ضعف الاستجابة.',evidenceRefs:['metric:masteryPct']},
  {targetId:'intervention.near_mastery',action:'مراجعة قصيرة تستهدف الفجوة المحدودة مع اختبار خروج بعد كل جلسة.',responsibleRole:'معلم المادة',timeframe:'أسبوع واحد',successIndicator:'بلوغ أغلب الفئة حد الإتقان في القياس اللاحق.',monitoringMethod:'اختبار خروج قصير.',contingency:'دعم فردي محدود للحالات المتبقية.',evidenceRefs:['metric:nearMasteryPct']},
  {targetId:'intervention.mastery_enrichment',action:'مهام تثبيت وإثراء وتطبيقات أعلى تحافظ على النمو وتوسع نقل التعلم.',responsibleRole:'معلم المادة',timeframe:'مستمر خلال الوحدة',successIndicator:'ثبات الإتقان وتحسن جودة الأداء في مهمة إثرائية.',monitoringMethod:'Rubric مختصر وملف إنجاز.',contingency:'رفع مستوى التحدي دون تحميل المتقنين مسؤولية تدريس زملائهم.',evidenceRefs:['metric:masteryCount']}
 ],
 monitoringEnhancements:[
  {targetId:'monitoring.short_followup',measure:'نتائج مهمات قصيرة وانتقال الطلبة بين الفئات الأربع أسبوعيًا.',owner:'معلم المادة'},
  {targetId:'monitoring.remeasurement',measure:'اختبار مكافئ يقارن الانتشار والتشتت وانتقال الفئات.',owner:'فريق المادة وأخصائي التقويم'}
 ],
 additionalCautions:['لا تحدد الدرجات الإجمالية المهارة أو المفهوم المسؤول عن التعثر.'],
 missingDataRequests:['تحليل مفردات الاختبار وربطها بالمهارات.'],
 suggestedNewType:{needed:false,nameAr:'',purpose:'',requiredFields:[],analysisFamily:[]}
};
const reconciled=sandbox.window.TaqareerReconciliation.reconcile(local,delta,{availableEvidenceRefs:refs});
const check=sandbox.window.TaqareerReconciliation.validateCounts(local,reconciled);
if(!check.ok) throw new Error(check.errors.join(','));
const context={analysis:reconciled,type:{name:'درجات مكوّن تقويمي'},sourceName:'aaaa.xlsx · Sheet1',sourceMeta:{reportTitle:'كشف مراجعة إدخال الدرجات لمادة دراسية ( الأحياء ) - الصف التاسع',metadata:{preamble:'المدرسة: الباسط للتعليم الأساسي (8-10) | المادة: الأحياء | الصف: التاسع | العام الدراسي: 2025/2026 | الفصل الدراسي: الثاني'}},quality:{completeness:100},recognitionStatus:'تصنيف هجين معتمد'};
const html=sandbox.window.TaqareerReports.buildReportHtml(context,{autoPrint:false});
fs.writeFileSync(path.join(root,'docs','taqareer_v0_9_0_reconciled_scores_preview.html'),html);
fs.writeFileSync(path.join(root,'tests','fixtures','reconciled-analysis-v090.json'),JSON.stringify(reconciled,null,2));
console.log(JSON.stringify({findings:reconciled.findings.length,plans:reconciled.improvementPlan.length,monitoring:reconciled.monitoringPlan.length,enhancements:reconciled._reconciliation.appliedEnhancements}));
