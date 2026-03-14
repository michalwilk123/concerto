import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuthStore } from "@/stores/auth-store";
import { colors, spacing } from "@/constants/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    try {
      await login(email.trim(), password);
    } catch {
      // error is set in store
    }
  };

  return (
    <AuthCard title="Sign In">
      {error && <Text style={styles.error}>{error}</Text>}

      <FormInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <FormInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoComplete="password"
      />

      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          disabled={!email || !password}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/(auth)/register" style={styles.link}>
          Sign Up
        </Link>
      </View>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.accentRed,
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
  },
  link: {
    color: colors.accentPurple,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
});
