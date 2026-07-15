import fs from "node:fs/promises";
import path from "node:path";

const NEWS_PUBLIC_PREFIX = "/assets/news/";

function collectAssetReferences(value, references) {
  if (typeof value === "string") {
    if (value.startsWith(NEWS_PUBLIC_PREFIX)) references.add(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetReferences(item, references));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectAssetReferences(item, references));
  }
}

async function listFiles(root) {
  const files = [];

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) files.push(target);
    }
  }

  try {
    await walk(root);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return files;
}

function assertInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove path outside the News asset directory: ${target}`);
  }
}

async function removeEmptyDirectories(root) {
  async function prune(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) await prune(path.join(directory, entry.name));
    }

    if (directory !== root && (await fs.readdir(directory)).length === 0) {
      assertInside(root, directory);
      await fs.rmdir(directory);
    }
  }

  try {
    await prune(root);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function findUnreferencedNewsAssets({ entries, newsAssetsRoot, publicRoot }) {
  const references = new Set();
  collectAssetReferences(entries, references);
  const files = await listFiles(newsAssetsRoot);
  const staleFiles = files.filter((file) => {
    const publicPath = `/${path.relative(publicRoot, file).split(path.sep).join("/")}`;
    return !references.has(publicPath);
  });

  return { references, files, staleFiles };
}

export async function removeUnreferencedNewsAssets({ entries, newsAssetsRoot, publicRoot, apply = false }) {
  const audit = await findUnreferencedNewsAssets({ entries, newsAssetsRoot, publicRoot });
  let removedBytes = 0;

  for (const file of audit.staleFiles) {
    assertInside(newsAssetsRoot, file);
    removedBytes += (await fs.stat(file)).size;
    if (apply) await fs.rm(file);
  }

  if (apply) await removeEmptyDirectories(newsAssetsRoot);

  return {
    referencedFiles: audit.references.size,
    totalFiles: audit.files.length,
    removedFiles: apply ? audit.staleFiles.length : 0,
    staleFiles: audit.staleFiles,
    staleBytes: removedBytes
  };
}
