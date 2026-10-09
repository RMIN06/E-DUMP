import { fireEvent, render, screen, act } from "@testing-library/react-native";
import { router } from "expo-router";
import { AppState } from "react-native";
import { ScheduleScreen } from "../src/features/schedule/ScheduleScreen";
import { useSchedule } from "../src/api/schedule";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../src/api/schedule", () => ({ useSchedule: jest.fn() }));
jest.mock("../src/api/useFocusRead", () => ({ useFocusRead: jest.fn() }));
jest.mock("../src/theme/responsive", () => ({
  useSizeClass: () => ({ sizeClass: "regular", fontScale: 1 }),
}));
const slots = [
  {
    id: "a",
    subject_slug: "coal",
    subject_name: "COAL",
    short_name: "COAL",
    teacher: "Ms. Aleena",
    weekday: 1,
    start: "09:00",
    end: "10:00",
    venue: "C-402",
  },
  {
    id: "b",
    subject_slug: "ds",
    subject_name: "Data Structures",
    short_name: "DS",
    teacher: "Mr. A",
    weekday: 1,
    start: "11:00",
    end: "12:00",
    venue: "F-303",
  },
];
const refetch = jest.fn();
beforeEach(() => {
  AppState.currentState = "active";
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-05T04:30:00Z"));
  jest.mocked(useSchedule).mockReturnValue({
    data: slots,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch,
  } as unknown as ReturnType<typeof useSchedule>);
});
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});
test("SCH-1 opens on Karachi today, marks the current class and navigates", async () => {
  await render(<ScheduleScreen />);
  expect(
    screen.getByRole("button", { name: "Mon" }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(screen.getByText("Now")).toBeTruthy();
  expect(screen.queryByText("Next")).toBeNull();
  expect(screen.getByText("9:00 AM – 10:00 AM")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /Now, 9:00/ }));
  expect(router.push).toHaveBeenCalledWith("/subject/coal");
});
test("all seven days are selectable and weekends have no classes", async () => {
  jest.setSystemTime(new Date("2026-10-09T20:30:00Z"));
  await render(<ScheduleScreen />);
  expect(
    screen.getByRole("button", { name: "Sat" }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(screen.getByText("No classes")).toBeTruthy();
  for (const day of ["Fri", "Sat", "Sun"])
    expect(screen.getByRole("button", { name: day })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Mon" }));
  expect(screen.getByText("COAL")).toBeTruthy();
  expect(screen.queryByText("Now")).toBeNull();
});
test("the next class updates when the foreground clock advances", async () => {
  await render(<ScheduleScreen />);
  await act(() => {
    jest.setSystemTime(new Date("2026-10-05T05:30:00Z"));
    jest.advanceTimersByTime(60_000);
  });
  expect(screen.getByRole("button", { name: /Next, 11:00/ })).toBeTruthy();
  expect(screen.queryByText("Now")).toBeNull();
});
test("cached schedule remains readable on refresh failure", async () => {
  jest.mocked(useSchedule).mockReturnValue({
    data: slots,
    isPending: false,
    isError: true,
    isRefetching: false,
    refetch,
  } as unknown as ReturnType<typeof useSchedule>);
  await render(<ScheduleScreen />);
  expect(screen.getByText("Offline. Showing saved data.")).toBeTruthy();
  expect(screen.getByText("COAL")).toBeTruthy();
});
test("first-load failure has retry and no false empty schedule", async () => {
  jest.mocked(useSchedule).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
    isRefetching: false,
    refetch,
  } as unknown as ReturnType<typeof useSchedule>);
  await render(<ScheduleScreen />);
  expect(screen.queryByText("No classes")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalled();
});
