import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { queryClient } from "../api/queryClient";
import { sessionActions } from "./session";
export const SYNC_INTERVAL_MS = 120_000;
export const MIN_SYNC_GAP_MS = 30_000;
export const MAX_BACKOFF_MS = 15 * 60_000;
export function useLiveSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lastSync = 0;
    let failures = 0;
    let running = false;
    const sync = async () => {
      if (running || AppState.currentState !== "active") return;
      if (
        Platform.OS === "web" &&
        (!navigator.onLine || document.visibilityState !== "visible")
      )
        return;
      const gap = failures
        ? Math.min(SYNC_INTERVAL_MS * 2 ** (failures - 1), MAX_BACKOFF_MS)
        : MIN_SYNC_GAP_MS;
      if (Date.now() - lastSync < gap) return;
      running = true;
      lastSync = Date.now();
      try {
        await sessionActions.syncProfile();
        failures = 0;
        void queryClient.invalidateQueries({ refetchType: "active" });
      } catch {
        failures += 1;
      } finally {
        running = false;
      }
    };
    const timer = setInterval(() => void sync(), SYNC_INTERVAL_MS);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [enabled]);
}
