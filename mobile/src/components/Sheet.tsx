import type { PropsWithChildren } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { controls, layout, space } from "../theme/spacing";
import { textLimits, textStyle } from "../theme/typography";
import { useTheme } from "../theme/tokens";

export function Sheet({
  visible,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; onClose(): void }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.frame}
      >
        <ScrollView
          style={{ backgroundColor: theme.ink }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.column,
              {
                paddingTop: insets.top + space.xl,
                paddingBottom: insets.bottom + space.xl,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.close}
            >
              <Text
                allowFontScaling
                maxFontSizeMultiplier={textLimits.bodyScale}
                style={[textStyle("bodyStrong"), { color: theme.moss }]}
              >
                Close
              </Text>
            </Pressable>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  frame: { flex: layout.fill },
  scroll: { flexGrow: layout.fill, alignItems: "center" },
  column: {
    width: layout.columnWidth,
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: space.xl,
    gap: space.xl,
  },
  close: {
    minHeight: controls.touchHeight,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
