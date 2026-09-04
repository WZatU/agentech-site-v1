import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";

let baseUrl = process.env.AI_ROBOTICS_CLUB_TEST_BASE_URL ?? "";
let serverProcess;
let serverOutput = "";

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function startDevelopmentServer() {
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );

  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk;
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Next.js development server exited early.\n${serverOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/ai-robotics-club`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // The development server has not started listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for the Next.js development server.\n${serverOutput}`);
}

async function load(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  assert.equal(response.status, 200, `${pathname} should load`);
  return response.text();
}

test.before(async () => {
  if (!baseUrl) {
    await startDevelopmentServer();
  }
});

test.after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await once(serverProcess, "exit");
});

test("uses the shared warm off-white canvas across the club journey", async () => {
  for (const pathname of ["/ai-robotics-club", "/ai-robotics-club/zh", "/ai-robotics-club/apply"]) {
    const html = await load(pathname);
    assert.match(
      html,
      /data-club-page-theme="warm-off-white"[^>]*bg-\[\#f5f4f1\]/,
      `${pathname} should use #f5f4f1 as its page canvas`,
    );
  }
});

test("offers scannable navigation and a mobile application action in both languages", async () => {
  for (const pathname of ["/ai-robotics-club", "/ai-robotics-club/zh"]) {
    const html = await load(pathname);
    assert.match(html, /data-club-section-navigation="true"/);
    assert.match(html, /href="#program-details"/);
    assert.match(html, /href="#curriculum"/);
    assert.match(html, /href="#faq"/);
    assert.match(html, /data-club-mobile-apply="true"[^>]*href="#quick-apply"/);
  }
});

test("turns the hero application card into a real prefill form", async () => {
  const html = await load("/ai-robotics-club");
  assert.match(html, /data-club-quick-application="true"[^>]*action="\/ai-robotics-club\/apply"[^>]*method="get"/);
  assert.match(html, /name="name"/);
  assert.match(html, /name="grade"[^>]*value="12"/);
  assert.match(html, /name="projects"/);
});

test("carries quick-application answers into the full application", async () => {
  const html = await load(
    "/ai-robotics-club/apply?name=Mina%20Chen&grade=10&projects=Line%20following%20robot",
  );
  assert.match(html, /name="name"[^>]*value="Mina Chen"/);
  assert.match(html, /talent-active-choice[^>]*>10<\/button>/);
  assert.match(html, /name="projects"[^>]*>Line following robot<\/textarea>/);
});

test("softens every club image edge into its surrounding background", async () => {
  for (const pathname of ["/ai-robotics-club", "/ai-robotics-club/zh"]) {
    const html = await load(pathname);
    const topicImageCount = html.match(/class="topic-image /g)?.length ?? 0;
    const blendedTopicImageCount = html.match(/data-club-image-blend="topic"/g)?.length ?? 0;
    const blendedImageCount = html.match(/data-club-image-blend="(?:hero|topic)"/g)?.length ?? 0;
    const rectangularBlendCount =
      html.match(/data-club-image-blend-shape="rectangular"/g)?.length ?? 0;

    assert.match(html, /data-club-image-blend="hero"/);
    assert.ok(topicImageCount > 0, `${pathname} should render topic images`);
    assert.equal(
      blendedTopicImageCount,
      topicImageCount,
      `${pathname} should apply the blend treatment to every topic image`,
    );
    assert.equal(
      rectangularBlendCount,
      blendedImageCount,
      `${pathname} should use a rectangular edge blend on every blended image`,
    );
  }
});

test("renders a seamless backdrop behind every featured topic image", async () => {
  for (const pathname of ["/ai-robotics-club", "/ai-robotics-club/zh"]) {
    const html = await load(pathname);
    const featuredTopicCount = html.match(/data-club-topic-layout="desktop-fit"/g)?.length ?? 0;
    const seamlessStageCount = html.match(/data-club-topic-image-stage="seamless"/g)?.length ?? 0;
    const backdropCount = html.match(/data-club-image-layer="backdrop"/g)?.length ?? 0;
    const foregroundCount = html.match(/data-club-image-layer="foreground"/g)?.length ?? 0;
    const hiddenBackdropCount =
      html.match(/data-club-image-layer="backdrop"[^>]*aria-hidden="true"/g)?.length ?? 0;

    assert.ok(featuredTopicCount > 0, `${pathname} should render featured topics`);
    assert.equal(seamlessStageCount, featuredTopicCount, `${pathname} should give every topic a seamless image stage`);
    assert.equal(backdropCount, featuredTopicCount, `${pathname} should render one backdrop per topic`);
    assert.equal(foregroundCount, featuredTopicCount, `${pathname} should render one complete foreground image per topic`);
    assert.equal(hiddenBackdropCount, backdropCount, `${pathname} should hide decorative backdrops from assistive technology`);
  }
});

test("uses the compact desktop-fit layout for every featured topic", async () => {
  for (const pathname of ["/ai-robotics-club", "/ai-robotics-club/zh"]) {
    const html = await load(pathname);
    const topicImageCount = html.match(/data-club-image-blend="topic"/g)?.length ?? 0;
    const desktopFitCount = html.match(/data-club-topic-layout="desktop-fit"/g)?.length ?? 0;

    assert.ok(topicImageCount > 0, `${pathname} should render featured topics`);
    assert.equal(
      desktopFitCount,
      topicImageCount,
      `${pathname} should keep every featured topic compact enough for a desktop viewport`,
    );
  }
});

test("gives learning topics and hands-on projects distinct visual roles", async () => {
  for (const pathname of ["/ai-robotics-club", "/ai-robotics-club/zh"]) {
    const html = await load(pathname);
    const featuredTopicCount = html.match(/data-club-topic-layout="desktop-fit"/g)?.length ?? 0;
    const learningGroupCount = html.match(/data-topic-list="topics"/g)?.length ?? 0;
    const projectGroupCount = html.match(/data-topic-list="projects"/g)?.length ?? 0;
    const accentedOutcomeCount = html.match(/data-topic-outcome-accent="blue-gold"/g)?.length ?? 0;

    assert.ok(featuredTopicCount > 0, `${pathname} should render featured topics`);
    assert.equal(learningGroupCount, featuredTopicCount, `${pathname} should visually identify every learning group`);
    assert.equal(projectGroupCount, featuredTopicCount, `${pathname} should visually identify every project group`);
    assert.equal(accentedOutcomeCount, featuredTopicCount, `${pathname} should accent every topic outcome`);
  }
});

test("defines rectangular masks and a viewport-bounded desktop topic card", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const topicMask = stylesheet.match(/\.topic-image \{[\s\S]*?\n  \}/)?.[0] ?? "";
  const heroMask = stylesheet.match(/\.club-hero-image \{[\s\S]*?\n  \}/)?.[0] ?? "";
  const desktopLayout = stylesheet.slice(stylesheet.indexOf("/* AI Robotics Club: keep"));

  assert.match(topicMask, /linear-gradient\(to right/);
  assert.match(topicMask, /linear-gradient\(to bottom/);
  assert.doesNotMatch(topicMask, /radial-gradient/);
  assert.match(heroMask, /linear-gradient\(to right/);
  assert.match(heroMask, /linear-gradient\(to bottom/);
  assert.doesNotMatch(heroMask, /radial-gradient/);
  assert.match(desktopLayout, /height: clamp\(700px, calc\(100svh - 24px\), 860px\)/);
  assert.match(desktopLayout, /grid-template-columns: minmax\(0, 0\.9fr\) minmax\(0, 1\.1fr\)/);
});

test("reserves desktop topic-list marker space before the text", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const desktopLayout = stylesheet.slice(stylesheet.indexOf("/* AI Robotics Club: keep"));
  const itemRule = desktopLayout.match(/\.topic-feature-row \.topic-list-item \{([\s\S]*?)\}/)?.[1] ?? "";
  const padding = itemRule.match(/padding:\s*([^;]+);/)?.[1].trim().split(/\s+/) ?? [];
  const resolvedLeftPadding = padding.length === 4 ? padding[3] : padding.length > 1 ? padding[1] : padding[0];

  assert.ok(resolvedLeftPadding?.endsWith("rem"), "desktop topic-list items should declare their left padding in rem");
  assert.ok(
    Number.parseFloat(resolvedLeftPadding) >= 1.5,
    "desktop topic-list items should keep the marker and its glow clear of the first letter",
  );
});
