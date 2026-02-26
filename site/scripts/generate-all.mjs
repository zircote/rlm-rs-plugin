import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDocsPages } from "./generate-docs-pages.mjs";
import { generateSkillsPages } from "./generate-skills-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(SITE_DIR, "..");

// Copy .github/social-preview.svg → site/public/og-image.svg when available
const socialPreview = join(PROJECT_ROOT, ".github", "social-preview.svg");
const ogImage = join(SITE_DIR, "public", "og-image.svg");
if (existsSync(socialPreview)) {
  copyFileSync(socialPreview, ogImage);
  console.log("Copied .github/social-preview.svg → public/og-image.svg\n");
}

console.log("=== Generating documentation pages ===\n");
const docs = generateDocsPages();
console.log(`\nGenerated ${docs.length} doc pages.\n`);

console.log("=== Generating skills pages ===\n");
const skills = generateSkillsPages();
console.log(`\nGenerated ${skills.length} skill pages.\n`);

console.log(`Total: ${docs.length + skills.length} pages generated.`);
