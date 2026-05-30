const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://concerto.micwilk.com";

export default {
  expo: {
    name: "Concerto Meetings",
    slug: "expo-app",
    owner: "michalwilk123",
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
      supportsTablet: false,
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription:
          "Allow Concerto Meetings to access your camera so you can be seen during meetings.",
        NSMicrophoneUsageDescription:
          "Allow Concerto Meetings to access your microphone so you can be heard during meetings.",
        NSPhotoLibraryUsageDescription:
          "Allow Concerto Meetings to access your photos so you can upload them to your groups and meetings.",
        ITSAppUsesNonExemptEncryption: false,
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
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      "expo-sharing",
      "expo-video",
    ],
    extra: {
      apiBaseUrl,
      eas: {
        projectId: "efec3908-e9a7-439b-93b0-c176ae1f52db",
      },
    },
  },
};
