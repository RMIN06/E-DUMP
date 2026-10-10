import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";
import { Heading } from "../../components/Heading";
import { Icon } from "../../components/Icon";
import { ProgressLine } from "../../components/ProgressLine";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { layout, space } from "../../theme/spacing";

export const welcomeKey = "edump.welcome-completed";

export function WelcomeGate({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const load = async () => {
    setError(null);
    try {
      setCompleted((await AsyncStorage.getItem(welcomeKey)) === "true");
      setReady(true);
    } catch {
      setError("Couldn't load your welcome preference. Try again.");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const continueToSignIn = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setWorking(true);
    setError(null);
    try {
      await AsyncStorage.setItem(welcomeKey, "true");
      setCompleted(true);
    } catch {
      setError("Couldn't save your welcome preference. Try again.");
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  };
  if (completed) return children;
  return (
    <Screen>
      <View style={styles.intro}>
        <Icon name="brand" size={layout.brandSize} />
        <Text variant="label">E-DUMP / BCS-3E</Text>
        <Heading variant="display">
          Your class,
          {"\n"}in one place.
        </Heading>
        <Text tone="muted">
          Welcome to E-DUMP. Find subject material, follow class updates and
          check your weekly schedule.
        </Text>
      </View>
      {error ? (
        <ErrorLine
          message={error}
          onRetry={() => void (ready ? continueToSignIn() : load())}
        />
      ) : null}
      {ready ? (
        <Button
          label="Continue"
          loading={working}
          loadingLabel="Continuing…"
          onPress={() => void continueToSignIn()}
        />
      ) : !error ? (
        <ProgressLine label="Opening E-DUMP" />
      ) : null}
      <Text variant="caption" tone="muted">
        For BCS-3E students. Sign in with your FAST student email.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.xl, paddingTop: space.xxl, paddingBottom: space.xl },
});
