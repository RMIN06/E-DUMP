import { useEffect } from "react";
import Svg, { Path, Rect, Circle, Polygon } from "react-native-svg";
import { brand } from "../theme/brand";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { layout } from "../theme/spacing";
import { useTheme } from "../theme/tokens";
import { useMotionPreference } from "../theme/animation";
import { motion } from "../theme/motion";

type IconName =
  | "updates"
  | "subjects"
  | "schedule"
  | "me"
  | "back"
  | "overflow"
  | "upload"
  | "brand";
export function Icon({
  name,
  active = false,
  size = layout.iconSize,
}: {
  name: IconName;
  active?: boolean;
  size?: number;
}) {
  const theme = useTheme();
  const reduced = useMotionPreference();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = reduced
      ? 1
      : withSpring(active ? motion.iconActiveScale : 1, motion.spring);
  }, [active, reduced, scale]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const face = active ? theme.moss : theme.boneMuted;
  const edge = theme.olive;
  const highlight = theme.bone;
  if (name === "brand") {
    return (
      <Svg
        width={size}
        height={size}
        viewBox={brand.viewBox}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {brand.layers.map((layer, index) => (
          <Polygon key={index} points={layer.points} fill={theme[layer.tone]} />
        ))}
      </Svg>
    );
  }
  if (name === "back" || name === "overflow") {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {name === "back" ? (
          <Path
            d="m20 7-9 9 9 9"
            fill="none"
            stroke={face}
            strokeWidth={layout.iconStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <Circle cx="7" cy="16" r="2" fill={face} />
            <Circle cx="16" cy="16" r="2" fill={face} />
            <Circle cx="25" cy="16" r="2" fill={face} />
          </>
        )}
      </Svg>
    );
  }
  return (
    <Animated.View
      style={animated}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {name === "subjects" ? (
          <>
            <Path d="M4 8 15 5 28 9v19l-13-4-11 3Z" fill={edge} />
            <Path d="m3 5 12-3v20L3 25Z" fill={face} />
            <Path d="m16 3 12 4v18l-12-4Z" fill={highlight} />
            <Path
              d="m18 8 7 2v2l-7-2Zm0 5 7 2v2l-7-2Zm0 5 5 1.5v2L18 20Z"
              fill={edge}
            />
          </>
        ) : name === "schedule" ? (
          <>
            <Rect x="5" y="7" width="24" height="23" rx="5" fill={edge} />
            <Rect x="3" y="4" width="24" height="23" rx="5" fill={face} />
            <Path d="M3 11h24v3H3Z" fill={edge} />
            <Path d="M9 2h3v6H9Zm10 0h3v6h-3Z" fill={highlight} />
            <Path
              d="M9 17h4v3H9Zm8 0h4v3h-4Zm-8 5h4v2H9Zm8 0h4v2h-4Z"
              fill={theme.ink}
            />
          </>
        ) : name === "updates" ? (
          <>
            <Path d="M7 23v-8c0-6 4-10 10-10s10 4 10 10v8l3 3H4Z" fill={edge} />
            <Path d="M5 21v-8c0-6 4-10 10-10s10 4 10 10v8l3 3H2Z" fill={face} />
            <Path d="M11 27h8c0 5-8 5-8 0Z" fill={highlight} />
            <Path d="M9 13c0-4 2-6 5-7v3c-2 1-3 2-3 4Z" fill={highlight} />
          </>
        ) : name === "me" ? (
          <>
            <Circle cx="18" cy="10" r="7" fill={edge} />
            <Path d="M6 30v-5c0-6 5-9 12-9s12 3 12 9v5Z" fill={edge} />
            <Circle cx="15" cy="8" r="7" fill={highlight} />
            <Path d="M3 27v-5c0-5 5-8 12-8s12 3 12 8v5Z" fill={face} />
            <Path d="M9 18c3 2 9 2 12 0l-2 4h-8Z" fill={highlight} />
          </>
        ) : (
          <>
            <Path d="M8 6h13l8 8v16H8Z" fill={edge} />
            <Path d="M4 2h13l8 8v16H4Z" fill={face} />
            <Path d="M17 2v8h8Z" fill={highlight} />
            <Path d="m14 11-6 6h4v6h4v-6h4Z" fill={theme.ink} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}
