import { useEffect, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { RulesScreen } from "./RulesScreen";

const key = "edump.rules.v1";
export function RulesGate({ children }: PropsWithChildren) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(key).then((value) => {
      if (alive) setAccepted(value === "accepted");
    }).catch(() => { if (alive) setAccepted(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (accepted === false) void SplashScreen.hideAsync(); }, [accepted]);
  if (accepted === null) return null;
  if (accepted) return children;
  const accept = async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try { await AsyncStorage.setItem(key, "accepted"); setAccepted(true); }
    catch { setError("Couldn't save your choice. Try again."); }
    finally { setWorking(false); }
  };
  return <RulesScreen onContinue={() => void accept()} working={working} error={error} />;
}
