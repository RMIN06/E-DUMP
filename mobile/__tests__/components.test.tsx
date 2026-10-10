import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Native from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Heading } from "../src/components/Heading";
import { Screen } from "../src/components/Screen";
import { Text } from "../src/components/Text";
import { TextAction } from "../src/components/TextAction";
import { Button } from "../src/components/Button";
import { theme } from "../src/theme/tokens";

describe("PRD §9 accessibility/platforms: M0 primitives", () => {
  test("busy buttons announce progress and prevent repeated submission", async () => {
    const press = jest.fn();
    await render(
      <Button
        label="Upload"
        loading
        loadingLabel="Uploading 42%"
        onPress={press}
      />,
    );
    const button = screen.getByRole("button", { name: "Uploading 42%" });
    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
    await fireEvent.press(button);
    expect(press).not.toHaveBeenCalled();
  });
  test("disabled text actions show their unavailable state and ignore taps", async () => {
    const press = jest.fn();
    await render(<TextAction label="Add file" disabled onPress={press} />);
    await fireEvent.press(screen.getByRole("button", { name: "Add file" }));
    expect(press).not.toHaveBeenCalled();
    expect(
      Native.StyleSheet.flatten(screen.getByText("Add file").props.style).color,
    ).toBe(theme.boneMuted);
  });
  test("short text actions retain a 48 dp target in both dimensions", async () => {
    await render(<TextAction label="Close" onPress={() => undefined} />);
    expect(
      Native.StyleSheet.flatten(
        screen.getByRole("button", { name: "Close" }).props.style,
      ),
    ).toMatchObject({ minHeight: 48, minWidth: 48 });
  });
  afterEach(() => jest.restoreAllMocks());
  test.each(
    [320, 360, 430, 800].flatMap((width) =>
      [1, 1.6].map((fontScale) => ({ width, fontScale })),
    ),
  )("wraps at $width dp / $fontScale scale", async ({ width, fontScale }) => {
    jest
      .spyOn(Native.Dimensions, "get")
      .mockReturnValue({ width, height: 800, scale: 1, fontScale });
    await render(
      <Heading>Computer Organization and Assembly Language</Heading>,
    );
    const heading = screen.getByRole("header");
    expect(heading.props.numberOfLines).toBe(3);
    expect(heading.props.allowFontScaling).toBe(true);
    expect(heading.props.maxFontSizeMultiplier).toBe(1.3);
    const style = Native.StyleSheet.flatten(heading.props.style);
    expect(style.fontSize).toBe(width < 360 ? 38 : 44);
    expect(style.width).toBeUndefined();
    expect(style.height).toBeUndefined();
  });
  test("body wraps without truncation and supports large text", async () => {
    await render(
      <Text tone="muted">Class material and alerts, in one place.</Text>,
    );
    const text = screen.getByText("Class material and alerts, in one place.");
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.maxFontSizeMultiplier).toBe(1.6);
    expect(Native.StyleSheet.flatten(text.props.style).color).toBe(
      theme.boneMuted,
    );
  });
  test.each([
    ["default", theme.bone],
    ["accent", theme.moss],
    ["danger", theme.danger],
  ] as const)("%s tone", async (tone, color) => {
    await render(<Text tone={tone}>Material</Text>);
    expect(
      Native.StyleSheet.flatten(screen.getByText("Material").props.style).color,
    ).toBe(color);
  });
  test("labels default to accent", async () => {
    await render(<Text variant="label">Quiz</Text>);
    expect(
      Native.StyleSheet.flatten(screen.getByText("Quiz").props.style).color,
    ).toBe(theme.moss);
  });
  test("screen respects safe areas and constrains tablet content", async () => {
    const metrics = {
      frame: { x: 0, y: 0, width: 800, height: 1280 },
      insets: { top: 40, bottom: 24, left: 0, right: 0 },
    };
    const rendered = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen>
          <Heading>BCS-3E</Heading>
        </Screen>
      </SafeAreaProvider>,
    );
    expect(rendered.toJSON()).toBeTruthy();
    expect(screen.getByRole("header")).toBeTruthy();
    const column = screen.container.queryAll(
      (view) => Native.StyleSheet.flatten(view.props.style)?.maxWidth === 560,
    )[0];
    expect(Native.StyleSheet.flatten(column?.props.style)).toMatchObject({
      width: "100%",
      maxWidth: 560,
      paddingTop: 64,
      paddingBottom: 48,
      paddingLeft: 24,
      paddingRight: 24,
    });
  });
});
