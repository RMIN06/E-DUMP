import { Pressable, StyleSheet, Text } from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      <Text
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
        style={[
          textStyle("bodyStrong"),
          { fontWeight: "700", color: destructive ? theme.danger : theme.moss },
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
