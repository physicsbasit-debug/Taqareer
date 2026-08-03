const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const sandbox={window:{},console,Intl,Date,Math,Set,Map,structuredClone,Array,Object,String,Number,RegExp,JSON};
vm.createContext(sandbox);
for(const file of ['mastery-metrics.js','deep-analysis.js','analysis-reconciliation.js','report-system.js']){
  vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
}
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','aaaa-scores.json'),'utf8'));
const local=sandbox.window.TaqareerDeepAnalytics.analyze({
  typeId:'assessment_component',
  headers:['م','درجة عنصر المادة'],
  rows:fixture.scores.map((score,index)=>({م:index+1,'درجة عنصر المادة':score})),
  scoreColumn:'درجة عنصر المادة',maxScore:40,thresholdPct:75
});
const api=sandbox.window.TaqareerReconciliation;
assert.strictEqual(api.VERSION,'0.9.0');
const canonical=api.canonicalize(local);
const contract=api.buildContract(local);
assert.strictEqual(contract.mode,'delta-only');
assert.strictEqual(contract.rules.lockedCounts.findings,5);
assert.deepStrictEqual(contract.targets.interventions.map(x=>x.id),[
  'intervention.deep_gap','intervention.moderate_gap','intervention.near_mastery','intervention.mastery_enrichment'
]);
const refs=Object.keys(local.evidenceMap||{});
const delta={
  executiveEnhancement:{title:'انتشار الإتقان يحتاج تدخلًا سريعًا موجّهًا',summary:'قراءة تربوية محسنة دون إعادة حساب المؤشرات.',rationale:'تحسين الصياغة فقط'},
  profileEnhancement:{method:'تحليل تشخيصي حتمي مع تفسير تربوي مصالَح',dataAdequacy:'كافية للتحليل الوصفي والتجزئة، غير كافية لتحديد المهارة المتعثرة.',dimensions:['الاستجابة للتدخل'],decisionUses:['اختيار شدة التدخل']},
  diagnosticEnhancements:[{targetId:'diagnostic.mastery_segments',analysis:'تؤكد الفئات الأربع أن البرنامج الموحد سيهدر الموارد؛ يلزم ربط كل فئة بجرعة تدخل مختلفة.',evidenceRefs:['metric:masteryPct'],confidence:'مرتفعة',implications:['تثبيت انتقال الطالب بين الفئات كمؤشر متابعة.'],limitations:[]}],
  findingEnhancements:[{targetId:'finding.mastery_spread',statement:'الانتشار المنخفض واسع بما يكفي لتبرير تدخل متعدد المستويات.',evidenceRefs:['metric:masteryPct','metric:n'],confidence:'مرتفعة',educationalImpact:'قرار جماعي مع تمايز داخلي.',recommendedAction:'البدء بالفجوة العميقة مع مسار قصير للقريبين من الإتقان.',limitations:[],severity:'high'}],
  additionalFindings:[{title:'انتشار الإتقان منخفض جدًا',statement:'صياغة مكررة يجب رفضها.',evidenceRefs:['metric:masteryPct'],confidence:'مرتفعة',educationalImpact:'',recommendedAction:'',limitations:[],severity:'high'}],
  qualityToolEnhancements:[{targetId:'gap',reason:'تفسير محسن للفجوة.',interpretation:'الوصول إلى المستوى التالي يتطلب انتقال 60 طالبًا على الأقل.',requiredData:[]}],
  interventionEnhancements:[
    {targetId:'intervention.deep_gap',action:'تشخيص موجز ثم إعادة تدريس مكثفة بمجموعات صغيرة وفق المتطلبات السابقة.',responsibleRole:'معلم المادة مع أخصائي التقويم',timeframe:'3 أسابيع',successIndicator:'انتقال 20% على الأقل من الفجوة العميقة إلى الفجوة المتوسطة أو أعلى.',monitoringMethod:'اختبار قبلي وبعدي وسجل أسبوعي.',contingency:'تحليل الحضور والصعوبات وعينات الأعمال عند ضعف الاستجابة.',evidenceRefs:['metric:deepGapPct']},
    {targetId:'intervention.unknown',action:'يجب رفضه',responsibleRole:'',timeframe:'',successIndicator:'',monitoringMethod:'',contingency:'',evidenceRefs:[]}
  ],
  monitoringEnhancements:[{targetId:'monitoring.remeasurement',measure:'اختبار مكافئ يقارن الانتشار والتشتت وانتقال الفئات.',owner:'فريق المادة وأخصائي التقويم'}],
  additionalCautions:['لا تحدد الدرجات الإجمالية المهارة المسؤولة عن الضعف.'],
  missingDataRequests:['تحليل مفردات الاختبار وربطها بالمهارات.'],
  suggestedNewType:{needed:false,nameAr:'',purpose:'',requiredFields:[],analysisFamily:[]}
};
const reconciled=api.reconcile(local,delta,{availableEvidenceRefs:refs});
const check=api.validateCounts(local,reconciled);
assert.strictEqual(check.ok,true,check.errors.join(','));
assert.strictEqual(reconciled.findings.length,5,'score findings must stay locked');
assert.strictEqual(reconciled.improvementPlan.length,4,'score interventions must stay locked');
assert.strictEqual(reconciled.monitoringPlan.length,4,'score monitoring must stay locked');
assert.strictEqual(reconciled.diagnosticSections.length,4,'score diagnostics must stay locked');
assert.ok(reconciled.improvementPlan[0].action.includes('إعادة تدريس مكثفة'));
assert.ok(reconciled.monitoringPlan.find(x=>x.id==='monitoring.remeasurement').measure.includes('انتقال الفئات'));
assert.strictEqual(reconciled._reconciliation.addedFindings,0);
assert.ok(reconciled._reconciliation.rejectedEnhancements>=1);
const context={analysis:reconciled,type:{name:'درجات مكوّن تقويمي'},sourceName:'aaaa.xlsx · Sheet1',sourceMeta:{reportTitle:'كشف مراجعة إدخال الدرجات لمادة دراسية ( الأحياء ) - الصف التاسع'},quality:{completeness:100},recognitionStatus:'معتمد'};
const html=sandbox.window.TaqareerReports.buildReportHtml(context,{autoPrint:false});
assert.ok(html.includes('تقارير v0.9.0'));
assert.strictEqual((html.match(/class="plan-card"/g)||[]).length,4,'report must render one canonical intervention set');
assert.strictEqual((html.match(/class="timeline"/g)||[]).length,1,'report must render one monitoring cycle');
assert.ok(!html.includes('صياغة مكررة يجب رفضها'));
console.log('PASS canonical reconciliation preserves locked score contract and removes parallel AI output');
