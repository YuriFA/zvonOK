import { defineConfig } from "vitepress";

// The working markdown in docs/ is the site source. Everything that is not
// part of the public curated set stays out via srcExclude; the dead-link
// check (on by default) keeps the published set internally consistent.
export default defineConfig({
  lang: "en",
  title: "ZvonOK Docs",
  description: "Self-hosted video rooms with a developer platform API",
  srcExclude: [
    "admin-observability-plan.md",
    "traefik-migration-plan.md",
    "adr/**",
    "research/**",
    "archive/**",
    "architecture/**",
  ],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Quickstart", link: "/quickstart" },
      { text: "Deployment", link: "/deployment" },
      { text: "Roadmap", link: "/platform-roadmap" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Quickstart", link: "/quickstart" },
          { text: "Deployment", link: "/deployment" },
          { text: "Egress", link: "/egress" },
          { text: "Whiteboard", link: "/whiteboard" },
          { text: "Platform Roadmap", link: "/platform-roadmap" },
        ],
      },
    ],
  },
});
