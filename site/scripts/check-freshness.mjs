import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { generateDocsPages } from "./generate-docs-pages.mjs";
import { generateSkillsPages } from "./generate-skills-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = resolve(__dirname, "..");
const COMMITTED_DIR = join(SITE_DIR, "src", "content", "docs");

const tmpDir = mkdtempSync(join(tmpdir(), "rlm-docs-freshness-"));
console.log(`Generating to temp dir: ${tmpDir}`);

try {
  const docPages = generateDocsPages(tmpDir);
  const skillPages = generateSkillsPages(tmpDir);
  const allGenerated = [...docPages, ...skillPages];

  let stale = false;

  for (const tmpPath of allGenerated) {
    const rel = relative(tmpDir, tmpPath);
    const committedPath = join(COMMITTED_DIR, rel);

    let tmpContent, committedContent;
    try {
      tmpContent = readFileSync(tmpPath);
    } catch {
      console.error(`ERROR: Could not read generated file: ${tmpPath}`);
      stale = true;
      continue;
    }

    try {
      committedContent = readFileSync(committedPath);
    } catch {
      console.error(`STALE: Missing committed file: ${rel}`);
      stale = true;
      continue;
    }

    if (!tmpContent.equals(committedContent)) {
      console.error(`STALE: Content differs: ${rel}`);
      stale = true;
    }
  }

  if (stale) {
    console.error("\nFreshness check FAILED. Run: npm run generate");
    process.exit(1);
  }

  console.log("\nAll generated files are fresh.");
  process.exit(0);
} finally {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}
