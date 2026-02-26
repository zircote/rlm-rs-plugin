import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, basename, posix } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(SITE_DIR, "..");

function buildLinkMap(mapping) {
  const linkMap = new Map();

  // From docs-mapping pages
  for (const page of mapping.pages) {
    linkMap.set(page.source, `/${page.slug}/`);
    // Also index by filename
    const fn = basename(page.source);
    if (!linkMap.has(fn.toLowerCase())) {
      linkMap.set(fn.toLowerCase(), `/${page.slug}/`);
    }
  }

  // Skills
  linkMap.set("skills/rlm/SKILL.md", "/skills/rlm/");
  linkMap.set("skill.md", "/skills/rlm/"); // generic fallback avoided
  linkMap.set("skills/rlm-chunking/SKILL.md", "/skills/rlm-chunking/");

  // Special files
  linkMap.set("skills/rlm/references/cli-reference.md", "/cli-reference/");

  // External fallbacks
  linkMap.set("README.md", "https://github.com/zircote/rlm-rs-plugin");
  linkMap.set("readme.md", "https://github.com/zircote/rlm-rs-plugin");

  return linkMap;
}

function resolveLink(href, sourceDir, linkMap) {
  // Skip external, anchors, mailto
  if (
    /^https?:\/\//.test(href) ||
    href.startsWith("#") ||
    href.startsWith("mailto:")
  ) {
    return href;
  }

  // Split anchor
  let anchor = "";
  const hashIdx = href.indexOf("#");
  if (hashIdx !== -1) {
    anchor = href.slice(hashIdx);
    href = href.slice(0, hashIdx);
  }

  if (!href) return anchor; // was just #something

  // Resolve relative to source file directory
  const absPath = resolve(PROJECT_ROOT, sourceDir, href);
  const relToRoot = relative(PROJECT_ROOT, absPath).split("\\").join("/");

  // Look up in link map
  if (linkMap.has(relToRoot)) {
    return linkMap.get(relToRoot) + anchor;
  }

  // Fallback: try filename match
  const fn = basename(relToRoot).toLowerCase();
  if (linkMap.has(fn)) {
    return linkMap.get(fn) + anchor;
  }

  // Return original if not found
  return href + anchor;
}

function rewriteLinks(content, sourceFile, linkMap) {
  const sourceDir = dirname(sourceFile);
  return content.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text, href) => {
    const resolved = resolveLink(href, sourceDir, linkMap);
    return `[${text}](${resolved})`;
  });
}

function stripFrontmatter(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
}

function stripHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, "");
}

function stripFirstH1(content) {
  // Remove the first # heading line
  return content.replace(/^#\s+[^\n]+\n?/, "");
}

function escapeMdx(content) {
  const lines = content.split("\n");
  let inCodeFence = false;
  const result = [];

  for (const line of lines) {
    // Check for code fence toggle
    if (/^```/.test(line.trimStart())) {
      inCodeFence = !inCodeFence;
      result.push(line);
      continue;
    }

    if (inCodeFence) {
      result.push(line);
      continue;
    }

    // Outside code fences: handle inline code segments
    // Split by backtick to identify inline code
    const segments = line.split("`");
    const escaped = segments.map((seg, i) => {
      // Odd-indexed segments are inside inline code
      if (i % 2 === 1) return seg;
      // Even-indexed: escape
      let s = seg;
      // Escape { and }
      s = s.replace(/\{/g, "\\{");
      s = s.replace(/\}/g, "\\}");
      // Escape < not followed by letter, /, or !
      s = s.replace(/<(?![a-zA-Z\/!])/g, "&lt;");
      // Escape > not preceded by tag-like chars (letter, ", /, -)
      // Actually: > at end of HTML tags like </div> or <br/> or attr="val"> should stay
      // Simple approach: escape > that appears to be comparison, not tag-closing
      // We'll escape > that is preceded by space, digit, or start of line — i.e., not part of a tag
      s = s.replace(/(?<![a-zA-Z"'\-\/])>/g, "&gt;");
      return s;
    });
    result.push(escaped.join("`"));
  }

  return result.join("\n");
}

export function generateDocsPages(outputBase) {
  const mappingPath = join(__dirname, "docs-mapping.json");
  const mapping = JSON.parse(readFileSync(mappingPath, "utf-8"));
  const linkMap = buildLinkMap(mapping);

  const outDir = outputBase || join(SITE_DIR, "src", "content", "docs");
  mkdirSync(outDir, { recursive: true });

  const generated = [];

  for (const page of mapping.pages) {
    const sourcePath = join(PROJECT_ROOT, page.source);
    if (!existsSync(sourcePath)) {
      console.warn(`Warning: source not found: ${page.source}`);
      continue;
    }

    let content = readFileSync(sourcePath, "utf-8");

    // Transform
    content = stripFrontmatter(content);
    content = stripHtmlComments(content);
    content = stripFirstH1(content);
    content = content.trimStart();
    content = rewriteLinks(content, page.source, linkMap);
    content = escapeMdx(content);

    // Build frontmatter
    const frontmatter = [
      "---",
      `title: "${page.title}"`,
      `description: "${page.description}"`,
      "---",
      "",
    ].join("\n");

    const output = frontmatter + content;
    const outPath = join(outDir, `${page.slug}.mdx`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, output);
    generated.push(outPath);
    console.log(`Generated: ${page.slug}.mdx`);
  }

  return generated;
}

// Run directly
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  generateDocsPages();
}
