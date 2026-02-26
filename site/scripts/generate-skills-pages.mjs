import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(SITE_DIR, "..");

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { attrs: {}, body: content };

  const yamlBlock = match[1];
  const attrs = {};
  // Simple yaml parser for flat key: value
  for (const line of yamlBlock.split("\n")) {
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.+)/);
    if (m) {
      attrs[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { attrs, body: content.slice(match[0].length) };
}

function stripHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, "");
}

function stripFirstH1(content) {
  return content.replace(/^#\s+[^\n]+\n?/, "");
}

function escapeMdx(content) {
  const lines = content.split("\n");
  let inCodeFence = false;
  const result = [];

  for (const line of lines) {
    if (/^```/.test(line.trimStart())) {
      inCodeFence = !inCodeFence;
      result.push(line);
      continue;
    }

    if (inCodeFence) {
      result.push(line);
      continue;
    }

    const segments = line.split("`");
    const escaped = segments.map((seg, i) => {
      if (i % 2 === 1) return seg;
      let s = seg;
      s = s.replace(/\{/g, "\\{");
      s = s.replace(/\}/g, "\\}");
      s = s.replace(/<(?![a-zA-Z\/!])/g, "&lt;");
      s = s.replace(/(?<![a-zA-Z"'\-\/])>/g, "&gt;");
      return s;
    });
    result.push(escaped.join("`"));
  }

  return result.join("\n");
}

// Simple link rewriting for skills
function rewriteLinks(content, sourceFile) {
  const sourceDir = dirname(sourceFile);

  // Build a small link map for skills
  const linkMap = new Map([
    ["references/cli-reference.md", "/cli-reference/"],
    ["cli-reference.md", "/cli-reference/"],
    ["CONTRIBUTING.md", "/getting-started/"],
    ["../CONTRIBUTING.md", "/getting-started/"],
    ["../../CONTRIBUTING.md", "/getting-started/"],
    ["SKILL.md", null], // skip self-references
    ["../rlm-chunking/SKILL.md", "/skills/rlm-chunking/"],
    ["../rlm/SKILL.md", "/skills/rlm/"],
  ]);

  return content.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text, href) => {
    if (
      /^https?:\/\//.test(href) ||
      href.startsWith("#") ||
      href.startsWith("mailto:")
    ) {
      return match;
    }

    let anchor = "";
    const hashIdx = href.indexOf("#");
    if (hashIdx !== -1) {
      anchor = href.slice(hashIdx);
      href = href.slice(0, hashIdx);
    }

    if (!href) return `[${text}](${anchor})`;

    if (linkMap.has(href)) {
      const target = linkMap.get(href);
      if (target === null) return `[${text}](${anchor || "#"})`;
      return `[${text}](${target}${anchor})`;
    }

    return `[${text}](${href}${anchor})`;
  });
}

export function generateSkillsPages(outputBase) {
  const skillsDir = join(PROJECT_ROOT, "skills");
  const outDir = outputBase
    ? join(outputBase, "skills")
    : join(SITE_DIR, "src", "content", "docs", "skills");
  mkdirSync(outDir, { recursive: true });

  const generated = [];

  if (!existsSync(skillsDir)) {
    console.warn("No skills directory found");
    return generated;
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = join(skillsDir, entry.name);
    const skillFile = join(skillDir, "SKILL.md");

    if (!existsSync(skillFile)) continue;

    let content = readFileSync(skillFile, "utf-8");
    const { attrs, body } = parseFrontmatter(content);

    const title = attrs.name || entry.name;
    const description = attrs.description || "";
    // Truncate description for frontmatter if very long
    const shortDesc =
      description.length > 160
        ? description.slice(0, 157) + "..."
        : description;

    let processed = body;
    processed = stripHtmlComments(processed);
    processed = stripFirstH1(processed);
    processed = processed.trimStart();
    processed = rewriteLinks(processed, `skills/${entry.name}/SKILL.md`);
    processed = escapeMdx(processed);

    // Escape inner double quotes for YAML
    const safeTitle = title.replace(/"/g, '\\"');
    const safeDesc = shortDesc.replace(/"/g, '\\"');

    const frontmatter = [
      "---",
      `title: "${safeTitle}"`,
      `description: "${safeDesc}"`,
      "---",
      "",
    ].join("\n");

    const output = frontmatter + processed;
    const outPath = join(outDir, `${entry.name}.mdx`);
    writeFileSync(outPath, output);
    generated.push(outPath);
    console.log(`Generated skill: skills/${entry.name}.mdx`);
  }

  return generated;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  generateSkillsPages();
}
