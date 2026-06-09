import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, spacing, radius, fontFamily } from "@/constants/theme";

export interface TabItem {
  id: string;
  label: string;
  badge?: number;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Items share width equally (full-width bar). Default true. */
  grow?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/**
 * Config-driven segmented control, mirroring the web button-group "segmented"
 * variant (components/ui/button-group.tsx): a joined box, single-select, active
 * item filled.
 */
export function Tabs({
  items,
  activeId,
  onSelect,
  grow = true,
  size = "md",
  style,
}: TabsProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole="tablist">
      {items.map((item, index) => {
        const active = item.id === activeId;
        const isLast = index === items.length - 1;
        return (
          <Pressable
            key={item.id}
            onPress={() => !item.disabled && onSelect(item.id)}
            disabled={item.disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: !!item.disabled }}
            style={[
              styles.item,
              size === "sm" ? styles.itemSm : styles.itemMd,
              grow && styles.grow,
              active && styles.itemActive,
              !isLast && styles.divider,
              item.disabled && styles.itemDisabled,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                size === "sm" ? styles.labelSm : styles.labelMd,
                active ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {item.label}
            </Text>
            {typeof item.badge === "number" && item.badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.badge > 9 ? "9+" : item.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "transparent",
  },
  itemMd: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  itemSm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 32,
  },
  grow: {
    flex: 1,
  },
  divider: {
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
  },
  itemActive: {
    backgroundColor: colors.bgElevated,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  labelMd: {
    fontSize: 14,
  },
  labelSm: {
    fontSize: 13,
  },
  labelActive: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
  },
  labelInactive: {
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    color: "#fff",
  },
});
