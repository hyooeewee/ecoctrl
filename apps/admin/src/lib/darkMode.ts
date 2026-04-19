export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

let listener: ((e: MediaQueryListEvent) => void) | null = null;

function apply(mode: Theme) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "light") {
    root.classList.remove("dark");
  } else {
    // system
    if (mediaQuery.matches) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

export function applyDarkMode(theme: Theme) {
  apply(theme);
  localStorage.setItem(STORAGE_KEY, theme);

  if (theme === "system") {
    listener = () => apply("system");
    mediaQuery.addEventListener("change", listener);
  } else {
    if (listener) {
      mediaQuery.removeEventListener("change", listener);
      listener = null;
    }
  }
}

export function getStoredTheme(): Theme | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return null;
}

export function initTheme() {
  const stored = getStoredTheme() ?? "system";
  applyDarkMode(stored);
}
