const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function load() {
  const sandbox = { window: {}, console, Intl, Date, Math, Set, Map, structuredClone, Array, Object, String, Number, RegExp, JSON };
  vm.createContext(sandbox);
  for (const file of ['mastery-metrics.js','visualization-policy.js','deep-analysis.js','report-system.js']) {
    vm.runInContext(read(`assets/${file}`), sandbox, { filename: file });
  }
  return sandbox.window;
}

test('global visualization policy selects chart by semantic intent, not report type', () => {
  const { TaqareerVisualizationEngine: engine } = load();
  assert.equal(engine.VERSION, '1.0.0');
  assert.equal(engine.selectChart({ id:'scores', type:'bar', title:'توزيع الدرجات', data:[{label:'0-10',count:3},{label:'11-20',count:5},{label:'21-30',count:2}], xKey:'label', yKey:'count' }).type, 'histogram');
  assert.equal(engine.selectChart({ id:'levels', type:'bar', title:'توزيع مستويات الأداء', data:[{label:'أ',count:10},{label:'ب',count:8},{label:'ج',count:4}], xKey:'label', yKey:'count' }).type, 'stacked100');
  assert.equal(engine.selectChart({ id:'gap', type:'bar', title:'فجوة المستوى الحالي والمستهدف', data:[{label:'أ',current:2,target:5},{label:'ب',current:3,target:5}], xKey:'label', yKey:'gap' }).type, 'bullet');
  assert.equal(engine.selectChart({ id:'ba', type:'bar', title:'التغير قبل وبعد', data:[{label:'أ',before:45,after:70},{label:'ب',before:50,after:62}], xKey:'label' }).type, 'dumbbell');
  assert.equal(engine.selectChart({ id:'trend', type:'bar', title:'الاتجاه الزمني', data:[{date:'1',count:4},{date:'2',count:6},{date:'3',count:3}], xKey:'date', yKey:'count' }).type, 'line');
});

test('radar is guarded against unreadable high-dimensional profiles', () => {
  const { TaqareerVisualizationEngine: engine } = load();
  const eight = Array.from({length:8},(_,i)=>({label:`م${i+1}`,value:50+i}));
  const nine = Array.from({length:9},(_,i)=>({label:`م${i+1}`,value:50+i}));
  assert.equal(engine.selectChart({id:'profile',type:'radar',title:'ملف المجالات',data:eight,max:100}).type,'radar');
  assert.equal(engine.selectChart({id:'profile',type:'radar',title:'ملف المجالات',data:nine,max:100}).type,'bar');
});

test('score analysis exposes histogram, composition, line and box from one shared policy', () => {
  const { TaqareerDeepAnalytics: deep } = load();
  const analysis = deep.analyze({
    typeId:'assessment_component', headers:['م','درجة عنصر المادة'],
    rows:Array.from({length:80},(_,i)=>({م:i+1,'درجة عنصر المادة':(i*7)%41})),
    scoreColumn:'درجة عنصر المادة', maxScore:40, thresholdPct:75,
  });
  const types = new Set(Array.from(analysis.charts, chart => chart.type));
  for (const expected of ['histogram','stacked100','line','box']) assert.ok(types.has(expected), `missing ${expected}`);
});

