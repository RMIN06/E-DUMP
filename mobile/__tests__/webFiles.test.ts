import { Blob as NodeBlob } from "node:buffer";
import {
  cachedFile,
  downloadFile,
  clearDownloads,
  removeCachedFile,
  openDocument,
} from "../src/lib/files.web";
jest.mock("../src/auth/session", () => ({
  session: { store: { getState: () => ({ accessToken: "access-test" }) } },
}));
const file = {
  file_id: "000000000000000000000001",
  size_bytes: 4,
  mime_type: "application/pdf",
};
const link = {
  url: "https://storage.test/signed",
  size_bytes: 4,
  mime_type: "application/pdf",
};
let saved: Map<string, Blob>;
beforeEach(() => {
  saved = new Map();
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://edump.test" },
  });
  Object.defineProperty(globalThis, "Blob", {
    configurable: true,
    value: NodeBlob,
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:private-file"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
  Object.defineProperty(globalThis, "Response", {
    configurable: true,
    value: class {
      headers: Headers;
      constructor(
        public data: Blob,
        options: { headers: Record<string, string> },
      ) {
        this.headers = new Headers(options.headers);
      }
      async blob() {
        return this.data;
      }
    },
  });
  const cache = {
    match: async (key: string | Request) => {
      const blob = saved.get(typeof key === "string" ? key : key.url);
      return blob
        ? {
            blob: async () => blob,
            headers: new Headers({ "Content-Length": String(blob.size) }),
          }
        : undefined;
    },
    put: async (key: string, response: Response) => {
      saved.set(key, await response.blob());
    },
    delete: async (key: string | Request) =>
      saved.delete(typeof key === "string" ? key : key.url),
    keys: async () => [...saved.keys()].map((url) => ({ url })),
  };
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: {
      open: async () => cache,
      delete: async () => {
        saved.clear();
        return true;
      },
    },
  });
});
afterEach(async () => {
  await clearDownloads();
});
function response(bytes = 4) {
  let read = false;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (read) return { done: true };
          read = true;
          return { done: false, value: new Uint8Array(bytes) };
        },
        cancel: jest.fn(),
      }),
    },
  };
}
test("downloads with authorization, reports real progress and opens cached files offline", async () => {
  const fetchMock = jest.fn(async () => response());
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const getLink = jest.fn(async () => link);
  const progress = jest.fn();
  expect(await downloadFile(file, getLink, progress)).toBe("blob:private-file");
  expect(fetchMock.mock.calls[0]).toEqual([
    "/api/download?url=https%3A%2F%2Fstorage.test%2Fsigned",
    expect.objectContaining({
      headers: { Authorization: "Bearer access-test" },
    }),
  ]);
  expect(progress).toHaveBeenCalledWith(1);
  fetchMock.mockRejectedValue(new Error("offline"));
  expect(await downloadFile(file, getLink, progress)).toBe("blob:private-file");
  expect(getLink).toHaveBeenCalledTimes(1);
  expect(await cachedFile(file)).toBe("blob:private-file");
  await removeCachedFile(file);
  expect(await cachedFile(file)).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-file");
});
test("cancelled and invalid downloads never persist private bytes", async () => {
  const aborted = new AbortController();
  aborted.abort();
  await expect(
    downloadFile(file, async () => link, jest.fn(), aborted.signal),
  ).rejects.toThrow("cancelled");
  await expect(
    downloadFile(file, async () => ({ ...link, size_bytes: 5 }), jest.fn()),
  ).rejects.toThrow("Invalid download details");
  globalThis.fetch = jest.fn(async () =>
    response(5),
  ) as unknown as typeof fetch;
  await expect(downloadFile(file, async () => link, jest.fn())).rejects.toThrow(
    "Invalid download size",
  );
  globalThis.fetch = jest.fn(async () =>
    response(3),
  ) as unknown as typeof fetch;
  await expect(downloadFile(file, async () => link, jest.fn())).rejects.toThrow(
    "incomplete",
  );
  expect(saved.size).toBe(0);
});
test("clear cache revokes file handles and document downloads keep their extension", async () => {
  globalThis.fetch = jest.fn(async () => response()) as unknown as typeof fetch;
  const uri = await downloadFile(file, async () => link, jest.fn());
  const anchor = {
    href: "",
    download: "",
    click: jest.fn(),
    remove: jest.fn(),
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => anchor, body: { appendChild: jest.fn() } },
  });
  await openDocument(uri, file.mime_type);
  expect(anchor.download).toBe("E-DUMP-file.pdf");
  expect(anchor.click).toHaveBeenCalled();
  await clearDownloads();
  expect(saved.size).toBe(0);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(uri);
  await expect(cachedFile({ ...file, file_id: "invalid" })).rejects.toThrow(
    "Invalid file details",
  );
});
