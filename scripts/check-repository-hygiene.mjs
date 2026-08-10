import { readdir, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const CLEAN_MODE = process.argv.includes("--clean");

const allowedRootFiles = new Set([
  ".gitignore",
  "README.md",
  "index.html",
  "package.json",
  "tsconfig.json",
]);

const allowedRootDirs = new Set([
  ".git",
  ".github",
  "docs",
  "node_modules",
  "references",
  "scripts",
  "src",
  "supabase",
  "tests",
]);

const forbiddenRootPatterns = [
  /^PHASE_/i,
  /^CHANGED_FILES_MANIFEST/i,
  /^GITHUB_UPLOAD_INSTRUCTIONS/i,
  /^HIDDEN_FILES_RESTORE_INSTRUCTIONS/i,
  /^GITHUB_WORKFLOW_VISIBLE$/i,
  /~\d*\./,
  /\.(bak|tmp|zip)$/i,
];

const removed = [];

async function removeKnownObsoleteArtifacts() {
  const entries = await readdir(".");
  for (const name of entries) {
    if (name === "dist") {
      await rm(name, { recursive: true, force: true });
      removed.push(`${name}/`);
      continue;
    }

    if (forbiddenRootPatterns.some((pattern) => pattern.test(name))) {
      await rm(name, { recursive: true, force: true });
      removed.push(name);
    }
  }

  try {
    const docs = await readdir("docs");
    for (const name of docs) {
      if (/^PHASE_/i.test(name)) {
        await rm(`docs/${name}`, { recursive: true, force: true });
        removed.push(`docs/${name}`);
      }
    }
  } catch {
    // The validation pass below will report a missing docs directory if relevant.
  }
}

if (CLEAN_MODE) {
  await removeKnownObsoleteArtifacts();
  if (removed.length) {
    console.log("CLEAN: removed known obsolete repository artifacts");
    for (const name of removed) console.log(`- ${name}`);
  } else {
    console.log("CLEAN: repository already contains no known obsolete artifacts");
  }
}

const failures = [];
const entries = await readdir(".");
for (const name of entries) {
  const info = await stat(name);
  if (forbiddenRootPatterns.some((pattern) => pattern.test(name))) {
    failures.push(`forbidden root artifact: ${name}`);
    continue;
  }
  if (info.isFile() && !allowedRootFiles.has(name)) failures.push(`unexpected root file: ${name}`);
  if (info.isDirectory() && !allowedRootDirs.has(name) && name !== "dist") failures.push(`unexpected root directory: ${name}`);
}

const docs = await readdir("docs");
for (const name of docs) {
  if (/^PHASE_/i.test(name)) failures.push(`historical phase document must stay in git history: docs/${name}`);
}

const gitCheck = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
if (gitCheck.status === 0 && gitCheck.stdout.trim() === "true") {
  const trackedDist = spawnSync("git", ["ls-files", "dist"], { encoding: "utf8" });
  if (trackedDist.status === 0 && trackedDist.stdout.trim()) {
    failures.push("dist/ is tracked by git; generated build output must not be committed");
  }
}

if (failures.length) {
  console.error("FAIL: repository hygiene");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: repository hygiene");
