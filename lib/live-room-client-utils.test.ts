import { describe, expect, it } from "vitest";
import { mergeMessages } from "./live-room-client-utils";
import type { LiveRoomMessage } from "./live-room-types";

function message(id: string, sentAt: string, overrides: Partial<LiveRoomMessage> = {}): LiveRoomMessage {
  return {
    id,
    senderId: "u1",
    senderName: "User",
    message: "hi",
    isPrivate: false,
    toUserId: null,
    toName: null,
    sentAt,
    ...overrides,
  };
}

describe("mergeMessages", () => {
  it("appends new messages not already present", () => {
    const existing = [message("1", "2026-01-01T00:00:00.000Z")];
    const incoming = [message("2", "2026-01-01T00:01:00.000Z")];
    const result = mergeMessages(existing, incoming);
    expect(result.map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("dedupes by id when the same message appears in both lists", () => {
    const existing = [message("1", "2026-01-01T00:00:00.000Z", { message: "old text" })];
    const incoming = [message("1", "2026-01-01T00:00:00.000Z", { message: "old text" })];
    const result = mergeMessages(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
  });

  it("does not drop distinct messages that happen to share a timestamp", () => {
    const existing = [message("1", "2026-01-01T00:00:00.000Z")];
    const incoming = [message("2", "2026-01-01T00:00:00.000Z")];
    const result = mergeMessages(existing, incoming);
    expect(result.map((m) => m.id).sort()).toEqual(["1", "2"]);
  });

  it("preserves chronological order after merging out-of-order pages", () => {
    const existing = [
      message("1", "2026-01-01T00:00:00.000Z"),
      message("3", "2026-01-01T00:02:00.000Z"),
    ];
    const incoming = [message("2", "2026-01-01T00:01:00.000Z")];
    const result = mergeMessages(existing, incoming);
    expect(result.map((m) => m.id)).toEqual(["1", "2", "3"]);
  });

  it("returns the existing array unchanged when incoming is empty", () => {
    const existing = [message("1", "2026-01-01T00:00:00.000Z")];
    const result = mergeMessages(existing, []);
    expect(result).toBe(existing);
  });

  it("handles an empty existing list", () => {
    const incoming = [message("1", "2026-01-01T00:00:00.000Z")];
    const result = mergeMessages([], incoming);
    expect(result.map((m) => m.id)).toEqual(["1"]);
  });
});
