import { StyleSheet, Text, View } from "react-native";
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
  return (
    <View
      style={[
        styles.label,
        { borderBottomColor: active ? theme.moss : theme.ink },
      ]}
    >
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
    </View>
  );
}
const styles = StyleSheet.create({
  label: { borderBottomWidth: controls.focusLine, paddingBottom: space.xs },
});
