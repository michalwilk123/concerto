import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, spacing, radius } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";

type Tone = "neutral" | "purple" | "green" | "orange" | "red";

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small pill, mirroring the web design system (components/ui/badge.tsx):
 * uppercase overline text on a subtle tinted surface.
 */
export function Badge({ label, tone = "neutral", style }: BadgeProps) {
  return (
    <View style={[styles.badge, toneStyles[tone], style]}>
      <Typography variant="overline" tone="secondary">
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
});

const toneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: colors.bgTertiary,
  },
  purple: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  green: {
    backgroundColor: "rgba(61, 155, 79, 0.2)",
  },
  orange: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  red: {
    backgroundColor: "rgba(229, 57, 53, 0.2)",
  },
});
