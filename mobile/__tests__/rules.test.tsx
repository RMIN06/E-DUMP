import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { RulesGate } from "../src/features/rules/RulesGate";

jest.mock("expo-splash-screen", () => ({ hideAsync: jest.fn(async () => undefined) }));
describe("PRD §10 first-launch content rules", () => {
  beforeEach(async () => { jest.restoreAllMocks(); await AsyncStorage.clear(); });
  test("shows rules before sign-in and persists acknowledgement", async () => {
    await render(<RulesGate><Text>Sign in</Text></RulesGate>);
    expect(await screen.findByText("Rules")).toBeTruthy();
    expect(screen.queryByText("Sign in")).toBeNull();
    expect(screen.getByRole("button", { name: "l250716@lhr.nu.edu.pk" })).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(await AsyncStorage.getItem("edump.rules.v1")).toBe("accepted");
  });
  test("accepted installations skip the first-launch screen", async () => {
    await AsyncStorage.setItem("edump.rules.v1", "accepted");
    await render(<RulesGate><Text>Sign in</Text></RulesGate>);
    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(screen.queryByText("Rules")).toBeNull();
  });
  test("failed storage keeps rules visible and permits retry", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
    await render(<RulesGate><Text>Sign in</Text></RulesGate>);
    fireEvent.press(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Couldn't save your choice. Try again.")).toBeTruthy();
    expect(screen.queryByText("Sign in")).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" }).props.accessibilityState.busy).toBe(false));
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Sign in")).toBeTruthy();
  });
});
