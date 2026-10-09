import { Pressable, Text, View } from "react-native";
import { controls, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { textLimits, textStyle } from "../theme/typography";

export function ErrorLine({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text
        accessibilityLiveRegion="polite"
        allowFontScaling
        maxFontSizeMultiplier={textLimits.bodyScale}
        style={[textStyle("body"), { color: theme.danger }]}
      >
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={{ minHeight: controls.touchHeight, justifyContent: "center" }}
        >
          <Text
            allowFontScaling
            maxFontSizeMultiplier={textLimits.bodyScale}
            style={[textStyle("bodyStrong"), { color: theme.moss }]}
          >
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
