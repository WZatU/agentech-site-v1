import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss, { type AtRule, type Rule } from "postcss";

const workspaceRoot = new URL("../", import.meta.url);

async function readWorkspaceFile(path: string) {
  return readFile(new URL(path, workspaceRoot), "utf8");
}

function declarationMap(css: string, selector: string, media?: string) {
  const values: Record<string, string> = {};
  const sheet = postcss.parse(css);

  sheet.walkRules((rule: Rule) => {
    const parentMedia = rule.parent?.type === "atrule" && (rule.parent as AtRule).name === "media"
      ? (rule.parent as AtRule).params
      : undefined;

    if (rule.selectors.includes(selector) && parentMedia === media) {
      rule.walkDecls((declaration) => {
        values[declaration.prop] = declaration.value;
      });
    }
  });

  return values;
}

test("news cards stack their complete story above a full-width image on phones", async () => {
  const [page, css] = await Promise.all([
    readWorkspaceFile("app/news/page.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);
  const mobileCard = declarationMap(css, ".news-theme-page [data-news-card]");
  const mobileThumbnail = declarationMap(css, ".news-theme-page [data-news-thumbnail]");
  const mobileMeta = declarationMap(css, ".news-theme-page [data-news-card-meta]");
  const mobileTitle = declarationMap(css, ".news-theme-page [data-news-card-title]");
  const mobileExcerpt = declarationMap(css, ".news-theme-page [data-news-excerpt]");
  const mobileReadMore = declarationMap(css, ".news-theme-page [data-news-read-more]");
  const desktopCard = declarationMap(css, ".news-theme-page [data-news-card]", "(min-width: 640px)");
  const desktopTitle = declarationMap(css, ".news-theme-page [data-news-card-title]", "(min-width: 640px)");

  assert.equal(mobileCard.display, "flex");
  assert.equal(mobileCard["flex-direction"], "column");
  assert.equal(mobileMeta.order, "1");
  assert.equal(mobileTitle.order, "2");
  assert.equal(mobileTitle.overflow, "visible");
  assert.equal(mobileTitle["-webkit-line-clamp"], "unset");
  assert.equal(mobileThumbnail.order, "3");
  assert.equal(mobileThumbnail.width, "100%");
  assert.equal(mobileThumbnail["aspect-ratio"], "16 / 9");
  assert.equal(mobileExcerpt.order, "4");
  assert.equal(mobileReadMore.order, "5");
  assert.equal(desktopCard.display, "grid");
  assert.equal(desktopCard["grid-template-columns"], "minmax(0, 1fr) 34%");
  assert.equal(desktopTitle["-webkit-line-clamp"], "2");
  assert.match(page, /sizes="\(min-width: 768px\) 320px, calc\(100vw - 72px\)"/);
});

test("club mobile navigation wraps and topic details collapse without a fixed overlay", async () => {
  const [page, pageZh, experience, css] = await Promise.all([
    readWorkspaceFile("app/ai-robotics-club/page.tsx"),
    readWorkspaceFile("app/ai-robotics-club/zh/page.tsx"),
    readWorkspaceFile("components/ai-robotics-club-experience.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  for (const source of [page, pageZh]) {
    assert.match(source, /data-club-mobile-topic-details/);
    assert.match(source, /data-club-desktop-topic-details/);
  }

  assert.match(experience, /data-club-mobile-apply="true"/);
  assert.match(experience, /href="#quick-apply"/);

  const navigation = declarationMap(css, "[data-club-section-navigation] > div");
  const mobileNavigation = declarationMap(css, "[data-club-section-navigation]", "(max-width: 767px)");
  const mobileApply = declarationMap(css, "[data-club-mobile-apply]");
  const mobileImage = declarationMap(css, ".topic-feature-row .topic-image-panel", "(max-width: 639px)");
  const mobileDetails = declarationMap(css, "[data-club-mobile-topic-details]", "(max-width: 639px)");
  const desktopDetails = declarationMap(css, "[data-club-desktop-topic-details]", "(max-width: 639px)");

  assert.equal(navigation["flex-wrap"], "wrap");
  assert.equal(mobileNavigation.position, "static");
  assert.equal(mobileApply.position, "static");
  assert.equal(mobileApply["min-height"], "44px");
  assert.equal(mobileImage["min-height"], "240px");
  assert.equal(mobileDetails.display, "block");
  assert.equal(desktopDetails.display, "none");
});

test("club and internship journeys follow the selected dark theme", async () => {
  const [club, clubZh, internshipList, internshipRole, internshipApply, css] = await Promise.all([
    readWorkspaceFile("app/ai-robotics-club/page.tsx"),
    readWorkspaceFile("app/ai-robotics-club/zh/page.tsx"),
    readWorkspaceFile("app/career-intern/page.tsx"),
    readWorkspaceFile("app/career-intern/[role]/page.tsx"),
    readWorkspaceFile("app/career-intern/apply/page.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  for (const source of [club, clubZh]) {
    assert.match(source, /data-club-page-theme="warm-off-white"/);
  }
  for (const source of [internshipList, internshipRole, internshipApply]) {
    assert.match(source, /internship-light-page/);
  }
  assert.match(internshipList, /data-internship-chip/);
  assert.match(internshipRole, /data-internship-chip/);

  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] [data-club-page-theme]').background,
    "#040607",
  );
  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] [data-club-page-theme] [data-club-surface]').background,
    "#0d1117",
  );
  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] .internship-light-page').background,
    "#040607",
  );
  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] .internship-light-page [data-internship-surface]').background,
    "#0d1117",
  );
  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] [data-club-page-theme] input:checked + [data-club-grade-option]').background,
    "#e5edf5",
  );
  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] [data-club-page-theme] [data-club-primary-action]').background,
    "#e5edf5",
  );
  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] .internship-light-page [data-internship-chip]').background,
    "#17202b",
  );
  assert.equal(
    declarationMap(css, ':root[data-theme="dark"] .internship-light-page :is(.talent-back-button, .internship-dark-button, .internship-view-role-button)').color,
    "#91dfff",
  );
});

test("homepage hero keeps a visible mobile frame and static fallback", async () => {
  const [page, hero, css] = await Promise.all([
    readWorkspaceFile("app/page.tsx"),
    readWorkspaceFile("components/agentech-galaxy-hero.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  assert.match(page, /titleImage="\/assets\/logo\/AGENTECH-white\.png"/);
  assert.match(hero, /data-agentech-galaxy-hero/);
  assert.match(hero, /data-agentech-galaxy-content/);

  const frame = declarationMap(css, "[data-agentech-galaxy-hero]");
  const content = declarationMap(css, "[data-agentech-galaxy-content]");

  assert.equal(frame["min-height"], "calc(100vh - 160px)");
  assert.match(frame.background, /radial-gradient/);
  assert.equal(content["min-height"], "calc(100vh - 160px)");
  assert.equal(content["padding-top"], "43vh");
});
