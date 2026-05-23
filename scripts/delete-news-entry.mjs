import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const newsDataPath = path.join(repoRoot, "data", "news-entries.json");
const importsPath = path.join(repoRoot, "data", "news-imports.json");
const newsAssetsRoot = path.join(repoRoot, "public", "assets", "news");

function getArg(name) {
  const prefix = `--${name}=`;
  const index = process.argv.indexOf(`--${name}`);

  if (index !== -1) {
    return process.argv[index + 1];
  }

  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : "";
}

function getPositionalArg() {
  return process.argv.slice(2).find((arg) => !arg.startsWith("-")) || "";
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function localAssetPath(publicPath) {
  if (!publicPath || typeof publicPath !== "string" || !publicPath.startsWith("/assets/news/")) {
    return "";
  }

  return path.join(repoRoot, "public", publicPath);
}

function assetPathsForEntry(entry) {
  const paths = new Set();

  for (const value of [entry.coverImage, ...(entry.images || []), ...(entry.videos || [])]) {
    const localPath = localAssetPath(value);

    if (localPath) {
      paths.add(localPath);
    }
  }

  for (const item of entry.media || []) {
    const localPath = localAssetPath(item.src);

    if (localPath) {
      paths.add(localPath);
    }
  }

  return paths;
}

function referencedAssetPaths(entries) {
  const paths = new Set();

  for (const entry of entries) {
    for (const assetPath of assetPathsForEntry(entry)) {
      paths.add(path.resolve(assetPath));
    }
  }

  return paths;
}

function assertInsideNewsAssets(target) {
  const resolved = path.resolve(target);
  const allowedRoot = path.resolve(newsAssetsRoot);

  if (!resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Refusing to remove unexpected path: ${resolved}`);
  }

  return resolved;
}

async function removeOneAsset(target) {
  if (!target || !existsSync(target)) {
    return;
  }

  const resolved = assertInsideNewsAssets(target);

  try {
    await fs.rm(resolved, { recursive: true, force: true });
  } catch (error) {
    const renamed = `${resolved}-deleted-${Date.now()}`;
    try {
      await fs.rename(resolved, renamed);
      console.log(`Assets were locked, so they were renamed instead: ${renamed}`);
      console.log(`Original delete error: ${error.message}`);
    } catch (renameError) {
      throw new Error(
        [
          `Windows is locking this news asset: ${resolved}`,
          "Stop the running website first, especially npm run start -- -p 3001, then run the delete command again.",
          `Delete error: ${error.message}`,
          `Rename fallback also failed: ${renameError.message}`
        ].join("\n")
      );
    }
  }
}

async function removeAssets(slug, entry, remainingEntries) {
  const stillReferenced = referencedAssetPaths(remainingEntries);

  for (const assetPath of assetPathsForEntry(entry)) {
    const resolved = path.resolve(assetPath);

    if (!stillReferenced.has(resolved)) {
      await removeOneAsset(resolved);
    }
  }

  await removeOneAsset(path.join(newsAssetsRoot, slug));
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => right.date.localeCompare(left.date));
}

function printNewsList(entries) {
  const sorted = sortEntries(entries);

  if (!sorted.length) {
    console.log("No news entries found.");
    return;
  }

  console.log("News entries, newest first:");
  for (const [index, entry] of sorted.entries()) {
    console.log(`${index + 1}. ${entry.date} | ${entry.slug} | ${entry.title}`);
  }
}

async function main() {
  const slug = getArg("slug");
  const sourceFolder = getArg("source");
  const date = getArg("date");
  const number = getArg("number");
  const mode = getArg("mode");
  const positional = getPositionalArg();
  const shouldList = process.argv.includes("--list") || process.argv.includes("-l");
  const resolvedSlug = slug || (mode === "slug" ? positional : "");
  const resolvedSource = sourceFolder || (mode === "source" ? positional : "");
  const resolvedDate = date || (mode === "date" ? positional : "");
  const resolvedNumber = number || (mode === "number" ? positional : "");

  const entries = await readJson(newsDataPath, []);
  const imports = await readJson(importsPath, []);

  if (shouldList || (!resolvedSlug && !resolvedSource && !resolvedDate && !resolvedNumber)) {
    printNewsList(entries);

    if (shouldList) {
      return;
    }
  }

  if (!resolvedSlug && !resolvedSource && !resolvedDate && !resolvedNumber) {
    console.log("");
    throw new Error("Delete with npm run delete:news:number 2, npm run delete:news:date 2026-03-16, npm run delete:news:slug agentech, or npm run delete:news:source 2026-05-22-example.");
  }

  const matchedImport = resolvedSource ? imports.find((item) => item.sourceFolder === resolvedSource) : null;
  const sorted = sortEntries(entries);
  const numberIndex = resolvedNumber ? Number(resolvedNumber) - 1 : -1;
  const matchedByNumber = Number.isInteger(numberIndex) && numberIndex >= 0 ? sorted[numberIndex] : null;
  const matchesByDate = resolvedDate ? entries.filter((entry) => entry.date === resolvedDate) : [];

  if (resolvedDate && matchesByDate.length > 1) {
    printNewsList(matchesByDate);
    throw new Error(`More than one news entry uses ${resolvedDate}. Delete by number or slug instead.`);
  }

  const targetSlug = resolvedSlug || matchedImport?.slug || matchedByNumber?.slug || matchesByDate[0]?.slug;

  if (!targetSlug) {
    throw new Error("No matching news entry found.");
  }

  const nextEntries = entries.filter((entry) => entry.slug !== targetSlug);
  const nextImports = imports.filter((item) => item.slug !== targetSlug && (!resolvedSource || item.sourceFolder !== resolvedSource));
  const targetEntry = entries.find((entry) => entry.slug === targetSlug);

  if (nextEntries.length === entries.length) {
    console.log(`No news entry found for slug: ${targetSlug}`);
  }

  if (targetEntry) {
    await removeAssets(targetSlug, targetEntry, nextEntries);
  }

  await fs.writeFile(newsDataPath, `${JSON.stringify(nextEntries, null, 2)}\n`);
  await fs.writeFile(importsPath, `${JSON.stringify(nextImports, null, 2)}\n`);
  console.log(`Deleted news entry: ${targetSlug}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
