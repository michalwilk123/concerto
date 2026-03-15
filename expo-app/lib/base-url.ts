import Constants from "expo-constants";

function inferDevBaseUrl() {
  const expoConstants = Constants as typeof Constants & {
    expoGoConfig?: { debuggerHost?: string | null };
  };
  const hostUri =
    Constants.expoConfig?.hostUri ??
    expoConstants.expoGoConfig?.debuggerHost ??
    null;

  if (!hostUri) {
    return null;
  }

  const [host] = hostUri.split(":");
  return host ? `http://${host}:3000` : null;
}

const configuredBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  inferDevBaseUrl() ??
  "http://localhost:3000";

export const BASE_URL = configuredBaseUrl.replace(/\/$/, "");

export function resolveApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
