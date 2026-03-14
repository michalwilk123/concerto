"use client";

import { useEffect, useState } from "react";
import { roomApi, type WaitingParticipant } from "@/lib/api-client";
import type { Role } from "@/types/room";
import { isTeacher } from "@/types/room";

export function useWaitingRoom(
  meetingId: string,
  role: Role,
): {
  waiting: WaitingParticipant[];
  removeParticipant: (name: string) => void;
} {
  const [waiting, setWaiting] = useState<WaitingParticipant[]>([]);

  useEffect(() => {
    if (!isTeacher(role) || !meetingId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await roomApi.listWaiting(meetingId);
        if (!cancelled) setWaiting(result.waiting);
      } catch {
        // ignore, keep polling
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role, meetingId]);

  const removeParticipant = (name: string) =>
    setWaiting((prev) => prev.filter((p) => p.participantName !== name));

  return { waiting, removeParticipant };
}
