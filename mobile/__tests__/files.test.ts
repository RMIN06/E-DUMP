import * as FS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";
import {
  cachedFile,
  downloadFile,
  clearDownloads,
  cancelDownloads,
  removeCachedFile,
  openDocument,
} from "../src/lib/files";

type FakeFile = {
  size: number;
  text?: string;
  modified?: number;
  directory?: boolean;
};
const mockFiles = new Map<string, FakeFile>();
let mockSize = 10;
let mockStatus = 200;
let mockHold = false;
let mockFinish: (() => void) | undefined;
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  getInfoAsync: jest.fn(async (uri: string) => {
    const entry = mockFiles.get(uri);
    return entry
      ? {
          exists: true,
          isDirectory: entry.directory ?? false,
          size: entry.size,
          modificationTime: entry.modified ?? 0,
        }
      : { exists: false };
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    const entry = mockFiles.get(uri);
    if (!entry) throw new Error("Missing");
    return entry.text ?? "bad json";
  }),
  writeAsStringAsync: jest.fn(async (uri: string, text: string) => {
    mockFiles.set(uri, { size: text.length, text });
  }),
  readDirectoryAsync: jest.fn(async () =>
    [...mockFiles.keys()]
      .filter((uri) => uri.startsWith("file:///cache/files/"))
      .map((uri) => uri.replace("file:///cache/files/", "")),
  ),
  makeDirectoryAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async (uri: string) => {
    for (const name of mockFiles.keys())
      if (name === uri || name.startsWith(uri.endsWith("/") ? uri : uri + "/"))
        mockFiles.delete(name);
  }),
  moveAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const value = mockFiles.get(from);
    if (!value) throw new Error("Missing partial");
    mockFiles.set(to, value);
    mockFiles.delete(from);
  }),
  getContentUriAsync: jest.fn(async () => "content://edump/file"),
  createDownloadResumable: jest.fn(
    (
      url: string,
      uri: string,
      options: object,
      progress: (event: {
        totalBytesWritten: number;
        totalBytesExpectedToWrite: number;
      }) => void,
    ) => {
      let resolve:
        ((value: { status: number; uri: string }) => void) | undefined;
      return {
        downloadAsync: jest.fn(
          () =>
            new Promise((done) => {
              resolve = done;
              mockFinish = () => {
                mockFiles.set(uri, { size: mockSize });
                progress({
                  totalBytesWritten: mockSize,
                  totalBytesExpectedToWrite: mockSize,
                });
                done({ status: mockStatus, uri });
              };
              if (!mockHold) mockFinish();
            }),
        ),
        cancelAsync: jest.fn(async () => {
          resolve?.({ status: 0, uri });
        }),
      };
    },
  ),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-intent-launcher", () => ({
  startActivityAsync: jest.fn(async () => undefined),
}));
const item = {
  file_id: "a".repeat(24),
  mime_type: "application/pdf",
  size_bytes: 10,
};
const uri = "file:///cache/files/" + item.file_id + ".pdf";
const link = jest.fn(async () => ({
  url: "https://private.invalid/signed",
  mime_type: "application/pdf",
  size_bytes: 10,
}));
const settle = async () => {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
};
beforeEach(async () => {
  await clearDownloads();
  mockFiles.clear();
  jest.clearAllMocks();
  mockSize = 10;
  mockStatus = 200;
  mockHold = false;
  mockFinish = undefined;
});

