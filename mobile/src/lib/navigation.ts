import { router, type Href } from "expo-router";
import { Platform } from "react-native";

export function goBack(fallback: Href) {
  if (Platform.OS === "web" && !router.canGoBack()) {
    router.replace(fallback);
  } else {
    router.back();
  }
}
