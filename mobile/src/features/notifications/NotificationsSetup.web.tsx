import { useEffect, useState } from "react";
import { router } from "expo-router";
import { api } from "../../api/client";
import { queryClient } from "../../api/queryClient";
import { useSession, sessionActions } from "../../lib/session";
import {
  webWorker,
  notificationsEnabled,
  registerNotifications,
} from "../../lib/notifications.web";
import { Text } from "../../components/Text";
import { notificationRoute } from "../../lib/notificationRoute";

export function NotificationsSetup() {
  const { status, user } = useSession();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    if (status !== "signedIn") return;
    const sync = () => {
      setOffline(!navigator.onLine);
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      void sessionActions.syncProfile().catch(() => undefined);
      void queryClient.invalidateQueries({ refetchType: "active" });
    };
    const message = (event: MessageEvent) => {
      sync();
      const path = notificationRoute(event.data);
      if (event.data?.open && path) router.push(path);
    };
    setOffline(!navigator.onLine);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    navigator.serviceWorker?.addEventListener("message", message);
    void notificationsEnabled()
      .then((enabled) => (enabled ? registerNotifications(api) : undefined))
      .catch(() => undefined);
    void webWorker().catch(() => undefined);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      navigator.serviceWorker?.removeEventListener("message", message);
    };
  }, [status, user?.id]);
  return offline ? (
    <Text variant="caption">Offline · reading saved class data</Text>
  ) : null;
}
