import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { usePathname } from "expo-router";
import * as Updates from "expo-updates";
import { UpdateNotice } from "./UpdateNotice";
import { canApplyAppUpdate } from "../../lib/appUpdates";

export function AppUpdates() {
  const path = usePathname();
  const { isUpdatePending } = Updates.useUpdates();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!Updates.isEnabled) return;
    let checking = false;
    let last = 0;
    const check = async () => {
      if (checking || Date.now() - last < 5 * 60 * 1000) return;
      checking = true;
      last = Date.now();
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline checks keep the current downloaded app available.
      } finally {
        checking = false;
      }
    };
    void check();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => listener.remove();
  }, []);
  if (!Updates.isEnabled || !isUpdatePending) return null;
  return (
    <UpdateNotice
      disabled={busy || !canApplyAppUpdate(path)}
      apply={() => {
        if (busy || !canApplyAppUpdate(path)) return;
        setBusy(true);
        void Updates.reloadAsync().catch(() => setBusy(false));
      }}
    />
  );
}
