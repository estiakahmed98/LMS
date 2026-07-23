/**
 * Helpers for parsing, validating, and rendering YouTube video URLs
 * (including Unlisted videos, which behave like normal watch/embed URLs).
 */

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a YouTube video ID from any of the commonly shared URL formats:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 *  - https://www.youtube.com/live/VIDEO_ID
 *
 * Returns null when the URL is empty, malformed, or not a recognized
 * YouTube URL shape.
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url || !url.trim()) return null;

  try {
    const parsedUrl = new URL(url.trim());
    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    ) {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v");
      }

      const parts = parsedUrl.pathname.split("/").filter(Boolean);

      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        return parts[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/** Validates that a string looks like a real YouTube video ID (11 chars). */
export function isValidYouTubeVideoId(videoId: string | null | undefined): videoId is string {
  return !!videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId);
}

/**
 * Parses and validates a YouTube URL in one step. Returns the video ID only
 * if the URL is a recognized YouTube URL AND the extracted ID is well-formed.
 */
export function parseYouTubeUrl(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  return isValidYouTubeVideoId(videoId) ? videoId : null;
}

/**
 * Builds a privacy-enhanced (youtube-nocookie.com) embed URL for a video ID,
 * with playback restricted as far as the YouTube iframe API allows: no
 * related-video suggestions from other channels, minimal branding, and
 * keyboard shortcuts (which include copy-link-at-time) disabled.
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    disablekb: "1",
    fs: "1",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/** Builds a thumbnail image URL for a video ID. */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
