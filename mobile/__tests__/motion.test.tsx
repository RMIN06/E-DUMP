import { act, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Text, View } from "react-native";
import {
  EntryContext,
  useMotionPreference,
  useRowEntry,
} from "../src/theme/animation";

function Preference() {
  const reduced = useMotionPreference();
  return <Text>{reduced ? "Reduced" : "Animated"}</Text>;
}
function Entry({ id }: { id: string }) {
  const index = useRowEntry(id);
  return <Text>{`${id}:${index ?? "instant"}`}</Text>;
}

afterEach(() => jest.restoreAllMocks());

test("OS reduced-motion changes apply during the session and the listener is removed", async () => {
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(true);
  let change: ((value: boolean) => void) | undefined;
  const subscription = AccessibilityInfo.addEventListener(
    "reduceMotionChanged",
    () => undefined,
  );
  subscription.remove();
  const remove = jest
    .spyOn(subscription, "remove")
    .mockImplementation(() => undefined)
    .mockClear();
  jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation((event: string, listener: unknown) => {
      if (event === "reduceMotionChanged")
        change = listener as (value: boolean) => void;
      return subscription;
    });
  const view = await render(<Preference />);
  await waitFor(() => expect(screen.getByText("Reduced")).toBeTruthy());
  await act(() => change?.(false));
  expect(screen.getByText("Animated")).toBeTruthy();
  await view.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

test("row entrances are capped and previously seen rows remain instant after remount", async () => {
  const scope = { seen: new Set<string>(), count: 0 };
  const items = Array.from({ length: 10 }, (_, index) => `row${index}`);
  const view = await render(
    <EntryContext.Provider value={scope}>
      <View>
        {items.map((id) => (
          <Entry key={id} id={id} />
        ))}
      </View>
    </EntryContext.Provider>,
  );
  expect(screen.getByText("row7:7")).toBeTruthy();
  expect(screen.getByText("row8:instant")).toBeTruthy();
  await view.rerender(
    <EntryContext.Provider value={scope}>
      <View />
    </EntryContext.Provider>,
  );
  await view.rerender(
    <EntryContext.Provider value={scope}>
      <Entry id="row0" />
    </EntryContext.Provider>,
  );
  expect(screen.getByText("row0:instant")).toBeTruthy();
});
