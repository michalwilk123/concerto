import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const router = useRouter();
  const segments = useSegments();
  const { token, user, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !isInitialized) return;
    SplashScreen.hideAsync();

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
  }, [fontsLoaded, isInitialized, token, user?.isActive, segments]);

  if (!fontsLoaded || !isInitialized) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Slot />
    </SafeAreaProvider>
  );
}
