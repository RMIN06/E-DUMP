import { Pressable, StyleSheet, Text, View } from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { useSizeClass } from "../theme/responsive";
import { headingStyle, textLimits, textStyle } from "../theme/typography";

export function EmptyState({
  title,
  message,
  action,
  onAction,
}: {
  title: string;
  message: string;
  action?: string;
  onAction?(): void;
}) {
  const theme = useTheme();
  const { sizeClass } = useSizeClass();
  return (
    <View style={styles.content}>
      <Text
        accessibilityRole="header"
        allowFontScaling
        maxFontSizeMultiplier={textLimits.headingScale}
        numberOfLines={textLimits.headingLines}
        style={[headingStyle("h2", sizeClass), { color: theme.bone }]}
      >
        {title}
      </Text>
      <Text
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
        style={[textStyle("body"), { color: theme.boneMuted }]}
      >
        {message}
      </Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.action}
        >
          <Text style={[textStyle("bodyStrong"), { color: theme.moss }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: space.sm, paddingVertical: space.xl },
  action: { minHeight: controls.touchHeight, justifyContent: "center" },
});
