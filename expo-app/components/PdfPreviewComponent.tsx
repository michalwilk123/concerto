import { useState, useEffect } from "react";
import { Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { File as ExpoFile, Paths } from "expo-file-system";
import { colors, spacing } from "@/constants/theme";

export default function PdfPreview({
  uri,
  authHeader,
}: {
  uri: string;
  authHeader: string;
}) {
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
