import { act, renderHook } from "@testing-library/react-native";
import { createSession, session } from "../src/auth/session";
import {
  ApiError,
  type Request,
  type RequestOptions,
} from "../src/api/transport";
import { api } from "../src/api/client";
import { useSession } from "../src/lib/session";
import type { components } from "../src/api/schema";

jest.mock("../src/lib/storage", () => ({
  secureSessionStorage: {
    read: jest.fn(),
    write: jest.fn(),
    remove: jest.fn(),
  },
  clearPrivateCache: jest.fn(),
}));

const user: components["schemas"]["User"] = {
  id: "test-user",
  email: "l250001@lhr.nu.edu.pk",
  name: "Ali Raza",
  role: "student",
  is_active: true,
  roll_no: "l250001",
  created_at: "2026-10-09T00:00:00Z",
  last_login_at: "2026-10-09T00:00:00Z",
  last_seen_updates_at: null,
};
const tokens = { access_token: "access", refresh_token: "refresh" };
function setup(
  handler: (
    path: string,
    options?: RequestOptions,
  ) => Promise<unknown> = async () => ({ ...tokens, user, needs_name: false }),
) {
  const send = jest.fn(handler);
  const request: Request = async <T>(path: string, options?: RequestOptions) =>
    (await send(path, options)) as T;
  const storage = {
    read: jest.fn(async (): Promise<string | null> => "saved-refresh"),
    write: jest.fn(async (_token: string) => {}),
    remove: jest.fn(async () => {}),
  };
  const clearCache = jest.fn(async () => {});
  const clearAdminCache = jest.fn();
  return {
    auth: createSession({ request, storage, clearCache, clearAdminCache }),
    send,
    storage,
    clearCache,
    clearAdminCache,
  };
}
test("profile refresh updates permissions and account deletion clears private credentials", async () => {
  const { auth, send, storage, clearCache } = setup(async (path, options) => {
    if (path === "/me" && options?.method === "DELETE") return undefined;
    if (path === "/me") return { ...user, role: "admin" };
    return { ...tokens, user, needs_name: false };
  });
  await auth.syncProfile();
  expect(send).not.toHaveBeenCalled();
  await auth.login(user.email);
  await auth.syncProfile();
  expect(auth.store.getState().user?.role).toBe("admin");
  await auth.deleteAccount();
  expect(send).toHaveBeenCalledWith(
    "/me",
    expect.objectContaining({ method: "DELETE" }),
  );
  expect(auth.store.getState()).toEqual({
    status: "signedOut",
    user: null,
    accessToken: null,
  });
  expect(storage.remove).toHaveBeenCalled();
  expect(clearCache).toHaveBeenCalled();
});
test("a denied account deletion retains the signed-in session", async () => {
  const { auth } = setup(async (path) => {
    if (path === "/me")
      throw new ApiError(403, "forbidden", "Make another admin first.");
    return { ...tokens, user, needs_name: false };
  });
  await auth.login(user.email);
  await expect(auth.deleteAccount()).rejects.toThrow(
    "Make another admin first.",
  );
  expect(auth.store.getState().status).toBe("signedIn");
});

