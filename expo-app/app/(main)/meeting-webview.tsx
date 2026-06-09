import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAuthStore } from "@/stores/auth-store";
import { BASE_URL, meetingsApi } from "@/lib/api";
import { colors, spacing } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import type { MobileMeetingJoinResponse, StatusPollResponse } from "@/lib/types";

type MeetingPhase =
  | "joining"
  | "waiting_for_host"
  | "waiting_for_approval"
  | "ready"
  | "error";

export default function MeetingWebViewScreen() {
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const participantName = user?.name?.trim() ?? "";
  const [phase, setPhase] = useState<MeetingPhase>("joining");
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugDetails, setDebugDetails] = useState<string | null>(null);

  const applyJoinResult = useCallback(
    (result: MobileMeetingJoinResponse | StatusPollResponse) => {
      console.log("[mobile meeting] join result", {
        meetingId,
        status: result.status,
        hasToken: Boolean(result.token),
        role: result.role,
        groupId: result.groupId,
      });

      if (result.status === "joined" || result.status === "approved") {
        const nextToken = result.token ?? null;
        const nextGroupId = result.groupId ?? null;
        if (!nextToken || !nextGroupId) {
          setError("Meeting join succeeded but returned incomplete room data.");
          setDebugDetails(JSON.stringify(result));
          setPhase("error");
          return;
        }

        setRoomToken(nextToken);
        setRole(result.role === "teacher" ? "teacher" : "student");
        setGroupId(nextGroupId);
        setError(null);
        setDebugDetails(null);
        setPhase("ready");
        return;
      }

      if (result.status === "waiting_for_host" || result.status === "waiting_for_approval") {
        setPhase(result.status);
        setError(null);
        setDebugDetails(null);
        return;
      }

      if (result.status === "host_present") {
        setPhase("joining");
        setError(null);
        setDebugDetails(null);
        return;
      }

      if (result.status === "rejected") {
        setError("Your request to join this meeting was rejected.");
        setPhase("error");
        return;
      }

      setError("Meeting join failed with an unsupported response.");
      setDebugDetails(JSON.stringify(result));
      setPhase("error");
    },
    [meetingId],
  );

  const joinMeeting = useCallback(async () => {
    console.log("[mobile meeting] join start", {
      meetingId,
      baseUrl: BASE_URL,
      hasToken: Boolean(token),
      participantName,
    });

    if (!meetingId) {
      setError("Meeting ID is missing.");
      setDebugDetails("Route params did not include meetingId.");
      setPhase("error");
      return;
    }

    if (!token || !participantName) {
      setError("You need to be signed in before joining the meeting.");
      setDebugDetails(
        `hasAuthToken=${Boolean(token)} participantName=${participantName || "<empty>"}`,
      );
      setPhase("error");
      return;
    }

    setPhase("joining");
    setError(null);
    setDebugDetails(null);

    try {
      const result = await meetingsApi.join(meetingId, participantName);
      applyJoinResult(result);
    } catch (joinError) {
      const message =
        joinError instanceof Error ? joinError.message : "Failed to join the meeting.";
      console.error("[mobile meeting] join failed", {
        meetingId,
        baseUrl: BASE_URL,
        participantName,
        error: joinError,
      });
      setError(message);
      setDebugDetails(`POST /api/mobile/meetings/${meetingId}/join`);
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
      <SafeAreaView style={styles.stateContainer}>
        <ActivityIndicator color={colors.accentPurple} size="large" />
        <Typography variant="titleLg" style={styles.stateTitle}>
          {phase === "waiting_for_host"
            ? "Waiting for the host"
            : phase === "waiting_for_approval"
              ? "Waiting for approval"
              : phase === "error"
                ? "Could not open the meeting"
                : "Joining meeting"}
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.stateMessage}>
          {phase === "waiting_for_host"
            ? "The meeting room will open as soon as a teacher joins."
            : phase === "waiting_for_approval"
              ? "Your request is pending approval."
              : error ?? "Preparing the meeting room and media access."}
        </Typography>
        {debugDetails ? (
          <Typography variant="caption" tone="tertiary" style={styles.debugDetails}>
            {debugDetails}
          </Typography>
        ) : null}
        {phase === "error" ? (
          <View style={styles.retryButton}>
            <Button
              title="Retry"
              onPress={() => void joinMeeting()}
              variant="primary"
            />
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.meetingHeader}>
        <Button
          title="Leave"
          onPress={() => router.back()}
          variant="danger"
          size="sm"
        />
      </View>
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
        onLoadStart={() => {
          console.log("[mobile meeting] webview load start", { meetingUrl });
        }}
        onLoadEnd={() => {
          console.log("[mobile meeting] webview load end", { meetingUrl });
        }}
        onError={(event) => {
          const { nativeEvent } = event;
          console.error("[mobile meeting] webview error", nativeEvent);
          setError(nativeEvent.description || "The meeting page failed to load.");
          setDebugDetails(`WebView error code=${nativeEvent.code} url=${nativeEvent.url}`);
          setPhase("error");
        }}
        onHttpError={(event) => {
          const { nativeEvent } = event;
          console.error("[mobile meeting] webview http error", nativeEvent);
          setError(`The meeting page returned HTTP ${nativeEvent.statusCode}.`);
          setDebugDetails(`WebView HTTP error url=${nativeEvent.url}`);
          setPhase("error");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  meetingHeader: {
    backgroundColor: colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
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
    textAlign: "center",
  },
  stateMessage: {
    marginTop: spacing.sm,
    textAlign: "center",
  },
  debugDetails: {
    marginTop: spacing.md,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.xl,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
