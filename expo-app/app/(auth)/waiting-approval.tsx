import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AuthCard } from "@/components/AuthCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuthStore } from "@/stores/auth-store";
import { colors, spacing } from "@/constants/theme";

export default function WaitingApprovalScreen() {
  const { logout, refreshSession, user } = useAuthStore();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshSession();
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthCard title="Awaiting Approval">
      <View style={styles.content}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.message}>
          Your account has been created successfully. An administrator needs to
          activate your account before you can access the app.
        </Text>
        <Text style={styles.sub}>
          This page checks automatically every 10 seconds.
        </Text>
        {user?.email && (
          <Text style={styles.email}>Signed in as {user.email}</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <PrimaryButton title="Sign Out" onPress={logout} variant="secondary" />
      </View>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.lg,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  sub: {
    color: colors.textTertiary,
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
  },
  email: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    marginTop: spacing.lg,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
});
