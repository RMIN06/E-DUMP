import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { UsersScreen } from "../src/features/admin/UsersScreen";
import { ReportsScreen } from "../src/features/admin/ReportsScreen";
import { AdminLinks } from "../src/features/admin/AdminLinks";
import { api } from "../src/api/client";
import {
  useAdminReports,
  useAdminUsers,
  type AdminUser,
  type AdminReport,
} from "../src/api/admin";
import { useSession } from "../src/lib/session";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.mock("../src/api/client", () => ({ api: jest.fn() }));
jest.mock("../src/api/admin", () => ({
  useAdminUsers: jest.fn(),
  useAdminReports: jest.fn(),
}));
jest.mock("../src/api/queryClient", () => ({
  queryClient: { invalidateQueries: jest.fn(async () => undefined) },
}));
jest.mock("../src/api/useFocusRead", () => ({ useFocusRead: jest.fn() }));
jest.mock("../src/lib/session", () => ({ useSession: jest.fn() }));
const user: AdminUser = {
  id: "member",
  name: "Class member",
  email: "l250001@lhr.nu.edu.pk",
  role: "student",
  is_active: true,
  roll_no: "l250001",
  created_at: "2026-10-09T00:00:00Z",
  last_login_at: "2026-10-09T00:00:00Z",
  last_seen_updates_at: null,
};
const report: AdminReport = {
  id: "report",
  material_id: "material",
  material_title: "Chapter three",
  material_removed: false,
  reporter_name: "Class member",
  reason: "copyright",
  note: "Please review",
  status: "open",
  resolved_by: null,
  created_at: "2026-10-09T00:00:00Z",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    user: { ...user, id: "admin", role: "admin" },
  } as ReturnType<typeof useSession>);
  jest.mocked(useAdminUsers).mockReturnValue({
    data: [user],
    refetch: jest.fn(),
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useAdminUsers>);
  jest.mocked(useAdminReports).mockReturnValue({
    data: [report],
    refetch: jest.fn(),
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useAdminReports>);
  jest.mocked(api).mockResolvedValue(undefined);
});
test("users search and role/status actions submit only allowed fields", async () => {
  await render(<UsersScreen />);
  await fireEvent.changeText(screen.getByLabelText("Search users"), "Class");
  await waitFor(() => expect(useAdminUsers).toHaveBeenLastCalledWith("Class"));
  await fireEvent.press(screen.getByRole("button", { name: /Class member,/ }));
  await fireEvent.press(screen.getByRole("button", { name: "Make admin" }));
  expect(api).toHaveBeenCalledWith("/admin/users/member", {
    method: "PATCH",
    body: { role: "admin" },
  });
  await fireEvent.press(screen.getByRole("button", { name: /Class member,/ }));
  await fireEvent.press(screen.getByRole("button", { name: "Disable" }));
  expect(api).toHaveBeenCalledWith("/admin/users/member", {
    method: "PATCH",
    body: { is_active: false },
  });
});
test("users cannot remove own admin access and failed mutations stay visible", async () => {
  jest.mocked(useAdminUsers).mockReturnValue({
    data: [{ ...user, id: "admin", role: "admin" }],
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useAdminUsers>);
  const view = await render(<UsersScreen />);
  await fireEvent.press(screen.getByRole("button", { name: /Class member,/ }));
  expect(screen.queryByRole("button", { name: "Remove admin" })).toBeNull();
  expect(
    screen.getByText("You cannot remove your own admin access."),
  ).toBeTruthy();
  await view.unmount();
  jest.mocked(useAdminUsers).mockReturnValue({
    data: [{ ...user, role: "admin", is_active: false }],
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useAdminUsers>);
  jest
    .mocked(api)
    .mockRejectedValueOnce(new Error("An active admin is required."));
  await render(<UsersScreen />);
  await fireEvent.press(screen.getByRole("button", { name: /Class member,/ }));
  await fireEvent.press(screen.getByRole("button", { name: "Enable" }));
  expect(screen.getByText("An active admin is required.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Remove admin" }));
  expect(api).toHaveBeenCalledWith("/admin/users/member", {
    method: "PATCH",
    body: { role: "student" },
  });
});
test("reports open material, remove it and dismiss a report", async () => {
  await render(<ReportsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: /Chapter three,/ }));
  expect(screen.getByText("Please review")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Open material" }));
  expect(router.push).toHaveBeenCalledWith("/material/material");
  await fireEvent.press(screen.getByRole("button", { name: /Chapter three,/ }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Remove material" }),
  );
  expect(api).toHaveBeenCalledWith("/admin/reports/report", {
    method: "PATCH",
    body: { action: "remove_material" },
  });
  await fireEvent.press(screen.getByRole("button", { name: /Chapter three,/ }));
  await fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));
  expect(api).toHaveBeenCalledWith("/admin/reports/report", {
    method: "PATCH",
    body: { action: "dismiss" },
  });
});
test("report failures and already-removed material remain actionable", async () => {
  jest.mocked(useAdminReports).mockReturnValue({
    data: [{ ...report, material_removed: true }],
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useAdminReports>);
  jest.mocked(api).mockRejectedValueOnce(new Error("Couldn't resolve report."));
  await render(<ReportsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: /Chapter three,/ }));
  expect(screen.queryByRole("button", { name: "Open material" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));
  expect(screen.getByText("Couldn't resolve report.")).toBeTruthy();
});
test("admin links display open report count", async () => {
  await render(<AdminLinks />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Reports (1 open)" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Users" }));
  expect(router.push).toHaveBeenCalledWith("/admin/reports");
  expect(router.push).toHaveBeenCalledWith("/admin/users");
});
