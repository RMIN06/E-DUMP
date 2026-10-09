import { StyleSheet, View } from "react-native";
import { controls, layout } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { useEffect, useState } from "react";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";

export function ProgressLine({
  value,
  label,
}: {
  value?: number;
  label: string;
}) {
  const theme = useTheme();
  const reduced = useMotionPreference();
  const [width, setWidth] = useState(0);
  const fraction = value === undefined ? undefined : Math.max(0, Math.min(1, value));
  const percent = fraction === undefined ? undefined : Math.round(fraction * 100);
  const progress = useSharedValue(fraction ?? 0);
  useEffect(() => {
    cancelAnimation(progress);
    if (fraction === undefined) {
      progress.value = 0;
      if (!reduced) progress.value = withRepeat(withTiming(1, { duration: motion.indeterminateDuration, easing: Easing.linear }), -1);
    } else progress.value = withTiming(fraction, { duration: reduced ? motion.reducedDuration : motion.durationFast, easing: Easing.linear });
    return () => cancelAnimation(progress);
  }, [fraction, reduced, progress]);
  const fill = useAnimatedStyle(() => ({
    transform: [{ translateX: fraction === undefined ? (progress.value - 1) * width : 0 }, { scaleX: fraction === undefined ? 1 : progress.value }],
    transformOrigin: "left",
  }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={percent === undefined ? { text: label } : { min: 0, max: 100, now: percent }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.olive }]}
    >
      <Animated.View
        style={[
          styles.fill,
          { width: layout.columnWidth, backgroundColor: theme.moss },
          fill,
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  track: { width: layout.columnWidth, height: controls.focusLine, overflow: "hidden" },
  fill: { height: controls.focusLine },
});
