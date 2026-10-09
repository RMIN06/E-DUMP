import { Text as NativeText, type TextProps } from "react-native";
import { useSizeClass } from "../theme/responsive";
import { useTheme } from "../theme/tokens";
import {
  headingStyle,
  textLimits,
  type HeadingVariant,
} from "../theme/typography";

type Props = Omit<
  TextProps,
  | "style"
  | "numberOfLines"
  | "maxFontSizeMultiplier"
  | "allowFontScaling"
  | "accessibilityRole"
> & {
  variant?: HeadingVariant;
};

export function Heading({ variant = "h1", ...props }: Props) {
  const theme = useTheme();
  const { sizeClass } = useSizeClass();
  return (
    <NativeText
      {...props}
      style={[headingStyle(variant, sizeClass), { color: theme.bone }]}
      accessibilityRole="header"
      allowFontScaling
      maxFontSizeMultiplier={textLimits.headingScale}
      numberOfLines={textLimits.headingLines}
    />
  );
}
