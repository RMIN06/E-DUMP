import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import * as Picker from "expo-document-picker";
import { UploadScreen } from "../src/features/materials/UploadScreen";
import { MaterialScreen } from "../src/features/materials/MaterialScreen";
import { SubjectMaterialsScreen } from "../src/features/materials/SubjectMaterialsScreen";
import { api } from "../src/api/client";
import { ApiError } from "../src/api/transport";
import { useMaterial, useMaterials, type Material } from "../src/api/materials";
import { useSession } from "../src/lib/session";
import { removeCachedFile } from "../src/lib/files";
import { useOpenFile } from "../src/features/materials/hooks/useOpenFile";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ slug: "coal", id: "one" }),
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({
  deleteAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({
    exists: true,
    isDirectory: false,
    size: 100,
  })),
}));
jest.mock("../src/api/client", () => ({ api: jest.fn() }));
jest.mock("../src/api/queryClient", () => ({
  queryClient: {
    setQueryData: jest.fn(),
    removeQueries: jest.fn(),
    invalidateQueries: jest.fn(async () => undefined),
  },
}));
jest.mock("../src/api/materials", () => ({
  useMaterial: jest.fn(),
  useMaterials: jest.fn(),
}));
jest.mock("../src/api/subjects", () => ({
  useSubject: () => ({
    data: { short_name: "COAL", teacher: "Teacher", material_count: 1 },
  }),
}));
jest.mock("../src/api/useFocusRead", () => ({ useFocusRead: jest.fn() }));
jest.mock("../src/lib/session", () => ({ useSession: jest.fn() }));
jest.mock("../src/lib/files", () => ({
  cachedFile: jest.fn(async () => null),
  removeCachedFile: jest.fn(async () => undefined),
}));
jest.mock("../src/features/materials/hooks/useOpenFile", () => ({
  useOpenFile: jest.fn(),
}));

jest.setTimeout(15000);
const item: Material = {
  id: "one",
  subject_slug: "coal",
  file_id: "a".repeat(24),
  title: "Assembly notes",
  kind: "notes",
  chapter: 3,
  description: "Read before class",
  uploader_id: "owner",
  uploader_name: "Student",
  original_name: "Assembly notes.pdf",
  mime_type: "application/pdf",
  size_bytes: 100,
  created_at: "2026-10-09T00:00:00Z",
  updated_at: "2026-10-09T00:00:00Z",
};
const refetch = jest.fn();
const next = jest.fn();
const open = jest.fn(async () => undefined);
const detail = { data: item, isError: false, refetch };
const list = {
  data: { pages: [{ items: [item], chapters: [3], next_cursor: null }] },
  isPending: false,
  isError: false,
  isFetching: false,
  isRefetching: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
  hasNextPage: false,
  refetch,
  fetchNextPage: next,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api).mockResolvedValue(item);
  jest
    .mocked(useMaterial)
    .mockReturnValue(detail as unknown as ReturnType<typeof useMaterial>);
  jest
    .mocked(useMaterials)
    .mockReturnValue(list as unknown as ReturnType<typeof useMaterials>);
  jest
    .mocked(useSession)
    .mockReturnValue({ user: { id: "owner", role: "student" } } as ReturnType<
      typeof useSession
    >);
  jest
    .mocked(useOpenFile)
    .mockReturnValue({ open, error: null, progress: null, cancel: jest.fn() });
  jest.mocked(Picker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        name: "Lecture 3.pdf",
        lastModified: 0,
        uri: "file:///picker/uuid.pdf",
        size: 100,
        mimeType: "application/pdf",
      },
    ],
  });
});

test("MAT-4: picker prefills title and uploads explicit original filename and normalized metadata", async () => {
  const selectedFile = Object.assign(new Blob(["selected document"]), {
    name: "Lecture 3.pdf",
    lastModified: 0,
    webkitRelativePath: "",
  });
  jest.mocked(Picker.getDocumentAsync).mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        name: "Lecture 3.pdf",
        uri: "blob:chosen",
        lastModified: 0,
        size: 100,
        mimeType: "application/pdf",
        file: selectedFile,
      },
    ],
  });
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  expect(screen.getByLabelText("Title").props.value).toBe("Lecture 3");
  await fireEvent.changeText(screen.getByLabelText("Chapter (optional)"), "03");
  await fireEvent.changeText(
    screen.getByLabelText("Note (optional)"),
    " Read this ",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/subjects/coal/materials",
      expect.objectContaining({
        method: "POST",
        upload: expect.objectContaining({
          file: selectedFile,
          filename: "Lecture 3.pdf",
          fields: {
            title: "Lecture 3",
            kind: "notes",
            chapter: "3",
            description: "Read this",
          },
        }),
      }),
    ),
  );
  await waitFor(() => expect(router.back).toHaveBeenCalled());
});
test("MAT-4: invalid chapter prevents a write", async () => {
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  await fireEvent.changeText(screen.getByLabelText("Chapter (optional)"), "-1");
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  expect(await screen.findByText("Use a chapter from 0 to 99.")).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
});

