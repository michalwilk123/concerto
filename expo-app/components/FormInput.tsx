import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { colors, spacing, radius } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";

interface FormInputProps extends TextInputProps {
  label: string;
  showPasswordToggle?: boolean;
  error?: string;
}

export function FormInput({
  label,
  style,
  showPasswordToggle,
  secureTextEntry,
  error,
  ...props
}: FormInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Typography variant="label" tone="secondary" style={styles.label}>
        {label}
      </Typography>
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
            <Typography variant="bodySm" tone="secondary">
              {visible ? "Hide" : "Show"}
            </Typography>
          </Pressable>
        )}
      </View>
      {error ? (
        <Typography variant="caption" tone="danger" style={styles.error}>
          {error}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
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
  error: {
    marginTop: spacing.xs,
  },
});
