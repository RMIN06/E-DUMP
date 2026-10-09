import { publicRequest, type RequestOptions } from "../src/api/transport";

class FakeXHR {
  static instances: FakeXHR[] = [];
  upload: { onprogress?: (event: { loaded: number; total: number }) => void } =
    {};
  open = jest.fn();
  send = jest.fn();
  setRequestHeader = jest.fn();
  timeout = 0;
  status = 201;
  responseText = '{"id":"created"}';
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  ontimeout?: () => void;
  abort = jest.fn(() => this.onabort?.());
  constructor() {
    FakeXHR.instances.push(this);
  }
}
const options: RequestOptions = {
  token: "access",
  upload: {
    uri: "file:///uuid.pdf",
    filename: "Lecture 3.pdf",
    mimeType: "application/pdf",
    fields: { title: "Lecture 3", kind: "notes" },
    onProgress: jest.fn(),
  },
};
const original = global.XMLHttpRequest;
const originalForm = global.FormData;
function activeXHR() {
  const xhr = FakeXHR.instances[0];
  if (!xhr) throw new Error("Expected an upload request.");
  return xhr;
}
beforeEach(() => {
  FakeXHR.instances = [];
  global.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
  global.FormData = jest.requireActual<{ default: typeof FormData }>(
    "react-native/Libraries/Network/FormData",
  ).default;
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://test/api/v1";
});
afterEach(() => {
  global.XMLHttpRequest = original;
  global.FormData = originalForm;
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  jest.clearAllMocks();
});
test("multipart sends original filename, bearer, boundary managed by native transport, and progress", async () => {
  const pending = publicRequest("/subjects/coal/materials", options);
  const xhr = activeXHR();
  expect(xhr.open).toHaveBeenCalledWith(
    "POST",
    "http://test/api/v1/subjects/coal/materials",
  );
  expect(xhr.timeout).toBe(120_000);
  expect(xhr.setRequestHeader).toHaveBeenCalledTimes(1);
  expect(xhr.setRequestHeader).toHaveBeenCalledWith(
    "Authorization",
    "Bearer access",
  );
  const form = (xhr.send.mock.calls as unknown[][])[0]?.[0] as FormData;
  expect(form.getAll("file")).toEqual([
    { uri: "file:///uuid.pdf", name: "Lecture 3.pdf", type: "application/pdf" },
  ]);
  expect(form.getAll("title")).toEqual(["Lecture 3"]);
  xhr.upload.onprogress?.({ loaded: 50, total: 100 });
  expect(options.upload?.onProgress).toHaveBeenCalledWith(0.5);
  xhr.onload?.();
  await expect(pending).resolves.toEqual({ id: "created" });
});
test("duplicate details reach the form without retrying the write", async () => {
  const pending = publicRequest("/upload", options);
  const xhr = activeXHR();
  xhr.status = 409;
  xhr.responseText = JSON.stringify({
    error: {
      code: "duplicate",
      message: "Already uploaded",
      details: { existing_material_id: "existing" },
    },
  });
  xhr.onload?.();
  await expect(pending).rejects.toMatchObject({
    status: 409,
    code: "duplicate",
    details: { existing_material_id: "existing" },
  });
  expect(FakeXHR.instances).toHaveLength(1);
});
test.each(["onerror", "ontimeout", "onabort"] as const)(
  "%s rejects once with an actionable message",
  async (callback) => {
    const pending = publicRequest("/upload", options);
    activeXHR()[callback]?.();
    await expect(pending).rejects.toThrow(/offline|timed out|cancelled/);
    expect(FakeXHR.instances).toHaveLength(1);
  },
);
test("cancel stops native upload and a pre-cancelled request sends nothing", async () => {
  const controller = new AbortController();
  const pending = publicRequest("/upload", {
    ...options,
    signal: controller.signal,
  });
  controller.abort();
  await expect(pending).rejects.toThrow("Upload cancelled.");
  expect(activeXHR().abort).toHaveBeenCalledTimes(1);
  await expect(
    publicRequest("/upload", { ...options, signal: controller.signal }),
  ).rejects.toThrow("Upload cancelled.");
  expect(FakeXHR.instances).toHaveLength(1);
});
test("invalid server body fails safely", async () => {
  const pending = publicRequest("/upload", options);
  activeXHR().responseText = "bad gateway";
  activeXHR().onload?.();
  await expect(pending).rejects.toThrow("Couldn't upload. Try again.");
});
