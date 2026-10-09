import { Text as NativeText, type TextProps } from "react-native";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle, type TextVariant } from "../theme/typography";

type Props = Omit<
  TextProps,
  "style" | "numberOfLines" | "maxFontSizeMultiplier" | "allowFontScaling"
> & {
  variant?: TextVariant;
  tone?: "default" | "muted" | "accent" | "danger";
};

export function Text({ variant = "body", tone, ...props }: Props) {
  const theme = useTheme();
  const tones = {
    default: theme.bone,
    muted: theme.boneMuted,
    accent: theme.moss,
    danger: theme.danger,
  };
  const resolvedTone = tone ?? (variant === "label" ? "accent" : "default");
  return (
    <NativeText
      {...props}
      style={[textStyle(variant), { color: tones[resolvedTone] }]}
      allowFontScaling
      maxFontSizeMultiplier={textLimits.bodyScale}
      numberOfLines={
        variant === "caption" ? textLimits.captionLines : undefined
      }
    />
  );
}
