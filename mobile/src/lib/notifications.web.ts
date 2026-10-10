import AsyncStorage from "@react-native-async-storage/async-storage";
import { publicRequest, type Request } from "../api/transport";
export const notificationPromptKey = "edump.notification-prompt";
const enabledKey = "edump.notifications-enabled";
let flight: Promise<string> | null = null;
let generation = 0;
export const pushProjectId = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window
    ? "browser"
    : undefined;
export function browserPushHelp() {
  return "On iPhone, add E-DUMP to your Home Screen from Safari, then open it to enable notifications (iOS 16.4 or later).";
}
export async function webWorker() {
  if (!pushProjectId()) throw new Error(browserPushHelp());
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}
async function deviceId(endpoint: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(endpoint),
  );
  return (
    "webpush:" +
    Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  );
}
export async function registerNotifications(
  request: Request,
  askPermission = false,
) {
  if (flight) return flight;
  const epoch = generation;
  flight = (async () => {
    if (!pushProjectId()) throw new Error(browserPushHelp());
    // Ask within the user's click before awaiting network operations (Safari).
    const permission = askPermission
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission !== "granted")
      throw new Error(
        "Allow notifications in your browser settings to receive class updates.",
      );
    const { public_key: key } = await request<{ public_key: string | null }>(
      "/me/web-push-key",
    );
    if (!key) throw new Error("Browser notifications are not configured yet.");
    const worker = await webWorker();
    const bytes = Uint8Array.from(
      atob(
        key.replace(/-/g, "+").replace(/_/g, "/") +
          "=".repeat((4 - (key.length % 4)) % 4),
      ),
      (char) => char.charCodeAt(0),
    );
    const subscription =
      (await worker.pushManager.getSubscription()) ??
      (await worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      }));
    if (epoch !== generation) {
      await subscription.unsubscribe();
      throw new Error("Registration cancelled.");
    }
    await request<void>("/me/web-devices", {
      method: "PUT",
      body: {
        subscription: {
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
        },
        notifications_enabled: true,
        platform: "web",
      },
    });
    await AsyncStorage.setItem(enabledKey, "true");
    return deviceId(subscription.endpoint);
  })();
  try {
    return await flight;
  } finally {
    flight = null;
  }
}
export async function disableNotifications(request: Request) {
  await flight?.catch(() => undefined);
  const subscription = pushProjectId()
    ? await (await webWorker()).pushManager.getSubscription()
    : null;
  if (subscription) {
    await request<void>(
      "/me/devices/" +
        encodeURIComponent(await deviceId(subscription.endpoint)),
      { method: "DELETE" },
    );
    await subscription.unsubscribe();
  }
  await AsyncStorage.setItem(enabledKey, "false");
}
export async function unregisterNotifications(accessToken: string) {
  generation += 1;
  await disableNotifications(<T>(path: string, options = {}) =>
    publicRequest<T>(path, { ...options, token: accessToken }),
  );
  await AsyncStorage.removeItem(enabledKey);
}
export async function notificationsEnabled() {
  if (
    !pushProjectId() ||
    Notification.permission !== "granted" ||
    (await AsyncStorage.getItem(enabledKey)) !== "true"
  )
    return false;
  return Boolean(await (await webWorker()).pushManager.getSubscription());
}
