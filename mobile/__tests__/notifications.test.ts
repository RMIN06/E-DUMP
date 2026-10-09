import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  announcementFromResponse,
  disableNotifications,
  notificationsEnabled,
  pushProjectId,
  registerNotifications,
  unregisterNotifications,
} from "../src/lib/notifications";
import {
  publicRequest,
  type Request,
  type RequestOptions,
} from "../src/api/transport";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { easConfig: { projectId: "test-project" } },
}));
jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("../src/api/transport", () => ({
  publicRequest: jest.fn(async () => undefined),
}));
const send = jest.fn(
  async (_path: string, _options?: RequestOptions) => undefined,
);
const request: Request = async <T>(path: string, options?: RequestOptions) =>
  (await send(path, options)) as T;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.replaceProperty(Platform, "OS", "android");
});
afterEach(() => jest.restoreAllMocks());

test("registers after permission, keeps per-device opt-out and unregisters with captured session", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
  } as Notifications.NotificationPermissionsStatus);
  const token = await registerNotifications(request);
  expect(send).toHaveBeenCalledWith(
    "/me/devices",
    expect.objectContaining({
      method: "PUT",
      body: {
        expo_push_token: token,
        platform: "android",
        notifications_enabled: true,
      },
    }),
  );
  expect(await notificationsEnabled()).toBe(true);
  await disableNotifications(request);
  expect(await notificationsEnabled()).toBe(false);
  expect(send).toHaveBeenLastCalledWith(
    "/me/devices",
    expect.objectContaining({
      body: expect.objectContaining({ notifications_enabled: false }),
    }),
  );
  await unregisterNotifications("captured-access");
  expect(publicRequest).toHaveBeenCalledWith(
    `/me/devices/${encodeURIComponent(token)}`,
    { method: "DELETE", token: "captured-access" },
  );
  expect(await notificationsEnabled()).toBe(false);
  await disableNotifications(request);
  await unregisterNotifications("captured-access");
});
test("permission denial does not register a token; enabling can request permission", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: false,
  } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
    granted: false,
  } as Notifications.NotificationPermissionsStatus);
  await expect(registerNotifications(request, true)).rejects.toThrow(
    "phone settings",
  );
  expect(send).not.toHaveBeenCalled();
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
    granted: true,
  } as Notifications.NotificationPermissionsStatus);
  jest.replaceProperty(Platform, "OS", "ios");
  await registerNotifications(request, true);
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
});
test("missing native project and non-device environments explain availability", async () => {
  jest.replaceProperty(Device, "isDevice", false);
  await expect(registerNotifications(request)).rejects.toThrow(
    "physical phone",
  );
  jest.replaceProperty(Device, "isDevice", true);
  jest.replaceProperty(Platform, "OS", "web");
  await expect(registerNotifications(request)).rejects.toThrow("phone");
  jest.replaceProperty(Constants, "easConfig", null);
  expect(pushProjectId()).toBeUndefined();
  await expect(registerNotifications(request)).rejects.toThrow("preview");
});
test("notification taps accept only announcement IDs", () => {
  const response = (id: unknown) =>
    ({
      notification: { request: { content: { data: { announcement_id: id } } } },
    }) as unknown as Notifications.NotificationResponse;
  expect(announcementFromResponse(response("a".repeat(24)))).toBe(
    "a".repeat(24),
  );
  expect(
    announcementFromResponse(response("https://untrusted.example")),
  ).toBeNull();
  expect(announcementFromResponse(response(42))).toBeNull();
});

test("sign-out waits for in-flight registration then removes the device", async () => {
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const request: Request = async <T>() => {
    started();
    await pending;
    return undefined as T;
  };
  const registering = registerNotifications(request);
  await ready;
  const signingOut = unregisterNotifications("old-access");
  release();
  await expect(registering).rejects.toThrow("cancelled");
  await signingOut;
  expect(publicRequest).toHaveBeenCalledWith(
    expect.stringContaining("/me/devices/"),
    { method: "DELETE", token: "old-access" },
  );
  expect(await notificationsEnabled()).toBe(false);
});
