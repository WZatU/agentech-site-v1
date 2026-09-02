import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";

let baseUrl = process.env.TALENTS_TEST_BASE_URL ?? "";
let serverProcess;
let serverOutput = "";
let html = "";

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

async function startProductionServer() {
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] }
  );

  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk;
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Next.js production server exited early.\n${serverOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/talents`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // The server has not started listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for the Next.js production server.\n${serverOutput}`);
}

test.before(async () => {
  if (!baseUrl) {
    await startProductionServer();
  }

  const response = await fetch(`${baseUrl}/talents`);
  assert.equal(response.status, 200);
  html = await response.text();
});

test.after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await once(serverProcess, "exit");
});

test("presents the Talents mission as the page's primary heading", () => {
  const primaryHeading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const headingText = primaryHeading.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  assert.match(headingText, /START EARLY\. BUILD FOR REAL\./i);
});

test("optically aligns the Talents display title with the hero copy", () => {
  assert.match(
    html,
    /data-talents-title[^>]*data-hero-optical-align="display-title"/i
  );
});

test("renders the Talents wordmark as independently aligned line layers", () => {
  assert.match(html, /data-talents-split-wordmark="true"/i);
  assert.match(html, /data-talents-wordmark-line="agentech"/i);
  assert.match(html, /data-talents-wordmark-line="talents"/i);
});

test("uses readable sentence-case display styling for the contact title", () => {
  const contactTitle =
    html.match(/<h2\b[^>]*id="talents-contact-title"[^>]*>/i)?.[0] ?? "";

  assert.notEqual(contactTitle, "", "Talents contact title should render");
  assert.match(contactTitle, /\bfont-semibold\b/);
  assert.ok(contactTitle.includes("tracking-[0.02em]"));
  assert.doesNotMatch(contactTitle, /\buppercase\b/);
  assert.doesNotMatch(contactTitle, /\bfont-medium\b/);
});

test("exposes one primary content landmark", () => {
  assert.equal(html.match(/<main\b/gi)?.length ?? 0, 1);
});

test("publishes every Talent pathway", () => {
  for (const href of ["/ai-robotics-club", "/career-intern", "/tech-education"]) {
    assert.match(html, new RegExp(`href=["']${href}["']`));
  }
});

test("publishes every Talent pathway image", () => {
  for (const image of ["summer-school.png", "internship.png", "tech-education.png"]) {
    assert.match(html, new RegExp(image));
  }
});

test("gives every pathway one complete high-contrast light accent", () => {
  const expectedAccents = [
    ["club", "#007d6f"],
    ["internship", "#1a73e8"],
    ["workshop", "#6f42c1"]
  ];

  for (const [program, lightAccent] of expectedAccents) {
    const card = html.match(
      new RegExp(`<a\\b[^>]*data-talents-program="${program}"[^>]*>[\\s\\S]*?<\\/a>`, "i")
    )?.[0] ?? "";

    assert.notEqual(card, "", `${program} must expose its theme hook`);
    assert.match(card, new RegExp(`--talents-light-accent:${lightAccent}`, "i"));
    assert.equal(
      card.match(/data-talents-accent="true"/g)?.length ?? 0,
      3,
      `${program} must apply its accent to the number, audience, and pathway action`
    );
  }
});
