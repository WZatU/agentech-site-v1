import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { removeUnreferencedNewsAssets } from "./news-assets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicRoot = path.join(repoRoot, "public");
const newsAssetsRoot = path.join(publicRoot, "assets", "news");
const newsDataPath = path.join(repoRoot, "data", "news-entries.json");
const apply = process.argv.includes("--apply");

const entries = JSON.parse(await fs.readFile(newsDataPath, "utf8"));
const result = await removeUnreferencedNewsAssets({ entries, newsAssetsRoot, publicRoot, apply });
const staleMegabytes = (result.staleBytes / 1024 / 1024).toFixed(2);

console.log(`${result.referencedFiles} referenced News assets; ${result.staleFiles.length} unreferenced files (${staleMegabytes} MB).`);

if (apply) {
  console.log(`Removed ${result.removedFiles} unreferenced files.`);
} else if (result.staleFiles.length) {
  console.log("Dry run only. Use npm run cleanup:news:apply to remove these files.");
}
