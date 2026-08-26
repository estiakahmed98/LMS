import { describe, expect, it } from "vitest";
import { decodeLiveKitSignal, encodeLiveKitSignal } from "./livekit-signaling";

describe("LiveKit invalidation signaling", () => {
  it("round-trips server invalidation messages", () => {
    const signal = { type: "INVALIDATE", resource: "messages" } as const;
    expect(decodeLiveKitSignal(encodeLiveKitSignal(signal))).toEqual(signal);
  });

  it("rejects an unknown invalidation resource", () => {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "INVALIDATE", resource: "private-data" }),
    );
    expect(decodeLiveKitSignal(payload)).toBeNull();
  });
});
