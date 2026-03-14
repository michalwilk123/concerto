import { useState, useEffect, useCallback } from "react";
import {
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useGroupsStore } from "@/stores/groups-store";
import { useFilesStore } from "@/stores/files-store";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { colors, spacing, radius } from "@/constants/theme";
import type { FileWithUrl, FolderDoc } from "@/lib/types";

type ListItem =
  | { type: "folder"; data: FolderDoc }
  | { type: "file"; data: FileWithUrl };

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
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "\u{1F4CA}";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "\u{1F4CA}";
  if (mimeType.includes("document") || mimeType.includes("word")) return "\u{1F4DD}";
  return "\u{1F4CE}";
}

export default function FilesScreen() {
  const selectedGroupId = useGroupsStore((s) => s.selectedGroupId);
  const {
    files,
    folders,
    folderPath,
    isLoading,
    error,
    previewFile,
    fetchContents,
    navigateToFolder,
    navigateUp,
    navigateToBreadcrumb,
    setPreviewFile,
    reset,
  } = useFilesStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (folderPath.length > 1 && selectedGroupId) {
        navigateUp(selectedGroupId);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [folderPath.length, selectedGroupId, navigateUp]);

  useEffect(() => {
    if (selectedGroupId) {
      reset();
      fetchContents(selectedGroupId);
    }
  }, [selectedGroupId]);

  const handleRefresh = useCallback(async () => {
    if (!selectedGroupId) return;
    setIsRefreshing(true);
    const currentFolderId = useFilesStore.getState().currentFolderId;
    await fetchContents(selectedGroupId, currentFolderId);
    setIsRefreshing(false);
  }, [selectedGroupId, fetchContents]);

  const handleFolderPress = useCallback(
    (folder: FolderDoc) => {
      if (selectedGroupId) navigateToFolder(selectedGroupId, folder);
    },
    [selectedGroupId, navigateToFolder]
  );

  const handleFilePress = useCallback(
    (file: FileWithUrl) => {
      if (file.mimeType.startsWith("audio/")) {
        Alert.alert("Unavailable", "Audio preview is unavailable in this Expo build.");
        return;
      }

      setPreviewFile(file);
    },
    [setPreviewFile]
  );

  const listData: ListItem[] = [
    ...folders.map((f) => ({ type: "folder" as const, data: f })),
    ...files.map((f) => ({ type: "file" as const, data: f })),
  ];

  if (!selectedGroupId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No group selected</Text>
        <Text style={styles.emptySubtext}>
          Open the sidebar to select a group
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {folderPath.length > 1 && (
        <View style={styles.breadcrumbBar}>
          {folderPath.map((entry, index) => (
            <View key={entry.id ?? "root"} style={styles.breadcrumbItem}>
              {index > 0 && (
                <Text style={styles.breadcrumbSep}>/</Text>
              )}
              <Pressable
                onPress={() => {
                  if (selectedGroupId && index < folderPath.length - 1) {
                    navigateToBreadcrumb(selectedGroupId, index);
                  }
                }}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.breadcrumbText,
                    index === folderPath.length - 1 && styles.breadcrumbActive,
                  ]}
                  numberOfLines={1}
                >
                  {entry.name}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item) =>
          item.type === "folder" ? `f:${item.data.id}` : `d:${item.data.id}`
        }
        renderItem={({ item }) =>
          item.type === "folder" ? (
            <Pressable
              style={styles.row}
              onPress={() => handleFolderPress(item.data)}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{"\u{1F4C1}"}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.data.name}
                </Text>
              </View>
              <Text style={styles.chevron}>{"\u203A"}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.row}
              onPress={() => handleFilePress(item.data)}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>
                  {getFileIcon(item.data.mimeType)}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.data.name}
                </Text>
                <Text style={styles.rowMeta}>
                  {formatFileSize(item.data.size)}
                  {"  \u00B7  "}
                  {new Date(item.data.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          )
        }
        contentContainerStyle={
          listData.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentPurple}
          />
        }
        ListEmptyComponent={
          isLoading && !isRefreshing ? (
            <ActivityIndicator
              color={colors.accentPurple}
              size="large"
              style={{ marginTop: 60 }}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No files</Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh
              </Text>
            </View>
          )
        }
      />
      {selectedGroupId && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  list: {
    padding: spacing.lg,
  },
  emptyList: {
    flex: 1,
  },
  errorBar: {
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    padding: spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: colors.accentRed,
    textAlign: "center",
  },

  // Breadcrumbs
  breadcrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexWrap: "wrap",
  },
  breadcrumbItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  breadcrumbSep: {
    fontSize: 14,
    color: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },
  breadcrumbText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: colors.accentPurple,
  },
  breadcrumbActive: {
    color: colors.textPrimary,
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  rowBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowName: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: colors.textPrimary,
  },
  rowMeta: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
  },

  // Empty states
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
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
