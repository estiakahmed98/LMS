import type { LiveRoomStatePayload } from "./live-room-types";

export function joinedStudents(
  previous: LiveRoomStatePayload | null,
  current: LiveRoomStatePayload,
) {
  if (!previous || previous.session.id !== current.session.id ||
      previous.currentUser.id !== current.currentUser.id ||
      !current.isHost || current.isSessionClosed || current.isRemoved || current.isWaiting) return [];
  const present = new Set(previous.participants.map((participant) => participant.id));
  return current.participants.filter((participant) =>
    participant.role === "PARTICIPANT" &&
    participant.id !== current.currentUser.id && !present.has(participant.id),
  );
}

export function departedStudents(
  previous: LiveRoomStatePayload | null,
  current: LiveRoomStatePayload,
) {
  if (!previous || previous.session.id !== current.session.id ||
      previous.currentUser.id !== current.currentUser.id ||
      !current.isHost || current.isSessionClosed || current.isRemoved || current.isWaiting) return [];
  const present = new Set(current.participants.map((participant) => participant.id));
  return previous.participants.filter((participant) =>
    participant.role === "PARTICIPANT" &&
    participant.id !== current.currentUser.id && !present.has(participant.id),
  );
}
