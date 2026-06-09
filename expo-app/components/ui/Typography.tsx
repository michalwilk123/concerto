import { Text, TextProps, StyleProp, TextStyle } from "react-native";
import {
  typography,
  tones,
  fontFamily,
  TypographyVariant,
  Tone,
  FontWeight,
} from "@/constants/theme";

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  /** Optional weight override; maps to the matching DM Sans family. */
  weight?: FontWeight;
  style?: StyleProp<TextStyle>;
}

/**
 * Single text primitive mirroring the web design system's typography hierarchy
 * (components/ui/typography.tsx). Prefer this over ad-hoc Text + StyleSheet.
 */
export function Typography({
  variant = "body",
  tone = "primary",
  weight,
  style,
  children,
  ...rest
}: TypographyProps) {
  return (
    <Text
      style={[
        typography[variant],
        { color: tones[tone] },
        weight ? { fontFamily: fontFamily[weight] } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
