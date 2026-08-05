const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sandbox = {
  window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
  Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'document-lite.js'), 'utf8'), sandbox, { filename: 'document-lite.js' });
const parse = sandbox.window.TaqareerDocuments._test.parseWordMetadataTokens;

test('extracts structured metadata from reverse-label Word header tokens', () => {
  const headerTokens = [
    'سلطنة عــــُـــمان', '1', 'رقم الصفحة', 'وزارة التعليم', '2026/08/02', 'التاريخ',
    'المديرية العامه للتعليم', '04:48:06', 'م', 'الساعة', 'محافظة جنوب الباطنة', 'المنطقة', ':',
    '2026/2025', 'العام الدراسى', 'الباسط للبنين الصفوف (8', '10', ')', 'المدرسة', ':', '3305', 'رمز المدرسة :',
    ' التقرير التجميعي لاستمارة استمارة الزيارة الإشرافية لمعلم مجال/ مادة لمادة اللغة العربية'
  ];
  const footerTokens = ['وليد عبدالله خميس الهنائى', 'طبع بواسطة :'];
  const result = parse(headerTokens, footerTokens);
  assert.equal(result.metadata.school, 'الباسط للبنين الصفوف (8-10)');
  assert.equal(result.metadata.subject, 'اللغة العربية');
  assert.equal(result.metadata.grade, '8-10');
  assert.equal(result.metadata.academicYear, '2025/2026');
  assert.equal(result.metadata.academicYearRaw, '2026/2025');
  assert.equal(result.metadata.reportDate, '2026/08/02');
  assert.equal(result.metadata.region, 'محافظة جنوب الباطنة');
  assert.equal(result.metadata.schoolCode, '3305');
  assert.equal(result.metadata.printedBy, 'وليد عبدالله خميس الهنائى');
  assert.equal(result.metadata.aggregatedReport, true);
  assert.equal(result.warnings.length, 1);
});
