const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadModules() {
  const sandbox = {
    window: {}, globalThis: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
    Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone, Intl, Date, performance,
  };
  sandbox.globalThis = sandbox.window;
  sandbox.window.performance = performance;
  vm.createContext(sandbox);
  for (const file of ['xlsx-lite.js', 'analysis-profile.js', 'mastery-metrics.js', 'visualization-policy.js', 'deep-analysis.js', 'deep-analysis-orchestrator.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window;
}

function fixture() {
  const window = loadModules();
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'multi-subject-results-grade10-matrix.json'), 'utf8'));
  const sheet = window.TaqareerXlsx.normalizeMatrix(raw.matrix, { rightToLeft: true });
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  return { window, sheet, profile };
}

function analyze(window, sheet, profile, options = { mode: 'all', includeSubjectTopTen: true, includeSchoolRanking: true }) {
  return window.TaqareerDeepAnalytics.analyzeEvidence({
    typeId: 'multi_subject_results', headers: sheet.headers, rows: sheet.rows,
    sourceMeta: sheet, analysisProfile: profile, analysisOptions: options,
  });
}

const coreGrade10 = [
  'اللغة العربية', 'التربية الاسلامية', 'الدراسات الاجتماعية', 'الرياضيات',
  'اللغة الانجليزية', 'الفيزياء', 'الكيمياء', 'الاحياء',
];

test('grade 10 school ranking uses 60% core and 40% all subjects with local protected names', () => {
  const { window, sheet, profile } = fixture();
  const result = analyze(window, sheet, profile);
  const tables = result.privateTables;
  assert.equal(tables.summary.studentCount, 252);
  assert.equal(tables.summary.subjectCount, 13);
  assert.equal(tables.summary.rankingEligibleCount, 252);
  assert.deepEqual(Array.from(tables.coreSubjects), coreGrade10);
  assert.match(tables.rankingFormulaLabel, /60%.*40%/);
  assert.equal(Object.keys(tables.subjectTopTen).length, 13);
  assert.ok(tables.schoolTopTen.length >= 10);

  const first = tables.schoolTopTen[0];
  assert.equal(first.rank, 1);
  const expected = first.coreMean * 0.6 + first.allMean * 0.4;
  assert.ok(Math.abs(first.rankingScore - expected) < 1e-9);
  assert.match(first.name, /طالب اختبار/);

  const compact = window.TaqareerDeepOrchestrator.compactPayload({
    source: { name: 'fixture.xlsx' }, recognizedType: { id: 'multi_subject_results' },
    data: { headers: sheet.headers, sampleRows: [], rowCount: sheet.rows.length },
    evidenceAnalysis: result, availableEvidenceRefs: Object.keys(result.evidenceMap || {}),
  });
  const serialized = JSON.stringify(compact);
  assert.doesNotMatch(serialized, /طالب اختبار/);
  assert.doesNotMatch(serialized, /privateTables|schoolTopTen|subjectTopTen/);
  assert.equal(compact.evidenceAnalysis.scopeContext.rankingPolicy.coreWeight, 0.6);
  assert.equal(compact.evidenceAnalysis.scopeContext.rankingPolicy.allWeight, 0.4);
});

test('standard competition ranking keeps ties and skips the following position', () => {
  const { window, sheet } = fixture();
  const scoreHeaders = sheet.headers.filter(header => header.endsWith(' - الدرجة'));
  const levelHeaders = sheet.headers.filter(header => header.endsWith(' - المستوى'));
  for (const index of [0, 1]) {
    scoreHeaders.forEach(header => { sheet.rows[index][header] = '100'; });
    levelHeaders.forEach(header => { sheet.rows[index][header] = 'أ'; });
  }
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const result = analyze(window, sheet, profile);
  const top = result.privateTables.schoolTopTen;
  assert.equal(top[0].rank, 1);
  assert.equal(top[1].rank, 1);
  assert.equal(top[0].rankLabel, 'الأول مكرر');
  assert.equal(top[1].rankLabel, 'الأول مكرر');
  assert.equal(top[2].rank, 3);
  assert.equal(top[2].rankLabel, 'الثالث');
});

