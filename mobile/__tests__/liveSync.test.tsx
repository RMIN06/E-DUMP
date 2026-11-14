import { renderHook, act } from "@testing-library/react-native";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { useLiveSync } from "../src/lib/useLiveSync";
import { queryClient } from "../src/api/queryClient";
import { sessionActions } from "../src/lib/session";
jest.mock("../src/lib/session", () => ({
  sessionActions: { syncProfile: jest.fn(async () => undefined) },
}));
jest.mock("../src/api/queryClient", () => ({
  queryClient: { invalidateQueries: jest.fn(async () => undefined) },
}));

const syncProfile = sessionActions.syncProfile as jest.Mock;
const invalidate = queryClient.invalidateQueries as jest.Mock;
let change: (state: AppStateStatus) => void = () => undefined;
const remove = jest.fn();
let listener: jest.SpyInstance;
const tick = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
const focus = () =>
  act(async () => {
    change("active");
  });

beforeEach(() => {
  jest.useFakeTimers();
  syncProfile.mockReset().mockResolvedValue(undefined);
  invalidate.mockClear();
  remove.mockClear();
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    value: "active",
    writable: true,
  });
  listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      change = callback;
      return { remove };
    });
});
afterEach(() => {
  listener.mockRestore();
  jest.useRealTimers();
});

test("syncs every two minutes, skips background or hidden tabs and ignores rapid refocus", async () => {
  const { rerender, unmount } = await renderHook<void, { enabled: boolean }>(
    ({ enabled }) => useLiveSync(enabled),
    { initialProps: { enabled: false } },
  );
  await tick(120_000);
  expect(syncProfile).not.toHaveBeenCalled();
  await rerender({ enabled: true });
  await tick(119_999);
  expect(syncProfile).not.toHaveBeenCalled();
  await tick(1);
  expect(syncProfile).toHaveBeenCalledTimes(1);
  expect(invalidate).toHaveBeenCalledTimes(1);
  AppState.currentState = "background";
  await act(async () => change("background"));
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(1);
  AppState.currentState = "active";
  await focus();
  expect(syncProfile).toHaveBeenCalledTimes(2);
  await focus();
  expect(syncProfile).toHaveBeenCalledTimes(2);
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: false },
  });
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(2);
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: true },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState: "hidden" },
  });
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(2);
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState: "visible" },
  });
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(3);
  expect(invalidate).toHaveBeenCalledTimes(3);
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: original,
  });
  await rerender({ enabled: false });
  await unmount();
  expect(remove).toHaveBeenCalled();
});

test("backs off while the server is failing and resumes after it recovers", async () => {
  syncProfile.mockRejectedValue(new Error("Too many requests"));
  await renderHook(() => useLiveSync(true));
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(1);
  expect(invalidate).not.toHaveBeenCalled();
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(2);
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(2);
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(3);
  await focus();
  expect(syncProfile).toHaveBeenCalledTimes(3);
  syncProfile.mockResolvedValue(undefined);
  await tick(360_000);
  expect(syncProfile).toHaveBeenCalledTimes(3);
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(4);
  expect(invalidate).toHaveBeenCalledTimes(1);
  await tick(120_000);
  expect(syncProfile).toHaveBeenCalledTimes(5);
});
