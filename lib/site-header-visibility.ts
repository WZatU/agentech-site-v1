import { isLocalHostname } from "./local-auth-bypass.ts";

const standaloneRoutePrefixes = [
  "/field-interest",
  "/agentech-products/agentech-library",
] as const;

export function shouldHideSiteHeader(pathname: string) {
  return standaloneRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldShowThemeToggle(pathname: string) {
  return pathname !== "/";
}

export function shouldShowMobileThemeToggle(pathname: string) {
  return shouldShowThemeToggle(pathname) && !shouldHideSiteHeader(pathname);
}

export function shouldShowAuthControls(hostname: string, hideSignInForPublicReview: boolean) {
  return !hideSignInForPublicReview && !isLocalHostname(hostname);
}
