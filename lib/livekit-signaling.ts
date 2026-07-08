/** Ephemeral LiveKit data-channel protocol for classroom controls. */

export type LiveKitSignal =
  | { type: "MUTE"; targetId: string }
  | { type: "MUTE_ALL" }
  | { type: "HAND"; raised: boolean }
  | { type: "LOWER_HAND"; targetId: string };

export function encodeLiveKitSignal(signal: LiveKitSignal): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(signal));
}

export function decodeLiveKitSignal(payload: Uint8Array): LiveKitSignal | null {
  try {
    const raw = JSON.parse(new TextDecoder().decode(payload)) as Partial<LiveKitSignal>;
    if (!raw || typeof raw !== "object" || typeof raw.type !== "string") return null;

    switch (raw.type) {
      case "MUTE":
        return typeof raw.targetId === "string" ? { type: "MUTE", targetId: raw.targetId } : null;
      case "MUTE_ALL":
        return { type: "MUTE_ALL" };
      case "HAND":
        return typeof raw.raised === "boolean" ? { type: "HAND", raised: raw.raised } : null;
      case "LOWER_HAND":
        return typeof raw.targetId === "string"
          ? { type: "LOWER_HAND", targetId: raw.targetId }
          : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export type LiveHostCommand =
  | { kind: "MUTE"; targetId: string; seq: number }
  | { kind: "MUTE_ALL"; seq: number }
  | { kind: "LOWER_HAND"; targetId: string; seq: number };
