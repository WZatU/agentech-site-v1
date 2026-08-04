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

const aegis = loadTypeScriptModule("features/eaic/02-unified-api/projects-validation/aegis-sdk-reference.ts");
const navi = loadTypeScriptModule("features/eaic/02-unified-api/projects-validation/navi-sdk-reference.ts");
const master = loadTypeScriptModule("features/eaic/02-unified-api/projects-validation/master-sdk-reference.ts");

const references = [
  {
    robot: "aegis",
    functions: aegis.aegisFunctions,
    starter: aegis.aegisStarterCode,
    expectedCount: 24
  },
  {
    robot: "navi",
    functions: navi.naviFunctions,
    starter: navi.naviStarterCode,
    expectedCount: 116
  },
  {
    robot: "master",
    functions: master.masterFunctions,
    starter: master.masterStarterCode,
    expectedCount: 23
  }
];

test("Aegis, Navi, and Master use the same private-address-free setup pattern", () => {
  for (const reference of references) {
    assert.equal(
      reference.starter,
      `from agentech import Agentech\nAgentech.use("${reference.robot}")`
    );
    assert.doesNotMatch(reference.starter, /host\s*=|(?:\d{1,3}\.){3}\d{1,3}/);
  }
});

test("every robot reference has unique, complete cards", () => {
  for (const reference of references) {
    assert.equal(reference.functions.length, reference.expectedCount);
    const names = reference.functions.map((item) => item.name);
    assert.equal(new Set(names).size, names.length);

    for (const item of reference.functions) {
      assert.equal(typeof item.name, "string");
      assert.ok(item.name.length > 0);
      assert.match(item.signature, /^Agentech\./);
      assert.match(item.example, /Agentech\./);
      assert.ok(Array.isArray(item.params));
      const parameterNames = item.params.map((parameter) => parameter.name);
      assert.equal(new Set(parameterNames).size, parameterNames.length);
    }
  }
});

test("Aegis and Master reference only their current public names", () => {
  const aegisNames = new Set(aegis.aegisFunctions.map((item) => item.name));
  assert.ok(aegisNames.has("get_battery_status"));
  assert.ok(!aegisNames.has("battery"));
  assert.ok(!aegisNames.has("imu"));

  assert.deepEqual(
    master.masterFunctions.map((item) => item.name),
    [
      "wave",
      "blow_kiss",
      "raise_hand",
      "salute",
      "heart",
      "handshake",
      "high_five",
      "clap",
      "cross_arms",
      "chest_wave",
      "hug",
      "cheer",
      "wave_goodbye",
      "raise_hands",
      "bow",
      "scratch_head",
      "center",
      "stay",
      "sit",
      "seated_actions.turn_head",
      "seated_actions.shake_head",
      "status",
      "action_catalog"
    ]
  );
});
