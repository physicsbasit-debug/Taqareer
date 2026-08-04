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
  typeId:'assessment_component',headers:['م','درجة عنصر المادة'],
  rows:fixture.scores.map((score,index)=>({م:index+1,'درجة عنصر المادة':score})),
  scoreColumn:'درجة عنصر المادة',maxScore:40,thresholdPct:75
});
const api=sandbox.window.TaqareerReconciliation;
assert.strictEqual(api.VERSION,'0.9.2');
assert.strictEqual(api.CONTRACT_VERSION,'3.0.0');
const contract=api.buildContract(local);
assert.strictEqual(contract.mode,'deep-analysis-delta');
assert.strictEqual(contract.rules.lockedCounts.findings,5);
assert.strictEqual(contract.deepAnalysisTargets.length,4);
assert.deepStrictEqual(contract.patchTargets.interventions.map(x=>x.id),[
  'intervention.deep_gap','intervention.moderate_gap','intervention.near_mastery','intervention.mastery_enrichment'
]);
const refs=Object.keys(local.evidenceMap||{});
const delta={
  contractVersion:'3.0.0',
  deepAnalysisUnits:[
    {
      targetId:'diagnostic.mastery_segments',
      analysis:'توضح الفئات الأربع أن ضعف الانتشار ليس كتلة واحدة؛ فالفجوة العميقة تحتاج إعادة بناء للمتطلبات السابقة، بينما القريبون من الإتقان يحتاجون جرعة قصيرة مركزة. هذا الاختلاف يجعل البرنامج الموحد أقل كفاءة، ويجعل انتقال الطالب بين الفئات مؤشرًا أدق من متابعة المتوسط وحده.',
      evidenceRefs:['metric:masteryPct','metric:deepGapPct'],confidence:'مرتفعة',
      implications:['تخصيص جرعة تدخل مختلفة لكل فئة.'],
      alternativeExplanations:['قد يتأثر التوزيع بصعوبة الاختبار أو عدم اتساقه مع فرص التعلم.'],
      limitations:['لا تحدد الدرجات الإجمالية المهارات المتعثرة.'],
      dataRequests:['تحليل مفردات الاختبار وربطها بالمهارات.']
    },
    {targetId:'diagnostic.unknown',analysis:'مرفوض',evidenceRefs:['metric:n'],confidence:'مرتفعة',implications:[],alternativeExplanations:[],limitations:[],dataRequests:[]}
  ],
  patches:[
    {targetType:'executive',targetId:'executive',field:'executiveSummary',text:'تتطلب النتيجة تدخلًا متعدد المستويات مع إعادة قياس انتقال الطلبة بين الفئات.',items:[],evidenceRefs:['metric:masteryPct']},
    {targetType:'finding',targetId:'finding.mastery_spread',field:'educationalImpact',text:'القرار جماعي، لكن التنفيذ يجب أن يبقى متمايزًا وفق عمق الفجوة.',items:[],evidenceRefs:['metric:masteryPct']},
    {targetType:'intervention',targetId:'intervention.deep_gap',field:'action',text:'تشخيص موجز للمتطلبات السابقة ثم إعادة تدريس مكثفة في مجموعات صغيرة.',items:[],evidenceRefs:['metric:deepGapPct']},
    {targetType:'intervention',targetId:'intervention.deep_gap',field:'implementationSteps',text:'',items:['اختبار تشخيصي قصير.','إعادة تدريس المفاهيم السابقة.','مهمة خروج أسبوعية.'],evidenceRefs:['metric:deepGapPct']},
    {targetType:'intervention',targetId:'intervention.deep_gap',field:'resources',text:'',items:['بنك أسئلة تشخيصي','سجل متابعة أسبوعي'],evidenceRefs:['metric:deepGapPct']},
    {targetType:'monitoring',targetId:'monitoring.remeasurement',field:'measure',text:'اختبار مكافئ يقارن الانتشار والتشتت وانتقال الفئات.',items:[],evidenceRefs:['metric:masteryPct']},
    {targetType:'finding',targetId:'finding.mastery_spread',field:'educationalImpact',text:'رقعة مكررة يجب رفضها.',items:[],evidenceRefs:['metric:masteryPct']},
    {targetType:'finding',targetId:'finding.mastery_spread',field:'mean',text:'حقل محظور.',items:[],evidenceRefs:['metric:mean']},
    {targetType:'intervention',targetId:'intervention.unknown',field:'action',text:'هدف غير موجود.',items:[],evidenceRefs:[]}
  ],
  additionalCautions:['لا تحول النتائج إلى حكم سببي على المعلم أو المنهج.'],
  missingDataRequests:['تحليل مفردات الاختبار وربطها بالمهارات.']
};
const reconciled=api.reconcile(local,delta,{availableEvidenceRefs:refs});
const check=api.validateCounts(local,reconciled);
assert.strictEqual(check.ok,true,check.errors.join(','));
assert.strictEqual(reconciled.findings.length,5);
assert.strictEqual(reconciled.improvementPlan.length,4);
assert.strictEqual(reconciled.monitoringPlan.length,4);
assert.strictEqual(reconciled.diagnosticSections.length,4);
const diag=reconciled.diagnosticSections.find(x=>x.id==='diagnostic.mastery_segments');
assert.ok(diag.analysis.includes('الفئات الأربع'));
assert.strictEqual(diag.alternativeExplanations.length,1);
assert.strictEqual(diag.dataRequests.length,1);
const deepPlan=reconciled.improvementPlan.find(x=>x.id==='intervention.deep_gap');
assert.ok(deepPlan.action.includes('إعادة تدريس مكثفة'));
assert.strictEqual(deepPlan.implementationSteps.length,3);
assert.strictEqual(deepPlan.resources.length,2);
assert.ok(reconciled.monitoringPlan.find(x=>x.id==='monitoring.remeasurement').measure.includes('انتقال الفئات'));
assert.strictEqual(reconciled._reconciliation.appliedDeepAnalyses,1);
assert.ok(reconciled._reconciliation.appliedPatches>=6);
assert.ok(reconciled._reconciliation.rejectedEnhancements>=4);
assert.strictEqual(reconciled._reconciliation.addedFindings,0);
const context={analysis:reconciled,type:{name:'درجات مكوّن تقويمي'},sourceName:'aaaa.xlsx · Sheet1',sourceMeta:{reportTitle:'كشف مراجعة إدخال الدرجات لمادة دراسية ( الأحياء ) - الصف التاسع'},quality:{completeness:100},recognitionStatus:'معتمد'};
const html=sandbox.window.TaqareerReports.buildReportHtml(context,{autoPrint:false});
assert.ok(html.includes('تقارير v0.9.2'));
assert.strictEqual((html.match(/class="plan-card"/g)||[]).length,4);
assert.strictEqual((html.match(/class="timeline"/g)||[]).length,1);
assert.ok(html.includes('تفسيرات بديلة محتملة'));
assert.ok(html.includes('خطوات التنفيذ'));
assert.ok(!html.includes('رقعة مكررة يجب رفضها'));
console.log('PASS deep analysis delta preserves locked contract, applies deep interpretation and rejects unsafe patches');

