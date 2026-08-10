const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadXlsx() {
  const sandbox = {
    window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
    Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone, Intl, Date,
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'xlsx-lite.js'), 'utf8'), sandbox, { filename: 'xlsx-lite.js' });
  return sandbox.window.TaqareerXlsx;
}

function fileLike(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    name: path.basename(filePath),
    async arrayBuffer() {
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  };
}

test('browser workbook reader preserves the multi-subject normalized sheet and its metadata', async () => {
  const xlsx = loadXlsx();
  const workbook = await xlsx.readWorkbook(fileLike(path.join(root, 'tests', 'fixtures', 'multi-subject-results-grade10-sanitized.xlsx')));
  assert.equal(workbook.sheets.length, 1);
  const sheet = workbook.sheets[0];
  assert.equal(sheet.specializedType, 'multi_subject_results');
  assert.equal(sheet.normalization.engine, 'multi-subject-results-normalizer-v2');
  assert.equal(sheet.normalization.subjectCount, 13);
  assert.equal(sheet.rows.length, 252);
  assert.equal(sheet.metadata.grade, 'العاشر');
  assert.equal(sheet.metadata.period, 'الدور الأول');
  assert.equal(sheet.metadata.academicYear, '2025/2026');
});

test('normalizer detects an identity-first 20-column workbook and exposes selectable subjects', () => {
  const xlsx = loadXlsx();
  const header = [
    'م', 'الاسم', 'الجنسية', 'القيد',
    'اللغة العربية', 'الدرجة', 'الرياضيات', 'الدرجة', 'الفيزياء', 'الدرجة',
    'المستوى', 'المادة', 'الصف', 'العاشر', 'الفترة', 'الدور الأول', 'العام الدراسي', 2025, '/', 2026,
  ];
  const matrix = [header];
  const levels = ['أ', 'ب', 'ج', 'د', 'هـ'];
  for (let index = 1; index <= 12; index++) {
    matrix.push([
      index, `طالب تجريبي ${index}`, 'عماني', 'منقول',
      levels[index % 5], 95 - index,
      levels[(index + 1) % 5], 88 - index,
      levels[(index + 2) % 5], 80 - index,
      '', '', '', '', '', '', '', '', '', '',
    ]);
  }
  const sheet = xlsx.normalizeMatrix(matrix, { rightToLeft: true });
  assert.equal(sheet.specializedType, 'multi_subject_results');
  assert.equal(sheet.rows.length, 12);
  assert.equal(sheet.normalization.subjectCount, 3);
  assert.equal(sheet.normalization.pairStartColumn, 5);
  assert.equal(sheet.normalization.pairOrientation, 'level-score');
  assert.deepEqual(Array.from(sheet.metadata.subjects), ['اللغة العربية', 'الرياضيات', 'الفيزياء']);
  assert.equal(sheet.rows[0]['اسم الطالب'], 'طالب تجريبي 1');
  assert.equal(sheet.rows[0]['الرياضيات - الدرجة'], '87');
});

test('frontend carries specialized workbook metadata, restores subject options, and blocks incomplete structures', () => {
  const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
  assert.match(app, /specializedType: sheet\.specializedType \|\| ""/);
  assert.match(app, /metadata: sheet\.metadata \|\| \{\}/);
  assert.match(app, /function multiSubjectSubjects\(\)/);
  assert.match(app, /state\.sourceMeta\?\.normalization\?\.subjects/);
  assert.match(app, /لم تُكتشف مواد في الورقة المختارة/);
  assert.match(app, /الورقة المختارة لا تحتوي درجات صالحة لمادتين على الأقل/);
  assert.match(app, /preferredDatasetId/);
});

test('score-only multi-subject workbook derives levels locally and exposes subjects', () => {
  const xlsx = loadXlsx();
  const matrix = [[
    'الكــل', 'الشعبة :', 'العاشر', 'الصف :', 'الدور الأول', 'الفترة :', 'م', 2026, '/', 2025, 'العام الدراسي :',
    'اللغة العربية', 'الرياضيات', 'الفيزياء', 'الكيمياء', 'الاحياء', 'الاسم', 'الجنسية', 'القيد', 'المعدل'
  ]];
  for (let index = 1; index <= 12; index++) {
    matrix.push([
      '', '', '', '', '', '', index, '', '', '', '',
      90 - index, 82 - index, 74 - index, 66 - index, 58 + index,
      `طالب تجريبي ${index}`, 'عماني', 'منقول', 75,
    ]);
  }
  const sheet = xlsx.normalizeMatrix(matrix, { rightToLeft: true });
  assert.equal(sheet.specializedType, 'multi_subject_results');
  assert.equal(sheet.normalization.engine, 'multi-subject-results-normalizer-v3');
  assert.equal(sheet.normalization.variant, 'score_only');
  assert.equal(sheet.normalization.levelSource, 'derived_from_score');
  assert.equal(sheet.normalization.subjectCount, 5);
  assert.equal(sheet.rows.length, 12);
  assert.deepEqual(Array.from(sheet.metadata.subjects), ['اللغة العربية', 'الرياضيات', 'الفيزياء', 'الكيمياء', 'الاحياء']);
  assert.equal(sheet.rows[0]['اللغة العربية - المستوى'], 'ب');
  assert.equal(sheet.rows[0]['الرياضيات - المستوى'], 'ب');
  assert.equal(sheet.metadata.grade, 'العاشر');
  assert.equal(sheet.metadata.period, 'الدور الأول');
  assert.equal(sheet.metadata.academicYear, '2025/2026');
});

