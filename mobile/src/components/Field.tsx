import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";
import { useSizeClass } from "../theme/responsive";

type Props = Omit<
  TextInputProps,
  "style" | "maxFontSizeMultiplier" | "placeholderTextColor"
> & { label: string; error?: string | null };
export function Field({ label, error, onFocus, onBlur, ...props }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const { fontScale } = useSizeClass();
  const lineHeight =
    Number(textStyle("body").lineHeight) *
    Math.min(fontScale, textLimits.bodyScale);
  return (
    <View style={styles.field}>
      <Text
        style={[textStyle("caption"), { color: theme.boneMuted }]}
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
      >
        {label}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        maxFontSizeMultiplier={textLimits.bodyScale}
        placeholderTextColor={theme.boneMuted}
        selectionColor={theme.moss}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          textStyle("body"),
          styles.input,
          props.multiline && {
            minHeight: lineHeight * controls.multilineMinLines + space.xl,
            maxHeight: lineHeight * controls.multilineMaxLines + space.xl,
            textAlignVertical: "top",
          },
          {
            color: theme.bone,
            borderBottomColor: focused ? theme.moss : theme.olive,
            borderBottomWidth: focused ? controls.focusLine : controls.hairline,
          },
        ]}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[textStyle("body"), { color: theme.danger }]}
          allowFontScaling
          maxFontSizeMultiplier={textLimits.bodyScale}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: space.sm },
  input: { minHeight: controls.touchHeight, paddingVertical: space.md },
});
