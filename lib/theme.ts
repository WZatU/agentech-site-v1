export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "agentech-theme";
export const THEME_CHANGE_EVENT = "agentech-theme-change";
export const THEME_OPTIONS = ["system", "light", "dark"] as const;

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveThemeMode(mode: ThemeMode, systemDark: boolean): ResolvedTheme {
  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveThemeMode(mode, systemDark);
  const root = document.documentElement;

  root.dataset.themeMode = mode;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: mode }));

  return resolved;
}

export function saveTheme(mode: ThemeMode) {
  try {
    if (mode === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  } catch {
    // Keep the live switch working even if browser storage is blocked.
  }
}

export function getNextTheme(mode: ThemeMode): ThemeMode {
  if (mode === "system") return "light";
  if (mode === "light") return "dark";
  return "system";
}

export const themeBootScript = `
(() => {
  const root = document.documentElement;
  let mode = "system";

  try {
    const saved = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (saved === "light" || saved === "dark") mode = saved;
  } catch {}

  const systemDark = typeof matchMedia === "function"
    ? matchMedia("(prefers-color-scheme: dark)").matches
    : true;
  const resolved = mode === "system"
    ? (systemDark ? "dark" : "light")
    : mode;

  root.dataset.themeMode = mode;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
})();
`;
