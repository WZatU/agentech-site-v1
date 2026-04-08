#!/usr/bin/env python3
from __future__ import annotations

import argparse
import posixpath
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


BASE_ORIGINS = ("https://www.trae.ai", "https://trae.ai")
BASE_HOSTS = {"www.trae.ai", "trae.ai"}
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)
HTML_ATTR_PATTERN = re.compile(
    r'(?P<prefix>(?<![\w-])(?:href|src|poster)\s*=\s*)(?P<quote>["\'])'
    r"(?P<url>.*?)(?P=quote)",
    re.IGNORECASE,
)
SRCSET_PATTERN = re.compile(
    r'(?P<prefix>\bsrcset\s*=\s*)(?P<quote>["\'])(?P<value>.*?)(?P=quote)',
    re.IGNORECASE,
)
CSS_URL_PATTERN = re.compile(
    r"""url\(\s*(?P<quote>["']?)(?P<url>.*?)(?P=quote)\s*\)""",
    re.IGNORECASE,
)


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def normalize_url(raw_url: str, base_url: str) -> str | None:
    raw_url = raw_url.strip()
    if not raw_url or raw_url.startswith(("data:", "javascript:", "mailto:", "tel:", "#")):
        return None
    if raw_url.startswith("//"):
        raw_url = "https:" + raw_url
    absolute = urllib.parse.urljoin(base_url, raw_url)
    parsed = urllib.parse.urlsplit(absolute)
    if parsed.scheme not in {"http", "https"}:
        return None
    if parsed.netloc not in BASE_HOSTS and (parsed.path or "/") == "/" and not parsed.query:
        return None
    path = parsed.path or "/"
    normalized = urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, path, parsed.query, "")
    )
    return normalized


def is_same_site(url: str) -> bool:
    return urllib.parse.urlsplit(url).netloc in BASE_HOSTS


def local_html_path(output_dir: Path, url: str) -> Path:
    parsed = urllib.parse.urlsplit(url)
    path = parsed.path or "/"
    if path.endswith("/"):
        path = path[:-1]
    if not path:
        dest = output_dir / "index.html"
    else:
        safe_path = path.lstrip("/")
        dest = output_dir / safe_path / "index.html"
    return dest


def local_asset_path(output_dir: Path, url: str) -> Path:
    parsed = urllib.parse.urlsplit(url)
    host = parsed.netloc
    path = parsed.path or "/"
    if path.endswith("/"):
        path += "index"
    rel = Path("_assets") / host / path.lstrip("/")
    if parsed.query:
        rel = rel.with_name(f"{rel.name}__q_{safe_name(parsed.query)}")
    return output_dir / rel


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value)


def relative_href(from_file: Path, to_file: Path) -> str:
    return posixpath.relpath(to_file.as_posix(), start=from_file.parent.as_posix())


def extract_sitemap_urls(sitemap_url: str) -> list[str]:
    xml_text = fetch_text(sitemap_url)
    root = ET.fromstring(xml_text)
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = []
    for loc in root.findall(".//sm:loc", namespace):
        if loc.text:
            urls.append(loc.text.strip())
    return urls


def extract_urls_from_html(html: str, base_url: str) -> set[str]:
    urls: set[str] = set()
    for match in HTML_ATTR_PATTERN.finditer(html):
        url = normalize_url(match.group("url"), base_url)
        if url:
            urls.add(url)
    for match in SRCSET_PATTERN.finditer(html):
        candidates = [part.strip() for part in match.group("value").split(",")]
        for candidate in candidates:
            if not candidate:
                continue
            pieces = candidate.split()
            url = normalize_url(pieces[0], base_url)
            if url:
                urls.add(url)
    return urls


def extract_urls_from_css(css: str, base_url: str) -> set[str]:
    urls: set[str] = set()
    for match in CSS_URL_PATTERN.finditer(css):
        url = normalize_url(match.group("url"), base_url)
        if url:
            urls.add(url)
    return urls


def rewrite_srcset(value: str, base_url: str, current_file: Path, output_dir: Path) -> str:
    rewritten: list[str] = []
    for item in value.split(","):
        candidate = item.strip()
        if not candidate:
            continue
        pieces = candidate.split()
        normalized = normalize_url(pieces[0], base_url)
        if normalized:
            local = local_file_for_url(output_dir, normalized)
            pieces[0] = relative_href(current_file, local)
        rewritten.append(" ".join(pieces))
    return ", ".join(rewritten)


def local_file_for_url(output_dir: Path, url: str) -> Path:
    if is_same_site(url):
        parsed = urllib.parse.urlsplit(url)
        if parsed.path.endswith((".xml", ".json", ".txt")):
            return local_asset_path(output_dir, url)
        return local_html_path(output_dir, url)
    return local_asset_path(output_dir, url)


