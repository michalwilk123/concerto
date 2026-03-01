"use client";

import {
  RealtimeKitProvider,
  useRealtimeKitClient,
  useRealtimeKitMeeting,
  useRealtimeKitSelector,
} from "@cloudflare/realtimekit-react";
import {
  RtkCameraToggle,
  RtkDialog,
  RtkGrid,
  RtkMicToggle,
  RtkParticipantsAudio,
  RtkRecordingIndicator,
  RtkRecordingToggle,
  RtkScreenShareToggle,
  RtkSettings,
} from "@cloudflare/realtimekit-react-ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { meetingsApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { useRoomStore } from "@/stores/room-store";
import type { Role, RoomParticipant } from "@/types/room";
import { isTeacher, presetToRole } from "@/types/room";
import { AppHeader } from "./AppHeader";
import Sidebar from "./Sidebar";
import { useToast } from "./Toast";

interface VideoRoomProps {
  token: string;
  meetingId: string;
  participantName: string;
  role: Role;
  groupId: string;
  onLeave: () => void;
  onEndMeeting: () => Promise<void> | void;
  onRoomStateChange: (roomState: string) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown meeting initialization error";
}

function isMissingAudioOutputError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("err1608") ||
    message.includes("localmediahandler") ||
    message.includes("no audio output devices") ||
    message.includes("no speaker")
  );
}

function RoomContent({
  meetingId,
  participantName,
  role,
  onLeave,
  onEndMeeting,
  onRoomStateChange,
  hasAudioOutput,
}: Omit<VideoRoomProps, "token"> & { hasAudioOutput: boolean }) {
  const { meeting } = useRealtimeKitMeeting();
  const roomState = useRealtimeKitSelector((m) => m.self.roomState);
  const selfPresetName = useRealtimeKitSelector((m) => m.self.presetName);
  const joinedParticipants = useRealtimeKitSelector((m) => m.participants.joined.toArray());
  const canRecord = useRealtimeKitSelector((m) => m.self.permissions.canRecord);
  const recordingState = useRealtimeKitSelector((m) => m.recording.recordingState);

  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, initialize, setRole } =
    useRoomStore();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [roomDescription, setRoomDescription] = useState("");
  const [lastSavedRoomDescription, setLastSavedRoomDescription] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const toast = useToast();
  const hasNotifiedRef = useRef(false);
  const lastRecordingStateRef = useRef<string | null>(null);

  const currentRole: Role = selfPresetName ? presetToRole(selfPresetName) : role;
  const isTeacherRole = isTeacher(currentRole);
  const isAdmin = session?.user.role === "admin";

  const copyRoomLink = () => {
    const url = `${window.location.origin}/meet/${meetingId}`;
    navigator.clipboard.writeText(url);
    toast.success(t("video.roomLinkCopied"));
  };

  useEffect(() => {
    initialize(meetingId, participantName, role);
  }, [meetingId, participantName, role, initialize]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meetingData = await meetingsApi.get(meetingId);
        if (cancelled) return;
        setRoomDescription(meetingData.name);
        setLastSavedRoomDescription(meetingData.name);
      } catch {
        if (cancelled) return;
        setRoomDescription(meetingId);
        setLastSavedRoomDescription(meetingId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  useEffect(() => {
    setRole(currentRole);
  }, [currentRole, setRole]);

  const persistMeetingName = async () => {
    if (!isAdmin) return;
    const nextName = roomDescription.trim();
    if (!nextName) {
      setRoomDescription(lastSavedRoomDescription);
      return;
    }
    if (nextName === lastSavedRoomDescription) return;

    try {
      const updated = await meetingsApi.patch(meetingId, { name: nextName });
      setRoomDescription(updated.name);
      setLastSavedRoomDescription(updated.name);
    } catch {
      setRoomDescription(lastSavedRoomDescription);
      toast.error(t("meetings.updateFailed"));
    }
  };

  // Watch for kicked/ended/disconnected states
  useEffect(() => {
    console.log("[RTK][RoomContent] roomState changed:", roomState);
    if (roomState && roomState !== "init" && roomState !== "joined" && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      console.log("[RTK][RoomContent] notifying parent about roomState:", roomState);
      onRoomStateChange(roomState);
    }
  }, [roomState, onRoomStateChange]);

  // Build participants list for sidebar
  const sidebarParticipants: RoomParticipant[] = [
    { id: meeting.self.id, name: participantName, presetName: selfPresetName },
    ...joinedParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      presetName: p.presetName,
    })),
  ];

  useEffect(() => {
    if (!recordingState) return;
    if (lastRecordingStateRef.current === null) {
      lastRecordingStateRef.current = recordingState;
      return;
    }
    if (lastRecordingStateRef.current === recordingState) return;
    lastRecordingStateRef.current = recordingState;

    if (recordingState === "RECORDING") {
      toast.success(t("video.recordingStarted"));
    } else if (recordingState === "PAUSED") {
      toast.warning(t("video.recordingPaused"));
    } else if (recordingState === "IDLE") {
      toast.info(t("video.recordingStopped"));
    }
  }, [recordingState, t, toast]);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
      }}
    >
      <AppHeader
        mode="room"
        meetingId={meetingId}
        roomDescription={roomDescription}
        onRoomDescriptionChange={setRoomDescription}
        participantName={participantName}
        participantRole={currentRole}
        canEditDescription={isAdmin}
        onRoomDescriptionBlur={persistMeetingName}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        onCopyLink={copyRoomLink}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            <RtkGrid meeting={meeting} style={{ height: "100%", width: "100%" }} />
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                zIndex: 10,
              }}
            >
              <RtkRecordingIndicator meeting={meeting} />
              {canRecord ? (
                <RtkRecordingToggle
                  meeting={meeting}
                  onRtkApiError={(event) => {
                    const detail = event?.detail;
                    const message = detail?.message || t("video.recordingStateFailed");
                    toast.error(message);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "12px 0",
            background: "var(--bg-secondary)",
          }}
        >
          <RtkMicToggle meeting={meeting} size="md" />
          <RtkCameraToggle meeting={meeting} size="md" />
          <RtkScreenShareToggle meeting={meeting} size="md" />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {t("video.settings")}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (isTeacherRole) {
                await onEndMeeting();
              } else {
                meeting.leaveRoom();
                onLeave();
              }
            }}
            style={{
              background: "#e53935",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {t("video.leave")}
          </button>
        </div>
      </div>

      <Sidebar
        participants={sidebarParticipants}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
      />
      <RtkDialog open={settingsOpen} onRtkDialogClose={() => setSettingsOpen(false)}>
        <RtkSettings meeting={meeting} />
      </RtkDialog>
      {hasAudioOutput ? <RtkParticipantsAudio meeting={meeting} /> : null}
    </div>
  );
}

