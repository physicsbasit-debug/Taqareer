const fs = require('node:fs');
const path = require('node:path');

function readText(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function packageVersion(root) {
  return JSON.parse(readText(root, 'package.json')).version;
}

function packageLockVersion(root) {
  return JSON.parse(readText(root, 'package-lock.json')).version;
}

function manifest(root) {
  return JSON.parse(readText(root, 'manifest.json'));
}

function edgeVersion(root) {
  const edge = readText(root, 'supabase/functions/analyze-educational-form/index.ts');
  const match = edge.match(/const\s+EDGE_VERSION\s*=\s*["']([^"']+)["']/);
  if (!match) throw new Error('EDGE_VERSION constant not found');
  return match[1];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { readText, packageVersion, packageLockVersion, manifest, edgeVersion, escapeRegExp };
