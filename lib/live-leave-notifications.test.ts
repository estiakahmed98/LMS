import { expect, it } from "vitest";
import { departedStudents, joinedStudents } from "./live-leave-notifications";
import type { LiveRoomStatePayload } from "./live-room-types";

const student = { id: "student", name: "Nabila", role: "PARTICIPANT" };
const room = (participants: object[], overrides = {}) => ({
  session: { id: "session" }, currentUser: { id: "host" }, isHost: true,
  isSessionClosed: false, isRemoved: false, isWaiting: false, participants, ...overrides,
}) as LiveRoomStatePayload;

it("notifies for newly joined students, excluding hosts and co-hosts", () => {
  expect(joinedStudents(room([]), room([student, { id: "host", role: "HOST" }, { id: "cohost", role: "CO_HOST" }]))).toEqual([student]);
});
it("does not announce existing students on initial load, repeated polls or media changes", () => {
  expect(joinedStudents(null, room([student]))).toEqual([]);
  expect(joinedStudents(room([student]), room([student]))).toEqual([]);
  expect(joinedStudents(room([student]), room([{ ...student, micOn: false }]))).toEqual([]);
});
it("announces a student joining after leaving, but not waiting for admission", () => {
  expect(joinedStudents(room([]), room([], { waitingUsers: [{ id: student.id, name: student.name }] }))).toEqual([]);
  expect(joinedStudents(room([]), room([student]))).toEqual([student]);
});

it("returns departed students with their names, excluding hosts and co-hosts", () => {
  expect(departedStudents(room([student, { id: "host", role: "HOST" }, { id: "cohost", role: "CO_HOST" }]), room([]))).toEqual([student]);
});
it("does not notify on initial load or media changes", () => {
  expect(departedStudents(null, room([student]))).toEqual([]);
  expect(departedStudents(room([student]), room([{ ...student, micOn: false, cameraOn: false }]))).toEqual([]);
});
it("does not replay departures on the next poll and supports rejoin then leave", () => {
  expect(departedStudents(room([]), room([]))).toEqual([]);
  expect(departedStudents(room([]), room([student]))).toEqual([]);
  expect(departedStudents(room([student]), room([]))).toEqual([student]);
});
it.each([
  { isHost: false }, { isSessionClosed: true }, { isRemoved: true }, { isWaiting: true },
  { session: { id: "other-session" } }, { currentUser: { id: "other-host" } },
])("suppresses alerts outside the instructor's active session: %j", (overrides) => {
  expect(departedStudents(room([student]), room([], overrides))).toEqual([]);
  expect(joinedStudents(room([]), room([student], overrides))).toEqual([]);
});
