const STORAGE_KEY = "pstc_video_progress";

export interface VideoProgress {
  positionSeconds: number;
  durationSeconds: number;
  watchedPercent: number;
  completed: boolean;
  updatedAt: string;
}

type ProgressStore = Record<string, VideoProgress>;

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function keyFor(userId: string, videoId: string) {
  return `${userId}::${videoId}`;
}

export function getVideoProgress(
  userId: string,
  videoId: string,
): VideoProgress | undefined {
  if (!userId) return undefined;
  return readStore()[keyFor(userId, videoId)];
}

export function saveVideoProgress(
  userId: string,
  videoId: string,
  progress: Omit<VideoProgress, "updatedAt">,
) {
  if (!userId) return;
  const store = readStore();
  store[keyFor(userId, videoId)] = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}
