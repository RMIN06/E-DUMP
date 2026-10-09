import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { publicRequest, type Request } from "../api/transport";

const tokenKey = "edump.device-token";
const enabledKey = "edump.notifications-enabled";
let registration: Promise<string> | null = null;
let generation = 0;
export const notificationPromptKey = "edump.notification-prompt";
export const pushProjectId = () =>
  Constants.easConfig?.projectId ??
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

export async function registerNotifications(
  request: Request,
  askPermission = false,
) {
  if (registration) return registration;
  const epoch = generation;
  registration = register(request, askPermission, epoch);
  try {
    return await registration;
  } finally {
    registration = null;
  }
}

async function register(
  request: Request,
  askPermission: boolean,
  epoch: number,
) {
  if (!pushProjectId())
    throw new Error(
      "Notifications will be available after the preview is configured.",
    );
  if (!Device.isDevice) throw new Error("Notifications need a physical phone.");
  if (Platform.OS !== "android" && Platform.OS !== "ios")
    throw new Error("Notifications need a phone.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "Class updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && askPermission)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Allow notifications in your phone settings to receive class updates.",
    );
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId: pushProjectId() })
  ).data;
  if (epoch !== generation)
    throw new Error("Notification registration cancelled.");
  await request<void>("/me/devices", {
    method: "PUT",
    body: {
      expo_push_token: token,
      platform: Platform.OS,
      notifications_enabled: true,
    },
  });
  await AsyncStorage.setItem(tokenKey, token);
  if (epoch !== generation)
    throw new Error("Notification registration cancelled.");
  await AsyncStorage.setItem(enabledKey, "true");
  return token;
}

export async function disableNotifications(request: Request) {
  await registration?.catch(() => undefined);
  const token = await AsyncStorage.getItem(tokenKey);
  if (token)
    await request<void>("/me/devices", {
      method: "PUT",
      body: {
        expo_push_token: token,
        platform: Platform.OS,
        notifications_enabled: false,
      },
    });
  await AsyncStorage.setItem(enabledKey, "false");
}

export async function unregisterNotifications(accessToken: string) {
  generation += 1;
  await registration?.catch(() => undefined);
  const token = await AsyncStorage.getItem(tokenKey);
  await AsyncStorage.removeItem(tokenKey);
  await AsyncStorage.removeItem(enabledKey);
  if (token)
    await publicRequest<void>(`/me/devices/${encodeURIComponent(token)}`, {
      method: "DELETE",
      token: accessToken,
    });
}

export async function notificationsEnabled() {
  const token = await AsyncStorage.getItem(tokenKey);
  if (!token || (await AsyncStorage.getItem(enabledKey)) !== "true")
    return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

export function announcementFromResponse(
  response: Notifications.NotificationResponse,
) {
  const id: unknown =
    response.notification.request.content.data?.announcement_id;
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id) ? id : null;
}
