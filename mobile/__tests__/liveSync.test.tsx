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

test("syncs visible data, pauses in background and stops after sign-out", async () => {
  jest.useFakeTimers();
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    value: "active",
    writable: true,
  });
  let change: (state: AppStateStatus) => void = () => undefined;
  const remove = jest.fn();
  const listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      change = callback;
      return { remove };
    });
  const { rerender, unmount } = await renderHook<void, { enabled: boolean }>(
    ({ enabled }) => useLiveSync(enabled),
    { initialProps: { enabled: false } },
  );
  await act(() => jest.advanceTimersByTime(30_000));
  expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  await rerender({ enabled: true });
  await act(() => jest.advanceTimersByTime(30_000));
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
  AppState.currentState = "background";
  await act(() => {
    change("background");
    jest.advanceTimersByTime(30_000);
  });
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
  AppState.currentState = "active";
  await act(() => change("active"));
  expect(sessionActions.syncProfile).toHaveBeenCalledTimes(2);
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: false },
  });
  await act(() => jest.advanceTimersByTime(30_000));
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: true },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState: "hidden" },
  });
  await act(() => jest.advanceTimersByTime(30_000));
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState: "visible" },
  });
  await act(() => jest.advanceTimersByTime(30_000));
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  await rerender({ enabled: false });
  await unmount();
  expect(remove).toHaveBeenCalled();
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: original,
  });
  listener.mockRestore();
  jest.useRealTimers();
});
