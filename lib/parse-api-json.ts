export async function parseApiJson<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      res.status === 404
        ? "API route not found. Stop the dev server, run npm run dev:clean, then try again."
        : "Server returned an invalid response.",
    );
  }
  return res.json() as Promise<T>;
}
