export type ColorTheme = "red" | "blue" | "dark";

export const DEFAULT_COLOR_THEME: ColorTheme = "red";
export const COLOR_THEME_STORAGE_KEY = "pstc_color_theme";
export const COLOR_THEME_ATTRIBUTE = "data-color-theme";
export const COLOR_THEME_CHANGE_EVENT = "pstc-color-theme-change";

export const SUPPORTED_COLOR_THEMES: readonly ColorTheme[] = [
  "red",
  "blue",
  "dark",
];

export const COLOR_THEME_META: Record<
  ColorTheme,
  { label: string; primary: string; secondary: string; logo: string }
> = {
  red: {
    label: "Red",
    primary: "#D82028",
    secondary: "#BCBCBC",
    logo: "/pstc_logo.png",
  },
  blue: {
    label: "Blue",
    primary: "#06529E",
    secondary: "#94C955",
    logo: "/pstc_logo_2.png",
  },
  dark: {
    label: "Purple",
    primary: "#6D28D9",
    secondary: "#F59E0B",
    logo: "/pstc_logo_3.png",
  },
};

function isColorTheme(value: string | null): value is ColorTheme {
  return (
    value !== null &&
    (SUPPORTED_COLOR_THEMES as readonly string[]).includes(value)
  );
}

export function getStoredColorTheme(): ColorTheme {
  if (typeof window === "undefined") {
    return DEFAULT_COLOR_THEME;
  }

  const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
  return isColorTheme(stored) ? stored : DEFAULT_COLOR_THEME;
}

export function applyColorTheme(theme: ColorTheme) {
  if (theme === DEFAULT_COLOR_THEME) {
    window.document.documentElement.removeAttribute(COLOR_THEME_ATTRIBUTE);
  } else {
    window.document.documentElement.setAttribute(COLOR_THEME_ATTRIBUTE, theme);
  }
}

export function setStoredColorTheme(theme: ColorTheme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  applyColorTheme(theme);

  window.dispatchEvent(
    new CustomEvent<ColorTheme>(COLOR_THEME_CHANGE_EVENT, {
      detail: theme,
    }),
  );
}

export function subscribeColorThemeChanges(
  handler: (theme: ColorTheme) => void,
) {
  function handleStorage(event: StorageEvent) {
    if (event.key === COLOR_THEME_STORAGE_KEY && isColorTheme(event.newValue)) {
      handler(event.newValue);
    }
  }

  function handleCustomEvent(event: Event) {
    const customEvent = event as CustomEvent<ColorTheme>;

    if (isColorTheme(customEvent.detail)) {
      handler(customEvent.detail);
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(
    COLOR_THEME_CHANGE_EVENT,
    handleCustomEvent as EventListener,
  );

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(
      COLOR_THEME_CHANGE_EVENT,
      handleCustomEvent as EventListener,
    );
  };
}
