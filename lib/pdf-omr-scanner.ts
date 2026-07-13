import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { OmrQuestionResult, OmrQuestionSpec } from "@/lib/omr-scanner";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export type PdfOmrScanResult = {
  previewImages: string[];
  answers: Record<string, string>;
  questionResults: OmrQuestionResult[];
  confidence: number;
};

type TextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PageEntry = {
  previewImage: string;
  imageData: ImageData;
  lines: TextLine[];
  fragments: TextFragment[];
};

type QuestionBlock = {
  questionNumber: number;
  lines: TextLine[];
  pageIndex: number;
};

type TextFragment = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function groupTextLines(
  items: ReadonlyArray<unknown>,
  viewport: { convertToViewportPoint(x: number, y: number): any },
) {
  const lines: {
    x: number;
    y: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    fragments: { text: string; x: number; y: number }[];
  }[] = [];

  for (const raw of items) {
    const item = raw as { str?: unknown; transform?: number[]; width?: number; height?: number };
    if (typeof item.str !== "string") continue;
    if (!Array.isArray(item.transform)) continue;

    const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    const width = typeof item.width === "number" ? Math.abs(item.width) : 0;
    const height = typeof item.height === "number" ? Math.abs(item.height) : 0;
    const [x2, y2] = viewport.convertToViewportPoint(
      item.transform[4] + width,
      item.transform[5] - height,
    );
    const fragment = { text: item.str, x, y };
    const fragmentMaxX = Number.isFinite(x2) ? Math.max(x, x2) : x;
    const fragmentMaxY = Number.isFinite(y2) ? Math.max(y, y2) : y;
    const fragmentMinY = Number.isFinite(y2) ? Math.min(y, y2) : y;
    const existing = lines.find((line) => Math.abs(line.y - y) < 4);

    if (existing) {
      existing.fragments.push(fragment);
      existing.x = Math.min(existing.x, x);
      existing.y = (existing.y + y) / 2;
      existing.minX = Math.min(existing.minX, x);
      existing.maxX = Math.max(existing.maxX, fragmentMaxX);
      existing.minY = Math.min(existing.minY, fragmentMinY);
      existing.maxY = Math.max(existing.maxY, fragmentMaxY);
    } else {
      lines.push({
        x,
        y,
        minX: x,
        maxX: fragmentMaxX,
        minY: fragmentMinY,
        maxY: fragmentMaxY,
        fragments: [fragment],
      });
    }
  }

  return lines
    .map((line) => {
      const fragments = line.fragments.slice().sort((a, b) => a.x - b.x);
      return {
        text: fragments.map((fragment) => fragment.text).join(" ").replace(/\s+/g, " ").trim(),
        x: Math.min(...fragments.map((fragment) => fragment.x)),
        y: line.y,
        width: Math.max(1, line.maxX - line.minX + 18),
        height: Math.max(10, line.maxY - line.minY + 4),
      };
    })
    .filter((line) => line.text.length > 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function extractTextFragments(
  items: ReadonlyArray<unknown>,
  viewport: { convertToViewportPoint(x: number, y: number): any },
) {
  const fragments: TextFragment[] = [];

  for (const raw of items) {
    const item = raw as { str?: unknown; transform?: number[]; width?: number; height?: number };
    if (typeof item.str !== "string") continue;
    if (!Array.isArray(item.transform)) continue;

    const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    const width = typeof item.width === "number" ? Math.abs(item.width) : 0;
    const height = typeof item.height === "number" ? Math.abs(item.height) : 0;
    const [x2, y2] = viewport.convertToViewportPoint(
      item.transform[4] + width,
      item.transform[5] - height,
    );

    fragments.push({
      text: item.str,
      x,
      y,
      width: Number.isFinite(x2) ? Math.max(1, Math.abs(x2 - x)) : 1,
      height: Number.isFinite(y2) ? Math.max(1, Math.abs(y2 - y)) : 1,
    });
  }

  return fragments.sort((a, b) => a.y - b.y || a.x - b.x);
}

function isQuestionStart(text: string) {
  return /^\s*\d{1,3}\s*[.)]?\s*/.test(text);
}

function isOptionStart(text: string) {
  return /^\s*[abcd]\s*[.)]?\s*/i.test(text);
}

