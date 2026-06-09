import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { AuthCard } from "@/components/AuthCard";
import { FormInput } from "@/components/FormInput";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { useAuthStore } from "@/stores/auth-store";
import { colors, spacing } from "@/constants/theme";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    clearError();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    try {
      await register(name.trim(), email.trim(), password);
    } catch {
      // error is set in store
    }
  };

  const displayError = localError || error;

  return (
    <AuthCard title="Create Account">
      {displayError && (
        <Typography variant="body" tone="danger" style={styles.error}>
          {displayError}
        </Typography>
      )}

      <FormInput
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoComplete="name"
      />

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
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
      />

      <FormInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repeat your password"
        secureTextEntry
        autoComplete="new-password"
      />

      <View style={styles.buttonContainer}>
        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={isLoading}
          disabled={!name || !email || !password || !confirmPassword}
          size="lg"
          fullWidth
        />
      </View>

      <View style={styles.footer}>
        <Typography variant="body" tone="secondary">
          Already have an account?{" "}
        </Typography>
        <Link href="/(auth)/login" style={styles.link}>
          Sign In
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
