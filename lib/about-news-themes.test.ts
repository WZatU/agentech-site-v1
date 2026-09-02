import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

const root = new URL("../", import.meta.url);
const [about, news, article, articleContent, css] = await Promise.all([
  "app/about/page.tsx",
  "app/news/page.tsx",
  "app/news/[slug]/page.tsx",
  "components/news-article-content.tsx",
  "app/globals.css"
].map((path) => readFile(new URL(path, root), "utf8")));
const sheet = postcss.parse(css);

function declarations(selector: string) {
  const values: Record<string, string> = {};
  sheet.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
    }
  });
  return values;
}

test("team page exposes a complete light-theme scope without replacing its dark presentation", () => {
  assert.match(about, /about-theme-page/);
  assert.match(about, /bg-\[#040607\]/);
  for (const hook of ["data-about-heading", "data-about-kicker", "data-about-ambient", "data-team-card", "data-team-group", "data-team-role", "data-team-orbit", "data-team-spark"]) {
    assert.ok(about.includes(hook), `Missing team theme hook: ${hook}`);
  }
  assert.equal(declarations(':root[data-theme="light"] .about-theme-page').background, "#f5f4f1");
  assert.equal(declarations(':root[data-theme="light"] .about-theme-page [data-about-heading]').color, "#111111");
  assert.equal(declarations(':root[data-theme="light"] .about-theme-page [data-team-group]').color, "#526174");
  assert.equal(declarations(':root[data-theme="light"] .about-theme-page [data-team-role]').color, "#007d6f");
});

test("team cards and decorative details stay light and legible including hover", () => {
  const card = declarations(':root[data-theme="light"] .about-theme-page [data-team-card]');
  assert.equal(card["background-color"], "#ffffff");
  assert.equal(card["border-color"], "#d8d3ca");
  assert.ok(card["box-shadow"]);
  assert.equal(declarations(':root[data-theme="light"] .about-theme-page [data-team-card]:hover')["border-color"], "#91b9e8");
  assert.equal(declarations(':root[data-theme="light"] .about-theme-page [data-team-orbit]')["border-color"], "#cbd5e1");
  assert.equal(declarations(':root[data-theme="light"] .about-theme-page [data-team-spark]').background, "#1a73e8");
});

test("news list has a scoped dark palette for surfaces, copy, metadata and links", () => {
  assert.match(news, /news-theme-page/);
  for (const hook of ["data-news-card", "data-news-title", "data-news-kicker", "data-news-author", "data-news-meta", "data-news-excerpt", "data-news-read-more", "data-news-thumbnail"]) {
    assert.ok(news.includes(hook), `Missing news theme hook: ${hook}`);
  }
  assert.equal(declarations(':root[data-theme="dark"] .news-theme-page').background, "#040607");
  assert.equal(declarations(':root[data-theme="dark"] .news-theme-page [data-news-card]').background, "#0d1117");
  assert.equal(declarations(':root[data-theme="dark"] .news-theme-page [data-news-title]').color, "#e5edf5");
  assert.equal(declarations(':root[data-theme="dark"] .news-theme-page [data-news-excerpt]').color, "#c1cbd7");
  assert.equal(declarations(':root[data-theme="dark"] .news-theme-page [data-news-meta]').color, "#aeb8c2");
  assert.equal(declarations(':root[data-theme="dark"] .news-theme-page [data-news-read-more]').color, "#91dfff");
  assert.equal(declarations(':root[data-theme="dark"] .news-theme-page [data-news-card]:focus-visible').background, "#11151b");
});

test("news article copy and language controls follow the selected theme without recoloring photos", () => {
  assert.match(article, /news-theme-page/);
  assert.match(article, /data-news-article-copy/);
  assert.match(articleContent, /data-news-language-group/);
  assert.match(articleContent, /aria-pressed=\{language === value\}/);
  assert.equal(declarations('.news-theme-page [data-news-article-copy] [data-news-title]').color, "var(--color-title)");
  assert.equal(declarations('.news-theme-page [data-news-body]').color, "var(--color-text)");
  assert.equal(declarations('.news-theme-page [data-news-language-group]').background, "var(--color-surface-soft)");
  assert.equal(declarations('.news-theme-page [data-news-language][aria-pressed="true"]').color, "var(--color-canvas)");
  sheet.walkRules((rule) => {
    if (rule.selector.includes("news-theme-page")) {
      assert.ok(!/(?:\s|>)img\b/.test(rule.selector), "News photographs must not be recolored by a theme rule");
    }
  });
});
