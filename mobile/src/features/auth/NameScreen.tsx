import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../components/Button";
import { ErrorLine } from "../../components/ErrorLine";
import { Field } from "../../components/Field";
import { Heading } from "../../components/Heading";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { sessionActions, useSession } from "../../lib/session";
import { space } from "../../theme/spacing";

export function NameScreen() {
  const { user } = useSession();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const inFlight = useRef(false);
  const submit = async () => {
    if (inFlight.current) return;
    const value = name.trim();
    if (
      value.length < 2 ||
      value.length > 40 ||
      /[\x00-\x1f\x7f]/.test(value)
    ) {
      setError("Use 2–40 characters for your name.");
      return;
    }
    setError(null);
    inFlight.current = true;
    setWorking(true);
    try {
      await sessionActions.updateName(value);
      router.replace("/me");
    } catch {
      setError("Can't save your name. Try again.");
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  };
  return (
    <Screen keepFormEndVisible>
      <Heading>Your name</Heading>
      <Text tone="muted">Shown next to files you upload.</Text>
      <View style={styles.form}>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          maxLength={40}
          editable={!working}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        {error ? (
          <ErrorLine message={error} onRetry={() => void submit()} />
        ) : null}
        <Button label="Save" loading={working} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  form: { marginTop: space.xl, gap: space.xl },
});
