import {
  Insets,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { colors } from "@/constants/theme";

interface IconButtonProps {
  /** A universal-symbol glyph only (× close, › chevron). Never an action. */
  glyph: string;
  onPress: () => void;
  accessibilityLabel: string;
  hitSlop?: number | Insets;
  style?: StyleProp<ViewStyle>;
}

/**
 * Narrow exception to the text-button rule (DESIGN.md §4): reserved for
 * universal symbols like the modal close ×. Mandatory accessibilityLabel.
 */
export function IconButton({
  glyph,
  onPress,
  accessibilityLabel,
  hitSlop = 8,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  glyph: {
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
