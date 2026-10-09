import { type TextProps } from "react-native";
import Animated, { FadeInUp, Easing } from "react-native-reanimated";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";
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
  const reduced = useMotionPreference();
  return (
    <Animated.Text
      {...props}
      style={[headingStyle(variant, sizeClass), { color: theme.bone }]}
      accessibilityRole="header"
      allowFontScaling
      maxFontSizeMultiplier={textLimits.headingScale}
      numberOfLines={textLimits.headingLines}
      entering={
        reduced
          ? undefined
          : FadeInUp.duration(motion.durationBase)
              .easing(Easing.bezier(...motion.easeOut))
              .withInitialValues({
                opacity: 0,
                transform: [{ translateY: motion.headingRise }],
              })
      }
    />
  );
}
