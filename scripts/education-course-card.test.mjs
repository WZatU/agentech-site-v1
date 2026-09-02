import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";

const routes = [
  "/agentech-education/k-2",
  "/agentech-education/3-5",
  "/agentech-education/6-8",
];
let serverProcess;
let serverOutput = "";
const pageHtml = new Map();

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
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
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
      const responses = await Promise.all(routes.map((route) => fetch(`${baseUrl}${route}`)));
      if (responses.every((response) => response.status === 200)) {
        const html = await Promise.all(responses.map((response) => response.text()));
        routes.forEach((route, index) => pageHtml.set(route, html[index]));
        return;
      }
    } catch {
      // The server has not started listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for the K-2 course page.\n${serverOutput}`);
});

test.after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await once(serverProcess, "exit");
});

test("shows the complete W001 portrait flyer without cropping", () => {
  const html = pageHtml.get("/agentech-education/k-2") ?? "";
  assert.match(html, /data-course-flyer="W001"[^>]*aspect-\[1429\/2000\]/);
  assert.match(html, /alt="Walnut 2026 Summer K-2 flyer"[^>]*class="[^"]*object-contain/);
});

test("keeps the Available Courses heading and complete W001 card within one compact viewport", () => {
  const html = pageHtml.get("/agentech-education/k-2") ?? "";
  assert.match(html, /data-course-card="W001"[^>]*max-w-\[320px\]/);
  assert.match(html, /data-course-details="W001"[^>]*gap-2[^>]*p-3/);
  assert.match(html, /data-course-title="W001"[^>]*mt-1[^>]*text-xl/);
  assert.match(html, /data-course-description="W001"[^>]*mt-1[^>]*leading-5/);
  assert.match(html, /data-course-price="W001"[^>]*mt-2[^>]*text-lg/);
  assert.match(html, /data-course-flyer-link="W001"[^>]*mt-2/);
  assert.match(html, /<button[^>]*class="[^"]*px-4[^"]*py-2[^"]*text-xs[^"]*"[^>]*>Enroll Now<\/button>/);
});

test("matches the W001 portrait card spec on the Grades 3-5 and 6-8 pages", () => {
  for (const [route, courseCode, title] of [
    ["/agentech-education/3-5", "W002", "Walnut 2026 Summer Grades 3-5"],
    ["/agentech-education/6-8", "W003", "Walnut 2026 Summer Grades 6-8"],
  ]) {
    const html = pageHtml.get(route) ?? "";

    assert.match(html, /data-education-canvas="warm-off-white"/);
    assert.match(html, new RegExp(`data-course-card="${courseCode}"[^>]*max-w-\\[320px\\]`));
    assert.match(html, new RegExp(`data-course-flyer="${courseCode}"[^>]*aspect-\\[1429\\/2000\\]`));
    assert.match(html, new RegExp(`alt="${title} flyer"[^>]*class="[^"]*object-contain`));
    assert.match(html, new RegExp(`data-course-details="${courseCode}"[^>]*gap-2[^>]*p-3`));
    assert.match(html, new RegExp(`data-course-title="${courseCode}"[^>]*mt-1[^>]*text-xl`));
    assert.match(html, new RegExp(`data-course-description="${courseCode}"[^>]*mt-1[^>]*leading-5`));
    assert.match(html, new RegExp(`data-course-price="${courseCode}"[^>]*mt-2[^>]*text-lg`));
    assert.match(html, new RegExp(`data-course-flyer-link="${courseCode}"[^>]*mt-2`));
    assert.match(html, /<button[^>]*class="[^"]*px-4[^"]*py-2[^"]*text-xs[^"]*"[^>]*>Enroll Now<\/button>/);
  }
});
