import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";

export default defineConfig({
  site: "https://zircote.github.io",
  base: "/rlm-rs-plugin/",
  integrations: [
    starlight({
      title: "RLM-RS Plugin",
      description:
        "Recursive Language Model integration for Claude Code — process documents far exceeding context windows.",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/zircote/rlm-rs-plugin",
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://zircote.github.io/rlm-rs-plugin/og-image.svg",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: "RLM-RS Plugin — Recursive Language Model for Claude Code",
          },
        },
      ],
      sidebar: [
        {
          label: "Overview",
          items: [
            { label: "Introduction", slug: "" },
            { label: "Changelog", slug: "changelog" },
          ],
        },
        {
          label: "Getting Started",
          items: [{ label: "Getting Started", slug: "getting-started" }],
        },
        {
          label: "Concepts",
          items: [
            { label: "Technical Overview", slug: "technical-overview" },
            { label: "Architecture", slug: "architecture" },
          ],
        },
        {
          label: "Reference",
          items: [{ label: "CLI Reference", slug: "cli-reference" }],
        },
        {
          label: "Skills Reference",
          items: [
            { label: "RLM Skill", slug: "skills/rlm" },
            { label: "RLM Chunking", slug: "skills/rlm-chunking" },
          ],
        },
      ],
    }),
    mermaid(),
  ],
});
