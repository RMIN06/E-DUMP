const { withFinalizedMod } = require("expo/config-plugins");
const { access, mkdir, writeFile } = require("node:fs/promises");
const { join } = require("node:path");

// Expo SDK 55 references this drawable even for a background-only splash.
module.exports = function withPlainSplash(config) {
  return withFinalizedMod(config, [
    "android",
    async (nativeConfig) => {
      const directory = join(
        nativeConfig.modRequest.platformProjectRoot,
        "app/src/main/res/drawable",
      );
      const file = join(directory, "splashscreen_logo.xml");
      try {
        await access(file);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await mkdir(directory, { recursive: true });
        await writeFile(
          file,
          '<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="@android:color/transparent" /></shape>\n',
        );
      }
      return nativeConfig;
    },
  ]);
};
