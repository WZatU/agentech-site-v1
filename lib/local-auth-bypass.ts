function normalizedHostname(host: string | null | undefined) {
  const firstHost = host?.split(",", 1)[0]?.trim().toLowerCase() ?? "";

  if (firstHost.startsWith("[")) {
    const closingBracket = firstHost.indexOf("]");
    return closingBracket > 0 ? firstHost.slice(1, closingBracket) : firstHost;
  }

  return firstHost.split(":", 1)[0] ?? "";
}

export function isLocalHostname(host: string | null | undefined) {
  const hostname = normalizedHostname(host);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isLocalRequest(headers: Pick<Headers, "get">) {
  return isLocalHostname(headers.get("x-forwarded-host") || headers.get("host"));
}

export function resolveLocalLoginDestination(next: string | string[] | undefined) {
  const destination = Array.isArray(next) ? next[0] : next;

  if (
    !destination ||
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    destination === "/login" ||
    destination.startsWith("/login?")
  ) {
    return "/";
  }

  return destination;
}

export function resolveLoginBypassDestination(
  headers: Pick<Headers, "get">,
  next: string | string[] | undefined,
  publicReview: boolean,
) {
  if (publicReview) {
    return "/";
  }

  return isLocalRequest(headers) ? resolveLocalLoginDestination(next) : null;
}
