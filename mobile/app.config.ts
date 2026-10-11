import type { ExpoConfig } from "expo/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { colors } from "./src/theme/tokens.ts";
import { layout } from "./src/theme/spacing.ts";
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
  slug: "e-dump",
  owner: "rmin06s-team",
  version: "0.1.7",
  runtimeVersion: "edump-android-1",
  updates: {
    url: "https://u.expo.dev/37e1b246-6c7a-4c9c-926b-7a0be8095b02",
    requestHeaders: { "expo-channel-name": "preview" },
    checkAutomatically: "ON_LOAD",
  },
  icon: "./assets/brand/icon.png",
  scheme: "edump",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  platforms: ["android", "ios", "web"],
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/brand/icon.png",
  },
  jsEngine: "hermes",
  backgroundColor: colors.ink,
  ios: { supportsTablet: true, bundleIdentifier: "com.edump.bcs3e" },
  android: {
    package: "com.edump.bcs3e",
    versionCode: 8,
    adaptiveIcon: {
      foregroundImage: "./assets/brand/adaptive-icon.png",
      backgroundColor: colors.ink,
    },
    ...(existsSync(resolve(__dirname, "google-services.json"))
      ? { googleServicesFile: "./google-services.json" }
      : {}),
  },
  extra: {
    eas: { projectId: "37e1b246-6c7a-4c9c-926b-7a0be8095b02" },
    pushConfigured: existsSync(resolve(__dirname, "google-services.json")),
  },
  androidStatusBar: { backgroundColor: colors.ink, barStyle: "light-content" },
  androidNavigationBar: {
    backgroundColor: colors.ink,
    barStyle: "light-content",
  },
  plugins: [
    [
      "expo-notifications",
      {
        icon: "./assets/brand/notification.png",
        color: colors.moss,
        defaultChannel: "default",
      },
    ],
    "expo-router",
    ["expo-font", { fonts: fontPaths }],
    [
      "expo-splash-screen",
      {
        backgroundColor: colors.ink,
        image: "./assets/brand/splash.png",
        imageWidth: layout.brandSize,
      },
    ],
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
