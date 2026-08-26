import type { LiveRoomMessage } from "@/lib/live-room-types";

/**
 * Merges a newly-fetched page of messages into the existing list, deduping
 * by id and keeping chronological (sentAt) order. Used so a poll/pagination
 * cycle only needs to append what's new instead of replacing the whole
 * array (which would re-render the full chat history every cycle).
 */
export function mergeMessages(
  existing: LiveRoomMessage[],
  incoming: LiveRoomMessage[],
): LiveRoomMessage[] {
  if (incoming.length === 0) return existing;

  const byId = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}
