import { useState } from "react";
import { ErrorLine } from "../../components/ErrorLine";
import { Heading } from "../../components/Heading";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { sessionActions } from "../../lib/session";

export function BlockedScreen() {
  const [error, setError] = useState<string | null>(null);
  const signOut = () => {
    void sessionActions
      .signOut()
      .catch(() => setError("Couldn't clear saved data. Try again."));
  };
  return (
    <Screen>
      <Heading>Account disabled</Heading>
      <Text>Contact a class admin.</Text>
      {error ? <ErrorLine message={error} onRetry={signOut} /> : null}
      <TextAction label="Sign out" onPress={signOut} />
    </Screen>
  );
}
