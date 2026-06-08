import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, View } from "react-native";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/constants/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const router = useRouter();
  const segments = useSegments();
  const { token, user, isInitialized, initialize } = useAuthStore();
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === "(auth)";
    const currentSegment = segments.at(-1);

    if (!token) {
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else if (!user?.isActive) {
      if (currentSegment !== "waiting-approval") {
        router.replace("/(auth)/waiting-approval");
      }
    } else {
      if (inAuthGroup) router.replace("/(main)/meetings");
    }
  }, [isInitialized, token, user?.isActive, segments, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsReady && isInitialized ? (
        <Slot />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.bgPrimary,
          }}
        >
          <ActivityIndicator color={colors.accentPurple} size="large" />
        </View>
      )}
    </SafeAreaProvider>
  );
}
