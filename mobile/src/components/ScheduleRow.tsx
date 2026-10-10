import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/tokens";
import { controls, layout, space } from "../theme/spacing";
import { textLimits, textStyle } from "../theme/typography";

export function ScheduleRow({
  time,
  title,
  meta,
  status,
  onPress,
}: {
  time: string;
  title: string;
  meta: string;
  status?: "Now" | "Next";
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[status, time, title, meta]
        .filter(Boolean)
        .join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor:
            pressed || status === "Now" ? theme.accentSoft : theme.surface,
        },
      ]}
    >
      <View style={styles.time}>
        {status ? (
          <Text
            allowFontScaling
            maxFontSizeMultiplier={textLimits.bodyScale}
            style={[textStyle("bodyStrong"), { color: theme.moss }]}
          >
            {status}
          </Text>
        ) : null}
        <Text
          allowFontScaling
          maxFontSizeMultiplier={textLimits.bodyScale}
          style={[textStyle("bodyStrong"), { color: theme.bone }]}
        >
          {time}
        </Text>
      </View>
      <Text
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
        numberOfLines={textLimits.headingLines}
        style={[textStyle("h3"), { color: theme.bone }]}
      >
        {title}
      </Text>
      <Text
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
        numberOfLines={textLimits.captionLines}
        style={[textStyle("caption"), { color: theme.boneMuted }]}
      >
        {meta}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: layout.rowHeight,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    borderRadius: controls.panelRadius,
    gap: space.sm,
  },
  time: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
