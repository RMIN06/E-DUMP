import { act, renderHook } from "@testing-library/react-native";
import { router } from "expo-router";
import { useOpenFile } from "../src/features/materials/hooks/useOpenFile";
import { downloadFile, openDocument } from "../src/lib/files";
import { getDownload, type Material } from "../src/api/materials";
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../src/lib/files", () => ({
  downloadFile: jest.fn(),
  openDocument: jest.fn(),
}));
jest.mock("../src/api/materials", () => ({ getDownload: jest.fn() }));
jest.mock("../src/api/queryClient", () => ({
  queryClient: { setQueryData: jest.fn() },
}));
const file = {
  id: "one",
  file_id: "a".repeat(24),
  mime_type: "application/pdf",
  size_bytes: 100,
} as Material;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(downloadFile).mockResolvedValue("file:///cached.pdf");
  jest.mocked(openDocument).mockResolvedValue(undefined);
});
test("document downloads through authorized URL factory and opens native viewer", async () => {
  const { result } = await renderHook(() => useOpenFile());
  await act(async () => {
    await result.current.open(file);
  });
  expect(openDocument).toHaveBeenCalledWith(
    "file:///cached.pdf",
    "application/pdf",
  );
  const factory = jest.mocked(downloadFile).mock.calls[0]?.[1];
  await factory?.();
  expect(getDownload).toHaveBeenCalledWith("one");
  expect(result.current.progress).toBeNull();
});
test("image opens internal detail without native document viewer", async () => {
  const { result } = await renderHook(() => useOpenFile());
  await act(async () => {
    await result.current.open({ ...file, mime_type: "image/png" });
  });
  expect(router.push).toHaveBeenCalledWith("/material/one");
  expect(openDocument).not.toHaveBeenCalled();
});
test("image detail avoids navigating to itself", async () => {
  const { result } = await renderHook(() => useOpenFile(false));
  await act(async () => {
    await result.current.open({ ...file, mime_type: "image/png" });
  });
  expect(router.push).not.toHaveBeenCalled();
});
test("missing viewer gives a clear recovery action", async () => {
  jest
    .mocked(openDocument)
    .mockRejectedValue(new Error("ActivityNotFoundException"));
  const { result } = await renderHook(() => useOpenFile());
  await act(async () => {
    await result.current.open(file);
  });
  expect(result.current.error).toBe(
    "Couldn't open the file. Install a viewer and try again.",
  );
});
test("cancel aborts transfer, suppresses cancellation error, and blocks concurrent taps", async () => {
  let release: () => void = () => undefined;
  jest.mocked(downloadFile).mockImplementation(
    (_file, _link, progress, signal) =>
      new Promise((resolve, reject) => {
        progress(0.5);
        release = () =>
          signal?.aborted
            ? reject(new Error("cancelled"))
            : resolve("file:///cached.pdf");
      }),
  );
  const { result } = await renderHook(() => useOpenFile());
  let pending: Promise<void>;
  await act(() => {
    pending = result.current.open(file);
  });
  expect(result.current.progress).toBe(0.5);
  await act(async () => {
    await result.current.open(file);
    result.current.cancel();
    release();
    await pending;
  });
  expect(downloadFile).toHaveBeenCalledTimes(1);
  expect(result.current.error).toBeNull();
  expect(openDocument).not.toHaveBeenCalled();
});
