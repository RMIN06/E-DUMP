import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { queryClient } from "../api/queryClient";
import { sessionActions } from "./session";
export function useLiveSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const sync = () => {
      if (AppState.currentState !== "active") return;
      if (
        Platform.OS === "web" &&
        (!navigator.onLine || document.visibilityState !== "visible")
      )
        return;
      void sessionActions.syncProfile().catch(() => undefined);
      void queryClient.invalidateQueries({ refetchType: "active" });
    };
    const timer = setInterval(sync, 30_000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [enabled]);
}
