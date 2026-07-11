// Client-side (no-API) text extraction for the assessment OCR upload button.
// Images run through tesseract.js OCR; PDFs use the embedded text layer and
// fall back to rasterize + OCR for scanned pages; .docx uses mammoth.
//
// All imports are dynamic so the heavy libraries only load when the admin
// actually uploads a file (keeps them out of the main bundle).

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ExtractProgress = (message: string) => void;

interface PdfTextItem {
  str: string;
  transform?: number[];
  hasEOL?: boolean;
}

/**
 * Reconstruct visual line breaks from pdf.js text items. `getTextContent()`
 * returns positioned fragments; joining them with spaces collapses the page
 * into one line and breaks any line-based parsing. We group fragments by their
 * baseline Y coordinate (transform[5]) and honour the `hasEOL` flag so each
 * question, option, and metadata line stays on its own line.
 */
function textContentToLines(items: ReadonlyArray<unknown>): string {
  const lines: string[] = [];
  let currentLine = "";
  let currentY: number | null = null;

  const flush = () => {
    const trimmed = currentLine.replace(/\s+/g, " ").trim();
    if (trimmed) lines.push(trimmed);
    currentLine = "";
  };

  for (const raw of items) {
    const item = raw as PdfTextItem;
    if (typeof item.str !== "string") continue;

    const y = Array.isArray(item.transform) ? item.transform[5] : null;
    // New visual line when the baseline moves by more than a small tolerance.
    if (currentY !== null && y !== null && Math.abs(y - currentY) > 3) {
      flush();
    }

    currentLine += (currentLine ? " " : "") + item.str;
    if (y !== null) currentY = y;

    if (item.hasEOL) {
      flush();
      currentY = null;
    }
  }
  flush();

  return lines.join("\n");
}

async function ocrImageBlob(blob: Blob, onProgress?: ExtractProgress): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const {
    data: { text },
  } = await recognize(blob, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress && m.status === "recognizing text") {
        onProgress(`Reading text… ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  return text;
}

async function extractPdf(file: File, onProgress?: ExtractProgress): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker is copied into /public (see public/pdf.worker.min.mjs) so it loads
  // from our own origin — no CDN, no bundler worker-resolution quirks.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.(`Extracting page ${pageNumber} of ${pdf.numPages}…`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const layerText = textContentToLines(content.items).trim();

    if (layerText.length > 20) {
      pageTexts.push(layerText);
      continue;
    }

    // Scanned page: rasterize to a canvas, then OCR it.
    onProgress?.(`Scanning page ${pageNumber} (image)…`);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (blob) pageTexts.push(await ocrImageBlob(blob, onProgress));
  }

  return pageTexts.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = (await import("mammoth")).default ?? (await import("mammoth"));
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
}

/**
 * Extract plain text from an uploaded file (image, PDF, or .docx).
 * Runs entirely in the browser — no server, no API key.
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: ExtractProgress,
): Promise<string> {
  const name = file.name.toLowerCase();

  if (file.type.startsWith("image/")) {
    onProgress?.("Reading image…");
    return ocrImageBlob(file, onProgress);
  }
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdf(file, onProgress);
  }
  if (file.type === DOCX_MIME || name.endsWith(".docx")) {
    onProgress?.("Reading Word document…");
    return extractDocx(file);
  }

  throw new Error("Unsupported file. Upload an image, PDF, or Word (.docx) file.");
}
