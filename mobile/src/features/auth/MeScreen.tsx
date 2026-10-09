import { useRef, useState } from "react";
import { router } from "expo-router";
import { ErrorLine } from "../../components/ErrorLine";
import { Heading } from "../../components/Heading";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { sessionActions, useSession } from "../../lib/session";
import { clearDownloads } from "../../lib/files";

export function MeScreen() {
  const { user } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [retry, setRetry] = useState<"signOut" | "downloads">("signOut");
  const inFlight = useRef(false);
  const signOut = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setWorking(true);
    setError(null);
    setRetry("signOut");
    try {
      await sessionActions.signOut();
    } catch {
      setError("Couldn't clear saved data. Try again.");
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  };
  const clear = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setWorking(true);
    setError(null);
    setRetry("downloads");
    try {
      await clearDownloads();
    } catch {
      setError("Couldn't clear downloads. Try again.");
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  };
  return (
    <Screen>
      <Heading>{user?.name ?? "Me"}</Heading>
      <Text variant="caption" tone="muted">
        {user?.email}
      </Text>
      <TextAction label="Name" onPress={() => router.push("/name")} />
      <TextAction
        label="Clear downloads"
        disabled={working}
        onPress={() => void clear()}
      />
      {error ? (
        <ErrorLine
          message={error}
          onRetry={() => void (retry === "downloads" ? clear() : signOut())}
        />
      ) : null}
      <TextAction
        label="Sign out"
        disabled={working}
        onPress={() => void signOut()}
      />
    </Screen>
  );
}
