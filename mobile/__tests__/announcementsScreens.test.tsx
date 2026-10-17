import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import * as Picker from "expo-document-picker";
import { UpdatesScreen } from "../src/features/announcements/UpdatesScreen";
import { AnnouncementScreen } from "../src/features/announcements/AnnouncementScreen";
import { UpdateFormScreen } from "../src/features/announcements/UpdateFormScreen";
import { api } from "../src/api/client";
import {
  useAnnouncement,
  useUpdates,
  useUpcoming,
  useUnreadCount,
  type Announcement,
} from "../src/api/announcements";
import { useSession } from "../src/lib/session";
import { downloadFile, openDocument } from "../src/lib/files";

let mockParams: { id?: string; subject?: string } = { id: "one" };
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: (props: object) =>
      React.createElement(View, { ...props, testID: "due-picker" }),
  };
});
jest.mock("expo-file-system/legacy", () => ({
  deleteAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({
    exists: true,
    isDirectory: false,
    size: 100,
  })),
}));
jest.mock("../src/api/client", () => ({ api: jest.fn() }));
jest.mock("../src/api/announcements", () => ({
  useAnnouncement: jest.fn(),
  useUpdates: jest.fn(),
  useUpcoming: jest.fn(),
  useUnreadCount: jest.fn(),
  getAttachmentDownload: jest.fn(),
  updateTypes: ["quiz", "task", "datesheet", "general"],
}));
jest.mock("../src/api/queryClient", () => ({
  queryClient: {
    setQueryData: jest.fn(),
    removeQueries: jest.fn(),
    invalidateQueries: jest.fn(async () => undefined),
  },
}));
jest.mock("../src/api/subjects", () => ({
  useSubjects: () => ({ data: [{ slug: "ds", short_name: "DS" }] }),
  useSubject: () => ({ data: { short_name: "DS" } }),
}));
jest.mock("../src/api/useFocusRead", () => ({ useFocusRead: jest.fn() }));
jest.mock("../src/lib/session", () => ({ useSession: jest.fn() }));
jest.mock("../src/lib/files", () => ({
  downloadFile: jest.fn(async () => "file:///cached.pdf"),
  openDocument: jest.fn(async () => undefined),
  removeCachedFile: jest.fn(async () => undefined),
}));
const attachment = {
  file_id: "a".repeat(24),
  original_name: "quiz.pdf",
  mime_type: "application/pdf",
  size_bytes: 100,
};
const item: Announcement = {
  id: "one",
  type: "quiz",
  title: "Linked lists",
  body: "Read chapter three.",
  subject_slug: "ds",
  due_at: new Date(Date.now() + 86_400_000).toISOString(),
  file_ids: [attachment.file_id],
  attachments: [attachment],
  pinned: true,
  author_id: "admin",
  author_name: "Class admin",
  created_at: "2026-10-09T00:00:00Z",
  updated_at: "2026-10-09T00:00:00Z",
};
const refetch = jest.fn();
const base = { isPending: false, isError: false, refetch };
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "one" };
  jest.mocked(useSession).mockReturnValue({
    user: { id: "admin", role: "admin" },
    status: "signedIn",
  } as unknown as ReturnType<typeof useSession>);
  jest
    .mocked(useAnnouncement)
    .mockReturnValue({ ...base, data: item } as unknown as ReturnType<
      typeof useAnnouncement
    >);
  jest.mocked(useUpdates).mockReturnValue({
    ...base,
    data: { pages: [{ items: [item] }] },
    fetchNextPage: jest.fn(),
  } as unknown as ReturnType<typeof useUpdates>);
  jest
    .mocked(useUpcoming)
    .mockReturnValue({ ...base, data: [item] } as unknown as ReturnType<
      typeof useUpcoming
    >);
  jest
    .mocked(useUnreadCount)
    .mockReturnValue({ ...base, data: { count: 3 } } as unknown as ReturnType<
      typeof useUnreadCount
    >);
  jest.mocked(api).mockResolvedValue(item);
});
afterEach(() => jest.useRealTimers());

