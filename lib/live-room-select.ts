import { prisma } from "@/lib/prisma";
import { filterVisibleMessages } from "@/lib/portal-access";
import type { LiveRoomMessage, LiveRoomMessagePage } from "@/lib/live-room-types";

/**
 * Narrower Prisma selects for the split room-data endpoints (Section 5 of
 * the hardening plan). These intentionally do NOT include the full chat
 * history or the full course enrollment list — `roomInclude` in
 * live-room-server.ts stays as the "full initial snapshot" shape used once
 * on mount; steady-state polling and chat pagination go through these
 * instead so a poll cycle doesn't re-fetch the whole room every time.
 */

const MAX_MESSAGE_PAGE_SIZE = 100;
const DEFAULT_MESSAGE_PAGE_SIZE = 50;

/**
 * Cursor-paginated chat page, newest first. `cursor` is a message id from a
 * previous page's `nextCursor`. Applies the same private-message visibility
 * rule as the full-room payload (`filterVisibleMessages`), but on a bounded
 * query instead of the entire session history.
 */
export async function fetchRoomMessages(
  sessionId: string,
  viewerId: string,
  isHost: boolean,
  options?: { cursor?: string | null; limit?: number },
): Promise<LiveRoomMessagePage> {
  const limit = Math.min(
    Math.max(1, options?.limit ?? DEFAULT_MESSAGE_PAGE_SIZE),
    MAX_MESSAGE_PAGE_SIZE,
  );

  const rows = await prisma.liveChatMessage.findMany({
    where: isHost
      ? { sessionId }
      : {
          sessionId,
          OR: [
            { isPrivate: false },
            { userId: viewerId },
            { toUserId: viewerId },
          ],
        },
    include: {
      user: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(options?.cursor
      ? { cursor: { id: options.cursor }, skip: 1 }
      : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const mapped: LiveRoomMessage[] = page.map((message) => ({
    id: message.id,
    senderId: message.userId,
    senderName: message.user.name,
    message: message.message,
    isPrivate: message.isPrivate,
    toUserId: message.toUserId,
    toName: message.toUser?.name ?? null,
    sentAt: message.sentAt.toISOString(),
  }));

  return {
    messages: filterVisibleMessages(mapped, viewerId, isHost).reverse(),
    hasMore,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}
