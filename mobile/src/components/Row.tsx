import { memo, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
  const below = sizeClass !== "tablet" || fontScale > 1.3;
  return (
    <Animated.View
      collapsable={false}
      style={[styles.row, { backgroundColor: theme.surface }]}
      entering={
        reduced || entry === null || Platform.OS === "web"
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
        <View
          style={[styles.leading, { backgroundColor: theme.accentSoft }]}
          pointerEvents="none"
        >
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
        <View style={[styles.titleLine, below && styles.stacked]}>
          <Text
            allowFontScaling
            maxFontSizeMultiplier={
              heading ? textLimits.headingScale : textLimits.bodyScale
            }
            numberOfLines={
              heading ? textLimits.headingLines : textLimits.rowLines
            }
            style={[
              heading ? headingStyle("h2", sizeClass) : textStyle(titleVariant),
              styles.title,
              below && styles.stackedTitle,
              { color: disabled ? theme.boneMuted : theme.bone },
            ]}
          >
            {title}
          </Text>
          {trailing ? (
            <Text
              allowFontScaling
              maxFontSizeMultiplier={textLimits.bodyScale}
              style={[
                textStyle("caption"),
                styles.badge,
                { color: theme.moss, backgroundColor: theme.accentSoft },
              ]}
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
    marginBottom: space.sm,
    borderRadius: controls.panelRadius,
    gap: space.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  main: { flex: layout.fill, minWidth: layout.zero, gap: space.sm },
  leading: { padding: space.sm, borderRadius: controls.radius },
  badge: {
    maxWidth: layout.columnWidth,
    flexShrink: layout.fill,
    alignSelf: "flex-start",
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: controls.radius,
  },
  details: {
    minWidth: controls.touchHeight,
    minHeight: controls.touchHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  titleLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: space.lg,
  },
  stacked: { flexDirection: "column", alignItems: "stretch", gap: space.sm },
  title: {
    flexGrow: layout.fill,
    flexShrink: layout.fill,
    flexBasis: layout.zero,
    minWidth: layout.zero,
  },
  stackedTitle: {
    flexBasis: "auto",
    flexGrow: layout.zero,
    flexShrink: layout.zero,
    width: layout.columnWidth,
  },
});
