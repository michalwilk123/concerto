import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, spacing, radius, fontFamily } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading text glyph (no icon library — text/unicode only). */
  iconStart?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one Button family, mirroring the web design system (components/ui/button.tsx).
 * Always text — never icon-only (use IconButton for the × / chevron exceptions).
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  iconStart,
  fullWidth,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const filled = variant === "primary" || variant === "danger";
  const textColor = filled
    ? "#fff"
    : variant === "secondary"
      ? colors.textPrimary
      : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={filled ? "#fff" : colors.textSecondary}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {iconStart ? (
            <Text style={[textSizeStyles[size], { color: textColor }]}>
              {iconStart}
            </Text>
          ) : null}
          <Text style={[textSizeStyles[size], { color: textColor }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: "stretch",
    width: "100%",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  md: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  lg: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: 13, fontFamily: fontFamily.semibold },
  md: { fontSize: 15, fontFamily: fontFamily.semibold },
  lg: { fontSize: 16, fontFamily: fontFamily.semibold },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accentPurple,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.accentRed,
  },
});
