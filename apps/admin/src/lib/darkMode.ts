export type Theme = "light" | "dark" | "system";

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
