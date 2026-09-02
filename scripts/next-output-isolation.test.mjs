import assert from "node:assert/strict";
import { test } from "node:test";

const configUrl = new URL("../next.config.ts", import.meta.url);

async function loadConfig(nodeEnv) {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  try {
    const configModule = await import(`${configUrl.href}?nodeEnv=${nodeEnv}`);
    return configModule.default;
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
}

test("development and production servers keep separate Next.js output directories", async () => {
  const developmentConfig = await loadConfig("development");
  const productionConfig = await loadConfig("production");

  assert.equal(developmentConfig.distDir ?? ".next", ".next-dev");
  assert.equal(productionConfig.distDir ?? ".next", ".next");
  assert.notEqual(developmentConfig.distDir, productionConfig.distDir);
});
