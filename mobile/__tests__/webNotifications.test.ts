import { webcrypto } from "node:crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Request } from "../src/api/transport";
import {
  registerNotifications,
  disableNotifications,
  unregisterNotifications,
  notificationsEnabled,
  pushProjectId,
} from "../src/lib/notifications.web";
jest.mock("../src/api/transport", () => ({
  publicRequest: jest.fn(async () => undefined),
}));
const subscribe = jest.fn();
const unsubscribe = jest.fn(async () => true);
const getSubscription = jest.fn();
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test",
  toJSON: () => ({
    endpoint: "https://fcm.googleapis.com/fcm/send/test",
    expirationTime: null,
    keys: { auth: "synthetic", p256dh: "synthetic" },
  }),
  unsubscribe,
};
let permission: { permission: string; requestPermission: jest.Mock };
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  getSubscription.mockResolvedValue(null);
  subscribe.mockResolvedValue(subscription);
  permission = {
    permission: "granted",
    requestPermission: jest.fn(async () => "granted"),
  };
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: permission,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { PushManager: {}, Notification: permission },
  });
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serviceWorker: {
        register: jest.fn(async () => undefined),
        ready: Promise.resolve({ pushManager: { subscribe, getSubscription } }),
      },
    },
  });
});
function api(
  key:
    | string
    | null = "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
) {
  return jest.fn(async (path: string) =>
    path === "/me/web-push-key" ? { public_key: key } : undefined,
  ) as unknown as jest.Mock & Request;
}
test("registers a browser subscription without expirationTime and disables its owned device", async () => {
  const request = api();
  const id = await registerNotifications(request, true);
  expect(id).toMatch(/^webpush:[a-f\d]{64}$/);
  expect(permission.requestPermission).toHaveBeenCalledTimes(1);
  const write = request.mock.calls.find(([path]) => path === "/me/web-devices");
  expect(write?.[1].body.subscription).toEqual({
    endpoint: subscription.endpoint,
    keys: subscription.toJSON().keys,
  });
  expect(subscribe).toHaveBeenCalledWith(
    expect.objectContaining({ userVisibleOnly: true }),
  );
  getSubscription.mockResolvedValue(subscription);
  expect(await notificationsEnabled()).toBe(true);
  await disableNotifications(request);
  expect(request).toHaveBeenCalledWith(
    `/me/devices/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  expect(unsubscribe).toHaveBeenCalled();
  expect(await notificationsEnabled()).toBe(false);
});
test("denied permission and missing server key do not register a device", async () => {
  permission.permission = "denied";
  const request = api();
  await expect(registerNotifications(request)).rejects.toThrow(
    "Allow notifications",
  );
  expect(request).not.toHaveBeenCalled();
  permission.permission = "granted";
  await expect(registerNotifications(api(null))).rejects.toThrow(
    "not configured",
  );
  expect(subscribe).not.toHaveBeenCalled();
});
test("unsupported browsers show iPhone installation guidance and logout unsubscribes", async () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  expect(pushProjectId()).toBeUndefined();
  expect(await notificationsEnabled()).toBe(false);
  await expect(registerNotifications(api(), true)).rejects.toThrow(
    "Home Screen",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { PushManager: {}, Notification: permission },
  });
  getSubscription.mockResolvedValue(subscription);
  await unregisterNotifications("access-test");
  expect(unsubscribe).toHaveBeenCalled();
});
