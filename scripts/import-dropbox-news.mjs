import AdmZip from "adm-zip";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";
import { removeUnreferencedNewsAssets } from "./news-assets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const newsDataPath = path.join(repoRoot, "data", "news-entries.json");
const importsPath = path.join(repoRoot, "data", "news-imports.json");
const newsAssetsRoot = path.join(repoRoot, "public", "assets", "news");
const tempRoot = path.join(repoRoot, ".tmp", `dropbox-news-import-${Date.now()}`);
const defaultAuthor = "Agentech";
const importerFingerprintVersion = "2026-05-strip-derived-title-preview";
const sourceFolderAuthorOverrides = new Map([
  ["2026-05-14", "Bill"],
  ["2026-05-18", "Li Yang"],
  ["2026-05-22", "Bill"],
  ["2026-06-07", "Li Yang"],
  ["2026-06-09", "Li Yang"],
  ["2026-06-11", "Li Yang"]
]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const videoExtensions = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const mediaExtensions = new Set([...imageExtensions, ...videoExtensions]);

function getArg(name) {
  const prefix = `--${name}=`;
  const index = process.argv.indexOf(`--${name}`);

  if (index !== -1) {
    return process.argv[index + 1];
  }

  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : "";
}

function toDirectDropboxDownloadUrl(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("dl", "1");
  return parsed.toString();
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function decodedTextScore(value) {
  const chineseCharacters = (value.match(/[\u3400-\u9FFF]/g) || []).length;
  const replacementCharacters = (value.match(/\uFFFD/g) || []).length;
  const mojibakeMarkers = (value.match(/Ã|Â|â€|â€™|â€œ|â€�|æ|ç|å|è|é/g) || []).length;
  return chineseCharacters * 5 - replacementCharacters * 20 - mojibakeMarkers * 3;
}

async function readTextFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const utf8 = buffer.toString("utf8");

  if (!utf8.includes("\uFFFD")) {
    return utf8;
  }

  try {
    const gb18030 = new TextDecoder("gb18030").decode(buffer);
    return decodedTextScore(gb18030) > decodedTextScore(utf8) ? gb18030 : utf8;
  } catch {
    return utf8;
  }
}

async function fileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function createFolderFingerprint({ indexPath, markdown, mediaItems }) {
  const hash = crypto.createHash("sha256");
  hash.update(importerFingerprintVersion);
  hash.update("\0");
  hash.update(path.basename(indexPath));
  hash.update("\0");
  hash.update(markdown);

  for (const item of mediaItems) {
    hash.update("\0");
    hash.update(item.type);
    hash.update("\0");
    hash.update(path.basename(item.path));
    hash.update("\0");
    hash.update(await fileHash(item.path));
  }

  return hash.digest("hex");
}

async function downloadDropboxFolder(link) {
  await fs.mkdir(tempRoot, { recursive: true });

  const response = await fetch(toDirectDropboxDownloadUrl(link));

  if (!response.ok) {
    throw new Error(`Dropbox download failed with status ${response.status}.`);
  }

  const zipPath = path.join(tempRoot, "news.zip");
  const zipBytes = Buffer.from(await response.arrayBuffer());

  if (zipBytes[0] !== 0x50 || zipBytes[1] !== 0x4b) {
    const preview = zipBytes.toString("utf8", 0, Math.min(zipBytes.length, 220));
    throw new Error(`Dropbox shared-link download did not return a zip file. Check DROPBOX_NEWS_SHARED_LINK. Response starts with: ${preview}`);
  }

  await fs.writeFile(zipPath, zipBytes);

  const zip = new AdmZip(zipPath);
  const extractDir = path.join(tempRoot, "extracted");
  zip.extractAllTo(extractDir, true);
  return extractDir;
}

async function dropboxApiFetch(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Dropbox API failed with status ${response.status}: ${await response.text()}`);
  }

  return response;
}

async function listDropboxSharedFolderPath(link, dropboxPath = "") {
  const entries = [];
  let response = await dropboxApiFetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path: dropboxPath,
      recursive: false,
      include_deleted: false,
      include_non_downloadable_files: false,
      shared_link: {
        url: link
      }
    })
  });
  let payload = await response.json();
  entries.push(...payload.entries);

  while (payload.has_more) {
    response = await dropboxApiFetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cursor: payload.cursor
      })
    });
    payload = await response.json();
    entries.push(...payload.entries);
  }

  return entries;
}

async function listDropboxSharedFolder(link) {
  const allEntries = [];
  const queue = [""];

  while (queue.length) {
    const currentPath = queue.shift();
    const entries = await listDropboxSharedFolderPath(link, currentPath);
    allEntries.push(...entries);

    for (const entry of entries) {
      if (entry[".tag"] === "folder") {
        queue.push(entry.path_display || entry.path_lower);
      }
    }
  }

  return allEntries;
}

async function downloadDropboxSharedFolderWithApi(link) {
  await fs.rm(tempRoot, { recursive: true, force: true });
  const extractDir = path.join(tempRoot, "api-extracted");
  await fs.mkdir(extractDir, { recursive: true });

  const entries = await listDropboxSharedFolder(link);
  const files = entries.filter((entry) => entry[".tag"] === "file");

  for (const file of files) {
    const dropboxPath = file.path_display || file.path_lower;
    const relativePath = dropboxPath.replace(/^\/+/, "");
    const destination = path.join(extractDir, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });

    const response = await dropboxApiFetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
      method: "POST",
      headers: {
        "Dropbox-API-Arg": JSON.stringify({
          url: link,
          path: dropboxPath
        })
      }
    });
    await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
  }

  return extractDir;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function titleFromFolderHint(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDisplayDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { frontmatter: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 3);

  if (end === -1) {
    return { frontmatter: {}, body: markdown };
  }

  const raw = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 4).trim();
  const frontmatter = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    frontmatter[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }

  return { frontmatter, body };
}

function markdownToParagraphs(markdown) {
  return markdown
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) =>
          line
            .replace(/^#{1,6}\s+/, "")
            .replace(/^>\s?/, "")
            .replace(/^[-*]\s+/, "")
            .replace(/^\d+\.\s+/, "")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1")
            .trim()
        )
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean);
}

function isDividerLine(line) {
  const trimmed = line.trim();
  return /^[\s\-–—⸻]+$/u.test(trimmed) || /^[\sâ€“â€”â¸»]+$/.test(trimmed);
}

function cleanNewsLine(line) {
  return isDividerLine(line) ? "" : line.trim();
}

function isPrivateMarkerLine(line) {
  const normalized = line.trim().toLowerCase();
  return normalized === "private" || normalized === "# private" || normalized === "## private" || normalized === "### private";
}

function isVisibilityMarkerLine(line) {
  const normalized = line.trim().toLowerCase();
  return (
    isPrivateMarkerLine(line) ||
    normalized === "public" ||
    normalized === "# public" ||
    normalized === "## public" ||
    normalized === "### public"
  );
}

function getNewsVisibility(frontmatter, markdown) {
  const rawVisibility = String(frontmatter.visibility || frontmatter.access || frontmatter.audience || "").trim().toLowerCase();

  if (["private", "company", "internal"].includes(rawVisibility)) {
    return "company";
  }

  if (markdown.split(/\r?\n/).some((line) => isPrivateMarkerLine(line))) {
    return "company";
  }

  return undefined;
}

function stripPrivateMarkerLines(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => !isVisibilityMarkerLine(line))
    .join("\n")
    .trim();
}

function isEnglishHeading(value) {
  const normalized = value.toLowerCase();
  return normalized === "english" || normalized === "en" || normalized.includes("english version");
}

function isChineseHeading(value) {
  return (
    value === "中文" ||
    value === "中文版" ||
    value === "简体中文" ||
    value.toLowerCase() === "chinese" ||
    value.toLowerCase() === "zh" ||
    value.includes("中文版")
  );
}

function containsChinese(value) {
  return /[\u3400-\u9FFF]/.test(value);
}

async function completeTranslations({ titleEn, titleZh, summaryEn, summaryZh, defaultTitle, defaultExcerpt, defaultBody, languageSections }) {
  const translations = {};

  if (languageSections.en || titleEn || summaryEn) {
    translations.en = {
      title: titleEn || defaultTitle,
      excerpt: summaryEn || defaultExcerpt,
      body: languageSections.en || defaultBody
    };
  }

  if (languageSections.zh || titleZh || summaryZh) {
    translations.zh = {
      title: titleZh || defaultTitle,
      excerpt: summaryZh || defaultExcerpt,
      body: languageSections.zh || defaultBody
    };
  }

  if (!translations.en && !translations.zh) {
    const defaultLanguage = containsChinese([defaultTitle, defaultExcerpt, ...defaultBody].join("\n")) ? "zh" : "en";
    translations[defaultLanguage] = {
      title: defaultTitle,
      excerpt: defaultExcerpt,
      body: defaultBody
    };
  }

  return translations;
}

function splitLanguageSections(markdown) {
  const sections = {};
  const lines = markdown.split(/\r?\n/);
  let current = "default";
  const buckets = {
    default: []
  };

  for (const line of lines) {
    const heading = line.trim().match(/^#{1,3}\s+(.+)$/);
    const rawHeadingText = (heading?.[1] || line).trim();
    const headingText = rawHeadingText.toLowerCase();
    const headingLabel = rawHeadingText.split(/[|｜]/)[0]?.trim() || rawHeadingText;

    if (isEnglishHeading(headingText) || isEnglishHeading(headingLabel)) {
      current = "en";
      buckets[current] ||= [];
      continue;
    }

    if (isChineseHeading(rawHeadingText) || isChineseHeading(headingLabel)) {
      current = "zh";
      buckets[current] ||= [];
      continue;
    }

    if (isDividerLine(line)) {
      continue;
    }

    if (!line.trim()) {
      buckets[current] ||= [];
      buckets[current].push(line);
      continue;
    }

    buckets[current] ||= [];
    buckets[current].push(line);
  }

  if (buckets.en?.join("").trim()) {
    sections.en = markdownToParagraphs(buckets.en.join("\n"));
  }

  if (buckets.zh?.join("").trim()) {
    sections.zh = markdownToParagraphs(buckets.zh.join("\n"));
  }

  if (!sections.en && !sections.zh && buckets.default?.join("").trim()) {
    const paragraphs = markdownToParagraphs(buckets.default.join("\n")).filter((paragraph) => cleanNewsLine(paragraph));

    for (const paragraph of paragraphs) {
      const language = containsChinese(paragraph) ? "zh" : "en";
      sections[language] ||= [];
      sections[language].push(paragraph);
    }
  }

  return sections;
}

function firstParagraph(paragraphs) {
  return paragraphs.find((paragraph) => paragraph.trim()) || "";
}

function bodyWithoutDerivedTitleAndSummary(paragraphs, title, summary) {
  const body = [...(paragraphs || [])];

  if (body[0] && title && body[0].trim() === title.trim()) {
    body.shift();
  }

  if (body[0] && summary && body[0].trim() === summary.trim()) {
    body.shift();
  }

  return body;
}

function firstSentence(paragraphs) {
  const paragraph = firstParagraph(paragraphs);

  if (!paragraph) {
    return "";
  }

  return paragraph.match(/^.+?[.!?。！？](?:\s|$)/u)?.[0]?.trim() || paragraph;
}

function isLikelyPreviewLine(paragraph) {
  if (!paragraph) {
    return false;
  }

  if (paragraph.length > 150) {
    return false;
  }

  return !/[.!?。！？]$/.test(paragraph.trim());
}

async function getTopLevelDirectories(sourceDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => {
      const name = entry.name.toLowerCase();
      return entry.isDirectory() && !name.startsWith("_") && !name.includes("example");
    })
    .map((entry) => path.join(sourceDir, entry.name));
}

function mediaSortValue(file) {
  const baseName = path.basename(file, path.extname(file)).toLowerCase();
  const number = Number(baseName.match(/^\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

function mediaExtensionSortValue(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".png": 0,
    ".jpg": 1,
    ".jpeg": 1,
    ".webp": 2
  }[ext] ?? 3;
}

async function getMedia(folderPath) {
  const imageDir = existsSync(path.join(folderPath, "image")) ? path.join(folderPath, "image") : folderPath;
  const files = (await fs.readdir(imageDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && mediaExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);
  const sorted = files.sort((left, right) => {
    const leftIsVideo = videoExtensions.has(path.extname(left).toLowerCase());
    const rightIsVideo = videoExtensions.has(path.extname(right).toLowerCase());

    if (leftIsVideo !== rightIsVideo) {
      return leftIsVideo ? -1 : 1;
    }

    return (
      mediaSortValue(left) - mediaSortValue(right) ||
      mediaExtensionSortValue(left) - mediaExtensionSortValue(right) ||
      left.localeCompare(right, undefined, { numeric: true })
    );
  });
  const images = sorted.filter((file) => imageExtensions.has(path.extname(file).toLowerCase()));
  const coverCandidates = images.filter((file) => {
    const baseName = path.basename(file, path.extname(file)).toLowerCase();
    return baseName === "1" || baseName === "01";
  });
  const fallbackMain = images.filter((file) => path.basename(file).toLowerCase() === "main.jpg");
  const orderedCover = coverCandidates.length ? coverCandidates : fallbackMain;
  const coverImage = (orderedCover[0] || images[0]) ? path.join(imageDir, orderedCover[0] || images[0]) : "";

  return {
    coverImage,
    media: sorted.map((file) => {
      const ext = path.extname(file).toLowerCase();
      return {
        type: videoExtensions.has(ext) ? "video" : "image",
        path: path.join(imageDir, file)
      };
    })
  };
}

async function copyMedia(mediaItems, coverImagePath, slug) {
  const runFolder = `media-${Date.now()}`;
  const destinationDir = path.join(newsAssetsRoot, slug, runFolder);
  await fs.mkdir(destinationDir, { recursive: true });

  const copiedMedia = [];
  const copiedImages = [];
  let copiedCoverImage = "";

  for (const [index, item] of mediaItems.entries()) {
    const ext = path.extname(item.path).toLowerCase() || (item.type === "video" ? ".mp4" : ".jpg");
    const filename = `${String(index + 1).padStart(2, "0")}${ext}`;
    const destination = path.join(destinationDir, filename);

    if (item.type === "image") {
      await sharp(item.path).rotate().toFile(destination);
    } else {
      await fs.copyFile(item.path, destination);
    }

    const publicPath = `/assets/news/${slug}/${runFolder}/${filename}`;
    copiedMedia.push({
      type: item.type,
      src: publicPath
    });

    if (item.type === "image") {
      copiedImages.push(publicPath);
    }

    if (coverImagePath && item.path === coverImagePath) {
      copiedCoverImage = publicPath;
    }
  }

  return {
    coverImage: copiedCoverImage || copiedImages[0] || copiedMedia[0]?.src || "",
    images: copiedImages,
    videos: copiedMedia.filter((item) => item.type === "video").map((item) => item.src),
    media: copiedMedia
  };
}

async function importNews() {
  const sourceArg = getArg("source");
  const link = getArg("link") || process.env.DROPBOX_NEWS_SHARED_LINK;
  let sourceDir = sourceArg;

  if (!sourceDir && link && process.env.DROPBOX_ACCESS_TOKEN) {
    try {
      sourceDir = await downloadDropboxSharedFolderWithApi(link);
    } catch (error) {
      console.log(`Dropbox API import failed, falling back to shared-link download: ${error.message}`);
    }
  }

  if (!sourceDir && link) {
    sourceDir = await downloadDropboxFolder(link);
  }

  if (!sourceDir) {
    throw new Error("Set DROPBOX_NEWS_SHARED_LINK or pass --source <folder>.");
  }

  const newsEntries = await readJson(newsDataPath, []);
  const imports = await readJson(importsPath, []);
  const importedFolders = new Set(imports.map((item) => item.sourceFolder));
  const importByFolder = new Map(imports.map((item) => [item.sourceFolder, item]));
  const existingSlugs = new Set(newsEntries.map((entry) => entry.slug));
  const directories = await getTopLevelDirectories(sourceDir);
  const newImports = [];
  let updatedImportMetadata = false;
  let updatedExistingMedia = false;

  for (const folderPath of directories) {
    const sourceFolder = path.basename(folderPath);
    const folderMatch = sourceFolder.match(/^(\d{4}-\d{2}-\d{2})(?:-(.+))?$/);

    if (!folderMatch) {
      console.log(`Skipping ${sourceFolder}: folder name must start with YYYY-MM-DD.`);
      continue;
    }

    const filesInFolder = await fs.readdir(folderPath, { withFileTypes: true });
    const contentFile = filesInFolder
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .find((name) => name.toLowerCase() === "index.md") ||
      filesInFolder
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .find((name) => [".md", ".txt"].includes(path.extname(name).toLowerCase()));
    const indexPath = contentFile ? path.join(folderPath, contentFile) : "";

    if (!indexPath || !existsSync(indexPath)) {
      console.log(`Skipping ${sourceFolder}: missing index.md, .md, or .txt news file.`);
      continue;
    }

    const markdown = await readTextFile(indexPath);
    const { frontmatter, body } = parseFrontmatter(markdown);
    const visibility = getNewsVisibility(frontmatter, body);
    const articleBody = stripPrivateMarkerLines(body);
    const date = frontmatter.date || folderMatch[1];
    const title = frontmatter.title || titleFromFolderHint(folderMatch[2] || "Agentech News");
    const titleSlug = slugify(title || sourceFolder);
    const slug = slugify(`${sourceFolder}-${titleSlug || "news"}`) || slugify(sourceFolder) || `news-${date}`;
    const imported = importByFolder.get(sourceFolder);
    const finalSlug = imported?.slug || slug;
    const existingIndex = imported ? newsEntries.findIndex((item) => item.slug === imported.slug) : -1;
    const existingEntry = existingIndex !== -1 ? newsEntries[existingIndex] : null;

    if (!slug) {
      console.log(`Skipping ${sourceFolder}: unable to create a slug.`);
      continue;
    }

    if (existingSlugs.has(finalSlug) && !imported) {
      console.log(`Skipping ${sourceFolder}: slug ${finalSlug} already exists.`);
      continue;
    }

    const mediaSource = await getMedia(folderPath);

    if (!mediaSource.media.length || !mediaSource.coverImage) {
      console.log(`Skipping ${sourceFolder}: no images or videos found.`);
      continue;
    }

    const fingerprint = await createFolderFingerprint({
      indexPath,
      markdown,
      mediaItems: mediaSource.media
    });

    if (imported && imported.fingerprint === fingerprint) {
      console.log(`Skipping ${sourceFolder}: no Dropbox changes detected.`);
      continue;
    }

    const copied = await copyMedia(mediaSource.media, mediaSource.coverImage, finalSlug);
    const languageSections = splitLanguageSections(articleBody);
    const paragraphs = markdownToParagraphs(articleBody);
    const defaultBody = languageSections.en || languageSections.zh || paragraphs;
    const derivedTitleEn = languageSections.en?.[0] || "";
    const derivedTitleZh = languageSections.zh?.[0] || "";
    const possibleSummaryEn = languageSections.en?.[1] || "";
    const possibleSummaryZh = languageSections.zh?.[1] || "";
    const derivedSummaryEn = isLikelyPreviewLine(possibleSummaryEn)
      ? possibleSummaryEn
      : firstSentence(bodyWithoutDerivedTitleAndSummary(languageSections.en, derivedTitleEn, ""));
    const derivedSummaryZh = isLikelyPreviewLine(possibleSummaryZh)
      ? possibleSummaryZh
      : firstSentence(bodyWithoutDerivedTitleAndSummary(languageSections.zh, derivedTitleZh, ""));
    const titleEn =
      frontmatter.title_en ||
      frontmatter.en_title ||
      (frontmatter.title && !containsChinese(frontmatter.title) ? frontmatter.title : "") ||
      derivedTitleEn ||
      (languageSections.en ? "Agentech Official News" : "");
    const titleZh =
      frontmatter.title_zh ||
      frontmatter.zh_title ||
      (frontmatter.title && containsChinese(frontmatter.title) ? frontmatter.title : "") ||
      derivedTitleZh;
    const rawSummary = frontmatter.summary || frontmatter.subtitle || "";
    const summaryEn =
      frontmatter.summary_en ||
      frontmatter.en_summary ||
      (rawSummary && !containsChinese(rawSummary) ? rawSummary : "") ||
      derivedSummaryEn;
    const summaryZh =
      frontmatter.summary_zh ||
      frontmatter.zh_summary ||
      (rawSummary && containsChinese(rawSummary) ? rawSummary : "") ||
      derivedSummaryZh;
    const articleLanguageSections = {
      en: languageSections.en ? bodyWithoutDerivedTitleAndSummary(languageSections.en, titleEn, summaryEn) : undefined,
      zh: languageSections.zh ? bodyWithoutDerivedTitleAndSummary(languageSections.zh, titleZh, summaryZh) : undefined
    };
    const excerpt = summaryEn || summaryZh || firstParagraph(defaultBody) || title;
    const translations = await completeTranslations({
      titleEn,
      titleZh,
      summaryEn,
      summaryZh,
      defaultTitle: titleEn || titleZh || title,
      defaultExcerpt: excerpt,
      defaultBody: defaultBody.length ? defaultBody : [excerpt],
      languageSections: articleLanguageSections
    });
    const entry = {
      slug: finalSlug,
      title: translations.en?.title || translations.zh?.title || title,
      date,
      displayDate: formatDisplayDate(date),
      author:
        frontmatter.author_override ||
        frontmatter.authorOverride ||
        frontmatter.agentech_author ||
        existingEntry?.author ||
        sourceFolderAuthorOverrides.get(sourceFolder) ||
        defaultAuthor,
      excerpt: translations.en?.excerpt || translations.zh?.excerpt || excerpt,
      coverImage: copied.coverImage,
      images: copied.images,
      videos: copied.videos,
      media: copied.media,
      body: translations.en?.body || translations.zh?.body || (defaultBody.length ? defaultBody : [excerpt]),
      ...(visibility ? { visibility } : {}),
      translations
    };

    if (existingIndex !== -1) {
      newsEntries[existingIndex] = entry;
      imported.fingerprint = fingerprint;
      imported.updatedAt = new Date().toISOString();
      updatedImportMetadata = true;
      updatedExistingMedia = true;
      console.log(`Updated ${sourceFolder} -> ${finalSlug}`);
    } else {
      newsEntries.push(entry);
      existingSlugs.add(finalSlug);
      newImports.push({
        sourceFolder,
        slug: finalSlug,
        fingerprint,
        importedAt: new Date().toISOString()
      });
      console.log(`Imported ${sourceFolder} -> ${finalSlug}`);
    }
  }

  if (!newImports.length && !updatedExistingMedia && !updatedImportMetadata) {
    console.log("No new Dropbox news entries found.");
    return;
  }

  newsEntries.sort((left, right) => right.date.localeCompare(left.date));
  imports.push(...newImports);
  await fs.writeFile(newsDataPath, `${JSON.stringify(newsEntries, null, 2)}\n`);
  await fs.writeFile(importsPath, `${JSON.stringify(imports, null, 2)}\n`);
  const cleanup = await removeUnreferencedNewsAssets({
    entries: newsEntries,
    newsAssetsRoot,
    publicRoot: path.join(repoRoot, "public"),
    apply: true
  });

  if (cleanup.removedFiles) {
    console.log(`Removed ${cleanup.removedFiles} obsolete news asset file${cleanup.removedFiles === 1 ? "" : "s"}.`);
  }
}

importNews().catch((error) => {
  console.error(error);
  process.exit(1);
});
