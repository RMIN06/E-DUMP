import { ApiError, publicRequest } from "../src/api/transport";
import { Platform } from "react-native";

const reply = (status: number, body: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as Response;

describe("AUTH-2: JSON transport", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://test/api/v1/";
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });
  test("sends typed JSON and bearer without persisting tokens", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(reply(200, { name: "Ali" }));
    expect(
      await publicRequest("/me", {
        method: "PATCH",
        body: { name: "Ali" },
        token: "access",
      }),
    ).toEqual({ name: "Ali" });
    expect(fetch).toHaveBeenCalledWith(
      "http://test/api/v1/me",
      expect.objectContaining({
        method: "PATCH",
        body: '{"name":"Ali"}',
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer access",
        },
      }),
    );
  });
  test("empty success and requests without body or auth", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(reply(204, null));
    expect(await publicRequest("/auth/logout")).toBeUndefined();
    expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined();
  });
  test.each([
    { error: { code: "unauthorized", message: "Sign in." } },
    null,
    { error: null },
    { error: { code: 4, message: 6 } },
  ])("structured errors and malformed errors fail safely", async (body) => {
    jest.spyOn(global, "fetch").mockResolvedValue(reply(401, body));
    await expect(publicRequest("/me")).rejects.toBeInstanceOf(ApiError);
  });
  test("missing configuration never makes a request", async () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const fetch = jest.spyOn(global, "fetch");
    await expect(publicRequest("/me", { method: "POST" })).rejects.toThrow(
      "Can't reach",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  test.each([true, false])(
    "external abort is forwarded (already aborted: %s)",
    async (aborted) => {
      const controller = new AbortController();
      if (aborted) controller.abort();
      const fetch = jest
        .spyOn(global, "fetch")
        .mockResolvedValue(reply(200, {}));
      const request = publicRequest("/me", { signal: controller.signal });
      if (!aborted) controller.abort();
      await request;
      expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    },
  );
  test("JSON request aborts after 15 seconds", async () => {
    jest.useFakeTimers();
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          ),
      );
    const result = expect(
      publicRequest("/me", { method: "POST" }),
    ).rejects.toThrow("aborted");
    await jest.advanceTimersByTimeAsync(15_000);
    await result;
  });
  test("GET network failures retry twice with the documented backoff", async () => {
    jest.useFakeTimers();
    const fetch = jest
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(reply(200, { ok: true }));
    const result = publicRequest("/me");
    await jest.advanceTimersByTimeAsync(4000);
    expect(await result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  test("session refresh permits a sleeping server without repeating a token rotation", async () => {
    jest.useFakeTimers();
    const fetch = jest
      .spyOn(global, "fetch")
      .mockImplementation(
        async (_url, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          ),
      );
    const result = expect(
      publicRequest("/auth/refresh", { method: "POST", timeoutMs: 75_000 }),
    ).rejects.toThrow("aborted");
    await jest.advanceTimersByTimeAsync(15_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(60_000);
    await result;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  test("browser authentication uses a cross-tab cookie lock", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    const original = Object.getOwnPropertyDescriptor(navigator, "locks");
    const lock = jest.fn(
      async (
        _name: string,
        _options: { signal?: AbortSignal },
        action: () => Promise<unknown>,
      ) => action(),
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request: lock },
    });
    jest.spyOn(global, "fetch").mockResolvedValue(reply(200, {}));
    try {
      await publicRequest("/auth/refresh", { method: "POST" });
      expect(lock).toHaveBeenCalledWith(
        "edump.session",
        expect.any(Object),
        expect.any(Function),
      );
      await publicRequest("/me");
      expect(lock).toHaveBeenCalledTimes(1);
    } finally {
      if (original) Object.defineProperty(navigator, "locks", original);
      else Reflect.deleteProperty(navigator, "locks");
    }
  });
});
