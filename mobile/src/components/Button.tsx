import { Pressable, StyleSheet, Text } from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress(): void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const unavailable = loading || disabled;
  const reduced = useMotionPreference();
  const opacity = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      onPressIn={() => {
        opacity.value = withTiming(controls.pressedOpacity, {
          duration: reduced ? motion.reducedDuration : motion.pressDuration,
        });
      }}
      onPressOut={() => {
        opacity.value = withTiming(1, {
          duration: reduced ? motion.reducedDuration : motion.pressDuration,
        });
      }}
      style={[
        styles.button,
        {
          backgroundColor: unavailable ? theme.olive : theme.moss,
        },
        animated,
      ]}
    >
      <Text
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
        style={[
          textStyle("label"),
          styles.label,
          { color: unavailable ? theme.boneMuted : theme.ink },
        ]}
      >
        {loading ? "Working…" : label}
      </Text>
    </AnimatedPressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: controls.buttonHeight,
    borderRadius: controls.radius,
    justifyContent: "center",
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  label: { ...textStyle("bodyStrong"), fontWeight: "700", textAlign: "center" },
});
