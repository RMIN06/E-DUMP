import { StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";

export function TabLabel({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  const theme = useTheme();
  const reduced = useMotionPreference();
  const selected = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    selected.value = reduced
      ? Number(active)
      : withSpring(Number(active), motion.spring);
  }, [active, reduced, selected]);
  const underline = useAnimatedStyle(() => ({
    opacity: selected.value,
    transform: [{ scaleX: selected.value }],
  }));
  return (
    <View style={styles.label}>
      <Text
        numberOfLines={1}
        allowFontScaling
        maxFontSizeMultiplier={textLimits.tabScale}
        style={[
          textStyle("caption"),
          { color: active ? theme.moss : theme.boneMuted },
        ]}
      >
        {label}
      </Text>
      <Animated.View
        accessible={false}
        style={[styles.underline, { backgroundColor: theme.moss }, underline]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  label: { paddingBottom: space.xs + controls.focusLine },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: controls.focusLine,
  },
});
