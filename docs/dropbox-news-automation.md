# Dropbox News Automation

The nightly GitHub Action imports news from the Dropbox shared folder saved in `DROPBOX_NEWS_SHARED_LINK`.

Manual run in GitHub:

1. Open the repository on GitHub.
2. Go to `Actions`.
3. Select `Import Dropbox News`.
4. Click `Run workflow`.

Manual run locally from the real Dropbox folder:

```powershell
npm run import:news
npm run build
git add data/news-entries.json data/news-imports.json public/assets/news
git commit -m "Import Dropbox news"
git push origin main
```

Preview the production build on your usual local port:

```powershell
npm run start -- -p 3001
```

You can also use:

```powershell
npm run serve:3001
```

Manual run locally with a link for only this terminal:

```powershell
$env:DROPBOX_NEWS_SHARED_LINK="https://www.dropbox.com/your-shared-folder-link"
npm run import:news
```

Required repository secrets:

- `DROPBOX_ACCESS_TOKEN`
- `DROPBOX_NEWS_SHARED_LINK`

The importer uses the Dropbox API token first. If no token is available, it can fall back to downloading the shared folder zip from the Dropbox link.

Dropbox folder format:

```text
2026-05-22/
  index.md or news.txt
  1.jpg
  2.jpg
  3.mp4
```

You can also put media inside an `image` folder if you prefer:

```text
2026-05-22/
  index.md
  image/
    1.png
    2.png
```

Use `1.jpg`, `1.png`, `01.jpg`, or `01.png` as the cover image. If there is only one image, that image is both the thumbnail and the only slideshow item. Videos are supported with `.mp4`, `.mov`, `.webm`, and `.m4v`; videos are placed first in the slideshow, then images.

If you add more media to an already imported Dropbox folder, the importer updates the existing news slideshow instead of creating a duplicate.

How the automation works:

1. GitHub runs the importer every night at midnight Pacific time.
2. The importer reads the Dropbox shared folder using `DROPBOX_ACCESS_TOKEN` and `DROPBOX_NEWS_SHARED_LINK`.
3. Each top-level folder whose name starts with a date, such as `2026-05-22`, becomes one news entry.
4. The importer reads `index.md`, another `.md` file, or a `.txt` file as the news text.
5. Numbered media files like `1.jpg`, `2.png`, `3.mp4` are copied into `public/assets/news/<slug>/`.
6. If the Dropbox folder already exists in `data/news-imports.json`, the importer updates that existing news entry instead of creating a duplicate.
7. The importer uses only the languages you provide in the Dropbox text file. It does not call OpenAI.
8. The Action commits the updated JSON and media files back to `main`.

If the news file has only English or only Chinese, the site shows only that language. To show the language toggle, include both `## English` and `## 中文` sections in the Dropbox text file.

If no author is provided, the author is always:

```text
Agentech
```

Only use an author override when you specifically want a different author:

```markdown
---
title: "News Title"
author_override: "Wang Yuan"
---
```

Manual edits:

- Edit copy, title, author, or translations in `data/news-entries.json`.
- List news entries, newest first:

```powershell
npm run list:news
```

- Delete by the number shown in that list:

```powershell
npm run delete:news:number 1
```

- Delete by date:

```powershell
npm run delete:news:date 2026-03-16
```

- Delete by slug:

```powershell
npm run delete:news:slug agentech
```

- Delete by Dropbox folder:

```powershell
npm run delete:news:source 2026-05-22-example
```

The delete command removes the entry from `data/news-entries.json`, removes its row from `data/news-imports.json`, and removes its assets folder from `public/assets/news/`. If Windows has an image locked, the command renames the asset folder instead so the page stops using it.

If the site is running with `npm run start -- -p 3001`, Windows may lock the news image files. Stop the running site first with `Ctrl + C`, then delete. The delete command now removes the news data and the referenced image/video files. If files are locked, it stops and tells you to close the running site before changing the JSON.
