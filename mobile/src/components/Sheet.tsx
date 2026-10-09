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
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";

export function Sheet({
  visible,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; onClose(): void }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useMotionPreference();
  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      transparent
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.frame}
      >
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(motion.durationBase)}
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: theme.backdrop },
          ]}
        >
          <Pressable
            style={styles.frame}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>
        <Animated.View
          entering={
            reduced
              ? undefined
              : FadeInDown.springify()
                  .stiffness(motion.spring.stiffness)
                  .damping(motion.spring.damping)
                  .mass(motion.spring.mass)
          }
          style={[
            styles.sheet,
            { backgroundColor: theme.ink, borderTopColor: theme.olive },
          ]}
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
                  paddingTop: space.xl,
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  frame: { flex: layout.fill, justifyContent: "flex-end" },
  sheet: {
    maxHeight: layout.sheetMaxHeight,
    borderTopWidth: controls.hairline,
    paddingTop: space.sm,
  },
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