// The same protocol must remain type-specific for narrative supervision reports.
const narrativeText=`جوانب الإجادة في الأداء وأدلتها
تمكن جميع الطلبة من اكتساب المفاهيم والمعارف المستهدفة.
كان الدرس منظما ومتسقا مع الأهداف التعليمية.
جوانب التطوير في الأداء وأدلتها
يحتاج المعلم إلى تنويع أساليب التقويم.
الدعم المقدم
تم تقديم نماذج للتغذية الراجعة.
التوصيات
تطبيق تقويمات قصيرة ومتابعة أثرها.`;
const narrativeLocal=sandbox.window.TaqareerDeepAnalytics.analyze({typeId:'supervision_narrative',narrativeText,rows:[],headers:[]});
const narrativeContract=api.buildContract(narrativeLocal);
assert.strictEqual(narrativeContract.family,'supervision_narrative');
assert.strictEqual(narrativeContract.rules.lockedCounts,null);
assert.ok(narrativeContract.deepAnalysisTargets.some(x=>x.title.includes('الأدلة')));
const narrativeTarget=narrativeContract.deepAnalysisTargets[0];
const narrativeDelta={contractVersion:'3.0.0',deepAnalysisUnits:[{
  targetId:narrativeTarget.id,
  analysis:'تكشف الصياغات الحالية أحكامًا تربوية مفيدة، لكنها تحتاج أدلة مشاهدة أكثر تحديدًا تربط الممارسة بسلوك الطلبة أو أثر التعلم. لا يعني ضعف التوثيق أن الممارسة غير موجودة؛ فقد يكون الخلل في طريقة تسجيل الدليل لا في الممارسة نفسها.',
  evidenceRefs:narrativeTarget.evidenceRefs,
  confidence:'متوسطة',
  implications:['اعتماد قالب يربط الممارسة والدليل والأثر.'],
  alternativeExplanations:['قد يكون ضعف نسبة الأدلة ناتجًا عن اختصار التقرير لا ضعف الممارسة الصفية.'],
  limitations:['النص لا يحتوي تسجيلًا مباشرًا للزيارة.'],
  dataRequests:['ملاحظات الزيارة الأصلية أو عينة موثقة من أعمال الطلبة.']
}],patches:[],additionalCautions:[],missingDataRequests:[]};
const narrativeReconciled=api.reconcile(narrativeLocal,narrativeDelta,{availableEvidenceRefs:Object.keys(narrativeLocal.evidenceMap||{})});
assert.strictEqual(narrativeReconciled._reconciliation.appliedDeepAnalyses,1);
assert.ok(narrativeReconciled.diagnosticSections.some(x=>x.analysis.includes('طريقة تسجيل الدليل')));
assert.ok(narrativeReconciled.diagnosticSections.some(x=>(x.alternativeExplanations||[]).length));
console.log('PASS narrative family receives its own deep pedagogical interpretation without score-analysis procedures');
