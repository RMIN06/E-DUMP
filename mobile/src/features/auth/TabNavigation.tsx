import { Platform, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { TabLabel } from "../../components/TabLabel";
import { controls, layout, space } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";
import { useUnreadCount } from "../../api/announcements";

export function TabNavigation() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= layout.desktopBreakpoint;
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();
  return (
    <Tabs
      initialRouteName="updates"
      screenOptions={{
        headerShown: false,
        tabBarPosition: desktop ? "left" : "bottom",
        tabBarLabelPosition: desktop ? "beside-icon" : "below-icon",
        tabBarStyle: {
          backgroundColor: theme.ink,
          borderTopColor: theme.lineSoft,
          borderTopWidth: controls.hairline,
          height: desktop ? undefined : layout.tabHeight + insets.bottom,
          width: desktop ? layout.desktopTabWidth : undefined,
          paddingBottom: insets.bottom,
          paddingTop: space.sm,
        },
        sceneStyle: { backgroundColor: theme.ink },
      }}
    >
      <Tabs.Screen
        name="updates"
        options={{
          title: "Updates",
          tabBarIcon: ({ focused }) => <Icon name="updates" active={focused} />,
          tabBarLabel: ({ focused }) => (
            <TabLabel
              label={
                unread.data?.count ? `Updates ${unread.data.count}` : "Updates"
              }
              active={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="subjects"
        options={{
          title: "Subjects",
          tabBarIcon: ({ focused }) => (
            <Icon name="subjects" active={focused} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Subjects" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ focused }) => (
            <Icon name="schedule" active={focused} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Schedule" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ focused }) => <Icon name="me" active={focused} />,
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Me" active={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
