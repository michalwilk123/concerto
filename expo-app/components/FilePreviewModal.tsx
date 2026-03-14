import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { WebView } from "react-native-webview";
import { File as ExpoFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors, spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";
import { resolveApiUrl } from "@/lib/api";
import type { FileWithUrl } from "@/lib/types";


function VideoPreview({ uri, authHeader }: { uri: string; authHeader: string }) {
  const player = useVideoPlayer(
    { uri, headers: { Authorization: authHeader } },
    (p) => { p.loop = false; }
  );

  return <VideoView player={player} nativeControls style={styles.video} />;
}


function ImagePreview({ uri, authHeader }: { uri: string; authHeader: string }) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ExpoFile.downloadFileAsync(uri, Paths.cache, {
      headers: { Authorization: authHeader },
      idempotent: true,
    })
      .then((result) => setLocalUri(result.uri))
      .catch((e) => setError(e.message || "Failed to load image"));
  }, [uri, authHeader]);

  if (error) {
    return <Text style={{ color: colors.accentRed, padding: spacing.lg }}>{error}</Text>;
  }
  if (!localUri) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.accentPurple} size="large" />
      </View>
    );
  }
  return <Image source={{ uri: localUri }} style={styles.image} resizeMode="contain" />;
}

function TextPreview({ uri, authHeader }: { uri: string; authHeader: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(uri, { headers: { Authorization: authHeader } })
      .then((r) => r.text())
      .then((t) => {
        setText(t);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load");
        setLoading(false);
      });
  }, [uri, authHeader]);

  if (loading) {
    return (
      <ActivityIndicator
        color={colors.accentPurple}
        size="large"
        style={{ marginTop: 60 }}
      />
    );
  }
  if (error) {
    return (
      <Text style={{ color: colors.accentRed, padding: spacing.lg }}>
        {error}
      </Text>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {text}
      </Text>
    </ScrollView>
  );
}

function PdfPreview({ uri, authHeader }: { uri: string; authHeader: string }) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ExpoFile.downloadFileAsync(uri, Paths.cache, {
      headers: { Authorization: authHeader },
      idempotent: true,
    })
      .then((result) => {
        setLocalUri(result.uri);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load PDF");
        setLoading(false);
      });
  }, [uri, authHeader]);

  if (loading) {
    return (
      <ActivityIndicator
        color={colors.accentPurple}
        size="large"
        style={{ marginTop: 60 }}
      />
    );
  }
  if (error || !localUri) {
    return (
      <Text style={{ color: colors.accentRed, padding: spacing.lg }}>
        {error}
      </Text>
    );
  }

  return (
    <WebView
      source={{ uri: localUri }}
      originWhitelist={["*"]}
      allowFileAccess
      style={{ flex: 1 }}
    />
  );
}

function FallbackPreview({
  file,
  uri,
  authHeader,
}: {
  file: FileWithUrl;
  uri: string;
  authHeader: string;
}) {
  const handleShare = async () => {
    try {
      const result = await ExpoFile.downloadFileAsync(uri, Paths.cache, {
        headers: { Authorization: authHeader },
        idempotent: true,
      });
      await Sharing.shareAsync(result.uri, {
        mimeType: file.mimeType,
        dialogTitle: file.name,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not share file");
    }
  };

  return (
    <View style={fallbackStyles.container}>
      <Text style={fallbackStyles.msg}>Preview not available</Text>
      <Pressable onPress={handleShare} style={fallbackStyles.shareBtn}>
        <Text style={fallbackStyles.shareBtnText}>Share</Text>
      </Pressable>
    </View>
  );
}

function AudioUnavailablePreview() {
  return (
    <View style={fallbackStyles.container}>
      <Text style={fallbackStyles.msg}>Audio preview is unavailable in this Expo build.</Text>
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
  },
  msg: {
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
  },
  shareBtn: {
    backgroundColor: colors.accentPurple,
    borderRadius: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  shareBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});

interface FilePreviewModalProps {
  file: FileWithUrl | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const token = useAuthStore((s) => s.token);

  if (!file) return null;

  const uri = resolveApiUrl(file.url);
  const authHeader = `Bearer ${token ?? ""}`;

  function renderBody() {
    if (!file) return null;

    if (file.mimeType.startsWith("image/")) {
      return <ImagePreview uri={uri} authHeader={authHeader} />;
    }

    if (file.mimeType.startsWith("audio/")) {
      return <AudioUnavailablePreview />;
    }

    if (file.mimeType.startsWith("video/")) {
      return <VideoPreview uri={uri} authHeader={authHeader} />;
    }

    if (
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json" ||
      file.mimeType === "application/javascript"
    ) {
      return <TextPreview uri={uri} authHeader={authHeader} />;
    }

    if (file.mimeType === "application/pdf") {
      return <PdfPreview uri={uri} authHeader={authHeader} />;
    }

    return <FallbackPreview file={file} uri={uri} authHeader={authHeader} />;
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {file.name}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.body}>{renderBody()}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingTop: spacing.xl + spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: colors.textPrimary,
    marginRight: spacing.md,
  },
  closeBtn: {
    padding: spacing.sm,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  body: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: "100%",
  },
  video: {
    width: "100%",
    height: 300,
    alignSelf: "center",
    marginTop: spacing.xl,
  },
});
