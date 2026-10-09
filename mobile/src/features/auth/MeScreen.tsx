import { useRef, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { ErrorLine } from "../../components/ErrorLine";
import { Heading } from "../../components/Heading";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { Sheet } from "../../components/Sheet";
import { sessionActions, useSession } from "../../lib/session";
import { clearDownloads } from "../../lib/files";

export function MeScreen({
  notifications,
  admin,
}: {
  notifications?: ReactNode;
  admin?: ReactNode;
}) {
  const { user } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [retry, setRetry] = useState<"signOut" | "downloads" | "delete">(
    "signOut",
  );
  const [confirm, setConfirm] = useState(false);
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
  const remove = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setWorking(true);
    setError(null);
    setRetry("delete");
    try {
      await sessionActions.deleteAccount();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't delete your account. Try again.",
      );
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
      {notifications}
      <TextAction label="Rules" onPress={() => router.push("/rules")} />
      {user?.role === "admin" ? admin : null}
      <TextAction
        label="Clear downloads"
        disabled={working}
        onPress={() => void clear()}
      />
      {error ? (
        <ErrorLine
          message={error}
          onRetry={() =>
            void (retry === "downloads"
              ? clear()
              : retry === "delete"
                ? remove()
                : signOut())
          }
        />
      ) : null}
      <TextAction
        label="Sign out"
        disabled={working}
        onPress={() => void signOut()}
      />
      <TextAction
        label="Delete account"
        destructive
        disabled={working}
        onPress={() => {
          setError(null);
          setConfirm(true);
        }}
      />
      <Sheet
        visible={confirm}
        onClose={() => {
          if (!working) setConfirm(false);
        }}
      >
        <Heading variant="h2">Delete your account?</Heading>
        <Text>
          Your account, devices and sessions will be deleted. Uploaded material
          stays as Former member. Remove any of your files first if you do not
          want to keep them in the class.
        </Text>
        <TextAction
          label="Delete my account"
          destructive
          disabled={working}
          onPress={() => void remove()}
        />
        {error ? <ErrorLine message={error} /> : null}
      </Sheet>
    </Screen>
  );
}
