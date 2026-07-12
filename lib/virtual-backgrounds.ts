"use client";

/**
 * Virtual background options for the live classroom camera, similar to
 * Zoom / Google Meet. Image backgrounds are generated on a canvas at runtime
 * (no static assets needed) and cached as data URLs.
 */
export type VideoBackground =
  | "none"
  | "blur"
  | "black"
  | "white"
  | "garden"
  | "beach"
  | "night"
  | "office"
  | "classroom";

export const VIDEO_BACKGROUNDS: VideoBackground[] = [
  "none",
  "blur",
  "black",
  "white",
  "office",
  "classroom",
  "garden",
  "beach",
  "night",
];

const WIDTH = 1280;
const HEIGHT = 720;

const cache = new Map<VideoBackground, string>();

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return [canvas, ctx];
}

function paintSolid(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function paintGarden(ctx: CanvasRenderingContext2D) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.55);
  sky.addColorStop(0, "#aee3f7");
  sky.addColorStop(1, "#e8f7e0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.55);

  // Grass
  const grass = ctx.createLinearGradient(0, HEIGHT * 0.5, 0, HEIGHT);
  grass.addColorStop(0, "#7cc46b");
  grass.addColorStop(1, "#3d8b37");
  ctx.fillStyle = grass;
  ctx.fillRect(0, HEIGHT * 0.5, WIDTH, HEIGHT * 0.5);

  // Sun
  ctx.fillStyle = "rgba(255, 224, 130, 0.9)";
  ctx.beginPath();
  ctx.arc(WIDTH * 0.85, HEIGHT * 0.15, 55, 0, Math.PI * 2);
  ctx.fill();

  // Flowers
  const petals = ["#f06292", "#ffb74d", "#e57373", "#ba68c8", "#fff176", "#ff8a65"];
  for (let i = 0; i < 40; i++) {
    const x = ((i * 137.5) % WIDTH) + (i % 3) * 7;
    const y = HEIGHT * 0.58 + ((i * 89.3) % (HEIGHT * 0.38));
    const size = 6 + ((i * 13) % 8);
    const color = petals[i % petals.length];

    // Stem
    ctx.strokeStyle = "#2e7d32";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 2.4);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Petals
    ctx.fillStyle = color;
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * size * 0.7, y + Math.sin(angle) * size * 0.7, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center
    ctx.fillStyle = "#fdd835";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintBeach(ctx: CanvasRenderingContext2D) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.45);
  sky.addColorStop(0, "#4fc3f7");
  sky.addColorStop(1, "#b3e5fc");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.45);

  // Sun
  ctx.fillStyle = "#fff59d";
  ctx.beginPath();
  ctx.arc(WIDTH * 0.78, HEIGHT * 0.14, 60, 0, Math.PI * 2);
  ctx.fill();

  // Sea
  const sea = ctx.createLinearGradient(0, HEIGHT * 0.45, 0, HEIGHT * 0.72);
  sea.addColorStop(0, "#0288d1");
  sea.addColorStop(1, "#26c6da");
  ctx.fillStyle = sea;
  ctx.fillRect(0, HEIGHT * 0.45, WIDTH, HEIGHT * 0.27);

  // Waves
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 3;
  for (let row = 0; row < 4; row++) {
    const y = HEIGHT * (0.5 + row * 0.06);
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 8) {
      const wy = y + Math.sin((x / 60) + row) * 4;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  // Sand
  const sand = ctx.createLinearGradient(0, HEIGHT * 0.72, 0, HEIGHT);
  sand.addColorStop(0, "#ffe0b2");
  sand.addColorStop(1, "#ffcc80");
  ctx.fillStyle = sand;
  ctx.fillRect(0, HEIGHT * 0.72, WIDTH, HEIGHT * 0.28);
}

function paintNight(ctx: CanvasRenderingContext2D) {
  // Night sky
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#0d1b3e");
  sky.addColorStop(1, "#1a2a5e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Stars (deterministic pseudo-random)
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 140; i++) {
    const x = (i * 197.3) % WIDTH;
    const y = (i * 113.7) % (HEIGHT * 0.85);
    const r = 0.6 + ((i * 7) % 10) / 8;
    ctx.globalAlpha = 0.4 + ((i * 13) % 10) / 16;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon
  ctx.fillStyle = "#fff9c4";
  ctx.beginPath();
  ctx.arc(WIDTH * 0.82, HEIGHT * 0.18, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0d1b3e";
  ctx.beginPath();
  ctx.arc(WIDTH * 0.85, HEIGHT * 0.16, 42, 0, Math.PI * 2);
  ctx.fill();
}

function paintOffice(ctx: CanvasRenderingContext2D) {
  const wall = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  wall.addColorStop(0, "#eceff1");
  wall.addColorStop(1, "#cfd8dc");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#78909c";
  ctx.fillRect(0, HEIGHT * 0.72, WIDTH, HEIGHT * 0.28);

  ctx.fillStyle = "#546e7a";
  ctx.fillRect(WIDTH * 0.08, HEIGHT * 0.18, WIDTH * 0.34, HEIGHT * 0.42);
  ctx.fillStyle = "#90caf9";
  ctx.fillRect(WIDTH * 0.1, HEIGHT * 0.2, WIDTH * 0.3, HEIGHT * 0.38);

  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(WIDTH * 0.52, HEIGHT * 0.58, WIDTH * 0.36, HEIGHT * 0.14);
}

function paintClassroom(ctx: CanvasRenderingContext2D) {
  const wall = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  wall.addColorStop(0, "#fff8e1");
  wall.addColorStop(1, "#ffe082");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#37474f";
  ctx.fillRect(WIDTH * 0.12, HEIGHT * 0.12, WIDTH * 0.76, HEIGHT * 0.34);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(WIDTH * 0.14, HEIGHT * 0.14, WIDTH * 0.72, HEIGHT * 0.3);

  ctx.fillStyle = "#795548";
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      ctx.fillRect(
        WIDTH * (0.1 + col * 0.14),
        HEIGHT * (0.52 + row * 0.12),
        WIDTH * 0.1,
        HEIGHT * 0.08,
      );
    }
  }
}

/**
 * Returns a data-URL image for image-type backgrounds, or null for
 * "none" / "blur" which are not image based.
 */
export function getBackgroundImageUrl(background: VideoBackground): string | null {
  if (background === "none" || background === "blur") return null;
  if (typeof document === "undefined") return null;

  const cached = cache.get(background);
  if (cached) return cached;

  const [canvas, ctx] = makeCanvas();
  switch (background) {
    case "black":
      paintSolid(ctx, "#000000");
      break;
    case "white":
      paintSolid(ctx, "#f5f5f5");
      break;
    case "garden":
      paintGarden(ctx);
      break;
    case "beach":
      paintBeach(ctx);
      break;
    case "night":
      paintNight(ctx);
      break;
    case "office":
      paintOffice(ctx);
      break;
    case "classroom":
      paintClassroom(ctx);
      break;
  }

  const url = canvas.toDataURL("image/png");
  cache.set(background, url);
  return url;
}