test("cached alerts leave upcoming and subject feeds at their deadline", async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-18T05:00:00Z"));
  const expiring = { ...item, due_at: "2026-10-18T05:00:01Z" };
  const undated = {
    ...item,
    id: "undated",
    title: "Class notice",
    due_at: null,
  };
  const expired = {
    ...item,
    id: "expired",
    title: "Old quiz",
    due_at: "2026-10-18T04:59:59Z",
  };
  jest
    .mocked(useUpcoming)
    .mockReturnValue({
      ...base,
      data: [expiring, expired],
    } as unknown as ReturnType<typeof useUpcoming>);
  jest
    .mocked(useUpdates)
    .mockReturnValue({
      ...base,
      data: { pages: [{ items: [expiring, expired, undated] }] },
    } as unknown as ReturnType<typeof useUpdates>);
  const view = await render(<UpdatesScreen />);
  expect(screen.queryByText("Old quiz")).toBeNull();
  expect(screen.getByText("Linked lists")).toBeTruthy();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
  expect(screen.queryByText("Linked lists")).toBeNull();
  expect(screen.queryByText("Coming up")).toBeNull();
  expect(screen.getByText("Class notice")).toBeTruthy();
  await view.rerender(<UpdatesScreen subjectSlug="ds" />);
  expect(screen.queryByText("Linked lists")).toBeNull();
  expect(screen.getByText("Class notice")).toBeTruthy();
});
test("student feed can read and filter but cannot post", async () => {
  jest
    .mocked(useSession)
    .mockReturnValue({ user: { role: "student" } } as unknown as ReturnType<
      typeof useSession
    >);
  await render(<UpdatesScreen />);
  expect(screen.queryByRole("button", { name: "Post" })).toBeNull();
  expect(screen.getByText("Coming up")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Task" }));
  expect(useUpdates).toHaveBeenLastCalledWith("task", undefined);
  await fireEvent.press(
    screen.getByRole("button", { name: /Linked lists, Pinned/ }),
  );
  expect(router.push).toHaveBeenCalledWith("/updates/one");
  expect(api).toHaveBeenCalledWith("/me/seen-updates", { method: "POST" });
});
test("admin post and subject view compose without losing navigation", async () => {
  const materials = jest.fn();
  await render(<UpdatesScreen subjectSlug="ds" onMaterials={materials} />);
  await fireEvent.press(screen.getByRole("button", { name: "Post" }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/updates/new",
    params: { subject: "ds" },
  });
  await fireEvent.press(screen.getByRole("button", { name: "Material" }));
  expect(materials).toHaveBeenCalled();
});

test("updates appear once across upcoming and overlapping pages", async () => {
  const general = {
    ...item,
    id: "two",
    type: "general" as const,
    title: "Class notice",
  };
  jest.mocked(useUpcoming).mockReturnValue({
    ...base,
    data: [item, item],
  } as unknown as ReturnType<typeof useUpcoming>);
  jest.mocked(useUpdates).mockReturnValue({
    ...base,
    data: { pages: [{ items: [item, general] }, { items: [general, item] }] },
    fetchNextPage: jest.fn(),
  } as unknown as ReturnType<typeof useUpdates>);
  await render(<UpdatesScreen />);
  expect(screen.getAllByText("Linked lists")).toHaveLength(1);
  expect(screen.getAllByText("Class notice")).toHaveLength(1);
  expect(screen.queryByText("Nothing here yet")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: /Linked lists, Pinned/ }),
  );
  expect(router.push).toHaveBeenCalledWith("/updates/one");
  await fireEvent.press(screen.getByRole("button", { name: "General" }));
  expect(screen.queryByText("Coming up")).toBeNull();
  expect(screen.getAllByText("Linked lists")).toHaveLength(1);
});

