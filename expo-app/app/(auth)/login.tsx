import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
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
      {error && (
        <Typography variant="body" tone="danger" style={styles.error}>
          {error}
        </Typography>
      )}

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
        showPasswordToggle
        autoComplete="password"
      />

      <View style={styles.buttonContainer}>
        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          disabled={!email || !password}
          size="lg"
          fullWidth
        />
      </View>

      <View style={styles.footer}>
        <Typography variant="body" tone="secondary">
          Don't have an account?{" "}
        </Typography>
        <Link href="/(auth)/register" style={styles.link}>
          Sign Up
        </Link>
      </View>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  error: {
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  link: {
    color: colors.accentPurple,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
});
