"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  normalizeThemeMode,
  saveTheme,
  THEME_CHANGE_EVENT,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  type ThemeMode
} from "@/lib/theme";

const labels: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark"
};

function ThemeOptionIcon({ option }: { option: ThemeMode }) {
  if (option === "system") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2.25" y="2.5" width="11.5" height="8.25" rx="1.5" />
        <path d="M5.25 13.5h5.5M8 10.75v2.75" />
      </svg>
    );
  }

  if (option === "light") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 1.25v1.5M8 13.25v1.5M1.25 8h1.5M13.25 8h1.5M3.23 3.23l1.06 1.06M11.71 11.71l1.06 1.06M3.23 12.77l1.06-1.06M11.71 4.29l1.06-1.06" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13.35 10.15A5.75 5.75 0 0 1 5.85 2.65a5.75 5.75 0 1 0 7.5 7.5Z" />
    </svg>
  );
}

export function ThemeToggle({
  mobile = false,
  mobileHeader = false
}: {
  mobile?: boolean;
  mobileHeader?: boolean;
}) {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const initialMode = normalizeThemeMode(document.documentElement.dataset.themeMode);
    setMode(initialMode);
    applyTheme(initialMode);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemChange() {
      if (mode === "system") applyTheme("system");
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const nextMode = normalizeThemeMode(event.newValue);
      setMode(nextMode);
      applyTheme(nextMode);
    }

    function handleThemeChange(event: Event) {
      setMode((event as CustomEvent<ThemeMode>).detail);
    }

    media.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, [mode]);

  function selectTheme(nextMode: ThemeMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    saveTheme(nextMode);
    applyTheme(nextMode);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Select a display theme"
      className={`theme-switcher ${mobile ? "theme-switcher-mobile" : ""} ${mobileHeader ? "theme-switcher-mobile-header" : ""}`}
    >
      {THEME_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={mode === option}
          aria-label={labels[option]}
          title={labels[option]}
          className="theme-switcher-option"
          onClick={() => selectTheme(option)}
        >
          <ThemeOptionIcon option={option} />
        </button>
      ))}
    </div>
  );
}
