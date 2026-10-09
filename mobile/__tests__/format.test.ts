import {
  classTime,
  fileSize,
  karachiDay,
  karachiTime,
  relativeTime,
} from "../src/lib/format";

test("SCH-1 day and clock are in Karachi, regardless of UTC device date", () => {
  const now = new Date("2026-10-08T20:30:00Z");
  expect(karachiDay(now)).toBe(5);
  expect(karachiTime(now)).toBe("01:30");
});
test.each([
  ["00:30", "12:30 AM"],
  ["08:30", "8:30 AM"],
  ["12:00", "12:00 PM"],
  ["14:30", "2:30 PM"],
])("formats %s", (value, expected) => expect(classTime(value)).toBe(expected));
test.each([
  [10, "10 B"],
  [2048, "2.0 KB"],
  [1258291, "1.2 MB"],
])("formats %s bytes", (value, expected) =>
  expect(fileSize(value as number)).toBe(expected),
);
test.each([
  [0, "0m ago"],
  [120000, "2m ago"],
  [7200000, "2h ago"],
  [259200000, "3d ago"],
  [691200000, "Thu 1 Oct"],
])("formats age %s", (age, expected) => {
  const now = new Date("2026-10-09T10:00:00Z");
  expect(
    relativeTime(new Date(now.getTime() - (age as number)).toISOString(), now),
  ).toBe(expected);
});
