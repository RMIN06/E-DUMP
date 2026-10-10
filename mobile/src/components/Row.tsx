import { memo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { layout, space, controls } from "../theme/spacing";
import { useSizeClass } from "../theme/responsive";
import { useTheme } from "../theme/tokens";
import { headingStyle, textStyle, textLimits } from "../theme/typography";
import Animated, {
  FadeInUp,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useMotionPreference, useRowEntry } from "../theme/animation";
import { motion } from "../theme/motion";

type Props = {
  title: string;
  meta: string;
  trailing?: string;
  heading?: boolean;
  onPress(): void;
  onLongPress?(): void;
  onDetails?(): void;
  titleVariant?: "bodyStrong" | "h3";
  entryKey?: string;
  accentPrefix?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  leading?: ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Row = memo(function Row({
  title,
  meta,
  trailing,
  heading = false,
  onPress,
  onLongPress,
  onDetails,
  titleVariant = "bodyStrong",
  entryKey,
  accentPrefix,
  disabled = false,
  accessibilityLabel,
  leading,
}: Props) {
  const theme = useTheme();
  const reduced = useMotionPreference();
  const entry = useRowEntry(entryKey ?? title);
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      [theme.clear, theme.accentSoft],
    ),
  }));
  const setPressed = (value: number) => {
    pressed.value = reduced
      ? value
      : withTiming(value, { duration: motion.pressDuration });
  };
  const { sizeClass, fontScale } = useSizeClass();
  const [titleWidth, setTitleWidth] = useState(0);
  const [metaWidth, setMetaWidth] = useState(0);
  const [available, setAvailable] = useState(0);
  const below =
    sizeClass === "compact" ||
    fontScale > 1.3 ||
    titleWidth + metaWidth + space.lg > available;
  return (
    <Animated.View
      style={[styles.row, { backgroundColor: theme.surface }]}
      entering={
        reduced || entry === null
          ? undefined
          : FadeInUp.duration(motion.durationBase)
              .delay(entry * motion.stagger)
              .easing(Easing.bezier(...motion.easeOut))
              .withInitialValues({
                opacity: 0,
                transform: [{ translateY: motion.rowRise }],
              })
      }
    >
      {leading ? (
        <View style={styles.leading} pointerEvents="none">
          {leading}
        </View>
      ) : null}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ??
          [title, meta, trailing].filter(Boolean).join(", ")
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => setPressed(1)}
        onPressOut={() => setPressed(0)}
        style={[styles.main, pressStyle]}
      >
        <View
          onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
          style={[styles.titleLine, below && styles.stacked]}
        >
          <Text
            allowFontScaling
            maxFontSizeMultiplier={
              heading ? textLimits.headingScale : textLimits.bodyScale
            }
            numberOfLines={
              heading ? textLimits.headingLines : textLimits.rowLines
            }
            onTextLayout={(event) =>
              setTitleWidth(
                Math.max(
                  0,
                  ...event.nativeEvent.lines.map((line) => line.width),
                ),
              )
            }
            style={[
              heading ? headingStyle("h2", sizeClass) : textStyle(titleVariant),
              styles.title,
              { color: disabled ? theme.boneMuted : theme.bone },
            ]}
          >
            {title}
          </Text>
          {trailing ? (
            <Text
              allowFontScaling
              maxFontSizeMultiplier={textLimits.bodyScale}
              onTextLayout={(event) =>
                setMetaWidth(
                  Math.max(
                    0,
                    ...event.nativeEvent.lines.map((line) => line.width),
                  ),
                )
              }
              style={[textStyle("caption"), { color: theme.boneMuted }]}
            >
              {trailing}
            </Text>
          ) : null}
        </View>
        <Text
          allowFontScaling
          maxFontSizeMultiplier={textLimits.bodyScale}
          numberOfLines={textLimits.captionLines}
          style={[textStyle("caption"), { color: theme.boneMuted }]}
        >
          {accentPrefix && meta.startsWith(accentPrefix) ? (
            <>
              <Text style={{ color: theme.moss }}>{accentPrefix}</Text>
              {meta.slice(accentPrefix.length)}
            </>
          ) : (
            meta
          )}
        </Text>
      </AnimatedPressable>
      {onDetails ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Details for ${title}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onDetails}
          style={styles.details}
        >
          <Text
            allowFontScaling
            maxFontSizeMultiplier={textLimits.bodyScale}
            style={[textStyle("bodyStrong"), { color: theme.moss }]}
          >
            ···
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
});
const styles = StyleSheet.create({
  row: {
    minHeight: layout.rowHeight,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: controls.panelRadius,
    gap: space.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  main: { flex: layout.fill, gap: space.sm },
  leading: { paddingTop: space.xs, paddingRight: space.sm },
  details: {
    minWidth: controls.touchHeight,
    minHeight: controls.touchHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  titleLine: { flexDirection: "row", alignItems: "baseline", gap: space.lg },
  stacked: { flexDirection: "column", alignItems: "stretch", gap: space.sm },
  title: { flexShrink: layout.fill },
});
