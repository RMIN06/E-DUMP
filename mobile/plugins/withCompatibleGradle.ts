import configPlugins, { type ConfigPlugin } from "expo/config-plugins.js";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// React Native 0.83's Foojay resolver uses an API removed in Gradle 9.
// Pin the latest compatible Gradle 8 maintenance release for every prebuild.
const withCompatibleGradle: ConfigPlugin = (config) => {
  config = configPlugins.withProjectBuildGradle(config, (native) => {
    const marker = "// Align Expo development module annotation classpaths.";
    if (!native.modResults.contents.includes(marker)) {
      native.modResults.contents += `
${marker}
subprojects {
  if (name in ["expo-dev-menu", "expo-dev-launcher"]) {
    configurations.configureEach {
      resolutionStrategy.force "org.jetbrains:annotations:23.0.0"
    }
  }
}
`;
    }
    const memoryMarker = "// Bound local native compilation to one job.";
    const memoryRules = `
${memoryMarker}
if (System.getenv("EDUMP_LOCAL_ANDROID_RELEASE") == "1") {
  subprojects {
    ["com.android.library", "com.android.application"].each { androidPlugin ->
      plugins.withId(androidPlugin) {
        android.defaultConfig.externalNativeBuild.cmake.arguments(
          "-DCMAKE_JOB_POOLS=edump_native=1",
          "-DCMAKE_JOB_POOL_COMPILE=edump_native",
          "-DCMAKE_JOB_POOL_LINK=edump_native"
        )
      }
    }
  }
}
`;
    const anchor = 'apply plugin: "expo-root-project"';
    const source = native.modResults.contents.replace(memoryRules, "");
    if (!source.includes(anchor))
      throw new Error("Android root plugin template changed.");
    // React's root plugin evaluates :app immediately, so register before it.
    native.modResults.contents = source.replace(
      anchor,
      `${memoryRules}\n${anchor}`,
    );
    return native;
  });
  return configPlugins.withDangerousMod(config, [
    "android",
    async (nativeConfig) => {
      const file = join(
        nativeConfig.modRequest.platformProjectRoot,
        "gradle/wrapper/gradle-wrapper.properties",
      );
      const original = await readFile(file, "utf8");
      const updated = original
        .replace(/gradle-[\d.]+-bin\.zip/, "gradle-8.14.6-bin.zip")
        .replace(/^distributionSha256Sum=.*\r?\n?/m, "");
      await writeFile(
        file,
        `${updated.trimEnd()}\ndistributionSha256Sum=7988ed071b2a07900e2ec715fca15c6ab72bce6db433af301fa7fa7e9407bd24\n`,
      );
      return nativeConfig;
    },
  ]);
};

export default withCompatibleGradle;
