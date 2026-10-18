import { Platform } from "react-native";
export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  upload?: {
    uri: string;
    file?: Blob;
    filename: string;
    mimeType: string;
    fields: Record<string, string>;
    onProgress(fraction: number): void;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type Request = <T>(path: string, options?: RequestOptions) => Promise<T>;

const sendOnce: Request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const base =
    Platform.OS === "web" ? "/api/v1" : process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base) throw new Error("Can't reach the server. Try again.");
  if (options.upload)
    return uploadOnce<T>(base.replace(/\/$/, "") + path, options);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, options.timeoutMs ?? 15_000);
  try {
    const response = await fetch(base.replace(/\/$/, "") + path, {
      method: options.method ?? "GET",
      credentials: Platform.OS === "web" ? "same-origin" : "omit",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const body: unknown = await response.json();
    if (!response.ok) {
      const error =
        typeof body === "object" && body !== null && "error" in body
          ? body.error
          : null;
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "request_failed";
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "Can't reach the server. Try again.";
      const details =
        typeof error === "object" &&
        error !== null &&
        "details" in error &&
        typeof error.details === "object" &&
        error.details !== null
          ? (error.details as Record<string, unknown>)
          : {};
      throw new ApiError(response.status, code, message, details);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
};

const sendWithRetries: Request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const delays = [1000, 3000];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await sendOnce<T>(path, options);
    } catch (error) {
      if (
        options.upload ||
        (options.method && options.method !== "GET") ||
        options.signal?.aborted ||
        attempt >= delays.length ||
        (error instanceof ApiError && error.status < 500)
      )
        throw error;
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(new Error("Request cancelled."));
        };
        const timer = setTimeout(() => {
          options.signal?.removeEventListener("abort", abort);
          resolve();
        }, delays[attempt]);
        options.signal?.addEventListener("abort", abort, { once: true });
      });
    }
  }
};

export const publicRequest: Request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  if (
    Platform.OS === "web" &&
    path.startsWith("/auth/") &&
    typeof navigator !== "undefined" &&
    navigator.locks
  ) {
    // All tabs share one HttpOnly refresh cookie; rotate it serially.
    return await navigator.locks.request(
      "edump.session",
      { signal: options.signal },
      () => sendWithRetries<T>(path, options),
    );
  }
  return sendWithRetries<T>(path, options);
};

async function uploadOnce<T>(url: string, options: RequestOptions): Promise<T> {
  const upload = options.upload;
  if (!upload || options.signal?.aborted) throw new Error("Upload cancelled.");
  const browserFile = Platform.OS === "web" ? upload.file : null;
  if (Platform.OS === "web" && !browserFile)
    throw new Error("Couldn't read this file. Choose it again and retry.");
  if (options.signal?.aborted) throw new Error("Upload cancelled.");
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => options.signal?.removeEventListener("abort", abort);
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    xhr.open("POST", url);
    xhr.timeout = 120_000;
    if (options.token)
      xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
    xhr.upload.onprogress = ({ loaded, total }) => {
      if (total > 0) upload.onProgress(Math.min(1, loaded / total));
    };
    xhr.onerror = () =>
      fail(new Error("Can't upload while offline. Try again when connected."));
    xhr.ontimeout = () => fail(new Error("Upload timed out. Try again."));
    xhr.onabort = () => fail(new Error("Upload cancelled."));
    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        fail(new Error("Couldn't upload. Try again."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        cleanup();
        resolve(body as T);
        return;
      }
      const error =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "object" &&
        body.error !== null
          ? (body.error as Record<string, unknown>)
          : {};
      fail(
        new ApiError(
          xhr.status,
          typeof error.code === "string" ? error.code : "request_failed",
          typeof error.message === "string"
            ? error.message
            : "Couldn't upload. Try again.",
          typeof error.details === "object" && error.details !== null
            ? (error.details as Record<string, unknown>)
            : {},
        ),
      );
    };
    const form = new FormData();
    for (const [key, value] of Object.entries(upload.fields))
      form.append(key, value);
    // React Native accepts a native URI descriptor in place of a browser Blob.
    if (browserFile) form.append("file", browserFile, upload.filename);
    else
      form.append("file", {
        uri: upload.uri,
        name: upload.filename,
        type: upload.mimeType,
      } as unknown as Blob);
    options.signal?.addEventListener("abort", abort, { once: true });
    xhr.send(form);
  });
}
