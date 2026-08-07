const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function loadPolicy() {
  const sandbox = { window: {}, String, Set, Array, Object, RegExp };
  vm.createContext(sandbox);
  vm.runInContext(read('assets/recognition-policy.js'), sandbox, { filename: 'recognition-policy.js' });
  return sandbox.window.TaqareerRecognitionPolicy;
}

function loadDocuments() {
  const sandbox = {
    window: {}, console, TextDecoder, DecompressionStream, Blob, Response, Uint8Array, DataView,
    Map, Set, Array, Object, String, Number, RegExp, JSON, Math, structuredClone,
  };
  vm.createContext(sandbox);
  vm.runInContext(read('assets/document-lite.js'), sandbox, { filename: 'document-lite.js' });
  return sandbox.window.TaqareerDocuments;
}

test('explicit student-work source title is authoritative over a generic supervision interpretation', () => {
  const policy = loadPolicy();
  const lock = policy.explicitTypeLock({
    sourceMeta: { reportTitle: 'ملخص الأداء لاستبانة استمارة فحص أعمال الطلبة' },
    rawText: 'بنود التقويم المتوسط الأكثر تكرارًا'
  });
  assert.equal(lock.typeId, 'student_work');
  assert.equal(lock.authority, 'explicit-source-title');
  assert.ok(lock.confidence >= 98);
});

test('PDF page context preserves the student-work report title before the table header', () => {
  const docs = loadDocuments();
  const lines = [
    { text: 'سلطنة عمان' },
    { text: 'ملخص الأداء لاستبانة استمارة فحص أعمال الطلبة' },
    { text: 'بنود التقويم المتوسط الأكثر تكرارا' },
  ];
  assert.match(docs._test.detectPdfPageReportTitle(lines, 3), /فحص أعمال الطلبة/);
});

test('scale direction remains unknown until an explicit confirmed choice exists', () => {
  const policy = loadPolicy();
  assert.equal(policy.confirmedScaleDirection({
    sourceScaleSemantics: { direction: 'lower-is-better', source: 'ai' }
  }), 'unknown');
  assert.equal(policy.confirmedScaleDirection({
    sourceScaleSemantics: { direction: 'lower-is-better', source: 'document', confirmed: false }
  }), 'unknown');
  assert.equal(policy.confirmedScaleDirection({
    localScaleSemantics: { direction: 'higher-is-better', source: 'user', confirmed: true }
  }), 'higher-is-better');
  assert.equal(policy.confirmedScaleDirection({
    localScaleSemantics: { direction: 'descriptive-only', source: 'user', confirmed: true }
  }), 'descriptive-only');
});

test('app keeps student-work structure stronger than generic supervision headers and blocks silent scale adoption', () => {
  const app = read('assets/app.js');
  assert.match(app, /بنية فحص أعمال الطلبة: بند \+ متوسط \+ الأكثر تكرارًا/);
  assert.match(app, /conflictsLocalAuthority/);
  assert.match(app, /confirmedScaleDirectionFromMeta/);
  assert.match(app, /state\.quality\.blockers\.length/);
  assert.match(app, /currentScaleDirection\(\) === "unknown"/);
});
