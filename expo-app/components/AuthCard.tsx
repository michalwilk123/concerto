import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";

interface AuthCardProps {
  title: string;
  children: React.ReactNode;
}

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Typography variant="pageTitle" style={styles.logoText}>
              Concert<Typography weight="bold" style={styles.logoAccent}>o</Typography>
            </Typography>
          </View>
          <Card padding="lg" style={styles.card}>
            <Typography variant="titleLg" style={styles.title}>
              {title}
            </Typography>
            {children}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: 32,
    lineHeight: 38,
  },
  logoAccent: {
    fontSize: 32,
    lineHeight: 38,
    color: colors.accentPurple,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    marginBottom: spacing.xl,
    textAlign: "center",
  },
});
