import { ReactNode } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { colors, spacing, radius } from "@/constants/theme";

interface CardProps {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
  interactive?: boolean;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Surface container mirroring the web design system (components/ui/card.tsx).
 * Default surface is bgSecondary (the mobile app's established card surface),
 * not web's bg-tertiary, so existing screens don't visibly shift.
 */
export function Card({
  children,
  padding = "md",
  interactive,
  selected,
  onPress,
  style,
}: CardProps) {
  const base = [
    styles.card,
    paddingStyles[padding],
    selected && styles.selected,
    style,
  ];

  if (interactive || onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  selected: {
    borderColor: colors.accentPurple,
  },
  pressed: {
    opacity: 0.85,
  },
});

const paddingStyles = StyleSheet.create({
  sm: { padding: spacing.sm },
  md: { padding: spacing.md },
  lg: { padding: spacing.lg },
});
