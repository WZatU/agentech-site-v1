import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const repositoryRoot = process.cwd();
const require = createRequire(import.meta.url);

function loadTypeScriptModule(relativePath) {
  const filename = path.join(repositoryRoot, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "require", "module", "__filename", "__dirname", output)(
    module.exports,
    require,
    module,
    filename,
    path.dirname(filename)
  );
  return module.exports;
}

const master = loadTypeScriptModule("features/eaic/02-unified-api/projects-validation/master-sdk-reference.ts");
const previews = loadTypeScriptModule("lib/master-simulation-previews.ts");

const expectedVariants = {
  wave: ["left", "right"],
  blow_kiss: ["left", "right"],
  raise_hand: ["left", "right"],
  salute: ["left", "right"],
  heart: ["left", "right", "both"],
  handshake: ["left", "right"],
  high_five: ["left", "right"],
  clap: ["fixed"],
  cross_arms: ["fixed"],
  chest_wave: ["left", "right"],
  hug: ["fixed"],
  cheer: ["fixed"],
  wave_goodbye: ["fixed"],
  raise_hands: ["fixed"],
  bow: ["fixed"],
  scratch_head: ["fixed"],
  status: ["fixed"],
  action_catalog: ["fixed"]
};

const expectedDefaults = {
  wave: "right",
  blow_kiss: "left",
  raise_hand: "right",
  salute: "right",
  heart: "both",
  handshake: "right",
  high_five: "right",
  clap: "fixed",
  cross_arms: "fixed",
  chest_wave: "right",
  hug: "fixed",
  cheer: "fixed",
  wave_goodbye: "fixed",
  raise_hands: "fixed",
  bow: "fixed",
  scratch_head: "fixed",
  status: "fixed",
  action_catalog: "fixed"
};

test("every previewed Master function has exactly its supported simulation variants", () => {
  const functionNames = new Set(master.masterFunctions.map((item) => item.name));
  const previewNames = Object.keys(previews.masterSimulationPreviews);
  assert.deepEqual(previewNames, Object.keys(expectedVariants));
  assert.ok(previewNames.every((functionName) => functionNames.has(functionName)));

  for (const functionName of previewNames) {
    const preview = previews.masterSimulationPreviews[functionName];
    assert.deepEqual(
      preview.variants.map((variant) => variant.value),
      expectedVariants[functionName],
      `${functionName} variants must follow the public SDK`
    );
    assert.equal(preview.defaultVariant, expectedDefaults[functionName]);
    assert.ok(preview.variants.some((variant) => variant.value === preview.defaultVariant));
  }
});

test("the Master preview manifest maps 27 unique MP4 assets that all exist", () => {
  const assets = Object.values(previews.masterSimulationPreviews).flatMap((preview) =>
    preview.variants.map((variant) => variant.asset)
  );

  assert.equal(assets.length, 27);
  assert.equal(new Set(assets).size, 27);

  for (const asset of assets) {
    assert.match(asset, /^\/assets\/products\/agentech-library\/simulator-previews\/master\/.+\.mp4$/);
    assert.ok(fs.existsSync(path.join(repositoryRoot, "public", asset)), `Missing ${asset}`);
  }
});

test("variant selection starts from the SDK example and accepts only supported choices", () => {
  assert.equal(previews.resolveMasterSimulationVariant("wave").value, "right");
  assert.equal(previews.resolveMasterSimulationVariant("wave", "left").value, "left");
  assert.equal(previews.resolveMasterSimulationVariant("heart").value, "both");
  assert.equal(previews.resolveMasterSimulationVariant("heart", "right").value, "right");
  assert.equal(previews.resolveMasterSimulationVariant("scratch_head", "right").value, "fixed");
  assert.equal(previews.resolveMasterSimulationVariant("unknown"), undefined);
});

test("every Master MP4 uses browser-compatible H.264 with fast-start metadata", () => {
  const assets = Object.values(previews.masterSimulationPreviews).flatMap((preview) =>
    preview.variants.map((variant) => variant.asset)
  );

  for (const asset of assets) {
    const file = fs.readFileSync(path.join(repositoryRoot, "public", asset));
    const avc1Offset = file.indexOf(Buffer.from("avc1"));
    const moovOffset = file.indexOf(Buffer.from("moov"));
    const mdatOffset = file.indexOf(Buffer.from("mdat"));

    assert.ok(avc1Offset >= 0, `${asset} must use H.264/avc1 for browser playback`);
    assert.ok(moovOffset >= 0 && moovOffset < mdatOffset, `${asset} must put moov metadata before media data`);
  }
});
