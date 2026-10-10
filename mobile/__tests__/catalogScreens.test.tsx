import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { SubjectsScreen } from "../src/features/subjects/SubjectsScreen";
import { Row } from "../src/components/Row";
import { FilterText } from "../src/components/FilterText";
import { useSubjects } from "../src/api/subjects";
import { useSizeClass } from "../src/theme/responsive";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../src/api/subjects", () => ({ useSubjects: jest.fn() }));
jest.mock("../src/api/useFocusRead", () => ({ useFocusRead: jest.fn() }));
jest.mock("../src/theme/responsive", () => ({
  useSizeClass: jest.fn(() => ({ sizeClass: "regular", fontScale: 1 })),
}));
const refetch = jest.fn();
const subject = {
  id: "one",
  slug: "coal",
  name: "Computer Organization and Assembly Language",
  short_name: "COAL",
  credits: 3,
  teacher: "Ms. Aleena Ahmad",
  kind: "theory" as const,
  sort_order: 2,
  aliases: [],
  material_count: 12,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useSizeClass)
    .mockReturnValue({ sizeClass: "regular", fontScale: 1 });
  jest.mocked(useSubjects).mockReturnValue({
    data: [subject],
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch,
  } as unknown as ReturnType<typeof useSubjects>);
});

test("SUB-1 course rows show teacher, credits and files and open the subject", async () => {
  await render(<SubjectsScreen />);
  expect(screen.getByText("Ms. Aleena Ahmad · 3 credits")).toBeTruthy();
  expect(screen.getByText("12 files")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: /Computer Organization/ }),
  );
  expect(router.push).toHaveBeenCalledWith("/subject/coal");
});
test("UHQ uses the specified missing-data placeholder", async () => {
  jest.mocked(useSubjects).mockReturnValue({
    data: [{ ...subject, teacher: null, credits: null }],
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch,
  } as unknown as ReturnType<typeof useSubjects>);
  await render(<SubjectsScreen />);
  expect(screen.getByText("Credits and teacher to be added")).toBeTruthy();
});
test("cached data stays readable on a failed network refresh", async () => {
  jest.mocked(useSubjects).mockReturnValue({
    data: [subject],
    isPending: false,
    isError: true,
    isRefetching: false,
    refetch,
  } as unknown as ReturnType<typeof useSubjects>);
  await render(<SubjectsScreen />);
  expect(screen.getByText("Offline. Showing saved data.")).toBeTruthy();
  expect(screen.getByText(subject.name)).toBeTruthy();
});
test("first-load failure offers retry", async () => {
  jest.mocked(useSubjects).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
    isRefetching: false,
    refetch,
  } as unknown as ReturnType<typeof useSubjects>);
  await render(<SubjectsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalled();
});
test.each([1, 1.6])(
  "Row moves trailing text below at %s body scale when needed",
  async (fontScale) => {
    jest
      .mocked(useSizeClass)
      .mockReturnValue({ sizeClass: "compact", fontScale });
    await render(
      <Row
        title="COAL"
        meta="Teacher"
        trailing="12 files"
        onPress={jest.fn()}
        heading
      />,
    );
    const title = screen.getByText("COAL");
    expect(title.props.numberOfLines).toBe(3);
    expect(title.props.onTextLayout).toBeUndefined();
    expect(StyleSheet.flatten(title.parent?.props.style).flexDirection).toBe(
      "column",
    );
  },
);
test("text filters stay single-line and expose selection", async () => {
  const change = jest.fn();
  await render(
    <FilterText
      label="Kind"
      value="all"
      options={[
        { value: "all", label: "All" },
        { value: "notes", label: "Notes" },
      ]}
      onChange={change}
    />,
  );
  expect(screen.getByText("Notes").props.numberOfLines).toBe(1);
  expect(
    StyleSheet.flatten(screen.getByRole("button", { name: "All" }).props.style),
  ).toMatchObject({ minWidth: 48, minHeight: 48 });
  expect(
    screen.getByRole("button", { name: "All" }).props.accessibilityState
      .selected,
  ).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Notes" }));
  expect(change).toHaveBeenCalledWith("notes");
});
