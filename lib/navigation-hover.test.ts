import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

test("desktop dropdown stays compact and keeps a hover bridge below its trigger", async () => {
  const source = await readFile(new URL("../components/service-menu.css", import.meta.url), "utf8");
  const rules = postcss.parse(source);
  const declarations: Record<string, string> = {};
  rules.walkRules("[data-service-menu-positioner]", (rule) => {
    rule.walkDecls((declaration) => { declarations[declaration.prop] = declaration.value; });
  });
  assert.equal(declarations.width, "min(264px, calc(100vw - 32px))");
  assert.equal(declarations.left, "50%");
  assert.equal(declarations.right, "auto");
  assert.equal(declarations["padding-top"], "10px");
  assert.equal(declarations.transform, "translateX(-50%)");
});
