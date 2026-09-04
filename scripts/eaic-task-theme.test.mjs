import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";
import postcss from "postcss";
import sharp from "sharp";

const taskRoutes = [
  ["Start Coding", "/agentech-products/eaic-hub/start-coding"],
  ["View SDK", "/agentech-products/eaic-hub/view-sdk"],
  ["Code Certification", "/agentech-products/eaic-hub/software-check"],
  ["Live Stream", "/agentech-products/eaic-hub/watch-live-run"],
];

let baseUrl = process.env.EAIC_THEME_TEST_BASE_URL ?? "";
let serverProcess;
let serverOutput = "";
const pages = new Map();

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
      const response = await fetch(`${baseUrl}${taskRoutes[0][1]}`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // The server has not started listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for the Next.js development server.\n${serverOutput}`);
}

test.before(async () => {
  if (!baseUrl) {
    await startDevelopmentServer();
  }

  for (const [title, route] of taskRoutes) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${title} should load`);
    pages.set(route, await response.text());
  }
});

test.after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await once(serverProcess, "exit");
});

async function loadPageStylesheet(route) {
  const response = await fetch(`${baseUrl}${route}`);
  assert.equal(response.status, 200, `${route} should load`);
  const html = await response.text();
  const stylesheetHrefs = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => ({
      href: tag.match(/\bhref="([^"]+)"/)?.[1],
      rel: tag.match(/\brel="([^"]+)"/)?.[1],
    }))
    .filter(({ href, rel }) => href && rel === "stylesheet")
    .map(({ href }) => href);

  assert.ok(stylesheetHrefs.length > 0, `${route} should load at least one stylesheet`);
  const stylesheets = await Promise.all(
    stylesheetHrefs.map(async (href) => {
      const stylesheetResponse = await fetch(new URL(href, baseUrl));
      assert.equal(stylesheetResponse.status, 200, `${href} should load`);
      return stylesheetResponse.text();
    }),
  );

  return { html, stylesheet: postcss.parse(stylesheets.join("\n")) };
}

function darkRuleDeclarations(stylesheet, selectorFragments) {
  const declarations = {};

  stylesheet.walkRules((rule) => {
    const isDarkThemeRule = /\[data-theme=(?:"dark"|dark)\]/.test(rule.selector);
    if (!isDarkThemeRule || !selectorFragments.every((fragment) => rule.selector.includes(fragment))) {
      return;
    }

    for (const node of rule.nodes) {
      if (node.type === "decl") {
        declarations[node.prop] = node.value;
      }
    }
  });

  return declarations;
}

test("renders all four EAIC tasks with the approved warm immersion theme", () => {
  for (const [title, route] of taskRoutes) {
    const html = pages.get(route) ?? "";
    assert.match(html, /bg-\[\#f5f4f1\] text-\[\#111111\]/, `${title} should use the warm page canvas`);
    assert.match(html, /text-\[\#1a73e8\]/, `${title} should use the electric-blue label color`);
    assert.match(html, /rounded-\[22px\]/, `${title} should render the rounded immersion cards`);
  }
});

test("renders the task numbers as black circles without leading zeros", () => {
  const expectedNumbers = ["1", "2", "3", "4"];

  taskRoutes.forEach(([, route], index) => {
    const html = pages.get(route) ?? "";
    assert.match(
      html,
      new RegExp(`data-task-number-badge="true"[^>]*rounded-full[^>]*bg-\\\[\\#111111\\\][^>]*>${expectedNumbers[index]}</div>`),
      `${route} should render its task number as a black circle`,
    );
  });
});

test("keeps every SDK category heading on the same left edge", () => {
  const html = pages.get("/agentech-products/eaic-hub/view-sdk") ?? "";
  assert.match(html, /data-sdk-category-summary="true"[^>]*sm:grid-cols-\[32px_minmax\(0,1fr\)_auto\]/);
  assert.match(html, /data-sdk-category-arrow="true"/);
  assert.match(html, /data-sdk-category-copy="true"/);
});

test("left-aligns every SDK function signature at the start of its command row", () => {
  const html = pages.get("/agentech-products/eaic-hub/view-sdk") ?? "";
  const signatures = html.match(/data-sdk-function-signature="true"[^>]*>/g) ?? [];

  assert.ok(signatures.length > 0, "the SDK page should render function signatures");
  for (const signature of signatures) {
    assert.match(signature, /\bjustify-self-start\b/);
    assert.match(signature, /\btext-left\b/);
  }
});

test("lays out the three Master SDK summary metrics in one equal-width desktop row", () => {
  const html = pages.get("/agentech-products/eaic-hub/view-sdk") ?? "";
  assert.match(
    html,
    /data-sdk-overview-grid="true"[^>]*data-sdk-overview-count="3"[^>]*md:grid-cols-3/,
  );
});