function extractQuestionBlocks(lines: TextLine[], pageIndex: number) {
  const blocks: QuestionBlock[] = [];
  let current: QuestionBlock | null = null;

  for (const line of lines) {
    const qMatch = line.text.match(/^\s*(\d{1,3})\s*[.)]?\s*/);
    if (qMatch) {
      const questionNumber = Number(qMatch[1]);
      current = { questionNumber, lines: [line], pageIndex };
      blocks.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  return blocks;
}

function sampleMarkScore(
  imageData: ImageData,
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  const { data, width, height } = imageData;
  const x0 = clamp(Math.floor(left), 0, width - 1);
  const y0 = clamp(Math.floor(top), 0, height - 1);
  const x1 = clamp(Math.ceil(right), 0, width - 1);
  const y1 = clamp(Math.ceil(bottom), 0, height - 1);

  let blue = 0;
  let dark = 0;
  let total = 0;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      if (a < 20) continue;
      total += 1;

      const blueDominant = b > 110 && b - r > 26 && b - g > 18 && b > Math.max(r, g) * 1.1;
      const darkInk = r < 105 && g < 105 && b < 150 && (r + g + b) / 3 < 130;
      if (blueDominant) blue += 1;
      if (darkInk) dark += 1;
    }
  }

  return {
    blue: total > 0 ? blue / total : 0,
    dark: total > 0 ? dark / total : 0,
    ink: total > 0 ? (blue + dark) / total : 0,
    blueCount: blue,
    darkCount: dark,
    totalCount: total,
    score:
      total > 0
        ? (() => {
            const density = (blue + dark) / total;
            const inkAmount = clamp((blue + dark) / 18, 0, 1);
            const colorBoost = blue > 0 ? clamp(blue / Math.max(1, blue + dark), 0, 1) * 0.12 : 0;
            return clamp(inkAmount * 0.55 + density * 0.45 + colorBoost, 0, 1);
          })()
        : 0,
  };
}

function sampleBubbleScore(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number,
) {
  const { data, width, height } = imageData;
  const x0 = clamp(Math.floor(centerX - radius), 0, width - 1);
  const y0 = clamp(Math.floor(centerY - radius), 0, height - 1);
  const x1 = clamp(Math.ceil(centerX + radius), 0, width - 1);
  const y1 = clamp(Math.ceil(centerY + radius), 0, height - 1);
  const innerRadius = Math.max(2, radius * 0.65);
  const outerRadius = Math.max(innerRadius + 1, radius * 1.15);

  let ink = 0;
  let total = 0;
  let centerInk = 0;
  let centerTotal = 0;
  let edgeInk = 0;
  let edgeTotal = 0;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > outerRadius) continue;

      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      if (a < 20) continue;

      const isInk =
        b > 110 && b - r > 26 && b - g > 18 && b > Math.max(r, g) * 1.08
          ? true
          : r < 105 && g < 105 && b < 150 && (r + g + b) / 3 < 130;

      total += 1;
      if (isInk) ink += 1;

      if (distance <= innerRadius) {
        centerTotal += 1;
        if (isInk) centerInk += 1;
      } else {
        edgeTotal += 1;
        if (isInk) edgeInk += 1;
      }
    }
  }

  const density = total > 0 ? ink / total : 0;
  const centerDensity = centerTotal > 0 ? centerInk / centerTotal : 0;
  const edgeDensity = edgeTotal > 0 ? edgeInk / edgeTotal : 0;

  return {
    density,
    centerDensity,
    edgeDensity,
    inkCount: ink,
    totalCount: total,
    score:
      total > 0
        ? clamp(
            density * 0.25 +
              centerDensity * 0.5 +
              Math.min(1, ink / 10) * 0.15 +
              edgeDensity * 0.1,
            0,
            1,
          )
        : 0,
  };
}

