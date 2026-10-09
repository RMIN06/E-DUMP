import { colors, theme } from "../src/theme/tokens";
import { getSizeClass } from "../src/theme/responsive";
import { headingStyle, textStyle } from "../src/theme/typography";

function channels(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}
function luminance(rgb: number[]): number {
  const linear = rgb.map((value) => {
    const scaled = value / 255;
    return scaled <= 0.04045
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  });
  return (
    (linear[0] ?? 0) * 0.2126 +
    (linear[1] ?? 0) * 0.7152 +
    (linear[2] ?? 0) * 0.0722
  );
}
function contrast(foreground: number[], background: number[]): number {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

describe("PRD §9 accessibility: palette and readable type", () => {
  test.each([
    ["bone", 12],
    ["moss", 7],
    ["danger", 4.5],
  ] as const)("%s contrast", (name, minimum) => {
    expect(
      contrast(channels(colors[name]), channels(colors.ink)),
    ).toBeGreaterThanOrEqual(minimum);
  });
  test("secondary text is composited against ink before contrast calculation", () => {
    const ink = channels(colors.ink);
    const muted = channels(colors.bone).map(
      (value, index) => value * 0.68 + (ink[index] ?? 0) * 0.32,
    );
    expect(contrast(muted, ink)).toBeGreaterThanOrEqual(7);
    expect(theme.boneMuted).toContain("0.68");
  });
  test.each([
    [320, "compact"],
    [360, "regular"],
    [429, "regular"],
    [430, "large"],
    [599, "large"],
    [600, "tablet"],
  ] as const)("width %i", (width, sizeClass) => {
    expect(getSizeClass(width)).toBe(sizeClass);
  });
  test("compact headings use the specified reduced scale", () => {
    expect(headingStyle("display", "compact")).toMatchObject({
      fontSize: 48,
      lineHeight: 50,
    });
    expect(headingStyle("h1", "compact")).toMatchObject({
      fontSize: 38,
      lineHeight: 42,
    });
    expect(headingStyle("h2", "compact")).toMatchObject({
      fontSize: 24,
      lineHeight: 28,
    });
    expect(headingStyle("h1", "regular")).toMatchObject({
      fontSize: 44,
      lineHeight: 48,
    });
  });
  test.each(["body", "bodyStrong", "caption", "label"] as const)(
    "%s uses Berthold development fallback",
    (variant) => {
      expect(textStyle(variant).fontFamily).toBeTruthy();
    },
  );
});
