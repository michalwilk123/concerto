import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, spacing, radius } from "@/constants/theme";

interface FormInputProps extends TextInputProps {
  label: string;
  showPasswordToggle?: boolean;
}

export function FormInput({ label, style, showPasswordToggle, secureTextEntry, ...props }: FormInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={showPasswordToggle ? styles.inputWrapper : undefined}>
        <TextInput
          style={[styles.input, showPasswordToggle && styles.inputWithToggle, style]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accentPurple}
          secureTextEntry={showPasswordToggle ? !visible : secureTextEntry}
          {...props}
        />
        {showPasswordToggle && (
          <Pressable style={styles.toggle} onPress={() => setVisible((v) => !v)}>
            <Text style={styles.toggleText}>{visible ? "Hide" : "Show"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: colors.textPrimary,
  },
  inputWithToggle: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
  },
});
