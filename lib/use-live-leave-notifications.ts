"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { LiveRoomStatePayload } from "./live-room-types";
import { departedStudents, joinedStudents } from "./live-leave-notifications";

export function useLiveLeaveNotifications(room: LiveRoomStatePayload | null, ended: boolean) {
  return useLiveParticipantNotifications(room, ended, "leave");
}

export function useLiveJoinNotifications(room: LiveRoomStatePayload | null, ended: boolean) {
  return useLiveParticipantNotifications(room, ended, "join");
}

function useLiveParticipantNotifications(room: LiveRoomStatePayload | null, ended: boolean, kind: "join" | "leave") {
  const t = useTranslations(`liveClassroom.${kind}Notifications`);
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const previous = useRef<LiveRoomStatePayload | null>(null);
  const key = room?.isHost ? `live-${kind}-notifications:${room.currentUser.id}` : null;

  useEffect(() => {
    let saved = true;
    try {
      if (key) saved = window.localStorage.getItem(key) !== "false";
    } catch { /* Settings still work when browser storage is unavailable. */ }
    enabledRef.current = saved;
    setEnabled(saved);
  }, [key]);

  useEffect(() => {
    if (room && !ended && enabledRef.current) {
      const changes = kind === "join" ? joinedStudents : departedStudents;
      for (const participant of changes(previous.current, room)) {
        toast.info(t(kind === "join" ? "studentJoined" : "studentLeft", { name: participant.name }));
      }
    }
    // Track changes while muted too, so turning alerts on never replays them.
    previous.current = room;
  }, [room, ended, t, kind]);

  function onChange(next: boolean) {
    enabledRef.current = next;
    setEnabled(next);
    try {
      if (key) window.localStorage.setItem(key, String(next));
    } catch { /* Keep the in-memory preference. */ }
  }

  return { enabled, onChange };
}
