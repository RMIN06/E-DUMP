const { readdirSync } = require("node:fs");
const coverageThreshold = { global: { lines: 70 } };
for (const folder of ["./src/auth/", "./src/lib/"]) {
  if (readdirSync(folder).some((name) => /\.tsx?$/.test(name))) {
    coverageThreshold[folder] = { lines: 90 };
  }
}

module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/api/schema.d.ts",
    "!src/theme/fontAssets.ts",
  ],
  coverageThreshold,
  setupFilesAfterEnv: ["./__tests__/setup.ts"],
};