export default function VideoRoom(props: VideoRoomProps) {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [hasAudioOutput, setHasAudioOutput] = useState(true);
  const { t } = useTranslation();
  const toast = useToast();

  useEffect(() => {
    if (!meeting) {
      let cancelled = false;
      const run = async () => {
        try {
          console.log("[RTK][VideoRoom] initMeeting start", {
            meetingId: props.meetingId,
            tokenLength: props.token?.length ?? 0,
            defaults: { audio: false, video: false },
          });
          await initMeeting({
            authToken: props.token,
            defaults: {
              audio: false,
              video: false,
            },
          });
          console.log("[RTK][VideoRoom] initMeeting success (audio=false, video=false)");
        } catch (error) {
          if (cancelled) return;
          if (isMissingAudioOutputError(error)) {
            setHasAudioOutput(false);
            console.log("[RTK][VideoRoom] no audio output device, retrying without audio output");
            await initMeeting({
              authToken: props.token,
              defaults: {
                audio: false,
                video: false,
              },
            }).catch((retryError) => {
              console.error("RealtimeKit retry init failed:", retryError);
              toast.error(getErrorMessage(retryError));
            });
            console.log("[RTK][VideoRoom] initMeeting retry completed");
            return;
          }

          console.error("RealtimeKit init failed:", error);
          toast.error(getErrorMessage(error));
        }
      };
      run();
      return () => {
        cancelled = true;
      };
    }
  }, [meeting, initMeeting, props.token, t, toast.error, toast.warning]);

  useEffect(() => {
    if (!meeting) return;

    console.log("[RTK][VideoRoom] meeting instance ready", {
      selfId: meeting.self.id,
      roomJoined: meeting.self.roomJoined,
      roomState: meeting.self.roomState,
    });

    const onRoomJoined = () => {
      console.log("[RTK][VideoRoom] event: roomJoined", {
        roomState: meeting.self.roomState,
        roomJoined: meeting.self.roomJoined,
      });
    };

    const onWaitlisted = () => {
      console.log("[RTK][VideoRoom] event: waitlisted", {
        roomState: meeting.self.roomState,
      });
    };

    const onRoomLeft = (payload: unknown) => {
      console.log("[RTK][VideoRoom] event: roomLeft", payload);
    };

    const onMediaPermissionUpdate = (payload: unknown) => {
      console.log("[RTK][VideoRoom] event: mediaPermissionUpdate", payload);
    };

    const onSocketConnectionUpdate = (payload: unknown) => {
      console.log("[RTK][VideoRoom] event: socketConnectionUpdate", payload);
    };

    meeting.self.addListener("roomJoined", onRoomJoined);
    meeting.self.addListener("waitlisted", onWaitlisted);
    meeting.self.addListener("roomLeft", onRoomLeft);
    meeting.self.addListener("mediaPermissionUpdate", onMediaPermissionUpdate);
    meeting.meta.addListener("socketConnectionUpdate", onSocketConnectionUpdate);

    if (!meeting.self.roomJoined) {
      console.log("[RTK][VideoRoom] calling meeting.joinRoom()");
      meeting.joinRoom();
    } else {
      console.log("[RTK][VideoRoom] joinRoom skipped because already joined");
    }

    return () => {
      meeting.self.removeListener("roomJoined", onRoomJoined);
      meeting.self.removeListener("waitlisted", onWaitlisted);
      meeting.self.removeListener("roomLeft", onRoomLeft);
      meeting.self.removeListener("mediaPermissionUpdate", onMediaPermissionUpdate);
      meeting.meta.removeListener("socketConnectionUpdate", onSocketConnectionUpdate);
    };
  }, [meeting]);

  return (
    <RealtimeKitProvider
      value={meeting}
      fallback={
        <div
          style={{
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
          }}
        >
          {t("video.connecting")}
        </div>
      }
    >
      <RoomContent {...props} hasAudioOutput={hasAudioOutput} />
    </RealtimeKitProvider>
  );
}