test("a forbidden admin request updates the role and evicts cached admin data without retrying it", async () => {
  const { auth, send, clearAdminCache } = setup(async (path) => {
    if (path === "/admin/users")
      throw new ApiError(403, "forbidden", "An admin is required.");
    if (path === "/me") return user;
    return { ...tokens, user: { ...user, role: "admin" }, needs_name: false };
  });
  await auth.login(user.email);
  await expect(auth.request("/admin/users")).rejects.toThrow(
    "An admin is required.",
  );
  expect(auth.store.getState().user?.role).toBe("student");
  expect(clearAdminCache).toHaveBeenCalledTimes(1);
  expect(
    send.mock.calls.filter(([path]) => path === "/admin/users"),
  ).toHaveLength(1);
});

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("AUTH-1…AUTH-4: session lifecycle and rotation", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  test("login persists only refresh token; name save completes onboarding", async () => {
    const { auth, storage } = setup(async (path) =>
      path === "/me"
        ? user
        : { ...tokens, user: { ...user, name: null }, needs_name: true },
    );
    await auth.login(user.email);
    expect(auth.store.getState().status).toBe("needsName");
    expect(storage.write).toHaveBeenCalledWith("refresh");
    expect(storage.write).not.toHaveBeenCalledWith("access");
    await auth.updateName("Ali Raza");
    expect(auth.store.getState().status).toBe("signedIn");
  });
  test.each(["invalid_email", "account_disabled", "network"])(
    "login failure %s clears local state",
    async (code) => {
      const { auth, storage, clearCache } = setup(async () => {
        throw code === "network"
          ? new Error("network")
          : new ApiError(
              code === "account_disabled" ? 403 : 422,
              code,
              "failure",
            );
      });
      await expect(auth.login(user.email)).rejects.toThrow();
      expect(auth.store.getState().status).toBe(
        code === "account_disabled" ? "blocked" : "signedOut",
      );
      expect(storage.remove).toHaveBeenCalled();
      expect(clearCache).toHaveBeenCalled();
    },
  );
  test("restore rotates then loads /me", async () => {
    const { auth, send, storage } = setup(async (path) =>
      path === "/me" ? user : tokens,
    );
    await auth.restore();
    expect(auth.store.getState()).toMatchObject({
      status: "signedIn",
      user,
      accessToken: "access",
    });
    expect(send.mock.calls.map(([path]) => path)).toEqual([
      "/auth/refresh",
      "/me",
    ]);
    expect(storage.write).toHaveBeenCalledWith("refresh");
  });
  test.each(["missing", "failed", "secure_read", "secure_write"])(
    "restore failure %s clears the session",
    async (failure) => {
      const { auth, storage } = setup(async () => {
        if (failure === "failed")
          throw new ApiError(401, "invalid_token", "invalid");
        return tokens;
      });
      if (failure === "missing") storage.read.mockResolvedValue(null);
      if (failure === "secure_read")
        storage.read.mockRejectedValue(new Error("storage"));
      if (failure === "secure_write")
        storage.write.mockRejectedValue(new Error("storage"));
      await auth.restore();
      expect(auth.store.getState().status).toBe("signedOut");
      expect(storage.remove).toHaveBeenCalled();
    },
  );
  test("3 second restore deadline rejects late responses without resurrecting a session", async () => {
    jest.useFakeTimers();
    const late = deferred<typeof tokens>();
    const { auth, storage } = setup(async () => late.promise);
    const restore = auth.restore();
    await jest.advanceTimersByTimeAsync(3000);
    await restore;
    late.resolve(tokens);
    await Promise.resolve();
    await Promise.resolve();
    expect(auth.store.getState().status).toBe("signedOut");
    expect(storage.write).not.toHaveBeenCalled();
  });
  test("five concurrent unauthorized requests share one refresh and retry once", async () => {
    const rotation = deferred<typeof tokens>();
    const { auth, send } = setup(async (path, options) => {
      if (path === "/auth/login")
        return { ...tokens, access_token: "old", user, needs_name: false };
      if (path === "/auth/refresh") return rotation.promise;
      if (options?.token === "old")
        throw new ApiError(401, "unauthorized", "expired");
      return user;
    });
    await auth.login(user.email);
    const requests = Promise.all(
      Array.from({ length: 5 }, () => auth.request("/me")),
    );
    await Promise.resolve();
    await Promise.resolve();
    rotation.resolve(tokens);
    await requests;
    expect(
      send.mock.calls.filter(([path]) => path === "/auth/refresh"),
    ).toHaveLength(1);
    expect(send.mock.calls.filter(([path]) => path === "/me")).toHaveLength(10);
  });
  test.each([
    "forbidden",
    "account_disabled",
    "request_failed",
    "invalid_token",
  ])("does not refresh on %s", async (code) => {
    const { auth, send } = setup(async () => {
      throw new ApiError(code === "invalid_token" ? 401 : 403, code, "failure");
    });
    await expect(auth.request("/me")).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
    if (code === "account_disabled")
      expect(auth.store.getState().status).toBe("blocked");
  });
  test.each(["invalid_token", "account_disabled", "missing"])(
    "refresh failure %s signs out or blocks",
    async (code) => {
      const { auth, storage } = setup(async () => {
        throw new ApiError(
          code === "account_disabled" ? 403 : 401,
          code,
          "failure",
        );
      });
      if (code === "missing") storage.read.mockResolvedValue(null);
      await expect(auth.refresh()).rejects.toThrow();
      expect(auth.store.getState().status).toBe(
        code === "account_disabled" ? "blocked" : "signedOut",
      );
    },
  );
  test.each([401, 403, 500])(
    "a failed retry (%s) never loops",
    async (status) => {
      const { auth, send } = setup(async (path, options) => {
        if (path === "/auth/refresh") return tokens;
        if (!options?.token) throw new ApiError(401, "unauthorized", "expired");
        throw new ApiError(
          status,
          status === 403 ? "account_disabled" : "unauthorized",
          "retry failed",
        );
      });
      await expect(auth.request("/me")).rejects.toThrow();
      expect(send).toHaveBeenCalledTimes(3);
    },
  );
  test("sign-out clears SecureStore, memory and caches even if server is unreachable", async () => {
    const { auth, storage, clearCache } = setup(async (path) => {
      if (path === "/auth/logout") throw new Error("offline");
      return { ...tokens, user, needs_name: false };
    });
    await auth.login(user.email);
    await auth.signOut();
    expect(auth.store.getState()).toEqual({
      status: "signedOut",
      user: null,
      accessToken: null,
    });
    expect(storage.remove).toHaveBeenCalled();
    expect(clearCache).toHaveBeenCalled();
  });
  test("sign-out still revokes remotely if local cache deletion fails", async () => {
    const { auth, send, clearCache } = setup();
    await auth.login(user.email);
    clearCache.mockRejectedValue(new Error("files"));
    await expect(auth.signOut()).rejects.toThrow("clear saved data");
    expect(send.mock.calls.some(([path]) => path === "/auth/logout")).toBe(
      true,
    );
  });
  test("sign-out prevents a late login or profile save from restoring private state", async () => {
    const late = deferred<unknown>();
    const { auth, storage } = setup(async () => late.promise);
    const login = auth.login(user.email);
    await auth.signOut();
    late.resolve({ ...tokens, user, needs_name: false });
    await expect(login).rejects.toThrow("Session changed");
    expect(storage.write).not.toHaveBeenCalled();
    expect(auth.store.getState().status).toBe("signedOut");
  });
  test("explicit blocking clears private state", async () => {
    const { auth } = setup();
    await auth.block();
    expect(auth.store.getState().status).toBe("blocked");
  });
  test("resource client and reactive session hook use the same store", async () => {
    expect(api).toBe(session.request);
    session.store.setState({
      status: "signedOut",
      user: null,
      accessToken: null,
    });
    const result = await renderHook(() => useSession());
    await act(() => session.store.setState({ status: "signedIn", user }));
    expect(result.result.current.status).toBe("signedIn");
  });
});
