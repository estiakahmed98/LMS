import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RoomServiceClient, ServerError } from "livekit-server-sdk";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/live-room-server", () => ({ getLiveRoom: vi.fn(), requireLiveRoomHost: vi.fn(), LiveRoomError: class extends Error {} }));
import { broadcastLiveRoomInvalidation, deleteLiveKitRoom, removeLiveKitParticipant } from "./livekit-server";

beforeEach(() => {
  vi.stubEnv("LIVEKIT_URL", "wss://example.com");
  vi.stubEnv("LIVEKIT_API_KEY", "test-key");
  vi.stubEnv("LIVEKIT_API_SECRET", "test-secret");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

const operations = [
  { method: "sendData" as const, run: () => broadcastLiveRoomInvalidation("session", "messages") },
  { method: "removeParticipant" as const, run: () => removeLiveKitParticipant("session", "student") },
  { method: "deleteRoom" as const, run: () => deleteLiveKitRoom("session") },
];

it.each(operations)("treats an absent room or participant as a no-op for $method", async ({ method, run }) => {
  vi.spyOn(RoomServiceClient.prototype, method).mockRejectedValue(new ServerError("Not Found", "room or participant does not exist", 404, "not_found"));
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  await expect(run()).resolves.toBeUndefined();
  expect(warn).not.toHaveBeenCalled();
});

it.each(operations)("still reports authentication and connection failures for $method", async ({ method, run }) => {
  const rpc = vi.spyOn(RoomServiceClient.prototype, method);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const error of [new ServerError("Unauthorized", "invalid key", 401, "unauthenticated"), new Error("connection failed"), new ServerError("Not Found", "bad proxy URL", 404)]) {
    rpc.mockRejectedValueOnce(error);
    await expect(run()).resolves.toBeUndefined();
    expect(warn).toHaveBeenLastCalledWith(expect.any(String), error);
  }
});

it("sends invalidation to the session's media room", async () => {
  const send = vi.spyOn(RoomServiceClient.prototype, "sendData").mockResolvedValue();
  await broadcastLiveRoomInvalidation("session", "state");
  expect(send).toHaveBeenCalledWith("lms-session-session", expect.any(Uint8Array), expect.any(Number), { topic: "lms-invalidation" });
  expect(JSON.parse(new TextDecoder().decode(send.mock.calls[0][1]))).toEqual({ type: "INVALIDATE", resource: "state" });
});
