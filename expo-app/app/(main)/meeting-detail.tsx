import { useState, useEffect, useCallback, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
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
import type { FileWithUrl } from "@/lib/types";

type Tab = "details" | "chat" | "files";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "\u{1F5BC}";
  if (mimeType.startsWith("video/")) return "\u{1F3AC}";
  if (mimeType.startsWith("audio/")) return "\u{1F3B5}";
  if (mimeType === "application/pdf") return "\u{1F4C4}";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "\u{1F4CA}";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "\u{1F4CA}";
  if (mimeType.includes("document") || mimeType.includes("word"))
    return "\u{1F4DD}";
  return "\u{1F4CE}";
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

  useEffect(() => {
    if (activeTab === "files" && !filesFetchedRef.current) {
      filesFetchedRef.current = true;
      loadFiles();
    }
  }, [activeTab, loadFiles]);

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

  const tabs: { key: Tab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "chat", label: "Chat" },
    { key: "files", label: "Files" },
  ];

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === "details" && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <Text style={styles.meetingTitle}>{meetingName}</Text>
          </View>

          <Pressable style={styles.joinButton} onPress={handleJoinMeeting}>
            <Text style={styles.joinButtonText}>Join Meeting</Text>
          </Pressable>
        </View>
      )}

      {activeTab === "chat" && meetingId && token && (
        <ChatPanel meetingId={meetingId} authToken={token} />
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
              <Text style={styles.emptyText}>No files</Text>
              <Text style={styles.emptySubtext}>
                Files shared in this meeting will appear here
              </Text>
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
                    <Text style={styles.fileIcon}>
                      {getFileIcon(item.mimeType)}
                    </Text>
                  </View>
                  <View style={styles.fileBody}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {formatFileSize(item.size)}
                      {"  \u00B7  "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
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

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.accentPurple,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accentPurple,
    fontFamily: "DMSans_600SemiBold",
  },

  // Details tab
  detailsContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  detailCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  meetingTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  joinButton: {
    backgroundColor: colors.accentPurple,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
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
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  fileIcon: {
    fontSize: 18,
  },
  fileBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fileName: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: colors.textPrimary,
  },
  fileMeta: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: colors.textTertiary,
  },
});
