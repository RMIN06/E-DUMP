import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";

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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
      accessibilityLabel={label}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={styles.target}
        >
          <Text
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={textLimits.bodyScale}
            style={[
              textStyle("body"),
              {
                color: option.value === value ? theme.moss : theme.boneMuted,
                textDecorationLine:
                  option.value === value ? "underline" : "none",
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
  filters: { gap: space.lg },
  target: {
    minHeight: controls.touchHeight,
    minWidth: controls.touchHeight,
    justifyContent: "center",
    paddingVertical: space.sm,
  },
});
