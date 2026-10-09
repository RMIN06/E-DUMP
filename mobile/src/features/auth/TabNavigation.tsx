import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { TabLabel } from "../../components/TabLabel";
import { controls, layout, space } from "../../theme/spacing";
import { useTheme } from "../../theme/tokens";

export function TabNavigation() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="subjects"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.ink,
          borderTopColor: theme.lineSoft,
          borderTopWidth: controls.hairline,
          height: layout.tabHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: space.sm,
        },
        sceneStyle: { backgroundColor: theme.ink },
      }}
    >
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
