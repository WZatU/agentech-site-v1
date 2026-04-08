const fallbackSiteUrl = "http://localhost:3000";

export function getSiteUrl() {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!rawSiteUrl) {
    return fallbackSiteUrl;
  }

  return rawSiteUrl.endsWith("/") ? rawSiteUrl.slice(0, -1) : rawSiteUrl;
}

export const siteUrl = getSiteUrl();
