import { Pressable, StyleSheet, Text } from "react-native";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TextAction({
  label,
  onPress,
  destructive = false,
  disabled = false,
}: {
  label: string;
  onPress(): void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const reduced = useMotionPreference();
  const opacity = useSharedValue(1);
  const feedback = useAnimatedStyle(() => ({ opacity: opacity.value }));
  useEffect(() => {
    opacity.value = 1;
  }, [disabled, reduced, opacity]);
  const setPressed = (pressed: boolean) => {
    opacity.value = withTiming(pressed ? controls.pressedOpacity : 1, {
      duration: reduced
        ? motion.reducedDuration
        : pressed
          ? motion.pressDuration
          : motion.releaseDuration,
      easing: Easing.bezier(...motion.easeOut),
    });
  };
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.action, feedback]}
    >
      <Text
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
        style={[
          textStyle("bodyStrong"),
          {
            fontWeight: "700",
            color: disabled
              ? theme.boneMuted
              : destructive
                ? theme.danger
                : theme.moss,
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
const styles = StyleSheet.create({
  action: {
    minHeight: controls.touchHeight,
    minWidth: controls.touchHeight,
    justifyContent: "center",
    paddingVertical: space.sm,
  },
});