test('a missing core grade excludes only that student from school ranking', () => {
  const { window, sheet } = fixture();
  const excludedName = sheet.rows[0]['اسم الطالب'];
  sheet.rows[0]['اللغة العربية - الدرجة'] = '';
  sheet.rows[0]['اللغة العربية - المستوى'] = '';
  const profile = window.TaqareerAnalysisProfiler.profileTable({ headers: sheet.headers, rows: sheet.rows, sourceMeta: sheet });
  const result = analyze(window, sheet, profile);
  assert.equal(result.privateTables.summary.rankingEligibleCount, 251);
  assert.equal(result.privateTables.incompleteRankingCount, 1);
  assert.equal(result.privateTables.incompleteRanking[0].name, excludedName);
  assert.ok(result.privateTables.incompleteRanking[0].missingCoreSubjects.includes('اللغة العربية'));
  assert.ok(!result.privateTables.schoolTopTen.some(item => item.name === excludedName));
});

test('subject mode limits evidence and local top ten to the selected subject', () => {
  const { window, sheet, profile } = fixture();
  const result = analyze(window, sheet, profile, {
    mode: 'subject', subject: 'الرياضيات', includeSubjectTopTen: true, includeSchoolRanking: false,
  });
  assert.equal(result.scopeContext.analysisMode, 'subject');
  assert.equal(result.scopeContext.selectedSubject, 'الرياضيات');
  assert.equal(result.subjects.length, 1);
  assert.equal(result.subjects[0].subject, 'الرياضيات');
  assert.deepEqual(Object.keys(result.privateTables.subjectTopTen), ['الرياضيات']);
  assert.equal(result.privateTables.schoolTopTen.length, 0);
  assert.ok(result.metrics.some(item => item.id === 'selectedSubjectMean'));
  assert.ok(result.charts.every(chart => !chart.id.startsWith('multi-subject-means')));
  assert.match(result.limitations.join(' '), /خاص بالمادة المختارة/);
});

test('grade boundaries use science through grade 8, then physics chemistry biology from grade 9 while weights change at grade 10', () => {
  const window = loadModules();
  const makeCase = (grade, subjects) => {
    const headers = ['اسم الطالب'];
    const subjectRoles = [];
    for (const subject of subjects) {
      const scoreHeader = `${subject} - الدرجة`;
      const levelHeader = `${subject} - المستوى`;
      headers.push(scoreHeader, levelHeader);
      subjectRoles.push({ subject, scoreHeader, levelHeader });
    }
    const rows = ['طالب ألف', 'طالب باء'].map((name, index) => {
      const row = { 'اسم الطالب': name };
      subjectRoles.forEach((role, subjectIndex) => {
        const score = 80 + index + subjectIndex;
        row[role.scoreHeader] = String(score);
        row[role.levelHeader] = score >= 80 ? 'ب' : 'ج';
      });
      return row;
    });
    const sourceMeta = { metadata: { grade, academicYear: '2025/2026' } };
    const analysisProfile = {
      columnRoles: { studentName: 'اسم الطالب', subjects: subjectRoles },
      rowRoles: { dataRowIndexes: [0, 1], aggregateRowIndexes: [] },
      metadata: { grade, academicYear: '2025/2026' },
    };
    return window.TaqareerDeepAnalytics.analyzeEvidence({
      typeId: 'multi_subject_results', headers, rows, sourceMeta, analysisProfile,
      analysisOptions: { mode: 'all', includeSubjectTopTen: false, includeSchoolRanking: true },
    });
  };

  const common = ['اللغة العربية', 'التربية الاسلامية', 'الدراسات الاجتماعية', 'الرياضيات', 'اللغة الانجليزية'];
  const grade8 = makeCase('الثامن', [...common, 'العلوم', 'تقنية المعلومات']);
  assert.equal(grade8.scopeContext.rankingPolicy.coreWeight, 0.7);
  assert.ok(grade8.privateTables.coreSubjects.includes('العلوم'));
  assert.ok(!grade8.privateTables.coreSubjects.includes('الفيزياء'));
  assert.equal(grade8.privateTables.missingCoreColumns.length, 0);

  const grade9 = makeCase('التاسع', [...common, 'الفيزياء', 'الكيمياء', 'الاحياء', 'تقنية المعلومات']);
  assert.equal(grade9.scopeContext.rankingPolicy.coreWeight, 0.7);
  assert.ok(grade9.privateTables.coreSubjects.includes('الفيزياء'));
  assert.ok(!grade9.privateTables.coreSubjects.includes('العلوم'));
  assert.equal(grade9.privateTables.missingCoreColumns.length, 0);

  const grade10 = makeCase('العاشر', [...common, 'الفيزياء', 'الكيمياء', 'الاحياء', 'تقنية المعلومات']);
  assert.equal(grade10.scopeContext.rankingPolicy.coreWeight, 0.6);
  assert.equal(grade10.scopeContext.rankingPolicy.allWeight, 0.4);
});
