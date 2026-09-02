import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";

const routes = [
  {
    path: "/agentech-education/k-2",
    label: "← BACK",
    fallback: "/agentech-education?pathway=grade-k-8#program-pathways",
  },
  {
    path: "/agentech-education/k-2/walnut-2026-summer-k-2",
    label: "← BACK",
    fallback: "/agentech-education/k-2",
  },
  {
    path: "/agentech-products/eaic-hub/view-sdk",
    label: "← BACK",
    fallback: "/agentech-products/eaic-hub",
  },
  {
    path: "/career-intern",
    label: "← BACK",
    fallback: "/talents",
  },
  {
    path: "/career-intern/apply",
    label: "← BACK",
    fallback: "/career-intern",
  },
  {
    path: "/career-intern/intelligent-hardware-development-intern",
    label: "← BACK",
    fallback: "/career-intern",
  },
  {
    path: "/ai-robotics-club",
    label: "← BACK",
    fallback: "/talents",
  },
  {
    path: "/ai-robotics-club/apply",
    label: "← BACK",
    fallback: "/ai-robotics-club",
  },
  {
    path: "/tech-education",
    label: "← BACK",
    fallback: "/talents",
  },
  {
    path: "/agentech-education/what-can-we-learn-from-navi",
    label: "← BACK",
    fallback: "/agentech-education",
  },
  {
    path: "/preorder",
    label: "← BACK",
    fallback: "/agentech-robotic",
  },
];
const educationPathwayPath = "/agentech-education?pathway=grade-k-8";
const pagePaths = [...routes.map(({ path }) => path), educationPathwayPath];

let serverProcess;
let serverOutput = "";
let pages = new Map();
const configuredBaseUrl = process.env.HISTORY_BACK_TEST_BASE_URL?.replace(/\/$/, "");

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

test.before(async () => {
  let baseUrl = configuredBaseUrl;
  if (!baseUrl) {
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
  }

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
      throw new Error(`Next.js development server exited early.\n${serverOutput}`);
    }

    try {
      const responses = await Promise.all(pagePaths.map((path) => fetch(`${baseUrl}${path}`)));
      if (responses.every((response) => response.status === 200)) {
        const html = await Promise.all(responses.map((response) => response.text()));
        pages = new Map(pagePaths.map((path, index) => [path, html[index]]));
        return;
      }
    } catch {
      // The server has not started listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for history-back pages.\n${serverOutput}`);
});

test.after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await once(serverProcess, "exit");
});

test("renders page-level back controls with one shared label and route fallbacks", () => {
  for (const { path, label, fallback } of routes) {
    const html = pages.get(path) ?? "";
    const normalizedHtml = html.replaceAll("<!-- -->", "");
    const escapedFallback = fallback.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const buttonMatch = normalizedHtml.match(
      new RegExp(`<button[^>]*data-history-back="true"[^>]*data-fallback-href="${escapedFallback}"[^>]*>`),
    );

    assert.ok(buttonMatch, `${path} should render a history back button`);
    assert.match(
      buttonMatch[0],
      /class="[^"]*\bhistory-back-button\b[^"]*"/,
      `${path} should use the shared pill-button appearance`,
    );
    assert.match(
      normalizedHtml,
      new RegExp(
        `<button[^>]*data-history-back="true"[^>]*data-fallback-href="${escapedFallback}"[^>]*>\\s*${label}\\s*</button>`,
      ),
    );
    assert.doesNotMatch(html, new RegExp(`<a[^>]*href="${escapedFallback}"[^>]*>${label}</a>`));

    const renderedBackLabels = Array.from(
      normalizedHtml.matchAll(/<button[^>]*data-history-back="true"[^>]*>([^<]*)<\/button>/g),
      (match) => match[1].trim(),
    );
    assert.ok(renderedBackLabels.length > 0, `${path} should expose at least one page-level back control`);
    assert.deepEqual(
      [...new Set(renderedBackLabels)],
      ["← BACK"],
      `${path} should not expose contextual Back to… labels`,
    );
  }
});

test("restores the Grade K-8 pathway from the browser history URL", () => {
  const html = pages.get(educationPathwayPath) ?? "";

  assert.match(html, /data-education-pathway="grade-k-8"/);
  assert.match(html, /Hands-on AI learning for younger builders\./);
  assert.doesNotMatch(html, /animation:education-tab-progress/);
});

test("keeps pathway URL changes inside the Next.js router history", async () => {
  const tabsSource = await readFile("components/education-program-tabs.tsx", "utf8");

  assert.match(tabsSource, /router\.replace\([^;]+\{\s*scroll:\s*false\s*\}\)/s);
  assert.doesNotMatch(tabsSource, /window\.history\.replaceState/);
});