test('indicator, training and adaptive analyzers inherit the same visualization engine', () => {
  const { TaqareerDeepAnalytics: deep } = load();
  const indicator = deep.analyze({
    typeId:'student_work', sourceMeta:{scaleSemantics:{direction:'higher-is-better',source:'test',minObserved:1,maxObserved:2}},
    headers:['بنود التقويم','المتوسط'], rows:[
      {'بنود التقويم':'ينجز الطلبة الأعمال وفق مستوياتهم التحصيلية','المتوسط':2},
      {'بنود التقويم':'يحقق الطلبة تقدما دراسيا بمرور الوقت','المتوسط':1},
      {'بنود التقويم':'يقدم المعلم تغذية راجعة فعالة','المتوسط':2},
      {'بنود التقويم':'تنمي الأنشطة مهارات التعلم الرقمي','المتوسط':1},
      {'بنود التقويم':'يراعي المعلم التمايز بين الطلبة','المتوسط':2},
    ], scoreColumn:'المتوسط', maxScore:2,
  });
  assert.ok(indicator.charts.some(chart=>chart.type==='radar'));
  assert.ok(indicator.charts.some(chart=>chart.type==='pareto'));
  assert.ok(indicator.charts.some(chart=>chart.type==='stacked100'));

  const training = deep.analyze({ typeId:'training_needs', headers:['الكفاية','الأهمية','المستوى الحالي','المستوى المستهدف','عدد المستفيدين'], rows:[
    {'الكفاية':'تحليل النتائج','الأهمية':5,'المستوى الحالي':2,'المستوى المستهدف':5,'عدد المستفيدين':18},
    {'الكفاية':'التقويم التكويني','الأهمية':5,'المستوى الحالي':3,'المستوى المستهدف':5,'عدد المستفيدين':24},
    {'الكفاية':'بناء الروبرك','الأهمية':4,'المستوى الحالي':1,'المستوى المستهدف':4,'عدد المستفيدين':20},
  ]});
  assert.ok(training.charts.some(chart=>chart.type==='bullet'));
  assert.ok(training.charts.some(chart=>chart.type==='heatmap'));

  const adaptive = deep.analyze({ typeId:'unknown', headers:['المجال','الوضع الحالي','المستهدف','قبل','بعد'], rows:[
    {'المجال':'التخطيط','الوضع الحالي':55,'المستهدف':80,'قبل':50,'بعد':62},
    {'المجال':'التنفيذ','الوضع الحالي':61,'المستهدف':85,'قبل':58,'بعد':70},
    {'المجال':'التقويم','الوضع الحالي':48,'المستهدف':80,'قبل':47,'بعد':54},
    {'المجال':'المتابعة','الوضع الحالي':66,'المستهدف':90,'قبل':60,'بعد':73},
  ]});
  assert.ok(adaptive.charts.some(chart=>chart.type==='histogram'));
  assert.ok(adaptive.charts.some(chart=>chart.type==='dumbbell'));
});

test('official report renderer supports the semantic chart family', () => {
  const { TaqareerReports: reports } = load();
  const charts = [
    {id:'h',type:'histogram',title:'توزيع',data:[{label:'1-2',count:3},{label:'3-4',count:5},{label:'5-6',count:2}],xKey:'label',yKey:'count'},
    {id:'s',type:'stacked100',title:'تركيب',data:[{label:'أ',count:6},{label:'ب',count:4}],xKey:'label',yKey:'count'},
    {id:'b',type:'bullet',title:'هدف',data:[{label:'أ',current:60,target:80}],xKey:'label',currentKey:'current',targetKey:'target'},
    {id:'d',type:'dumbbell',title:'قبل وبعد',data:[{label:'أ',before:40,after:70}],xKey:'label',beforeKey:'before',afterKey:'after'},
    {id:'p',type:'pareto',title:'أولوية',data:[{label:'أ',gap:8},{label:'ب',gap:3}],xKey:'label',yKey:'gap'},
  ];
  const html = reports.buildReportHtml({ analysis:{ metrics:[], charts, findings:[], qualityTools:[], improvementPlan:[], monitoringPlan:[], diagnosticSections:[], limitations:[], analysisProfile:{} }, type:{id:'unknown',name:'اختبار'}, sourceName:'fixture.csv', sourceMeta:{}, quality:{}, recognitionStatus:'معتمد' }, {autoPrint:false});
  assert.match(html,/class="hist-chart"/);
  assert.match(html,/class="stack-track"/);
  assert.match(html,/class="bullet-track"/);
  assert.match(html,/class="dumbbell-track"/);
  assert.match(html,/class="pareto-track"/);
});
