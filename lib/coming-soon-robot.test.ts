import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

const workspaceRoot = new URL("../", import.meta.url);

async function readWorkspaceFile(path: string) {
  return readFile(new URL(path, workspaceRoot), "utf8");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("the workshop presents the approved mechanical copy inside the physical blackboard", async () => {
  const component = await readWorkspaceFile("components/coming-soon-robot.tsx");

  for (const copy of [
    "BEEP. WHIRR. CLICK.",
    "COMING SOON",
    "I'M STILL BUILDING THIS PAGE.",
    "ONE MORE BOLT... THEN MAYBE TWO.",
    "REPAIR MODE // ACTIVE",
    "OH, HI! YOU CAUGHT ME BUILDING."
  ]) {
    assert.match(component, new RegExp(escapeRegExp(copy)));
  }

  assert.doesNotMatch(
    component,
    /[\u3400-\u9fff]/,
    "customer-facing component copy must stay English-only"
  );
  assert.match(component, /data-coming-soon-blackboard/);
  assert.match(component, /data-coming-soon-voice/);
  assert.match(component, /data-coming-soon-scene/);
  assert.match(component, /tabIndex=\{0\}/);
  assert.match(component, /role="button"/);
  assert.doesNotMatch(component, /<svg/);
});

test("the four landscape frames form one full workshop instead of a portrait sprite", async () => {
  const [component, css] = await Promise.all([
    readWorkspaceFile("components/coming-soon-robot.tsx"),
    readWorkspaceFile("components/coming-soon-robot.css")
  ]);

  for (const action of ["base", "assembly", "wave-one", "wave-two"]) {
    assert.match(component, new RegExp(`data-coming-soon-action="${action}"`));
  }

  for (const asset of ["assembly-01", "assembly-02", "wave-01", "wave-02"]) {
    assert.match(
      css,
      new RegExp(`/assets/coming-soon/workshop-wide/${asset}\\.jpg`)
    );
  }

  assert.doesNotMatch(css, /action-0[12]-frame-sheet\.png/);
  assert.doesNotMatch(css, /background-size:\s*400% 200%/);
  assert.doesNotMatch(css, /aspect-ratio:\s*362\s*\/\s*543/);
});

test("the base frame stays fixed while only the robot side changes", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");
  const rules = postcss.parse(css);
  const declarations = (selector: string) => {
    const values: Record<string, string> = {};
    rules.walkRules(selector, (rule) => {
      if (rule.parent !== rules) return;
      rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
    });
    return values;
  };

  const root = declarations("[data-coming-soon-robot]");
  const workshop = declarations("[data-coming-soon-workshop]");
  const base = declarations('[data-coming-soon-action="base"]');
  const assembly = declarations('[data-coming-soon-action="assembly"]');
  const overlay = declarations("[data-coming-soon-overlay]");

  assert.equal(root.position, "relative");
  assert.equal(root.overflow, "hidden");
  assert.equal(root["background-color"], "#f5f4f1");
  assert.equal(workshop.position, "absolute");
  assert.equal(workshop.inset, "0");
  assert.equal(base.opacity, "1");
  assert.equal(base.animation, undefined, "the full base image must never flicker");
  assert.match(assembly.animation, /coming-soon-repair/);
  assert.match(overlay["mask-image"], /linear-gradient\(90deg/);
  assert.match(overlay["-webkit-mask-image"], /linear-gradient\(90deg/);
  assert.match(overlay["will-change"], /opacity/);
});

test("hovering or focusing the robot switches to the wave and reveals its voice line", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");
  const rules = postcss.parse(css);
  const voice: Record<string, string> = {};

  rules.walkRules("[data-coming-soon-voice]", (rule) => {
    if (rule.parent !== rules) return;
    rule.walkDecls((declaration) => { voice[declaration.prop] = declaration.value; });
  });

  assert.equal(voice.display, "none", "the greeting must not appear during autonomous repair");
  assert.match(css, /@keyframes coming-soon-wave-one/);
  assert.match(css, /@keyframes coming-soon-wave-two/);
  assert.match(
    css,
    /\[data-coming-soon-scene\]:(?:hover|focus)[\s\S]*~\s*\[data-coming-soon-blackboard\][\s\S]*\[data-coming-soon-voice\][^{]*\{[^}]*display:\s*flex;/
  );
  assert.match(
    css,
    /\[data-coming-soon-scene\]:(?:hover|focus)[\s\S]*~\s*\[data-coming-soon-workshop\][\s\S]*\[data-coming-soon-action="wave-one"\][^{]*\{[^}]*animation:\s*coming-soon-wave-one/
  );
  assert.match(css, /\[data-coming-soon-voice\]::before[^{]*\{[^}]*content:\s*"VOICE LINK \/\/";/);
  assert.match(
    css,
    /\[data-coming-soon-scene\]:(?:hover|focus)\s*~\s*\[data-coming-soon-blackboard\]\s*\[data-coming-soon-description\][^{]*\{[^}]*display:\s*none;/
  );
  assert.match(css, /\[data-coming-soon-scene\]:focus-visible[^{]*\{[^}]*outline:\s*none;/);
  assert.match(css, /\[data-coming-soon-scene\]:focus-visible::after/);
});

test("desktop wave frames reveal the raised hand before the shared repair mask", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");
  const rules = postcss.parse(css);
  const waveMask: Record<string, string> = {};

  rules.walkRules((rule) => {
    if (rule.parent !== rules) return;
    if (!rule.selectors?.includes('[data-coming-soon-action="wave-one"]')) return;
    if (!rule.selectors.includes('[data-coming-soon-action="wave-two"]')) return;
    rule.walkDecls((declaration) => { waveMask[declaration.prop] = declaration.value; });
  });

  assert.match(waveMask["mask-image"], /linear-gradient\(90deg, transparent 0 50%/);
  assert.match(waveMask["mask-image"], /#000 55% 100%/);
  assert.match(waveMask["-webkit-mask-image"], /linear-gradient\(90deg, transparent 0 50%/);
});

test("blackboard headline and robot readouts use a textured chalk-print treatment", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");
  const rules = postcss.parse(css);
  const headline: Record<string, string> = {};
  const readout: Record<string, string> = {};

  rules.walkRules("[data-coming-soon-blackboard] h1", (rule) => {
    if (rule.parent !== rules) return;
    rule.walkDecls((declaration) => { headline[declaration.prop] = declaration.value; });
  });
  rules.walkRules((rule) => {
    if (rule.parent !== rules) return;
    if (!rule.selectors?.includes("[data-coming-soon-voice] span")) return;
    if (!rule.selectors.includes("[data-coming-soon-progress] b")) return;
    rule.walkDecls((declaration) => { readout[declaration.prop] = declaration.value; });
  });

  assert.match(headline["font-family"], /^var\(--font-mono\)/);
  assert.match(headline["background-image"], /repeating-linear-gradient/);
  assert.equal(headline["background-clip"], "text");
  assert.equal(headline["-webkit-background-clip"], "text");
  assert.match(headline["-webkit-text-stroke"], /em/);
  assert.match(headline["text-shadow"], /rgba/);
  assert.match(readout["font-family"], /^var\(--font-mono\)/);
  assert.match(readout["background-image"], /repeating-linear-gradient/);
  assert.equal(readout["background-clip"], "text");
  assert.equal(readout["-webkit-background-clip"], "text");
  assert.match(readout["text-shadow"], /rgba/);
});

test("blackboard copy has no independent card, curtain, blur, or color block", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");
  const rules = postcss.parse(css);
  const board: Record<string, string> = {};

  rules.walkRules("[data-coming-soon-blackboard]", (rule) => {
    if (rule.parent !== rules) return;
    rule.walkDecls((declaration) => { board[declaration.prop] = declaration.value; });
  });

  assert.equal(board.position, "absolute");
  assert.equal(board.top, "11%");
  assert.equal(board.left, "8%");
  assert.equal(board.width, "46%");
  assert.equal(board.background, "none");
  assert.equal(board.border, "0");
  assert.equal(board["box-shadow"], "none");
  assert.equal(board["backdrop-filter"], "none");
  assert.equal(board.filter, "none");
});

test("responsive and reduced-motion rules keep the scene readable without horizontal overflow", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");

  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /@media\s*\(max-width:\s*430px\)/);
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\[data-coming-soon-overlay\][\s\S]*animation:\s*none\s*!important;/
  );
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\[data-coming-soon-action="assembly"\][\s\S]*opacity:\s*0;/
  );
});

test("phones use the dedicated portrait workshop frames while the physical blackboard stays fixed", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");
  const rules = postcss.parse(css);
  const mobileBase: Record<string, string> = {};
  const mobileAssembly: Record<string, string> = {};
  const mobileWaveOne: Record<string, string> = {};
  const mobileWaveTwo: Record<string, string> = {};
  const mobileFrame: Record<string, string> = {};
  const mobileOverlay: Record<string, string> = {};
  const mobileBoard: Record<string, string> = {};
  const mobileScene: Record<string, string> = {};

  rules.walkAtRules("media", (atRule) => {
    if (atRule.params !== "(max-width: 430px)") return;
    const collect = (selector: string, target: Record<string, string>) => {
      atRule.walkRules(selector, (rule) => {
        rule.walkDecls((declaration) => { target[declaration.prop] = declaration.value; });
      });
    };
    collect('[data-coming-soon-action="base"]', mobileBase);
    collect('[data-coming-soon-action="assembly"]', mobileAssembly);
    collect('[data-coming-soon-action="wave-one"]', mobileWaveOne);
    collect('[data-coming-soon-action="wave-two"]', mobileWaveTwo);
    collect("[data-coming-soon-frame]", mobileFrame);
    collect("[data-coming-soon-overlay]", mobileOverlay);
    collect("[data-coming-soon-blackboard]", mobileBoard);
    collect("[data-coming-soon-scene]", mobileScene);
  });

  assert.match(mobileBase["background-image"], /mobile-assembly-01\.jpg/);
  assert.match(mobileAssembly["background-image"], /mobile-assembly-02\.jpg/);
  assert.match(mobileWaveOne["background-image"], /mobile-wave-01\.jpg/);
  assert.match(mobileWaveTwo["background-image"], /mobile-wave-02\.jpg/);
  assert.equal(mobileFrame["background-size"], "cover");
  assert.equal(mobileFrame["background-position"], "center");
  assert.match(mobileOverlay["mask-image"], /linear-gradient\(180deg, transparent 0 42%/);
  assert.match(mobileOverlay["-webkit-mask-image"], /linear-gradient\(180deg, transparent 0 42%/);
  assert.equal(mobileBoard.top, "14%");
  assert.equal(mobileBoard.left, "9%");
  assert.equal(mobileBoard.width, "77%");
  assert.equal(mobileScene.top, "43%");
  assert.equal(mobileScene.width, "100%");
});

test("the shared placeholder and preview route compose the robot without entering navigation", async () => {
  const [placeholder, route, sitemap] = await Promise.all([
    readWorkspaceFile("components/placeholder-page.tsx"),
    readWorkspaceFile("app/coming-soon/page.tsx"),
    readWorkspaceFile("app/sitemap.ts")
  ]);

  assert.match(
    placeholder,
    /import \{ ComingSoonRobot \} from "@\/components\/coming-soon-robot"/
  );
  assert.match(placeholder, /<ComingSoonRobot/);
  assert.match(placeholder, /eyebrow=\{title\}/);
  assert.match(placeholder, /headline\?: string/);
  assert.match(route, /searchParams:\s*Promise<\{\s*feature\?:\s*string\s*\|\s*string\[\]/);
  assert.match(route, /resolveComingSoonFeature\(feature\)/);
  assert.match(route, /<PlaceholderPage[\s\S]*title=\{resolvedFeature\.title\}/);
  assert.match(route, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.doesNotMatch(sitemap, /coming-soon/);
});
