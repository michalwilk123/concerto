const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.107:3000";

export default {
  expo: {
    name: "expo-app",
    slug: "expo-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "concerto",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#16161a",
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription:
          "Allow Concerto to access your camera for RealtimeKit meetings.",
        NSMicrophoneUsageDescription:
          "Allow Concerto to access your microphone for RealtimeKit meetings.",
      },
      bitcode: false,
      bundleIdentifier: "com.micwilk.concerto",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#16161a",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.INTERNET",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.WAKE_LOCK",
        "android.permission.BLUETOOTH",
      ],
      package: "com.micwilk.concerto",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-router", "./plugins/with-android-kotlin-opt-ins"],
    extra: {
      apiBaseUrl,
      eas: {
        projectId: "efec3908-e9a7-439b-93b0-c176ae1f52db",
      },
    },
  },
};
