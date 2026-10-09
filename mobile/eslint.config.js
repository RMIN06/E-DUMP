const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");

const banned = [
  "expo-linear-gradient",
  "expo-blur",
  "lottie-react-native",
  "nativewind",
  "react-native-paper",
  "native-base",
  "tamagui",
  "axios",
  "redux",
  "@reduxjs/toolkit",
  "framer-motion",
  "motion",
  "firebase",
  "react-native-web",
];

module.exports = defineConfig([
  expo,
  { ignores: ["coverage/**", ".expo/**", "src/api/schema.d.ts"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: banned }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='numColumns']",
          message: "Use a single column.",
        },
        {
          selector: "TSAnyKeyword",
          message: "Use a concrete type or unknown.",
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: banned,
          patterns: [
            {
              group: [
                "../api/**",
                "../auth/**",
                "../features/**",
                "../lib/**",
                "../components/**",
                "./*",
              ],
              message: "Primitives may import only theme modules within src.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: banned,
          patterns: [
            {
              group: ["**/api/client", "**/api/schema"],
              message: "Routes use resource hooks, not API internals.",
            },
          ],
        },
      ],
    },
  },
]);