test("blends the Master motor map into the warm EAIC page palette", () => {
  const html = pages.get("/agentech-products/eaic-hub/view-sdk") ?? "";
  assert.match(
    html,
    /data-master-motor-map-theme="warm-neutral"[^>]*border-\[\#d8d3ca\][^>]*bg-\[\#eeece7\]/,
  );
});

test("matches the Master motor-map title weight and tracking to the SDK tutorial title", () => {
  const html = (pages.get("/agentech-products/eaic-hub/view-sdk") ?? "").replaceAll("<!-- -->", "");
  const motorMapTitle = html.match(/<h2\b[^>]*id="master-motor-map-title"[^>]*>/i)?.[0] ?? "";

  assert.notEqual(motorMapTitle, "", "the Master motor-map title should render");
  assert.match(motorMapTitle, /\btext-3xl\b/);
  assert.match(motorMapTitle, /\bfont-semibold\b/);
  assert.match(motorMapTitle, /\btracking-tight\b/);
  assert.doesNotMatch(motorMapTitle, /\bfont-interface\b/);
  assert.doesNotMatch(motorMapTitle, /\bfont-medium\b/);
});

test("blends the Master motion guide shell into the warm EAIC page palette", () => {
  const html = pages.get("/agentech-products/eaic-hub/view-sdk") ?? "";
  assert.match(
    html,
    /data-master-joint-motion-theme="warm-neutral"[^>]*border-\[\#d8d3ca\][^>]*bg-\[\#eeece7\]/,
  );
});

test("renders Safety Limits with the engineering-yellow hierarchy", () => {
  const html = pages.get("/agentech-products/eaic-hub/view-sdk") ?? "";
  assert.match(
    html,
    /data-safety-limits-theme="engineering-yellow"[^>]*border-\[\#d8d3ca\][^>]*bg-white\/70/,
  );
});

test("keeps Safety Limits and live heartbeat readable on the dark EAIC task canvas", async () => {
  const { html, stylesheet } = await loadPageStylesheet("/agentech-products/eaic-hub/view-sdk");

  assert.match(html, /data-safety-limit-kind="standard"/);
  assert.match(html, /data-master-heartbeat="true"/);
  assert.match(html, /data-master-heartbeat-field="true"/);

  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-safety-limit-kind=standard]"]),
    {
      "background-color": "#11151b",
      "border-color": "#2a3440",
      color: "#e5edf5",
    },
  );
  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-master-heartbeat=true]"]),
    {
      "background-color": "#0d1117",
      "border-color": "#2a3440",
      color: "#e5edf5",
    },
  );
  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-master-heartbeat-field=true]"]),
    {
      "background-color": "#11151b",
      "border-color": "#2a3440",
    },
  );
});

test("keeps Code Certification error and locked states dark and legible", async () => {
  const { html, stylesheet } = await loadPageStylesheet("/agentech-products/eaic-hub/software-check");

  assert.match(html, /data-code-upload-zone="true"[^>]*data-code-upload-state="idle"/);
  assert.match(html, /data-code-review-stage="software-security"/);
  assert.match(html, /data-code-review-schedule-gate="true"/);

  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-code-upload-zone=true]", "[data-code-upload-state=error]"]),
    {
      "background-color": "#211315",
      "border-color": "#c95e5e",
    },
  );
  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-code-review-alert=true]"]),
    {
      "background-color": "#241416",
      "border-color": "#ef6b6b",
      color: "#ffb4b4",
    },
  );
  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-code-review-stage-description=true]"]),
    { color: "#aeb8c2" },
  );
  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-code-review-schedule-description=true]"]),
    { color: "#aeb8c2" },
  );
});

test("emphasizes the live-gesture completion warning without bookending exclamation marks", () => {
  const html = (pages.get("/agentech-products/eaic-hub/view-sdk") ?? "").replaceAll("<!-- -->", "");
  assert.match(
    html,
    /data-safety-limit-emphasis="completion-verification"[^>]*font-bold[^>]*>Every live gesture waits for completion and verifies stable standing again<\/strong>/,
  );
});

