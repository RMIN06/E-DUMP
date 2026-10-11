import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { layout, space } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";

export function UpdateNotice({
  apply,
  disabled,
}: {
  apply(): void;
  disabled: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.outer,
        { backgroundColor: theme.ink, paddingTop: insets.top },
      ]}
    >
      <View style={styles.content}>
        <Text variant="caption">
          App update ready.{" "}
          {disabled
            ? "Finish this screen to restart safely."
            : "Restart when you’re ready."}
        </Text>
        <TextAction
          label="Restart to update"
          disabled={disabled}
          onPress={apply}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  outer: { width: layout.columnWidth },
  content: {
    width: layout.columnWidth,
    maxWidth: layout.webContentWidth,
    alignSelf: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
});
