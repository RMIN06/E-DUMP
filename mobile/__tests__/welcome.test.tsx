import { fireEvent, render, screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WelcomeGate, welcomeKey } from "../src/features/auth/WelcomeGate";
import { Text } from "../src/components/Text";

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

test("first installation welcomes the student and Continue persists across remounts", async () => {
  const view = await render(
    <WelcomeGate>
      <Text>Student email form</Text>
    </WelcomeGate>,
  );
  expect(await screen.findByRole("button", { name: "Continue" })).toBeTruthy();
  expect(screen.queryByText("Student email form")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  expect(await screen.findByText("Student email form")).toBeTruthy();
  expect(await AsyncStorage.getItem(welcomeKey)).toBe("true");
  await view.unmount();
  await render(
    <WelcomeGate>
      <Text>Student email form</Text>
    </WelcomeGate>,
  );
  expect(await screen.findByText("Student email form")).toBeTruthy();
  expect(screen.queryByText(/Welcome to E-DUMP/)).toBeNull();
});

test("a failed preference write leaves Continue available to retry", async () => {
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("storage"));
  await render(
    <WelcomeGate>
      <Text>Student email form</Text>
    </WelcomeGate>,
  );
  await screen.findByRole("button", { name: "Continue" });
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  expect(
    await screen.findByText(
      "Couldn't save your welcome preference. Try again.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Student email form")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Student email form")).toBeTruthy();
});
