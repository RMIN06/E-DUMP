import { createContext, useContext, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { motion } from "./motion";

export function useMotionPreference() {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { alive = false; listener.remove(); };
  }, []);
  return reduced;
}

export type EntryScope = { seen: Set<string>; count: number };
export const EntryContext = createContext<EntryScope | null>(null);
export function useRowEntry(key: string) {
  const scope = useContext(EntryContext);
  const [index] = useState(() => {
    if (!scope || scope.seen.has(key)) return null;
    scope.seen.add(key);
    const next = scope.count++;
    return next < motion.staggerLimit ? next : null;
  });
  return index;
}
