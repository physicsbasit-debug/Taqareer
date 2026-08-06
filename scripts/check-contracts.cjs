const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.resolve(__dirname, '..', 'src-contracts', 'analysis-contracts.ts');
const source = fs.readFileSync(file, 'utf8');
const required = [
  '| "visit";',
  'multiVisitReport?: boolean;',
  'visitCount?: number;',
  '"explicit-multiple-visits-and-teachers"',
  '"compare-numeric-and-narrative-evidence-within-each-visit-only"',
  'export interface SemanticAnalysisProfile',
  'requiresScoreSettings: boolean;',
  'aggregateRowIndexes?: number[];',
  'export interface AdaptiveAnalysisRoute',
  'export interface MultiSubjectAnalysisOptions',
  'export interface MultiSubjectRankingPolicy',
  'export interface MultiSubjectScopeContext',
  'includeSchoolRanking: boolean;',
  'requiredCoreSubjects: string[];',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Missing contract token: ${token}`);
}
// Ensure the file contains only TypeScript declarations/interfaces, not accidental runtime fragments.
if (/\b(eval|Function)\s*\(/.test(source)) throw new Error('Unsafe runtime expression in contracts');
console.log('PASS: analysis contracts include multi-visit context and adaptive semantic routing and multi-subject ranking contracts');
