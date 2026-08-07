const fs=require('fs'), vm=require('vm');
const path=require('path');
const masteryCode=fs.readFileSync(path.join(__dirname,'..','assets','mastery-metrics.js'),'utf8');
const visualizationCode=fs.readFileSync(path.join(__dirname,'..','assets','visualization-policy.js'),'utf8');
const code=fs.readFileSync(path.join(__dirname,'..','assets','deep-analysis.js'),'utf8');
const sandbox={window:{},console,Intl,Date,Math,Set,Map,structuredClone,Array,Object,String,Number,RegExp,JSON};
vm.createContext(sandbox);vm.runInContext(masteryCode,sandbox);vm.runInContext(visualizationCode,sandbox);vm.runInContext(code,sandbox);
const analyze=sandbox.window.TaqareerDeepAnalytics.analyze;
const tests=[
 ['scores',{typeId:'assessment_component',headers:['م','اسم الطالب','عنصر المادة','درجة عنصر المادة','ملاحظات'],rows:Array.from({length:60},(_,i)=>({'م':i+1,'اسم الطالب':`طالب ${i+1}`,'عنصر المادة':'اختبار','درجة عنصر المادة':(i*7)%41,'ملاحظات':''})),scoreColumn:'درجة عنصر المادة',maxScore:40,thresholdPct:75}],
 ['levels',{typeId:'level_distribution',headers:['الصف','أ','ب','ج','د','هـ'],rows:[{'الصف':'التاسع','أ':47,'ب':46,'ج':73,'د':77,'هـ':25},{'الصف':'العاشر','أ':46,'ب':29,'ج':65,'د':97,'هـ':15}]}],
 ['cross',{typeId:'cross_subject',headers:['اسم الطالب','اللغة العربية','الرياضيات','العلوم'],rows:Array.from({length:30},(_,i)=>({'اسم الطالب':`طالب ${i+1}`,'اللغة العربية':50+(i*3)%50,'الرياضيات':35+(i*5)%60,'العلوم':40+(i*7)%55}))}],
 ['supervision',{typeId:'supervision_indicator',sourceMeta:{scaleSemantics:{direction:'higher-is-better',source:'test',minObserved:1.9,maxObserved:3.5}},headers:['بنود التقويم','المتوسط'],rows:[{'بنود التقويم':'تخطيط المنهاج لتحقيق نواتج التعلم','المتوسط':3.5},{'بنود التقويم':'فاعلية إدارة الصف','المتوسط':2.1},{'بنود التقويم':'توظيف استراتيجيات التدريس','المتوسط':2.8},{'بنود التقويم':'توظيف أساليب تقويم متنوعة','المتوسط':1.9},{'بنود التقويم':'التطوير المهني وتحسين الأداء','المتوسط':3.2}],scoreColumn:'المتوسط',maxScore:4}],
 ['studentwork',{typeId:'student_work',sourceMeta:{scaleSemantics:{direction:'higher-is-better',source:'test',minObserved:1,maxObserved:2}},headers:['بنود التقويم','المتوسط','الأكثر تكرارا'],rows:[{'بنود التقويم':'يحقق الطلبة تقدما دراسيا في الأعمال','المتوسط':2,'الأكثر تكرارا':2},{'بنود التقويم':'يقدم المعلم تغذية راجعة فعالة','المتوسط':1,'الأكثر تكرارا':1},{'بنود التقويم':'تنمي الأنشطة مهارات التعلم الرقمي','المتوسط':2,'الأكثر تكرارا':2},{'بنود التقويم':'يراعي المعلم التمايز بين الطلبة','المتوسط':1,'الأكثر تكرارا':1}],scoreColumn:'المتوسط',maxScore:2}],
 ['narrative',{typeId:'supervision_narrative',headers:[],rows:[],narrativeText:`جوانب الإجادة في الأداء وأدلتها
استخدم المعلم استراتيجية التعلم التعاوني حيث شارك معظم الطلبة في النشاط وقدّموا إجابات صحيحة بنسبة 80%.
أدار المعلم زمن الحصة بفاعلية مما أسهم في استمرار مشاركة الطلبة حتى نهاية النشاط.
الجوانب التي تحتاج إلى تطوير في الأداء وأدلتها
يحتاج التقويم إلى تنويع أكبر إذ اقتصر على الأسئلة الشفوية ولم يقدم دليلاً كتابيًا.
لم تطبق مهام تقويم ذاتي للطلبة مما حد من قدرتهم على مراجعة أدائهم.
الدعم المقدم
تزويد المعلم بنماذج بطاقات ملاحظة خلال أسبوع وتطبيقها في حصتين.
مناقشة طريقة بناء تقويم ذاتي مع المعلم الأول يوم الثلاثاء.
التوصيات
تطبيق بطاقة ملاحظة في الحصتين القادمتين وقياس مشاركة الطلبة بنسبة 80%.
تنفيذ مهمة تقويم ذاتي خلال أسبوعين ومقارنة نتائجها بخط الأساس.
لا توجد جوانب تطوير.`}],
 ['survey',{typeId:'survey',headers:['الاستجابة','جودة التواصل','وضوح الإجراءات','سرعة الاستجابة','الدعم المقدم'],rows:Array.from({length:48},(_,i)=>({
  'الاستجابة':i+1,
  'جودة التواصل':['أوافق بشدة','أوافق','محايد','لا أوافق'][i%4],
  'وضوح الإجراءات':['أوافق','أوافق بشدة','أوافق','محايد'][i%4],
  'سرعة الاستجابة':['محايد','أوافق','لا أوافق','أوافق'][i%4],
  'الدعم المقدم':['أوافق بشدة','أوافق','أوافق','محايد'][i%4]
 }))}],
 ['training',{typeId:'training_needs',headers:['الكفاية','الأهمية','المستوى الحالي','عدد المستفيدين'],rows:[
  {'الكفاية':'تحليل نتائج الطلبة','الأهمية':5,'المستوى الحالي':2,'عدد المستفيدين':18},
  {'الكفاية':'التقويم التكويني','الأهمية':5,'المستوى الحالي':3,'عدد المستفيدين':24},
  {'الكفاية':'توظيف الذكاء الاصطناعي','الأهمية':4,'المستوى الحالي':2,'عدد المستفيدين':30},
  {'الكفاية':'إدارة الصف','الأهمية':4,'المستوى الحالي':3,'عدد المستفيدين':15},
  {'الكفاية':'بناء الروبرك','الأهمية':4,'المستوى الحالي':1,'عدد المستفيدين':20}
 ]}],
 ['program',{typeId:'program_evaluation',headers:['الهدف','المستهدف','المتحقق','جودة التنفيذ','الأثر'],rows:[
  {'الهدف':'رفع الإتقان','المستهدف':80,'المتحقق':61,'جودة التنفيذ':75,'الأثر':58},
  {'الهدف':'خفض الغياب','المستهدف':90,'المتحقق':82,'جودة التنفيذ':88,'الأثر':79},
  {'الهدف':'تنمية المهارات الرقمية','المستهدف':85,'المتحقق':67,'جودة التنفيذ':72,'الأثر':64},
  {'الهدف':'رفع مشاركة الأسرة','المستهدف':70,'المتحقق':45,'جودة التنفيذ':62,'الأثر':41}
 ]}],
 ['behavior',{typeId:'behavior_attendance',headers:['التاريخ','الطالب','نوع الحالة','الصف','الإجراء'],rows:Array.from({length:42},(_,i)=>({
  'التاريخ':`2026-0${1+(i%3)}-${String(1+(i%20)).padStart(2,'0')}`,
  'الطالب':`طالب ${1+(i%12)}`,
  'نوع الحالة':['تأخر','غياب','سلوك صفي','عدم إنجاز'][i%4],
  'الصف':i%2?'التاسع':'العاشر',
  'الإجراء':i%3?'متابعة صفية':'تواصل مع ولي الأمر'
 }))}],
 ['adaptive',{typeId:'unknown',headers:['المجال','الوضع الحالي','المستهدف','قبل','بعد','التاريخ','ملاحظة'],rows:[
  {'المجال':'التخطيط','الوضع الحالي':55,'المستهدف':80,'قبل':50,'بعد':62,'التاريخ':'2026-01-15','ملاحظة':'تحسن جزئي'},
  {'المجال':'التنفيذ','الوضع الحالي':61,'المستهدف':85,'قبل':58,'بعد':70,'التاريخ':'2026-02-15','ملاحظة':'تقدم ملحوظ'},
  {'المجال':'التقويم','الوضع الحالي':48,'المستهدف':80,'قبل':47,'بعد':54,'التاريخ':'2026-03-15','ملاحظة':'يحتاج دعم'},
  {'المجال':'المتابعة','الوضع الحالي':66,'المستهدف':90,'قبل':60,'بعد':73,'التاريخ':'2026-04-15','ملاحظة':'تحسن مستمر'}
 ]}],
 ['unknown',{typeId:'unknown',headers:['المجال','القيمة','الملاحظة'],rows:Array.from({length:25},(_,i)=>({'المجال':i%2?'أ':'ب','القيمة':i+1,'الملاحظة':i%3?'جيد':'يحتاج متابعة'}))}]
];
for(const [name,input] of tests){
 const r=analyze(input);
 const checks={kind:r.kind,metrics:r.metrics?.length,charts:r.charts?.length,findings:r.findings?.length,tools:r.qualityTools?.length,plan:r.improvementPlan?.length,monitor:r.monitoringPlan?.length,diagnostic:r.diagnosticSections?.length,limits:r.limitations?.length};
 console.log(name,JSON.stringify(checks));
 if(!r.metrics?.length||!r.findings?.length||!r.diagnosticSections?.length) throw new Error(`${name} incomplete`);
 if(name==='scores'){
   if(r.masteryContractVersion!=='1.0.0') throw new Error('scores did not use mastery contract');
   if(r.thresholdPct!==75) throw new Error('scores cutoff drifted from 75%');
   if(!r.masteryJudgement?.label) throw new Error('scores judgement missing');
   if(r.masteryDistribution?.reduce((a,b)=>a+b.count,0)!==r.n) throw new Error('scores bands do not equal group size');
 }
 if(name!=='unknown' && (!r.charts?.length||!r.qualityTools?.length||!r.improvementPlan?.length)) throw new Error(`${name} shallow`);
}
console.log('PASS');
