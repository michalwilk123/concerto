import { VideoView, useVideoPlayer } from "expo-video";
import { StyleSheet } from "react-native";
import { spacing } from "@/constants/theme";

export default function VideoPreview({
  uri,
  authHeader,
}: {
  uri: string;
  authHeader: string;
}) {
  const player = useVideoPlayer(
    { uri, headers: { Authorization: authHeader } },
    (p) => {
      p.loop = false;
    }
  );

  return <VideoView player={player} nativeControls style={styles.video} />;
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    height: 300,
    alignSelf: "center",
    marginTop: spacing.xl,
  },
});
