const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'assets'))
  .filter(name => name.endsWith('.js'))
  .map(name => path.join(root, 'assets', name));
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log(`PASS JavaScript syntax: ${files.length} asset files`);
