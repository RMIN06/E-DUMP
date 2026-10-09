import { StyleSheet, View } from "react-native";
import { controls, layout } from "../theme/spacing";
import { useTheme } from "../theme/tokens";

export function ProgressLine({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const theme = useTheme();
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { backgroundColor: theme.olive }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${percent}%`, backgroundColor: theme.moss },
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  track: { width: layout.columnWidth, height: controls.focusLine },
  fill: { height: controls.focusLine },
});
