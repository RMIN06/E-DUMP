import { useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import { UpdateNotice } from "./UpdateNotice";
import { canApplyAppUpdate } from "../../lib/appUpdates";

export function AppUpdates() {
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const waiting = useRef<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let alive = true;
    let registration: ServiceWorkerRegistration | undefined;
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void registration?.update().catch(() => undefined);
    };
    const found = () => {
      if (!alive || !registration?.waiting) return;
      waiting.current = registration.waiting;
      setReady(true);
    };
    const installing = () => {
      registration?.installing?.addEventListener("statechange", found);
    };
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((value) => {
        if (!alive) return;
        registration = value;
        found();
        installing();
        registration.addEventListener("updatefound", installing);
        refresh();
      })
      .catch(() => undefined);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      alive = false;
      registration?.removeEventListener("updatefound", installing);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);
  if (!ready) return null;
  return (
    <UpdateNotice
      disabled={busy || !canApplyAppUpdate(path)}
      apply={() => {
        if (busy || !canApplyAppUpdate(path) || !waiting.current) return;
        setBusy(true);
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => window.location.reload(),
          { once: true },
        );
        waiting.current.postMessage({ type: "APPLY_UPDATE" });
      }}
    />
  );
}
