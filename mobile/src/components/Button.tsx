import { Pressable, StyleSheet, Text } from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: unavailable ? theme.olive : theme.moss,
          opacity: pressed ? controls.pressedOpacity : 1,
        },
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
    </Pressable>
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
