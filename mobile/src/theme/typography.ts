import { isLoaded } from "expo-font";
import { Platform, type TextStyle } from "react-native";
import type { SizeClass } from "./responsive";

export const textLimits = {
  headingScale: 1.3,
  bodyScale: 1.6,
  headingLines: 3,
  captionLines: 2,
  rowLines: 2,
  tabScale: 1.2,
} as const;
export const fontNames = {
  heading: "Recoleta-Bold",
  regular: "Berthold-Regular",
  medium: "Berthold-Medium",
  bold: "Berthold-Bold",
} as const;

const sizes = {
  display: { fontSize: 56, lineHeight: 58, letterSpacing: -1 },
  h1: { fontSize: 44, lineHeight: 48, letterSpacing: -0.6 },
  h2: { fontSize: 28, lineHeight: 32, letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 24, letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  label: { fontSize: 14, lineHeight: 18, letterSpacing: 0 },
} as const;
const compactSizes = {
  display: { fontSize: 48, lineHeight: 50 },
  h1: { fontSize: 38, lineHeight: 42 },
  h2: { fontSize: 24, lineHeight: 28 },
} as const;
const fallbackHeading = Platform.OS === "ios" ? "Times New Roman" : "serif";
const fallbackBody = Platform.OS === "ios" ? "System" : "sans-serif";

export type HeadingVariant = "display" | "h1" | "h2";
export type TextVariant = "h3" | "body" | "bodyStrong" | "caption" | "label";

export function headingStyle(
  variant: HeadingVariant,
  sizeClass: SizeClass,
): TextStyle {
  return {
    ...sizes[variant],
    ...(sizeClass === "compact" ? compactSizes[variant] : {}),
    fontFamily: isLoaded(fontNames.heading)
      ? fontNames.heading
      : fallbackHeading,
    fontWeight: "700",
    textAlign: "left",
    flexShrink: 1,
  };
}

export function textStyle(variant: TextVariant): TextStyle {
  const family =
    variant === "label" || variant === "h3"
      ? fontNames.bold
      : variant === "bodyStrong"
        ? fontNames.medium
        : fontNames.regular;
  return {
    ...sizes[variant],
    fontFamily: isLoaded(family) ? family : fallbackBody,
    fontWeight:
      variant === "label" || variant === "h3"
        ? "700"
        : variant === "bodyStrong"
          ? "500"
          : "400",
    textAlign: "left",
    flexShrink: 1,
  };
}
