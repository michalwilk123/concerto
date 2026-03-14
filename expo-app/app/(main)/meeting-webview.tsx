import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useAuthStore } from "@/stores/auth-store";
import { BASE_URL, meetingsApi } from "@/lib/api";
import { colors, radius, spacing } from "@/constants/theme";
import type { MobileMeetingJoinResponse, StatusPollResponse } from "@/lib/types";

type MeetingPhase =
  | "joining"
  | "waiting_for_host"
  | "waiting_for_approval"
  | "ready"
  | "error";

export default function MeetingWebViewScreen() {
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const participantName = user?.name?.trim() ?? "";
  const [phase, setPhase] = useState<MeetingPhase>("joining");
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyJoinResult = useCallback(
    (result: MobileMeetingJoinResponse | StatusPollResponse) => {
      if (result.status === "joined" || result.status === "approved") {
        const nextToken = result.token ?? null;
        const nextGroupId = result.groupId ?? null;
        if (!nextToken || !nextGroupId) {
          setError("Meeting join succeeded but returned incomplete room data.");
          setPhase("error");
          return;
        }

        setRoomToken(nextToken);
        setRole(result.role === "teacher" ? "teacher" : "student");
        setGroupId(nextGroupId);
        setError(null);
        setPhase("ready");
        return;
      }

      if (result.status === "waiting_for_host" || result.status === "waiting_for_approval") {
        setPhase(result.status);
        setError(null);
        return;
      }

      if (result.status === "host_present") {
        setPhase("joining");
        setError(null);
        return;
      }

      if (result.status === "rejected") {
        setError("Your request to join this meeting was rejected.");
        setPhase("error");
        return;
      }

      setError("Meeting join failed with an unsupported response.");
      setPhase("error");
    },
    [],
  );

  const joinMeeting = useCallback(async () => {
    if (!meetingId) {
      setError("Meeting ID is missing.");
      setPhase("error");
      return;
    }

    if (!token || !participantName) {
      setError("You need to be signed in before joining the meeting.");
      setPhase("error");
      return;
    }

    setPhase("joining");
    setError(null);

    try {
      const result = await meetingsApi.join(meetingId, participantName);
      applyJoinResult(result);
    } catch (joinError) {
      const message =
        joinError instanceof Error ? joinError.message : "Failed to join the meeting.";
      setError(message);
      setPhase("error");
    }
  }, [applyJoinResult, meetingId, participantName, token]);

  useEffect(() => {
    void joinMeeting();
  }, [joinMeeting]);

  useEffect(() => {
    if (
      phase !== "waiting_for_host" &&
      phase !== "waiting_for_approval"
    ) {
      return;
    }

    if (!meetingId || !participantName) {
      return;
    }

    const interval = setInterval(() => {
      void meetingsApi
        .pollStatus(meetingId, participantName)
        .then((result) => {
          if (result.status === "host_present") {
            void joinMeeting();
            return;
          }
          applyJoinResult(result);
        })
        .catch(() => {
          // Keep polling until the room becomes available again.
        });
    }, 3000);

    return () => clearInterval(interval);
  }, [applyJoinResult, joinMeeting, meetingId, participantName, phase]);

  const meetingUrl = useMemo(() => {
    if (!meetingId || !participantName || !roomToken || !role || !groupId) {
      return null;
    }

    const hashParams = new URLSearchParams({
      mobileToken: roomToken,
      participantName,
      role,
      groupId,
      autoStartMedia: "1",
      mobileMode: "1",
    });

    return `${BASE_URL}/meet/${encodeURIComponent(meetingId)}#${hashParams.toString()}`;
  }, [groupId, meetingId, participantName, role, roomToken]);

  if (phase !== "ready" || !meetingUrl) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.accentPurple} size="large" />
        <Text style={styles.stateTitle}>
          {phase === "waiting_for_host"
            ? "Waiting for the host"
            : phase === "waiting_for_approval"
              ? "Waiting for approval"
              : phase === "error"
                ? "Could not open the meeting"
                : "Joining meeting"}
        </Text>
        <Text style={styles.stateMessage}>
          {phase === "waiting_for_host"
            ? "The meeting room will open as soon as a teacher joins."
            : phase === "waiting_for_approval"
              ? "Your request is pending approval."
              : error ?? "Preparing the meeting room and media access."}
        </Text>
        {phase === "error" ? (
          <Pressable onPress={() => void joinMeeting()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{
          uri: meetingUrl,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        onPermissionRequest={(request: any) => request.grant(request.resources)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bgPrimary,
  },
  stateTitle: {
    marginTop: spacing.lg,
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: colors.textPrimary,
    textAlign: "center",
  },
  stateMessage: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentPurple,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
