import { useEffect, useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { api } from "../../api/client";
import { useSession } from "../../lib/session";
import {
  announcementFromResponse,
  disableNotifications,
  notificationPromptKey,
  notificationsEnabled,
  pushProjectId,
  registerNotifications,
} from "../../lib/notifications";
import { Sheet } from "../../components/Sheet";
import { Heading } from "../../components/Heading";
import { Text } from "../../components/Text";
import { TextAction } from "../../components/TextAction";
import { ErrorLine } from "../../components/ErrorLine";

export function NotificationsSetup() {
  const { status, user } = useSession();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return () => Notifications.setNotificationHandler(null);
  }, []);
  useEffect(() => {
    if (status !== "signedIn" || !userId) {
      setShow(false);
      return;
    }
    let alive = true;
    const open = (response: Notifications.NotificationResponse) => {
      const id = announcementFromResponse(response);
      if (alive && id) {
        router.push(`/updates/${id}`);
        void Notifications.clearLastNotificationResponseAsync().catch(
          () => undefined,
        );
      }
    };
    const listener =
      Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) open(response);
      })
      .catch(() => undefined);
    if (pushProjectId())
      void (async () => {
        const prompted = await AsyncStorage.getItem(notificationPromptKey);
        if (!alive) return;
        if (!prompted) setShow(true);
        else if (await notificationsEnabled()) await registerNotifications(api);
        else await disableNotifications(api);
      })().catch(() => undefined);
    return () => {
      alive = false;
      listener.remove();
    };
  }, [status, userId]);
  const dismiss = async () => {
    await AsyncStorage.setItem(notificationPromptKey, "seen");
    setShow(false);
  };
  const allow = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await registerNotifications(api, true);
      await dismiss();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible={show}
      onClose={() => {
        if (!busy)
          void dismiss().catch(() =>
            setError("Couldn't save your preference."),
          );
      }}
    >
      <Heading variant="h2">Class notifications</Heading>
      <Text>Get quiz, task and datesheet updates from class admins.</Text>
      <TextAction
        label="Allow notifications"
        disabled={busy}
        onPress={() => void allow()}
      />
      <TextAction
        label="Not now"
        disabled={busy}
        onPress={() =>
          void dismiss().catch(() => setError("Couldn't save your preference."))
        }
      />
      {error ? <ErrorLine message={error} /> : null}
    </Sheet>
  );
}
