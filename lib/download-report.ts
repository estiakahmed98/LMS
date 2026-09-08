/** Fetch first so permission errors stay on the report page instead of opening JSON. */
export async function downloadReport(url: string, filename: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      typeof data?.error === "string" ? data.error : "Failed to export report. Please try again.",
    );
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
