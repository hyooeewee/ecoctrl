export type Theme = "light" | "dark" | "system";

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

let listener: ((e: MediaQueryListEvent) => void) | null = null;

export function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return mediaQuery.matches ? "dark" : "light";
}

function apply(mode: Theme) {
  const root = document.documentElement;
  if (getEffectiveTheme(mode) === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function applyDarkMode(theme: Theme) {
  apply(theme);

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