def rewrite_html(html: str, page_url: str, current_file: Path, output_dir: Path) -> str:
    def replace_attr(match: re.Match[str]) -> str:
        raw_url = match.group("url")
        normalized = normalize_url(raw_url, page_url)
        if not normalized:
            return match.group(0)
        if is_same_site(normalized):
            parsed = urllib.parse.urlsplit(normalized)
            if parsed.path.endswith((".xml", ".json", ".txt")):
                target = local_asset_path(output_dir, normalized)
            else:
                target = local_html_path(output_dir, normalized)
        else:
            target = local_asset_path(output_dir, normalized)
        replacement = relative_href(current_file, target)
        return f"{match.group('prefix')}{match.group('quote')}{replacement}{match.group('quote')}"

    def replace_srcset(match: re.Match[str]) -> str:
        rewritten = rewrite_srcset(match.group("value"), page_url, current_file, output_dir)
        return f"{match.group('prefix')}{match.group('quote')}{rewritten}{match.group('quote')}"

    html = HTML_ATTR_PATTERN.sub(replace_attr, html)
    html = SRCSET_PATTERN.sub(replace_srcset, html)
    return html


def rewrite_css(css: str, css_url: str, current_file: Path, output_dir: Path) -> str:
    def replace_url(match: re.Match[str]) -> str:
        raw_url = match.group("url")
        normalized = normalize_url(raw_url, css_url)
        if not normalized:
            return match.group(0)
        target = local_asset_path(output_dir, normalized)
        replacement = relative_href(current_file, target)
        quote = match.group("quote") or ""
        return f"url({quote}{replacement}{quote})"

    return CSS_URL_PATTERN.sub(replace_url, css)


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def mirror(output_dir: Path, pause_seconds: float) -> None:
    page_urls = []
    seen_pages = set()
    for sitemap_url in ("https://www.trae.ai/sitemap.xml", "https://trae.ai/sitemap.xml"):
        try:
            for url in extract_sitemap_urls(sitemap_url):
                normalized = normalize_url(url, sitemap_url)
                if normalized and is_same_site(normalized) and normalized not in seen_pages:
                    page_urls.append(normalized)
                    seen_pages.add(normalized)
            if page_urls:
                break
        except Exception:
            continue

    if not page_urls:
        page_urls = [BASE_ORIGINS[0] + "/"]

    html_cache: dict[str, str] = {}
    css_cache: dict[str, str] = {}
    binary_assets: set[str] = set()
    discovered_css: set[str] = set()

    for page_url in page_urls:
        try:
            html = fetch_text(page_url)
        except urllib.error.HTTPError as exc:
            print(f"skip page {page_url} ({exc.code})", file=sys.stderr)
            continue
        except Exception as exc:
            print(f"skip page {page_url} ({exc})", file=sys.stderr)
            continue

        html_cache[page_url] = html
        for asset_url in extract_urls_from_html(html, page_url):
            if is_same_site(asset_url) and not urllib.parse.urlsplit(asset_url).path.endswith(
                (".xml", ".json", ".txt")
            ):
                continue
            if asset_url.endswith(".css"):
                discovered_css.add(asset_url)
            else:
                binary_assets.add(asset_url)
        if pause_seconds:
            time.sleep(pause_seconds)

    pending_css = list(discovered_css)
    seen_css = set()
    while pending_css:
        css_url = pending_css.pop(0)
        if css_url in seen_css:
            continue
        seen_css.add(css_url)
        try:
            css = fetch_text(css_url)
        except Exception as exc:
            print(f"skip css {css_url} ({exc})", file=sys.stderr)
            continue
        css_cache[css_url] = css
        for asset_url in extract_urls_from_css(css, css_url):
            if asset_url.endswith(".css"):
                pending_css.append(asset_url)
            else:
                binary_assets.add(asset_url)
        if pause_seconds:
            time.sleep(pause_seconds)

    for asset_url in sorted(binary_assets):
        target = local_asset_path(output_dir, asset_url)
        if target.exists():
            continue
        try:
            payload = fetch_bytes(asset_url)
        except Exception as exc:
            print(f"skip asset {asset_url} ({exc})", file=sys.stderr)
            continue
        ensure_parent(target)
        target.write_bytes(payload)
        if pause_seconds:
            time.sleep(pause_seconds)

    for css_url, css in css_cache.items():
        target = local_asset_path(output_dir, css_url)
        ensure_parent(target)
        target.write_text(rewrite_css(css, css_url, target, output_dir), encoding="utf-8")

    for page_url, html in html_cache.items():
        target = local_html_path(output_dir, page_url)
        ensure_parent(target)
        target.write_text(rewrite_html(html, page_url, target, output_dir), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Mirror trae.ai into a local folder.")
    parser.add_argument(
        "--output",
        default="trae-local",
        help="Directory where the mirrored site will be written.",
    )
    parser.add_argument(
        "--pause",
        type=float,
        default=0.1,
        help="Delay between requests in seconds.",
    )
    args = parser.parse_args()

    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    mirror(output_dir, args.pause)
    print(f"Mirrored site written to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
