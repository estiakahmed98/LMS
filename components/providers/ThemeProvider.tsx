"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

declare global {
  interface Window {
    __boedThemeWarningPatch?: boolean;
  }
}

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  !window.__boedThemeWarningPatch
) {
  window.__boedThemeWarningPatch = true;
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export default function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