test("upcoming-only feeds keep their update without a false empty state", async () => {
  await render(<UpdatesScreen />);
  expect(screen.getAllByText("Linked lists")).toHaveLength(1);
  expect(screen.queryByText("Nothing here yet")).toBeNull();
});
test("attachment opening, pinning, editing and confirmed deletion", async () => {
  await render(<AnnouncementScreen />);
  await fireEvent.press(screen.getByRole("button", { name: /quiz.pdf/ }));
  expect(downloadFile).toHaveBeenCalled();
  expect(openDocument).toHaveBeenCalledWith(
    "file:///cached.pdf",
    "application/pdf",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Unpin" }));
  expect(api).toHaveBeenCalledWith("/announcements/one", {
    method: "PATCH",
    body: { pinned: false },
  });
  await fireEvent.press(screen.getByRole("button", { name: "Edit" }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/updates/new",
    params: { id: "one" },
  });
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete update" }));
  expect(api).toHaveBeenCalledWith("/announcements/one", { method: "DELETE" });
  expect(router.back).toHaveBeenCalled();
});
test("student detail hides write actions and explains failed downloads", async () => {
  jest
    .mocked(useSession)
    .mockReturnValue({ user: { role: "student" } } as unknown as ReturnType<
      typeof useSession
    >);
  jest
    .mocked(downloadFile)
    .mockRejectedValueOnce(
      new Error("Offline. Download this file while online first."),
    );
  await render(<AnnouncementScreen />);
  expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: /quiz.pdf/ }));
  expect(
    screen.getByText("Offline. Download this file while online first."),
  ).toBeTruthy();
});
test("new form validates, uploads attachment and publishes due time in UTC", async () => {
  mockParams = {};
  jest
    .mocked(useAnnouncement)
    .mockReturnValue({ ...base, data: undefined } as unknown as ReturnType<
      typeof useAnnouncement
    >);
  jest.mocked(Picker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///picked.pdf",
        name: "quiz.pdf",
        size: 100,
        mimeType: "application/pdf",
        lastModified: 0,
      },
    ],
  });
  jest
    .mocked(api)
    .mockImplementation(async (path) =>
      path.endsWith("/attachments") ? attachment : item,
    );
  await render(<UpdateFormScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Publish" }));
  expect(screen.getByText("Add a title.")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Title"), "Linked lists");
  await fireEvent.changeText(
    screen.getByLabelText("Body"),
    "Read chapter three.",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Quiz" }));
  await fireEvent.press(screen.getByRole("button", { name: "DS" }));
  await fireEvent.press(screen.getByRole("button", { name: "Set due date" }));
  const date = new Date("2026-10-10T05:00:00Z");
  await act(() =>
    screen.getByTestId("due-picker").props.onChange({ type: "set" }, date),
  );
  await act(() =>
    screen.getByTestId("due-picker").props.onChange({ type: "set" }, date),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Add file" }));
  await waitFor(() =>
    expect(screen.getByText("Attachments (1/3)")).toBeTruthy(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Publish" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/announcements", {
      method: "POST",
      body: {
        type: "quiz",
        title: "Linked lists",
        body: "Read chapter three.",
        subject_slug: "ds",
        due_at: date.toISOString(),
        file_ids: [attachment.file_id],
      },
    }),
  );
  expect(router.replace).toHaveBeenCalledWith("/updates/one");
});
test("edit keeps notify again off by default and supports removing due date and files", async () => {
  await render(<UpdateFormScreen />);
  expect(screen.getByLabelText("Notify again").props.value).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Clear due date" }));
  await fireEvent.press(
    screen.getByRole("button", { name: /Remove quiz.pdf/ }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/announcements/one?notify=false",
      expect.objectContaining({
        body: expect.objectContaining({ due_at: null, file_ids: [] }),
      }),
    ),
  );
});

test("announcement batch picker respects remaining slots before uploading", async () => {
  jest.mocked(Picker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [0, 1, 2].map((i) => ({
      uri: `file:///quiz-${i}.pdf`,
      name: `quiz-${i}.pdf`,
      size: 100,
      mimeType: "application/pdf",
      lastModified: 0,
    })),
  });
  await render(<UpdateFormScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Add file" }));
  expect(
    await screen.findByText("Choose up to 2 more attachments."),
  ).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
  expect(screen.getByText("Attachments (1/3)")).toBeTruthy();
});
test("announcement batch retains successful attachments when another file fails", async () => {
  jest.mocked(Picker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [0, 1].map((i) => ({
      uri: `file:///quiz-${i}.pdf`,
      name: `quiz-${i}.pdf`,
      size: 100,
      mimeType: "application/pdf",
      lastModified: 0,
    })),
  });
  jest
    .mocked(api)
    .mockResolvedValueOnce({
      ...attachment,
      file_id: "b".repeat(24),
      original_name: "quiz-0.pdf",
    })
    .mockRejectedValueOnce(new Error("Connection lost."));
  await render(<UpdateFormScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Add file" }));
  expect(await screen.findByText("quiz-1.pdf: Connection lost.")).toBeTruthy();
  expect(screen.getByText("Attachments (2/3)")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /Remove quiz-0.pdf/ }),
  ).toBeTruthy();
  expect(Picker.getDocumentAsync).toHaveBeenCalledWith(
    expect.objectContaining({ multiple: true }),
  );
  expect(api).toHaveBeenCalledTimes(2);
});
