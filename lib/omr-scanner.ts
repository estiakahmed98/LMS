export type OmrQuestionSpec = {
  id: string;
  options: string[];
};

export type OmrQuestionResult = {
  questionId: string;
  selectedIndex: number | null;
  selectedAnswer: string | null;
  confidence: number;
  scores: number[];
  ambiguous: boolean;
};

export type OmrScanBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OmrScanResult = {
  answers: Record<string, string>;
  questionResults: OmrQuestionResult[];
  confidence: number;
  bounds: OmrScanBounds;
};

const MAX_ANALYSIS_WIDTH = 1800;
const EDGE_SCAN_RATIO = 0.22;
const EDGE_DARK_THRESHOLD = 190;
const ANGLE_SEARCH_DEGREES = [-6, -3, 0, 3, 6];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load scan image."));
    image.src = dataUrl;
  });
}

function drawImageToCanvas(image: HTMLImageElement) {
  const scale = Math.min(1, MAX_ANALYSIS_WIDTH / image.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable in this browser.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

function drawRotatedImageToCanvas(image: HTMLImageElement, angleDegrees: number) {
  const scale = Math.min(1, MAX_ANALYSIS_WIDTH / image.naturalWidth);
  const srcWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const srcHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const angle = (angleDegrees * Math.PI) / 180;

  if (angleDegrees === 0) {
    return drawImageToCanvas(image);
  }

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(Math.abs(srcWidth * cos) + Math.abs(srcHeight * sin)));
  canvas.height = Math.max(1, Math.ceil(Math.abs(srcWidth * sin) + Math.abs(srcHeight * cos)));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable in this browser.");
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(angle);
  context.drawImage(image, -srcWidth / 2, -srcHeight / 2, srcWidth, srcHeight);
  return { canvas, context };
}

function detectDarkRow(
  data: Uint8ClampedArray,
  width: number,
  row: number,
  sampleStep = 2,
) {
  let dark = 0;
  let total = 0;
  const rowOffset = row * width * 4;

  for (let x = 0; x < width; x += sampleStep) {
    const index = rowOffset + x * 4;
    const lum = luminance(data[index], data[index + 1], data[index + 2]);
    if (lum < EDGE_DARK_THRESHOLD) dark += 1;
    total += 1;
  }

  return total > 0 ? dark / total : 0;
}

function detectDarkColumn(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: number,
  sampleStep = 2,
) {
  let dark = 0;
  let total = 0;

  for (let y = 0; y < height; y += sampleStep) {
    const index = (y * width + column) * 4;
    const lum = luminance(data[index], data[index + 1], data[index + 2]);
    if (lum < EDGE_DARK_THRESHOLD) dark += 1;
    total += 1;
  }

  return total > 0 ? dark / total : 0;
}

function detectBounds(imageData: ImageData): OmrScanBounds {
  const { data, width, height } = imageData;
  const topLimit = Math.max(1, Math.floor(height * EDGE_SCAN_RATIO));
  const bottomLimit = Math.max(1, Math.floor(height * (1 - EDGE_SCAN_RATIO)));
  const leftLimit = Math.max(1, Math.floor(width * EDGE_SCAN_RATIO));
  const rightLimit = Math.max(1, Math.floor(width * (1 - EDGE_SCAN_RATIO)));

  let top = -1;
  let bottom = -1;
  let left = -1;
  let right = -1;

  for (let y = 0; y < topLimit; y += 1) {
    const score = detectDarkRow(data, width, y);
    if (score > 0.12) {
      top = y;
      break;
    }
  }

  for (let y = height - 1; y >= bottomLimit; y -= 1) {
    const score = detectDarkRow(data, width, y);
    if (score > 0.12) {
      bottom = y;
      break;
    }
  }

  for (let x = 0; x < leftLimit; x += 1) {
    const score = detectDarkColumn(data, width, height, x);
    if (score > 0.12) {
      left = x;
      break;
    }
  }

  for (let x = width - 1; x >= rightLimit; x -= 1) {
    const score = detectDarkColumn(data, width, height, x);
    if (score > 0.12) {
      right = x;
      break;
    }
  }

  if (top < 0 || bottom < 0 || left < 0 || right < 0 || bottom <= top || right <= left) {
    const marginX = Math.round(width * 0.06);
    const marginY = Math.round(height * 0.06);
    return {
      left: marginX,
      top: marginY,
      right: width - marginX,
      bottom: height - marginY,
    };
  }

  return {
    left: clamp(left - 4, 0, width - 1),
    top: clamp(top - 4, 0, height - 1),
    right: clamp(right + 4, 0, width - 1),
    bottom: clamp(bottom + 4, 0, height - 1),
  };
}

function sampleBubbleScore(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number,
) {
  const { data, width, height } = imageData;
  const innerRadius = Math.max(2, radius * 0.58);
  const ringInner = Math.max(innerRadius + 1, radius * 0.82);
  const ringOuter = Math.max(ringInner + 1, radius * 1.18);

  let innerSum = 0;
  let innerCount = 0;
  let ringSum = 0;
  let ringCount = 0;

  const minY = Math.max(0, Math.floor(centerY - ringOuter));
  const maxY = Math.min(height - 1, Math.ceil(centerY + ringOuter));
  const minX = Math.max(0, Math.floor(centerX - ringOuter));
  const maxX = Math.min(width - 1, Math.ceil(centerX + ringOuter));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > ringOuter) continue;

      const index = (y * width + x) * 4;
      const lum = luminance(data[index], data[index + 1], data[index + 2]);

      if (dist <= innerRadius) {
        innerSum += 255 - lum;
        innerCount += 1;
      } else if (dist <= ringOuter && dist >= ringInner) {
        ringSum += 255 - lum;
        ringCount += 1;
      }
    }
  }

  const innerDark = innerCount > 0 ? innerSum / innerCount : 0;
  const ringDark = ringCount > 0 ? ringSum / ringCount : 0;

  return {
    innerDark,
    ringDark,
    score: innerDark - ringDark * 0.25,
  };
}

