import { useState, useEffect, useCallback, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { File as ExpoFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors, spacing, radius } from "@/constants/theme";
import { meetingsApi, resolveApiUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { ChatPanel } from "@/components/meeting/ChatPanel";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Typography } from "@/components/ui/Typography";
import type { FileWithUrl } from "@/lib/types";

type Tab = "details" | "chat" | "files";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType.startsWith("video/")) return "VID";
  if (mimeType.startsWith("audio/")) return "AUD";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "XLS";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "PPT";
  if (mimeType.includes("document") || mimeType.includes("word"))
    return "DOC";
  return "FILE";
}

export default function MeetingDetailScreen() {
  const { meetingId, meetingName } = useLocalSearchParams<{
    meetingId: string;
    meetingName: string;
  }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [files, setFiles] = useState<FileWithUrl[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const filesFetchedRef = useRef(false);

  const loadFiles = useCallback(async () => {
    if (!meetingId) return;
    setFilesLoading(true);
    try {
      const result = await meetingsApi.meetingFiles(meetingId);
      setFiles(result);
    } catch {
      // silently fail — user can retry
    }
    setFilesLoading(false);
  }, [meetingId]);

  // Preload the file list when the meeting opens (not when the Files tab is
  // first tapped) so switching to Files is instant.
  useEffect(() => {
    if (!filesFetchedRef.current) {
      filesFetchedRef.current = true;
      loadFiles();
    }
  }, [loadFiles]);

  const handleFilePress = useCallback(
    async (file: FileWithUrl) => {
      if (!token) return;
      if (file.mimeType.startsWith("audio/")) {
        Alert.alert("Unavailable", "Audio preview is unavailable in this Expo build.");
        return;
      }
      try {
        const downloaded = await ExpoFile.downloadFileAsync(
          resolveApiUrl(file.url),
          Paths.cache,
          { headers: { Authorization: `Bearer ${token}` }, idempotent: true }
        );
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: file.mimeType,
          dialogTitle: file.name,
        });
      } catch (e: any) {
        Alert.alert("Error", e.message || "Could not open file");
      }
    },
    [token]
  );

  const handleJoinMeeting = () => {
    router.push({
      pathname: "/(main)/meeting-webview",
      params: { meetingId, meetingName },
    });
  };

  const handleBack = () => {
    router.back();
  };

  const tabs = [
    { id: "details", label: "Details" },
    { id: "chat", label: "Chat" },
    { id: "files", label: "Files" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.backBar}>
        <Button
          title="Back"
          onPress={handleBack}
          variant="ghost"
          size="sm"
          iconStart={"‹"}
        />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarWrap}>
        <Tabs
          items={tabs}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as Tab)}
          grow
        />
      </View>

      {/* Tab content */}
      {activeTab === "details" && (
        <View style={styles.detailsContainer}>
          <Card padding="lg" style={styles.detailCard}>
            <Typography variant="titleLg">{meetingName}</Typography>
          </Card>

          <Button
            title="Join Meeting"
            onPress={handleJoinMeeting}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      )}

      {/* Mounted as soon as the meeting opens (hidden when inactive) so the chat
          WebSocket connects + history loads in the background. */}
      {meetingId && token && (
        <View style={[styles.tabPanel, activeTab !== "chat" && styles.hidden]}>
          <ChatPanel meetingId={meetingId} authToken={token} />
        </View>
      )}

      {activeTab === "files" && (
        <View style={styles.filesContainer}>
          {filesLoading ? (
            <ActivityIndicator
              color={colors.accentPurple}
              size="large"
              style={{ marginTop: 60 }}
            />
          ) : files.length === 0 ? (
            <View style={styles.empty}>
              <Typography variant="titleMd" tone="secondary">
                No files
              </Typography>
              <Typography variant="body" tone="tertiary" style={styles.emptySub}>
                Files shared in this meeting will appear here
              </Typography>
            </View>
          ) : (
            <FlatList
              data={files}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.fileList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.fileRow}
                  onPress={() => handleFilePress(item)}
                >
                  <View style={styles.fileIconContainer}>
                    <Typography variant="overline" style={styles.fileIcon}>
                      {getFileIcon(item.mimeType)}
                    </Typography>
                  </View>
                  <View style={styles.fileBody}>
                    <Typography variant="body" weight="semibold" numberOfLines={1}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" tone="tertiary" style={styles.fileMeta}>
                      {formatFileSize(item.size)}
                      {"  ·  "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Typography>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  tabPanel: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
  backBar: {
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
  },

  // Tab bar
  tabBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  // Details tab
  detailsContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  detailCard: {
    marginBottom: spacing.xl,
  },

  // Files tab
  filesContainer: {
    flex: 1,
  },
  fileList: {
    padding: spacing.lg,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fileIconContainer: {
    width: 42,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  fileIcon: {
    fontSize: 10,
    color: colors.accentPurple,
  },
  fileBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fileMeta: {
    marginTop: 2,
  },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptySub: {
    marginTop: spacing.xs,
  },
});
