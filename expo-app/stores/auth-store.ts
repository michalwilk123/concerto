import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "@/lib/base-url";

const TOKEN_KEY = "auth_token";

function describeNetworkError(error: unknown, url: string) {
  const message = error instanceof Error ? error.message : String(error);
  return `Network request failed for ${url}. BASE_URL=${BASE_URL}. Original error: ${message}`;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

async function syncAppData(user: User | null) {
  const [{ useGroupsStore }, { useMeetingsStore }] = await Promise.all([
    import("./groups-store"),
    import("./meetings-store"),
  ]);

  if (user) {
    void useGroupsStore.getState().fetchGroups();
    return;
  }

  useGroupsStore.getState().reset();
  useMeetingsStore.getState().clearMeetings();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ isInitialized: true });
        return;
      }
      set({ token });

      const url = `${BASE_URL}/api/auth/get-session`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ token: null, isInitialized: true });
        return;
      }

      const data = await res.json();
      if (data?.user) {
        set({ user: data.user, isInitialized: true });
        void syncAppData(data.user);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ token: null, isInitialized: true });
        void syncAppData(null);
      }
    } catch {
      console.error("[expo auth] initialize failed", {
        baseUrl: BASE_URL,
      });
      set({ isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = `${BASE_URL}/api/auth/sign-in/email`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: BASE_URL },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }

      const token = data.token;
      if (!token) {
        throw new Error("No token received");
      }

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ token, user: data.user, isLoading: false });
      void syncAppData(data.user);
    } catch (e: any) {
      const message =
        e instanceof TypeError
          ? describeNetworkError(e, `${BASE_URL}/api/auth/sign-in/email`)
          : e.message;
      console.error("[expo auth] login failed", { baseUrl: BASE_URL, error: e });
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = `${BASE_URL}/api/auth/sign-up/email`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: BASE_URL },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Registration failed");
      }

      const token = data.token;
      if (!token) {
        throw new Error("No token received");
      }

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ token, user: data.user, isLoading: false });
      void syncAppData(data.user);
    } catch (e: any) {
      const message =
        e instanceof TypeError
          ? describeNetworkError(e, `${BASE_URL}/api/auth/sign-up/email`)
          : e.message;
      console.error("[expo auth] register failed", { baseUrl: BASE_URL, error: e });
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null, error: null });
    void syncAppData(null);
  },

  deleteAccount: async () => {
    const { token } = get();
    if (!token) {
      throw new Error("Not signed in");
    }

    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${BASE_URL}/api/account/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete account");
      }

      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ token: null, user: null, isLoading: false, error: null });
      void syncAppData(null);
    } catch (e: any) {
      const message =
        e instanceof TypeError
          ? describeNetworkError(e, `${BASE_URL}/api/account/delete`)
          : e.message;
      console.error("[expo auth] delete account failed", { baseUrl: BASE_URL, error: e });
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  refreshSession: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/api/auth/get-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data?.user) {
        set({ user: data.user });
        void syncAppData(data.user);
      }
    } catch {
      // silent fail for polling
    }
  },
}));
