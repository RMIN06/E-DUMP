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
  Text,
  type FlatListProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { controls, layout, space } from "../theme/spacing";
import { headingStyle, textLimits, textStyle } from "../theme/typography";
import { useSizeClass } from "../theme/responsive";
import { useTheme } from "../theme/tokens";
import { EntryContext, type EntryScope } from "../theme/animation";

export function Screen<T = never>({
  children,
  keepFormEndVisible = false,
  list,
  footer,
  title,
  subtitle,
  action,
}: PropsWithChildren<{
  keepFormEndVisible?: boolean;
  list?: Omit<FlatListProps<T>, "style" | "contentContainerStyle">;
  footer?: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sizeClass } = useSizeClass();
  const header = title ? (
    <View style={[styles.masthead, { backgroundColor: theme.moss }]}>
      <View style={styles.headerTop}>
        <Text style={[textStyle("label"), { color: theme.ink }]}>
          E-DUMP / BCS-3E
        </Text>
        {action}
      </View>
      <Text
        accessibilityRole="header"
        allowFontScaling
        maxFontSizeMultiplier={textLimits.headingScale}
        style={[headingStyle("h1", sizeClass), { color: theme.ink }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          allowFontScaling
          maxFontSizeMultiplier={textLimits.bodyScale}
          style={[textStyle("caption"), { color: theme.ink }]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  ) : null;
  const ListHeader = list?.ListHeaderComponent;
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
        behavior={
          Platform.OS === "web"
            ? undefined
            : Platform.OS === "ios"
              ? "padding"
              : "height"
        }
        style={[styles.screen, { backgroundColor: theme.ink }]}
      >
        <StatusBar barStyle="light-content" />
        {list ? (
          <FlatList
            {...list}
            ListHeaderComponent={
              title ? (
                <View style={styles.listHeader}>
                  {header}
                  {typeof ListHeader === "function" ? (
                    <ListHeader />
                  ) : (
                    ListHeader
                  )}
                </View>
              ) : (
                ListHeader
              )
            }
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
            removeClippedSubviews={false}
            onEndReachedThreshold={layout.listEndThreshold}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          />
        ) : (
          <ScrollView
            ref={scroll}
            style={styles.viewport}
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
              {header}
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
  masthead: {
    flexShrink: layout.zero,
    minWidth: layout.zero,
    padding: space.xl,
    borderRadius: controls.panelRadius,
    gap: space.md,
  },
  headerTop: {
    flexShrink: layout.zero,
    minWidth: layout.zero,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  listHeader: {
    flexShrink: layout.zero,
    minWidth: layout.zero,
    gap: space.lg,
    paddingBottom: space.lg,
  },
  screen: { flex: layout.fill, minHeight: layout.zero },
  viewport: { flex: layout.fill, minHeight: layout.zero },
  scroll: { flexGrow: layout.fill, alignItems: "center" },
  listColumn: {
    flex: layout.fill,
    minHeight: layout.zero,
    width: layout.columnWidth,
    maxWidth:
      Platform.OS === "web" ? layout.webContentWidth : layout.maxContentWidth,
    alignSelf: "center",
  },
  column: {
    minWidth: layout.zero,
    flexShrink: layout.zero,
    width: layout.columnWidth,
    maxWidth:
      Platform.OS === "web" ? layout.webFormWidth : layout.maxContentWidth,
    gap: space.lg,
  },
  footer: {
    width: layout.columnWidth,
    maxWidth:
      Platform.OS === "web" ? layout.webFormWidth : layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.sm,
  },
});
