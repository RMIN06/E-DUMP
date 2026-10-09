import { useWindowDimensions } from "react-native";

export type SizeClass = "compact" | "regular" | "large" | "tablet";

export function getSizeClass(width: number): SizeClass {
  if (width < 360) return "compact";
  if (width < 430) return "regular";
  if (width < 600) return "large";
  return "tablet";
}

export function useSizeClass() {
  const { width, fontScale } = useWindowDimensions();
  return { sizeClass: getSizeClass(width), fontScale };
}
