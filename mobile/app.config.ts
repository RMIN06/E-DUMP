import type { ExpoConfig } from "expo/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { colors } from "./src/theme/tokens.ts";
import withCompatibleGradle from "./plugins/withCompatibleGradle.ts";
import withLocalAndroidRelease from "./plugins/withLocalAndroidRelease.ts";

const requiredFonts = [
  "Recoleta-Bold.otf",
  "Berthold-Regular.otf",
  "Berthold-Medium.otf",
  "Berthold-Bold.otf",
];
const fontPaths = requiredFonts
  .concat("Recoleta-SemiBold.otf")
  .filter((file) => existsSync(resolve(__dirname, "assets/fonts", file)))
  .map((file) => `./assets/fonts/${file}`);
const release = ["preview", "production"].includes(
  process.env.EAS_BUILD_PROFILE ?? "",
);
const previewFallback =
  process.env.EAS_BUILD_PROFILE === "preview" &&
  process.env.EDUMP_PREVIEW_FALLBACK_FONTS === "1";
if (
  release &&
  !previewFallback &&
  requiredFonts.some(
    (file) => !existsSync(resolve(__dirname, "assets/fonts", file)),
  )
) {
  throw new Error(
    "Licensed Recoleta and Berthold fonts are required for release builds.",
  );
}

const config: ExpoConfig = {
  name: "E-DUMP",
  slug: "edump",
  version: "0.1.0",
  scheme: "edump",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  platforms: ["android", "ios"],
  jsEngine: "hermes",
  backgroundColor: colors.ink,
  ios: { supportsTablet: true, bundleIdentifier: "com.edump.bcs3e" },
  android: { package: "com.edump.bcs3e" },
  androidStatusBar: { backgroundColor: colors.ink, barStyle: "light-content" },
  androidNavigationBar: {
    backgroundColor: colors.ink,
    barStyle: "light-content",
  },
  plugins: [
    "expo-notifications",
    "expo-router",
    ["expo-font", { fonts: fontPaths }],
    ["expo-splash-screen", { backgroundColor: colors.ink }],
    "./plugins/withPlainSplash.cjs",
    "expo-system-ui",
    "expo-secure-store",
    [
      "expo-build-properties",
      {
        android: { minSdkVersion: 26 },
        ios: { deploymentTarget: "15.1" },
      },
    ],
  ],
};

export default withLocalAndroidRelease(withCompatibleGradle(config));