test('browser reader detects a dominant comprehensive score-only sheet inside a ten-sheet workbook', async () => {
  const xlsx = loadXlsx();
  const workbook = await xlsx.readWorkbook(fileLike(path.join(root, 'tests', 'fixtures', 'multi-subject-score-only-multisheet.xlsx')));
  assert.equal(workbook.sheets.length, 10);
  const comprehensive = workbook.sheets[0];
  assert.equal(comprehensive.name, 'النتائج الشاملة');
  assert.equal(comprehensive.specializedType, 'multi_subject_results');
  assert.equal(comprehensive.normalization.engine, 'multi-subject-results-normalizer-v3');
  assert.equal(comprehensive.normalization.variant, 'score_only');
  assert.equal(comprehensive.rows.length, 249);
  assert.equal(comprehensive.normalization.subjectCount, 5);
  assert.equal(comprehensive.headers.length, 15);
});

test('paired multi-subject ministry layout remains specialized for 2-4 student records', () => {
  const xlsx = loadXlsx();
  const header = [
    'الكــل','الشعبة :','العاشر','الصف :','الدور الأول','الفترة :','م',2026,'/',2025,'العام الدراسي :',
    'الطلبه المنقولون','المهارات الحياتية','تقنية المعلومات','المهارات الموسيقية','الفنون التشكيلية','الرياضة المدرسية','الدراسات الاجتماعية',
    'الكيمياء','الفيزياء','الاحياء','الرياضيات','اللغة الانجليزية','اللغة العربية','التربية الاسلامية','خدمة التوجيه المهني','المادة','الاسم',null,'م',
    'المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة',
    'المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','المستوى','الدرجة','القيد','الجنسية'
  ];
  const makeRow = (index, offset) => [
    '', '', 'أ', 96-offset, 'ب', 86-offset, 'ج', 76-offset, 'د', 66-offset, 'أ', 95-offset, 'ب', 85-offset, 'ج', 75-offset,
    'د', 65-offset, 'أ', 94-offset, 'ب', 84-offset, 'ج', 74-offset, 'د', 64-offset, 'أ', 93-offset,
    'منقول', 'عماني', `طالب تجريبي ${index}`, index,
  ];
  const data = [makeRow(1,0), makeRow(2,1), makeRow(3,2), makeRow(4,3)];

  for (const count of [2, 3, 4]) {
    const sheet = xlsx.normalizeMatrix([header, ...data.slice(0, count)], { rightToLeft: true });
    assert.equal(sheet.specializedType, 'multi_subject_results', `count=${count}`);
    assert.equal(sheet.normalization.engine, 'multi-subject-results-normalizer-v2', `count=${count}`);
    assert.equal(sheet.rows.length, count, `count=${count}`);
    assert.equal(sheet.normalization.subjectCount, 13, `count=${count}`);
    assert.equal(sheet.metadata.grade, 'العاشر', `count=${count}`);
    assert.equal(sheet.rows[0]['اسم الطالب'], 'طالب تجريبي 1', `count=${count}`);
    assert.equal(sheet.rows[0]['الكيمياء - الدرجة'], '75', `count=${count}`);
  }
});

test('score-only multi-subject layout remains specialized for 2-4 student records when identity headers are explicit', () => {
  const xlsx = loadXlsx();
  const header = [
    'الكــل','الشعبة :','العاشر','الصف :','الدور الأول','الفترة :','م',2026,'/',2025,'العام الدراسي :',
    'اللغة العربية','الرياضيات','الفيزياء','الكيمياء','الاحياء','الاسم','الجنسية','القيد'
  ];
  const data = Array.from({ length: 4 }, (_, i) => [
    '', '', '', '', '', '', i + 1, '', '', '', '',
    90 - i, 82 - i, 74 - i, 66 - i, 58 + i, `طالب صغير ${i + 1}`, 'عماني', 'منقول'
  ]);
  for (const count of [2, 3, 4]) {
    const sheet = xlsx.normalizeMatrix([header, ...data.slice(0, count)], { rightToLeft: true });
    assert.equal(sheet.specializedType, 'multi_subject_results', `count=${count}`);
    assert.equal(sheet.normalization.engine, 'multi-subject-results-normalizer-v3', `count=${count}`);
    assert.equal(sheet.rows.length, count, `count=${count}`);
    assert.equal(sheet.normalization.subjectCount, 5, `count=${count}`);
  }
});