async function renderPdfPages(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: PageEntry[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) continue;

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const previewImage = canvas.toDataURL("image/png");
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const content = await page.getTextContent();
    const lines = groupTextLines(content.items, viewport);
    const fragments = extractTextFragments(content.items, viewport);

    pages.push({ previewImage, imageData, lines, fragments });
  }

  return pages;
}

function parseOptionLabel(optionIndex: number) {
  return String.fromCharCode(65 + optionIndex);
}

function sampleBestBubbleScore(
  page: PageEntry,
  anchorX: number,
  anchorY: number,
  lineHeight: number,
) {
  const radius = clamp(lineHeight * 0.78, 5, 16);
  const candidates = [
    { x: anchorX, y: anchorY + lineHeight * 0.55 },
    { x: anchorX, y: anchorY + lineHeight * 1.0 },
    { x: anchorX, y: anchorY + lineHeight * 1.45 },
    { x: anchorX, y: anchorY + lineHeight * 1.9 },
    { x: anchorX + lineHeight * 0.35, y: anchorY + lineHeight * 1.1 },
    { x: anchorX - lineHeight * 0.35, y: anchorY + lineHeight * 1.1 },
    { x: anchorX + lineHeight * 0.2, y: anchorY + lineHeight * 1.55 },
    { x: anchorX - lineHeight * 0.2, y: anchorY + lineHeight * 1.55 },
  ];

  let best = { score: 0 };
  for (const candidate of candidates) {
    const current = sampleBubbleScore(page.imageData, candidate.x, candidate.y, radius);
    if (current.score > best.score) {
      best = current;
    }
  }
  return best;
}

function scoreOptionOnPage(
  page: PageEntry,
  optionText: string,
  optionIndex: number,
  block: QuestionBlock | null,
) {
  const normalizedOption = normalizeText(optionText);
  const optionTokens = tokenize(optionText);
  const optionLabel = parseOptionLabel(optionIndex);
  const candidates = (block?.lines ?? page.lines).filter((line) => {
    const normalizedLine = normalizeText(line.text);
    if (
      normalizedLine.includes(normalizedOption) ||
      normalizedOption.includes(normalizedLine) ||
      (isOptionStart(line.text) && normalizedLine.includes(normalizedOption.slice(0, 12)))
    ) {
      return true;
    }

    const tokens = tokenize(line.text);
    const overlap = tokens.filter((token) => optionTokens.includes(token)).length;
    return overlap >= 1 && tokens.length <= optionTokens.length + 3;
  });

  let bestScore = 0;
  let bestLine: TextLine | null = null;
  const blockLines = block?.lines ?? [];
  const blockMinY = blockLines.length > 0 ? Math.min(...blockLines.map((line) => line.y)) : -Infinity;
  const blockMaxY = blockLines.length > 0 ? Math.max(...blockLines.map((line) => line.y)) : Infinity;

  for (const line of candidates) {
    const lineHeight = clamp(line.height, 11, 34);
    const labelFragments = page.fragments.filter((fragment) => {
      const text = normalizeText(fragment.text);
      return (
        text === optionLabel.toLowerCase() ||
        text === `${optionLabel.toLowerCase()}.` ||
        text === `${optionLabel.toLowerCase()})`
      );
    });

    const relevantLabelFragments = labelFragments.filter(
      (fragment) => fragment.y >= blockMinY - lineHeight * 2 && fragment.y <= blockMaxY + lineHeight * 2,
    );

    const candidateAnchor =
      relevantLabelFragments
        .slice()
        .sort((a, b) => {
          const scoreA = Math.abs(a.y - line.y) * 2 + Math.abs(a.x - line.x) * 0.25;
          const scoreB = Math.abs(b.y - line.y) * 2 + Math.abs(b.x - line.x) * 0.25;
          return scoreA - scoreB;
        })[0] ??
      labelFragments
        .slice()
        .sort((a, b) => {
          const scoreA = Math.abs(a.y - line.y) * 2 + Math.abs(a.x - line.x) * 0.25;
          const scoreB = Math.abs(b.y - line.y) * 2 + Math.abs(b.x - line.x) * 0.25;
          return scoreA - scoreB;
        })[0] ??
      null;

    const anchorX = candidateAnchor ? candidateAnchor.x + candidateAnchor.width * 0.5 : line.x + line.width * 0.5;
    const anchorY = candidateAnchor ? candidateAnchor.y + candidateAnchor.height * 0.5 : line.y;
    const score = sampleBestBubbleScore(page, anchorX, anchorY, lineHeight);
    const lineScore = score.score;

    if (lineScore > bestScore) {
      bestScore = lineScore;
      bestLine = line;
    }
  }

  if (!bestLine && block) {
    const blockTokens = new Set(block.lines.flatMap((line) => tokenize(line.text)));
    if (optionTokens.some((token) => blockTokens.has(token))) {
      const fallbackLine = block.lines.find((line) => isOptionStart(line.text)) ?? block.lines[0] ?? null;
      if (fallbackLine) {
        const lineHeight = clamp(fallbackLine.height, 11, 34);
        const lineScore = sampleBestBubbleScore(
          page,
          fallbackLine.x + fallbackLine.width * 0.5,
          fallbackLine.y,
          lineHeight,
        ).score;
        bestScore = lineScore;
        bestLine = fallbackLine;
      }
    }
  }

  return { score: bestScore, line: bestLine };
}