function getLayout(bounds: OmrScanBounds, questionCount: number) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const headerHeight = height * 0.12;
  const bottomPadding = height * 0.06;
  const usableHeight = Math.max(1, height - headerHeight - bottomPadding);
  const rowHeight = usableHeight / Math.max(1, questionCount);
  const bubbleRadius = clamp(rowHeight * 0.22, 5, 15);
  const optionStartX = bounds.left + width * 0.36;
  const optionEndX = bounds.right - width * 0.07;

  return {
    width,
    height,
    headerHeight,
    rowHeight,
    bubbleRadius,
    optionStartX,
    optionEndX,
    questionNumberX: bounds.left + width * 0.07,
  };
}

function analyzeImageData(
  imageData: ImageData,
  questions: OmrQuestionSpec[],
): OmrScanResult {
  const bounds = detectBounds(imageData);
  const layout = getLayout(bounds, questions.length);
  const answers: Record<string, string> = {};
  const questionResults: OmrQuestionResult[] = [];

  questions.forEach((question, questionIndex) => {
    const optionCount = Math.max(2, question.options.length);
    const rowCenterY = bounds.top + layout.headerHeight + layout.rowHeight * (questionIndex + 0.5);
    const spacing =
      optionCount === 1
        ? 0
        : (layout.optionEndX - layout.optionStartX) / Math.max(1, optionCount - 1);

    const scores = Array.from({ length: optionCount }, (_, optionIndex) => {
      const centerX = layout.optionStartX + spacing * optionIndex;
      return sampleBubbleScore(imageData, centerX, rowCenterY, layout.bubbleRadius).score;
    });

    let bestIndex = -1;
    let bestScore = -Infinity;
    let secondScore = -Infinity;
    let totalScore = 0;

    scores.forEach((score, index) => {
      totalScore += score;
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        bestIndex = index;
      } else if (score > secondScore) {
        secondScore = score;
      }
    });

    const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
    const separation = bestScore - (Number.isFinite(secondScore) ? secondScore : 0);
    const clarity = bestScore - averageScore;
    const selected =
      bestIndex >= 0 && bestScore >= 18 && separation >= 5 && clarity >= 6
        ? bestIndex
        : null;

    const confidence = clamp(
      ((bestScore - 12) / 60) * 0.5 + (separation / 18) * 0.35 + (clarity / 30) * 0.15,
      0,
      1,
    );
    const ambiguous = selected === null || confidence < 0.45 || separation < 6;
    const selectedAnswer =
      selected !== null ? question.options[selected] ?? null : null;

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
  });

  const resolvedResults = questionResults.filter((result) => result.selectedAnswer);
  const confidence =
    resolvedResults.length > 0
      ? resolvedResults.reduce((sum, result) => sum + result.confidence, 0) /
        resolvedResults.length
      : 0;

  return {
    answers,
    questionResults,
    confidence: clamp(confidence, 0, 1),
    bounds,
  };
}

export async function analyzeOmrScan(
  dataUrl: string,
  questions: OmrQuestionSpec[],
): Promise<OmrScanResult> {
  const image = await loadImage(dataUrl);
  const attempts: OmrScanResult[] = [];

  for (const angle of ANGLE_SEARCH_DEGREES) {
    const { canvas, context } = drawRotatedImageToCanvas(image, angle);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    attempts.push(analyzeImageData(imageData, questions));
  }

  return attempts.reduce((best, current) => {
    const bestDetected = Object.keys(best.answers).length;
    const currentDetected = Object.keys(current.answers).length;

    if (currentDetected > bestDetected) return current;
    if (currentDetected < bestDetected) return best;
    if (current.confidence > best.confidence) return current;
    return best;
  }, attempts[0]);
}