test("MAT-5 downloads with progress, atomically caches, then opens offline without a fresh URL", async () => {
  const progress = jest.fn();
  expect(await downloadFile(item, link, progress)).toBe(uri);
  expect(progress).toHaveBeenCalledWith(1);
  expect(mockFiles.has(uri + ".part")).toBe(false);
  expect(await downloadFile(item, link, progress)).toBe(uri);
  expect(link).toHaveBeenCalledTimes(1);
  expect(FS.createDownloadResumable).toHaveBeenCalledTimes(1);
});
test("concurrent opens reuse one transfer", async () => {
  mockHold = true;
  const first = downloadFile(item, link, jest.fn());
  const second = downloadFile(item, link, jest.fn());
  await settle();
  mockFinish?.();
  expect(await first).toBe(uri);
  expect(await second).toBe(uri);
  expect(link).toHaveBeenCalledTimes(1);
});
test.each([
  { status: 403, size: 10 },
  { status: 200, size: 8 },
])(
  "failed or incomplete transfers never become cached files: %j",
  async ({ status, size }) => {
    mockStatus = status;
    mockSize = size;
    await expect(downloadFile(item, link, jest.fn())).rejects.toThrow(
      "Couldn't finish",
    );
    expect(mockFiles.has(uri)).toBe(false);
    expect(mockFiles.has(uri + ".part")).toBe(false);
  },
);
test("cancel aborts a transfer and sign-out leaves no cached bytes", async () => {
  mockHold = true;
  const controller = new AbortController();
  const work = downloadFile(item, link, jest.fn(), controller.signal);
  const failure = expect(work).rejects.toThrow("cancelled");
  await settle();
  controller.abort();
  await failure;
  expect(mockFiles.has(uri + ".part")).toBe(false);
  const next = downloadFile(item, link, jest.fn());
  const nextFailure = expect(next).rejects.toThrow();
  await settle();
  await cancelDownloads();
  await nextFailure;
  await clearDownloads();
  expect(mockFiles.size).toBe(0);
});
test("the 500 MB cap evicts the least recently opened cached file", async () => {
  const old = "b".repeat(24) + ".pdf";
  const recent = "c".repeat(24) + ".pdf";
  mockFiles.set("file:///cache/files/" + old, {
    size: 300 * 1024 * 1024,
    modified: 1,
  });
  mockFiles.set("file:///cache/files/" + recent, {
    size: 200 * 1024 * 1024,
    modified: 2,
  });
  mockFiles.set("file:///cache/files/ignored.part", { size: 100 });
  await downloadFile(item, link, jest.fn());
  expect(mockFiles.has("file:///cache/files/" + old)).toBe(false);
  expect(mockFiles.has("file:///cache/files/" + recent)).toBe(true);
});
test("cache touches rebuild a damaged index and reject corrupt or invalid entries", async () => {
  mockFiles.set(uri, { size: 10 });
  mockFiles.set("file:///cache/files/index.json", { size: 2, text: "{}" });
  expect(await cachedFile(item)).toBe(uri);
  mockFiles.set(uri, { size: 9 });
  expect(await cachedFile(item)).toBeNull();
  mockFiles.set(uri, { size: 10, directory: true });
  expect(await cachedFile(item)).toBeNull();
  await expect(cachedFile({ ...item, file_id: "../bad" })).rejects.toThrow(
    "Invalid",
  );
  await expect(cachedFile({ ...item, mime_type: "text/html" })).rejects.toThrow(
    "Invalid",
  );
  await removeCachedFile(item);
  expect(mockFiles.has(uri)).toBe(false);
  await removeCachedFile({ ...item, file_id: "bad" });
});
test.each([
  { url: "http://unsafe.invalid", mime_type: item.mime_type, size_bytes: 10 },
  { url: "https://private.invalid", mime_type: "text/html", size_bytes: 10 },
  { url: "https://private.invalid", mime_type: item.mime_type, size_bytes: 11 },
])("rejects invalid signed download descriptors: %j", async (value) => {
  await expect(
    downloadFile(item, async () => value, jest.fn()),
  ).rejects.toThrow("Invalid download");
});
test("an already aborted request does no file IO", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    downloadFile(item, link, jest.fn(), controller.signal),
  ).rejects.toThrow("cancelled");
  expect(link).not.toHaveBeenCalled();
});
test("Android uses a content URI and a read grant for the OS viewer", async () => {
  Platform.OS = "android";
  await openDocument(uri, item.mime_type);
  expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
    "android.intent.action.VIEW",
    { data: "content://edump/file", flags: 1, type: item.mime_type },
  );
});
test("iOS opens through sharing and reports unavailable viewers", async () => {
  Platform.OS = "ios";
  await openDocument(uri, item.mime_type);
  expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, {
    mimeType: item.mime_type,
  });
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
  await expect(openDocument(uri, item.mime_type)).rejects.toThrow(
    "No file viewer",
  );
  Platform.OS = "android";
});
