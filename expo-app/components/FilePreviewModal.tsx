import { useState, useEffect, Suspense, lazy } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { File as ExpoFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors, spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";
import { resolveApiUrl } from "@/lib/api";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import type { FileWithUrl } from "@/lib/types";

const VideoPreviewLazy = lazy(() => import("./VideoPreviewComponent"));
const PdfPreviewLazy = lazy(() => import("./PdfPreviewComponent"));



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
    return (
      <Typography variant="body" tone="danger" style={{ padding: spacing.lg }}>
        {error}
      </Typography>
    );
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
      <Typography variant="body" tone="danger" style={{ padding: spacing.lg }}>
        {error}
      </Typography>
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
      <Typography variant="titleMd" tone="secondary">
        Preview not available
      </Typography>
      <Button title="Share" onPress={handleShare} variant="primary" />
    </View>
  );
}

function AudioUnavailablePreview() {
  return (
    <View style={fallbackStyles.container}>
      <Typography
        variant="body"
        tone="secondary"
        style={fallbackStyles.audioMsg}
      >
        Audio preview is unavailable in this Expo build.
      </Typography>
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
    padding: spacing.xl,
  },
  audioMsg: {
    textAlign: "center",
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
      return (
        <Suspense fallback={<ActivityIndicator color={colors.accentPurple} size="large" style={{ marginTop: 60 }} />}>
          <VideoPreviewLazy uri={uri} authHeader={authHeader} />
        </Suspense>
      );
    }

    if (
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json" ||
      file.mimeType === "application/javascript"
    ) {
      return <TextPreview uri={uri} authHeader={authHeader} />;
    }

    if (file.mimeType === "application/pdf") {
      return (
        <Suspense fallback={<ActivityIndicator color={colors.accentPurple} size="large" style={{ marginTop: 60 }} />}>
          <PdfPreviewLazy uri={uri} authHeader={authHeader} />
        </Suspense>
      );
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
          <Typography variant="titleMd" numberOfLines={1} style={styles.title}>
            {file.name}
          </Typography>
          <IconButton glyph="✕" onPress={onClose} accessibilityLabel="Close" />
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
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: "100%",
  },
});
