import { render, screen } from "@testing-library/react-native";
import RootLayout from "../app/_layout";

jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));
jest.mock("../src/features/auth/AuthGate", () => ({
  // An unresolved session must not hide the update that repairs connectivity.
  AuthGate: () => null,
}));
jest.mock("../src/features/rules/RulesGate", () => ({
  RulesGate: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../src/features/notifications/NotificationsSetup", () => ({
  NotificationsSetup: () => null,
}));
jest.mock("../src/features/appUpdates/AppUpdates", () => ({
  AppUpdates: () => {
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <Text>Recovery update ready</Text>;
  },
}));

test("a failed authentication gate cannot hide an installed recovery update", async () => {
  await render(<RootLayout />);
  expect(await screen.findByText("Recovery update ready")).toBeTruthy();
});