test("highlights the completion warning with the boundary palette while keeping ordinary limits neutral", async () => {
  const { html, stylesheet } = await loadPageStylesheet("/agentech-products/eaic-hub/view-sdk");
  const warning = html.match(/<div\b[^>]*data-safety-limit-kind="completion-verification"[^>]*>/)?.[0] ?? "";

  assert.notEqual(warning, "", "the completion warning should have its own highlighted row");
  assert.match(warning, /border-\[#d1a832\]/);
  assert.match(warning, /bg-\[#fff7d6\]/);
  assert.match(warning, /text-\[#55430a\]/);
  assert.match(warning, /shadow-\[inset_3px_0_0_#c99a00\]/);
  assert.match(warning, /\bpy-2\b(?!\.)/, "the completion row should keep its original vertical padding");
  assert.equal((html.match(/data-safety-limit-kind="standard"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /data-safety-limit-kind="temporary-boundary"/, "the Master completion warning is not a temporary boundary");

  assert.deepEqual(
    darkRuleDeclarations(stylesheet, ["[data-safety-limit-kind=completion-verification]"]),
    {
      "background-color": "#20190a",
      "border-color": "#7a5d1f",
      color: "#f2cf67",
    },
  );
});

test("renders Start Coding with the regenerated transparent Aegis blueprint", () => {
  const html = pages.get(taskRoutes[0][1]) ?? "";
  assert.match(html, /dog-blueprint-transparent-v4\.png/);
  assert.doesNotMatch(html, /dog-blueprint\.png/);
  assert.match(html, /<link rel="preload" as="image"[^>]*dog-blueprint-transparent-v4\.png/, "the above-the-fold robot image should be preloaded");
});

test("cleans Start Coding blueprint ink only in dark mode", async () => {
  const { html, stylesheet } = await loadPageStylesheet(taskRoutes[0][1]);
  const imageTag = [...html.matchAll(/<img\b[^>]*>/g)]
    .map(([tag]) => tag)
    .find((tag) => tag.includes("dog-blueprint-transparent-v4.png"));
  assert.ok(imageTag?.includes('data-eaic-start-blueprint="true"'), "the Start Coding blueprint needs a scoped rendering hook");

  const { filter } = darkRuleDeclarations(stylesheet, [".eaic-task-theme", "[data-eaic-start-blueprint]"]);
  const filterId = filter?.match(/url\(["']?#([^"')]+)["']?\)/)?.[1];
  assert.ok(filterId, "dark mode should apply the clean-linework filter");
  stylesheet.walkRules((rule) => {
    if (!rule.selector.includes("[data-eaic-start-blueprint]")) return;
    assert.match(rule.selector, /\[data-theme=(?:"dark"|dark)\]/, "light mode must keep the original image rendering");
  });

  const filterMarkup = [...html.matchAll(/<filter\b[^>]*>[\s\S]*?<\/filter>/g)]
    .map(([markup]) => markup)
    .find((markup) => markup.includes(`id="${filterId}"`));
  assert.ok(filterMarkup, "the referenced filter must be rendered with the blueprint");

  // Exercise the actual emitted filter with representative source pixels, not
  // duplicated filter constants. Alpha is the visibility on the dark canvas.
  const inks = [
    ["#1d73a2", 1], // Primary robot outline.
    ["#84c1dc", 0.8], // Lighter mechanical detail.
    ["#ffffff", 0.5], // White reflection / extraction residue.
    ["#e4eaef", 0.7], // Near-neutral pale sketch line.
    ["#c6dce8", 0.45], // Subtle blue ground grid.
    ["#1d73a2", 0], // Fully transparent source must stay transparent.
  ];
  const fixture = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="10"><defs>${filterMarkup}</defs><g filter="url(#${filterId})">${inks.map(([color, opacity], index) => `<rect x="${index * 10}" width="10" height="10" fill="${color}" fill-opacity="${opacity}"/>`).join("")}</g></svg>`;
  const { data, info } = await sharp(Buffer.from(fixture)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (index) => data[(5 * info.width + index * 10 + 5) * info.channels + 3];
  assert.ok(alpha(0) >= 180, "primary blue outlines must stay prominent");
  assert.ok(alpha(1) >= 55, "lighter mechanical detail must remain visible");
  assert.ok(alpha(2) <= 5 && alpha(3) <= 5, "white and gray sketch residue must disappear");
  assert.ok(alpha(4) >= 5 && alpha(4) < alpha(0) * 0.25, "the ground grid should remain faint, below the robot outline");
  assert.equal(alpha(5), 0, "transparent areas must remain transparent");
});

test("renders the EAIC Hub hero with the approved light and dark humanoid illustrations", async () => {
  const response = await fetch(`${baseUrl}/agentech-products/eaic-hub`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);
  for (const theme of ["light", "dark"]) {
    const image = images.find((tag) => tag.includes(`data-eaic-hero-theme="${theme}"`));
    assert.ok(image, `the ${theme} illustration must be rendered`);
    assert.ok(image.includes(`humanoid-wireframe-${theme}-v1.png`), `${theme} must use the approved image`);
    assert.ok(image.includes("Humanoid robot wireframe"), "the accessible description must match the new subject");
  }
  assert.doesNotMatch(html, /dog-blueprint/);
});

test("keeps the EAIC Hub blueprint linework legible in light mode", async () => {
  const response = await fetch(`${baseUrl}/agentech-products/eaic-hub`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-eaic-hero-blueprint="linework"/);

  const stylesheetHrefs = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => ({
      href: tag.match(/\bhref="([^"]+)"/)?.[1],
      rel: tag.match(/\brel="([^"]+)"/)?.[1],
    }))
    .filter(({ href, rel }) => href && rel === "stylesheet")
    .map(({ href }) => href);

  assert.ok(stylesheetHrefs.length > 0, "the Hub should load at least one stylesheet");

  const stylesheets = await Promise.all(
    stylesheetHrefs.map(async (href) => {
      const stylesheetResponse = await fetch(new URL(href, baseUrl));
      assert.equal(stylesheetResponse.status, 200, `${href} should load`);
      return stylesheetResponse.text();
    }),
  );
  const stylesheet = postcss.parse(stylesheets.join("\n"));

  let blueprintFilter = "";
  let blueprintFit = "";
  const themeDisplay = {};
  const mobileOverlays = {};
  let desktopLightOverlay = "";

  stylesheet.walkRules((rule) => {
    const isLightThemeRule = /\[data-theme=(?:"light"|light)\]/.test(rule.selector);

    if (rule.selector.includes("[data-eaic-hero-blueprint]")) {
      blueprintFilter = rule.nodes.find(
        (node) => node.type === "decl" && node.prop === "filter",
      )?.value ?? blueprintFilter;
      blueprintFit = rule.nodes.find(
        (node) => node.type === "decl" && node.prop === "object-fit",
      )?.value ?? blueprintFit;
    }

    for (const theme of ["light", "dark"]) {
      if (rule.selector.includes(`[data-eaic-hero-theme=${theme}]`) || rule.selector.includes(`[data-eaic-hero-theme="${theme}"]`)) {
        const display = rule.nodes.find((node) => node.type === "decl" && node.prop === "display")?.value;
        if (display) themeDisplay[`${isLightThemeRule ? "light" : "default"}:${theme}`] = display;
      }
    }

    if (rule.selector.includes("[data-eaic-hero-overlay]") && rule.parent?.type === "root") {
      const background = rule.nodes.find((node) => node.type === "decl" && node.prop === "background")?.value;
      if (background) mobileOverlays[isLightThemeRule ? "light" : "dark"] = background;
    }

    if (
      isLightThemeRule &&
      rule.selector.includes("[data-eaic-hero-overlay]") &&
      rule.parent?.type === "atrule" &&
      rule.parent.name === "media" &&
      rule.parent.params.includes("min-width")
    ) {
      desktopLightOverlay = rule.nodes.find(
        (node) => node.type === "decl" && node.prop === "background",
      )?.value ?? desktopLightOverlay;
    }
  });

  assert.equal(blueprintFilter, "none", "the restored linework must not be dimmed or recolored");
  assert.equal(blueprintFit, "contain", "the square illustration must retain the head and both hands");
  assert.deepEqual(themeDisplay, {
    "default:light": "none", "default:dark": "block",
    "light:light": "block", "light:dark": "none",
  }, "exactly the matching illustration should be visible for each theme");
  for (const theme of ["light", "dark"]) {
    assert.match(mobileOverlays[theme] ?? "", /transparent 60%/, `${theme} overlay must clear the mobile illustration's head`);
  }

  const lowOpacityStop = [...desktopLightOverlay.matchAll(/rgba\(245,\s*244,\s*241,\s*(0?\.\d+)\)\s*(\d+)%/g)]
    .map((match) => ({ alpha: Number(match[1]), position: Number(match[2]) }))
    .find(({ alpha }) => alpha <= 0.08);
  assert.ok(lowOpacityStop, "the desktop light overlay should expose the blueprint region");
  assert.ok(lowOpacityStop.position <= 64, "the low-opacity overlay stop should begin before the robot center");
});

test("optically aligns both EAIC brand marks with the hero copy", async () => {
  const response = await fetch(`${baseUrl}/agentech-products/eaic-hub`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-hero-optical-align="image-mark"/i);
  assert.match(html, /data-eaic-hub-word[^>]*data-hero-optical-align="display-title"/i);
});

test("renders the login hero as a concise two-line editorial headline", async () => {
  const response = await fetch(`${baseUrl}/login`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(
    html,
    /data-login-hero-title="true"[^>]*font-black[^>]*leading-\[0\.86\][^>]*>\s*<span[^>]*>Access the<\/span>\s*<span[^>]*>Agentech Ecosystem<\/span>/,
  );
});

test("renders the login canvas with the shared warm off-white background", async () => {
  const response = await fetch(`${baseUrl}/login`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-login-canvas="warm-off-white"[^>]*bg-\[\#f5f4f1\]/);
});
