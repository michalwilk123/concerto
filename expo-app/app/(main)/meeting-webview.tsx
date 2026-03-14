import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useAuthStore } from "@/stores/auth-store";
import { BASE_URL } from "@/lib/api";
import { colors } from "@/constants/theme";

export default function MeetingWebViewScreen() {
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const token = useAuthStore((s) => s.token);
  const meetingUrl = `${BASE_URL}/meet/${meetingId}`;

  // Inject the auth token as a cookie before the page loads
  const injectedJS = `
    document.cookie = "better-auth.session_token=${token}; path=/";
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: meetingUrl }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
