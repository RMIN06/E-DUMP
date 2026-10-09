import {
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  FlatList,
  type FlatListProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, space } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { EntryContext, type EntryScope } from "../theme/animation";

export function Screen<T = never>({
  children,
  keepFormEndVisible = false,
  list,
  footer,
}: PropsWithChildren<{
  keepFormEndVisible?: boolean;
  list?: Omit<FlatListProps<T>, "style" | "contentContainerStyle">;
  footer?: ReactNode;
}>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const entry = useRef<EntryScope>({ seen: new Set(), count: 0 });
  const scroll = useRef<ScrollView>(null);
  const revealFormEnd = () => {
    if (keepFormEndVisible && Keyboard.isVisible()) {
      requestAnimationFrame(() => {
        scroll.current?.scrollToEnd({ animated: false });
      });
    }
  };
  useEffect(() => {
    if (!keepFormEndVisible) return;
    const listener = Keyboard.addListener("keyboardDidShow", () => {
      requestAnimationFrame(() => {
        scroll.current?.scrollToEnd({ animated: false });
      });
    });
    return () => listener.remove();
  }, [keepFormEndVisible]);
  return (
    <EntryContext.Provider value={entry.current}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { backgroundColor: theme.ink }]}
    >
      <StatusBar barStyle="light-content" />
      {list ? (
        <FlatList
          {...list}
          style={styles.listColumn}
          contentContainerStyle={{
            paddingTop: insets.top + space.xl,
            paddingBottom: insets.bottom + space.xl,
            paddingLeft: insets.left + space.xl,
            paddingRight: insets.right + space.xl,
          }}
          initialNumToRender={layout.listInitial}
          maxToRenderPerBatch={layout.listBatch}
          windowSize={layout.listWindow}
          removeClippedSubviews={Platform.OS === "android"}
          onEndReachedThreshold={layout.listEndThreshold}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        />
      ) : (
        <ScrollView
          ref={scroll}
          onLayout={revealFormEnd}
          onContentSizeChange={revealFormEnd}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <View
            style={[
              styles.column,
              {
                paddingTop: insets.top + space.xl,
                paddingBottom: insets.bottom + space.xl,
                paddingLeft: insets.left + space.xl,
                paddingRight: insets.right + space.xl,
              },
            ]}
          >
            {children}
          </View>
        </ScrollView>
      )}
      {footer ? (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
    </EntryContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: layout.fill },
  scroll: { flexGrow: layout.fill, alignItems: "center" },
  listColumn: {
    width: layout.columnWidth,
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  column: {
    width: layout.columnWidth,
    maxWidth: layout.maxContentWidth,
    gap: space.sm,
  },
  footer: {
    width: layout.columnWidth,
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.sm,
  },
});
