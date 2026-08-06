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
  assert.match(app, /الورقة المختارة لا تحتوي أزواج درجة ومستوى لمادتين على الأقل/);
  assert.match(app, /preferredDatasetId/);
});
