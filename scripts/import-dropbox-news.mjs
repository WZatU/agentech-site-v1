import AdmZip from "adm-zip";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const newsDataPath = path.join(repoRoot, "data", "news-entries.json");
const importsPath = path.join(repoRoot, "data", "news-imports.json");
const newsAssetsRoot = path.join(repoRoot, "public", "assets", "news");
const tempRoot = path.join(repoRoot, ".tmp", `dropbox-news-import-${Date.now()}`);
const defaultAuthor = "Agentech";
const sourceFolderAuthorOverrides = new Map([
  ["2026-05-18", "Li Yang"],
  ["2026-05-22", "Wang Yuan"]
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

function cleanNewsLine(line) {
  return line.replace(/^[-–—⸻]+$/, "").trim();
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

    if (!cleanNewsLine(line)) {
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

  return sections;
}

function firstParagraph(paragraphs) {
  return paragraphs.find((paragraph) => paragraph.trim()) || "";
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

    return mediaSortValue(left) - mediaSortValue(right) || left.localeCompare(right, undefined, { numeric: true });
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
    await fs.copyFile(item.path, destination);
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

    const markdown = await fs.readFile(indexPath, "utf8");
    const { frontmatter, body } = parseFrontmatter(markdown);
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

    const copied = await copyMedia(mediaSource.media, mediaSource.coverImage, finalSlug);
    const languageSections = splitLanguageSections(body);
    const paragraphs = markdownToParagraphs(body);
    const defaultBody = languageSections.en || languageSections.zh || paragraphs;
    const titleEn =
      frontmatter.title_en ||
      frontmatter.en_title ||
      (frontmatter.title && !containsChinese(frontmatter.title) ? frontmatter.title : "") ||
      (languageSections.en ? "Agentech Official News" : "");
    const titleZh =
      frontmatter.title_zh ||
      frontmatter.zh_title ||
      (frontmatter.title && containsChinese(frontmatter.title) ? frontmatter.title : "");
    const rawSummary = frontmatter.summary || frontmatter.subtitle || "";
    const summaryEn =
      frontmatter.summary_en ||
      frontmatter.en_summary ||
      (rawSummary && !containsChinese(rawSummary) ? rawSummary : "");
    const summaryZh =
      frontmatter.summary_zh ||
      frontmatter.zh_summary ||
      (rawSummary && containsChinese(rawSummary) ? rawSummary : "");
    const excerpt = summaryEn || summaryZh || firstParagraph(defaultBody) || title;
    const translations = await completeTranslations({
      titleEn,
      titleZh,
      summaryEn,
      summaryZh,
      defaultTitle: titleEn || titleZh || title,
      defaultExcerpt: excerpt,
      defaultBody: defaultBody.length ? defaultBody : [excerpt],
      languageSections
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
      translations
    };

    if (existingIndex !== -1) {
      newsEntries[existingIndex] = entry;
      updatedExistingMedia = true;
      console.log(`Updated ${sourceFolder} -> ${finalSlug}`);
    } else {
      newsEntries.push(entry);
      existingSlugs.add(finalSlug);
      newImports.push({
        sourceFolder,
        slug: finalSlug,
        importedAt: new Date().toISOString()
      });
      console.log(`Imported ${sourceFolder} -> ${finalSlug}`);
    }
  }

  if (!newImports.length && !updatedExistingMedia) {
    console.log("No new Dropbox news entries found.");
    return;
  }

  newsEntries.sort((left, right) => right.date.localeCompare(left.date));
  imports.push(...newImports);
  await fs.writeFile(newsDataPath, `${JSON.stringify(newsEntries, null, 2)}\n`);
  await fs.writeFile(importsPath, `${JSON.stringify(imports, null, 2)}\n`);
}

importNews().catch((error) => {
  console.error(error);
  process.exit(1);
});
