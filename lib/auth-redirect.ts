export function safeCallbackUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) return null;
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || /^\/(login|forgot-password|reset-password)(\/|$)/.test(url.pathname)) return null;
  return url.pathname + url.search + url.hash;
}
