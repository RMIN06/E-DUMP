import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Heading } from "../src/components/Heading";
import { Screen } from "../src/components/Screen";
import { Text } from "../src/components/Text";
import { fontAssets } from "../src/theme/fontAssets";
import { AuthGate } from "../src/features/auth/AuthGate";
import { RulesGate } from "../src/features/rules/RulesGate";
import { NotificationsSetup } from "../src/features/notifications/NotificationsSetup";

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      {error ? (
        <Screen>
          <Heading>E-DUMP</Heading>
          <Text tone="danger">Fonts could not load. Restart the app.</Text>
        </Screen>
      ) : (
        <RulesGate><AuthGate>
          <NotificationsSetup />
        </AuthGate></RulesGate>
      )}
    </SafeAreaProvider>
  );
}