function mergeQuestionBlocks(
  pages: PageEntry[],
  questions: OmrQuestionSpec[],
) {
  const blocks = pages.flatMap((page, pageIndex) => extractQuestionBlocks(page.lines, pageIndex));
  const sortedBlocks = blocks.slice().sort((a, b) => a.questionNumber - b.questionNumber);
  const pageGroups = pages.map((page, pageIndex) => extractQuestionBlocks(page.lines, pageIndex));

  return questions.map((_, index) => {
    const number = index + 1;
    const block =
      sortedBlocks.find((item) => item.questionNumber === number) ??
      pageGroups.flatMap((group) => group).find((item) => item.questionNumber === number) ??
      sortedBlocks[index] ??
      null;
    return block;
  });
}

export async function analyzePdfOmr(
  file: File,
  questions: OmrQuestionSpec[],
): Promise<PdfOmrScanResult> {
  const pages = await renderPdfPages(file);
  const previewImages = pages.map((page) => page.previewImage);
  const questionBlocks = mergeQuestionBlocks(pages, questions);
  const answers: Record<string, string> = {};
  const questionResults: OmrQuestionResult[] = [];
  let confidenceTotal = 0;

  questions.forEach((question, index) => {
    const block = questionBlocks[index];
    const scores = question.options.map((optionText, scoreIndex) => {
      if (!block) return 0;

      const page = pages[block.pageIndex] ?? pages[0];
      if (!page) return 0;

      const { score } = scoreOptionOnPage(page, optionText, scoreIndex, block);
      return score;
    });

    let bestIndex = -1;
    let bestScore = -Infinity;
    let secondScore = -Infinity;

    scores.forEach((score, scoreIndex) => {
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        bestIndex = scoreIndex;
      } else if (score > secondScore) {
        secondScore = score;
      }
    });

    const selected =
      bestIndex >= 0 && (bestScore >= 0.015 || bestScore - secondScore >= 0.004)
        ? bestIndex
        : null;
    const confidence = clamp(
      ((bestScore - 0.006) / 0.05) * 0.65 + ((bestScore - secondScore) / 0.015) * 0.35,
      0,
      1,
    );
    const selectedAnswer = selected !== null ? question.options[selected] ?? null : null;
    const ambiguous = selected === null || confidence < 0.5;

    if (selectedAnswer) {
      answers[question.id] = selectedAnswer;
    }

    questionResults.push({
      questionId: question.id,
      selectedIndex: selected,
      selectedAnswer,
      confidence,
      scores,
      ambiguous,
    });
    confidenceTotal += confidence;
  });

  return {
    previewImages,
    answers,
    questionResults,
    confidence: questions.length > 0 ? confidenceTotal / questions.length : 0,
  };
}
