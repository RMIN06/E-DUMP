import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";
import { useEffect, useState } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";

export function FilterText<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange(value: T): void;
  label: string;
}) {
  const theme = useTheme();
  const reduced = useMotionPreference();
  const [positions, setPositions] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  useEffect(() => {
    const selected = positions[value];
    if (!selected) return;
    x.value = reduced ? selected.x : withSpring(selected.x, motion.spring);
    width.value = selected.width;
  }, [positions, value, reduced, x, width]);
  const underline = useAnimatedStyle(() => ({ width: width.value, transform: [{ translateX: x.value }] }));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
      accessibilityLabel={label}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View accessible={false} style={[styles.underline, { backgroundColor: theme.moss }, underline]} />
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={styles.target}
          onLayout={(event) => {
            const { x, width } = event.nativeEvent.layout;
            setPositions((previous) => previous[option.value]?.x === x && previous[option.value]?.width === width ? previous : { ...previous, [option.value]: { x, width } });
          }}
        >
          <Text
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={textLimits.bodyScale}
            style={[
              textStyle("body"),
              {
                color: option.value === value ? theme.moss : theme.boneMuted,
              },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  underline: { position: "absolute", bottom: 0, left: 0, height: controls.focusLine },
  filters: { gap: space.lg },
  target: {
    minHeight: controls.touchHeight,
    minWidth: controls.touchHeight,
    justifyContent: "center",
    paddingVertical: space.sm,
  },
});
