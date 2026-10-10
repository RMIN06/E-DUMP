import { Platform } from "react-native";
import { router } from "expo-router";
import { goBack } from "../src/lib/navigation";
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
}));
const originalPlatform = Platform.OS;
afterEach(() => {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: originalPlatform,
  });
  jest.clearAllMocks();
});
test("direct browser links return to their parent screen", () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  (router.canGoBack as jest.Mock).mockReturnValue(false);
  goBack("/(tabs)/me");
  expect(router.replace).toHaveBeenCalledWith("/(tabs)/me");
  expect(router.back).not.toHaveBeenCalled();
});
test("browser history and native navigation keep the normal back action", () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  (router.canGoBack as jest.Mock).mockReturnValue(true);
  goBack("/(tabs)/subjects");
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: "android",
  });
  goBack("/(tabs)/subjects");
  expect(router.back).toHaveBeenCalledTimes(2);
  expect(router.replace).not.toHaveBeenCalled();
});
