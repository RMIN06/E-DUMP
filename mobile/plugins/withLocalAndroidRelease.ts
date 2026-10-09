import configPlugins, { type ConfigPlugin } from "expo/config-plugins.js";

const withLocalAndroidRelease: ConfigPlugin = (config) => {
  if (process.env.EDUMP_LOCAL_ANDROID_RELEASE !== "1") return config;
  for (const name of [
    "EDUMP_KEYSTORE_FILE",
    "EDUMP_KEYSTORE_PASSWORD",
    "EDUMP_KEY_ALIAS",
  ]) {
    if (!process.env[name])
      throw new Error(`Missing local signing variable: ${name}`);
  }
  return configPlugins.withAppBuildGradle(config, (native) => {
    let source = native.modResults.contents;
    if (source.includes("signingConfig signingConfigs.edumpRelease"))
      return native;
    if (!source.includes("signingConfigs {"))
      throw new Error("Android signing template changed.");
    source = source.replace(
      "signingConfigs {",
      `signingConfigs {
        edumpRelease {
            storeFile file(System.getenv("EDUMP_KEYSTORE_FILE"))
            storePassword System.getenv("EDUMP_KEYSTORE_PASSWORD")
            keyAlias System.getenv("EDUMP_KEY_ALIAS")
            keyPassword System.getenv("EDUMP_KEYSTORE_PASSWORD")
        }`,
    );
    source = source.replace(
      /(release\s*\{[\s\S]*?signingConfig signingConfigs\.)debug/,
      "$1edumpRelease",
    );
    source = source.replace(
      "android {",
      `android {
    splits {
        abi {
            reset()
            enable true
            include "arm64-v8a", "armeabi-v7a"
            universalApk false
        }
    }`,
    );
    if (!source.includes("signingConfig signingConfigs.edumpRelease"))
      throw new Error("Android release template changed.");
    native.modResults.contents = source;
    return native;
  });
};
export default withLocalAndroidRelease;