test("MAT-4: real upload progress stays visible and file replacement is locked until completion", async () => {
  let finish: ((value: Material) => void) | undefined;
  jest.mocked(api).mockReturnValueOnce(
    new Promise<Material>((resolve) => {
      finish = resolve;
    }),
  );
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  const upload = jest.mocked(api).mock.calls[0]?.[1]?.upload;
  if (!upload || !finish) throw new Error("Expected an active upload.");
  await act(() => upload.onProgress(0.42));
  expect(
    screen.getByRole("button", { name: "Uploading 42%" }).props
      .accessibilityState.busy,
  ).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Change files" }));
  expect(Picker.getDocumentAsync).toHaveBeenCalledTimes(1);
  await act(() => finish?.(item));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
});
test("MAT-4: oversize file is rejected before upload", async () => {
  jest.mocked(Picker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///large.pdf",
        name: "large.pdf",
        lastModified: 0,
        size: 26 * 1024 * 1024,
      },
    ],
  });
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  expect(
    await screen.findByText(
      "large.pdf: choose a non-empty file no larger than 25 MB.",
    ),
  ).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
});
test("MAT-8: duplicate preserves form and links to existing material", async () => {
  jest.mocked(api).mockRejectedValue(
    new ApiError(409, "duplicate", "Already uploaded.", {
      existing_material_id: "existing",
    }),
  );
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  await fireEvent.press(
    await screen.findByRole("button", { name: "View existing material" }),
  );
  expect(router.replace).toHaveBeenCalledWith("/material/existing");
  expect(screen.getByLabelText("Title").props.value).toBe("Lecture 3");
});
test("MAT-1/MAT-2/MAT-5: row opens file, details opens metadata, filters combine", async () => {
  await render(<SubjectMaterialsScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: /^Assembly notes,/ }),
  );
  expect(open).toHaveBeenCalledWith(item);
  await fireEvent.press(
    screen.getByRole("button", { name: "Details for Assembly notes" }),
  );
  expect(router.push).toHaveBeenCalledWith("/material/one");
  await fireEvent.press(screen.getByRole("button", { name: "Notes" }));
  await fireEvent.press(screen.getByRole("button", { name: "3" }));
  expect(useMaterials).toHaveBeenLastCalledWith("coal", {
    kind: "notes",
    chapter: "3",
    q: "",
  });
});
test("MAT-1: cached rows remain readable offline", async () => {
  jest
    .mocked(useMaterials)
    .mockReturnValue({ ...list, isError: true } as unknown as ReturnType<
      typeof useMaterials
    >);
  await render(<SubjectMaterialsScreen />);
  expect(screen.getByText("Offline. Showing saved data.")).toBeTruthy();
  expect(screen.getByText(item.title)).toBeTruthy();
});
test("MAT-1: empty result provides upload action", async () => {
  jest.mocked(useMaterials).mockReturnValue({
    ...list,
    data: { pages: [{ items: [], chapters: [], next_cursor: null }] },
  } as unknown as ReturnType<typeof useMaterials>);
  await render(<SubjectMaterialsScreen />);
  expect(screen.getByText("No materials")).toBeTruthy();
  const upload = screen.getAllByRole("button", { name: "Upload" })[1];
  if (!upload) throw new Error("Expected the empty-state upload action.");
  await fireEvent.press(upload);
  expect(router.push).toHaveBeenCalledWith("/upload/coal");
});
test("MAT-6: owner confirms deletion, removes cache and returns", async () => {
  await render(<MaterialScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Delete material" }),
  );
  expect(
    screen.getByText(
      "Remove this material and its file for everyone in the class?",
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/materials/one", { method: "DELETE" }),
  );
  expect(removeCachedFile).toHaveBeenCalledWith(item);
  await waitFor(() => expect(router.back).toHaveBeenCalled());
});
test("MAT-6: other students do not see delete", async () => {
  jest
    .mocked(useSession)
    .mockReturnValue({ user: { id: "other", role: "student" } } as ReturnType<
      typeof useSession
    >);
  await render(<MaterialScreen />);
  expect(screen.queryByRole("button", { name: "Delete material" })).toBeNull();
});
test("MAT-7: report sends fixed reason and trimmed note and shows receipt", async () => {
  await render(<MaterialScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Report material" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Copyright" }));
  await fireEvent.changeText(
    screen.getByLabelText("Note (optional)"),
    " Please review ",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Send report" }));
  expect(await screen.findByText("Report sent.")).toBeTruthy();
  expect(api).toHaveBeenCalledWith("/materials/one/report", {
    method: "POST",
    body: { reason: "copyright", note: "Please review" },
  });
});
test("MAT-5: detail opens document and failed initial read offers retry", async () => {
  const view = await render(<MaterialScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Open file" }));
  expect(open).toHaveBeenCalledWith(item);
  jest.mocked(useMaterial).mockReturnValue({
    ...detail,
    data: undefined,
    isError: true,
  } as unknown as ReturnType<typeof useMaterial>);
  await view.rerender(<MaterialScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalled();
});

const batchAssets = [
  {
    uri: "file:///first.pdf",
    name: "First.pdf",
    size: 100,
    mimeType: "application/pdf",
    lastModified: 0,
  },
  {
    uri: "file:///second.pdf",
    name: "Second.pdf",
    size: 200,
    mimeType: "application/pdf",
    lastModified: 0,
  },
];
test("batch material upload preserves independent titles and retries only failed files", async () => {
  jest
    .mocked(Picker.getDocumentAsync)
    .mockResolvedValue({ canceled: false, assets: batchAssets });
  jest
    .mocked(api)
    .mockRejectedValueOnce(new Error("Connection lost."))
    .mockResolvedValueOnce({ ...item, id: "second" })
    .mockResolvedValueOnce(item);
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  await fireEvent.changeText(screen.getByLabelText("Title"), "First lecture");
  await fireEvent.changeText(
    screen.getByLabelText("Title for Second.pdf"),
    "Second lecture",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  expect(
    await screen.findByText(
      "1 of 2 files uploaded. Retry the remaining files.",
    ),
  ).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
  expect(api).toHaveBeenNthCalledWith(
    2,
    "/subjects/coal/materials",
    expect.objectContaining({
      upload: expect.objectContaining({
        filename: "Second.pdf",
        fields: { title: "Second lecture", kind: "notes" },
      }),
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(api).toHaveBeenCalledTimes(3);
  expect(api).toHaveBeenLastCalledWith(
    "/subjects/coal/materials",
    expect.objectContaining({
      upload: expect.objectContaining({
        filename: "First.pdf",
        fields: { title: "First lecture", kind: "notes" },
      }),
    }),
  );
});
test("batch selection retains valid files while rejecting an oversize file", async () => {
  jest.mocked(Picker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      ...batchAssets,
      {
        ...batchAssets[0]!,
        uri: "file:///large.pdf",
        name: "large.pdf",
        size: 26 * 1024 * 1024,
      },
    ],
  });
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  expect(Picker.getDocumentAsync).toHaveBeenCalledWith(
    expect.objectContaining({ multiple: true }),
  );
  expect(screen.getByLabelText("Title for Second.pdf").props.value).toBe(
    "Second",
  );
  expect(
    screen.getByText(
      "large.pdf: choose a non-empty file no larger than 25 MB.",
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(api).toHaveBeenCalledTimes(2);
});
test("canceling a batch aborts the current upload and does not start the next file", async () => {
  jest
    .mocked(Picker.getDocumentAsync)
    .mockResolvedValue({ canceled: false, assets: batchAssets });
  let finish: ((value: Material) => void) | undefined;
  jest.mocked(api).mockReturnValueOnce(
    new Promise<Material>((resolve) => {
      finish = resolve;
    }),
  );
  await render(<UploadScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose files" }));
  await fireEvent.press(screen.getByRole("button", { name: "Upload" }));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  const signal = jest.mocked(api).mock.calls[0]?.[1]?.signal;
  await fireEvent.press(screen.getByRole("button", { name: "Cancel upload" }));
  expect(signal?.aborted).toBe(true);
  await act(() => finish?.(item));
  expect(api).toHaveBeenCalledTimes(1);
});
