import type { NewsEntry } from "@/lib/news";

const companyNewsDomain = "@agent-tech.ai";

function getAllowedCompanyNewsEmails() {
  return (process.env.COMPANY_NEWS_ALLOWED_EMAILS || process.env.NEXT_PUBLIC_COMPANY_NEWS_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeAccessEmail(email: string | undefined | null) {
  const rawEmail = (email || "").trim();

  try {
    return decodeURIComponent(rawEmail).toLowerCase();
  } catch {
    return rawEmail.toLowerCase();
  }
}

export function isCompanyNewsEntry(entry: Pick<NewsEntry, "visibility">) {
  return entry.visibility === "company" || entry.visibility === "private";
}

export function canViewCompanyNews(email: string | undefined | null) {
  const normalizedEmail = normalizeAccessEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return normalizedEmail.endsWith(companyNewsDomain) || getAllowedCompanyNewsEmails().includes(normalizedEmail);
}

export function canViewNewsEntry(entry: Pick<NewsEntry, "visibility">, email: string | undefined | null) {
  return !isCompanyNewsEntry(entry) || canViewCompanyNews(email);
}
