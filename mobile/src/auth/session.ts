import { createStore } from "zustand/vanilla";
import type { components } from "../api/schema";
import { ApiError, publicRequest, type Request } from "../api/transport";
import {
  clearAdminCache,
  clearPrivateCache,
  secureSessionStorage,
} from "../lib/storage";
import { unregisterNotifications } from "../lib/notifications";

type User = components["schemas"]["User"];
type Tokens = components["schemas"]["Tokens"];
type LoginResponse = components["schemas"]["LoginResponse"];
export type SessionStatus =
  "restoring" | "signedOut" | "needsName" | "signedIn" | "blocked";
type SessionState = {
  status: SessionStatus;
  user: User | null;
  accessToken: string | null;
};
type Dependencies = {
  request: Request;
  storage: {
    read(): Promise<string | null>;
    write(token: string): Promise<void>;
    remove(): Promise<void>;
  };
  clearCache(): Promise<void>;
  clearAdminCache?(): void;
  unregisterDevice?(accessToken: string): Promise<void>;
};

export function createSession(dependencies: Dependencies) {
  const store = createStore<SessionState>(() => ({
    status: "restoring",
    user: null,
    accessToken: null,
  }));
  let generation = 0;
  let refreshToken: string | null = null;
  let flight: Promise<string> | null = null;
  let storageQueue = Promise.resolve();
  const enqueue = (action: () => Promise<void>) => {
    storageQueue = storageQueue.catch(() => undefined).then(action);
    return storageQueue;
  };
  const clear = async (status: "signedOut" | "blocked" = "signedOut") => {
    generation += 1;
    refreshToken = null;
    flight = null;
    store.setState({ status, user: null, accessToken: null });
    const results = await Promise.allSettled([
      enqueue(dependencies.storage.remove),
      dependencies.clearCache(),
    ]);
    if (results.some((result) => result.status === "rejected"))
      throw new Error("Couldn't clear saved data. Try again.");
  };
  const save = async (tokens: Tokens, epoch: number) => {
    await enqueue(async () => {
      if (epoch === generation)
        await dependencies.storage.write(tokens.refresh_token);
    });
    if (epoch !== generation) throw new Error("Session changed.");
    refreshToken = tokens.refresh_token;
    store.setState({ accessToken: tokens.access_token });
    return tokens.access_token;
  };
  const setUser = (user: User) => {
    if (user.role !== "admin") dependencies.clearAdminCache?.();
    store.setState({
      user,
      status: user.name === null ? "needsName" : "signedIn",
    });
  };
  const refresh = () => {
    if (flight) return flight;
    const epoch = generation;
    flight = (async () => {
      try {
        const raw = refreshToken ?? (await dependencies.storage.read());
        if (!raw || epoch !== generation) throw new Error("Sign in again.");
        const tokens = await dependencies.request<Tokens>("/auth/refresh", {
          method: "POST",
          body: { refresh_token: raw },
        });
        return await save(tokens, epoch);
      } catch (error) {
        if (epoch === generation)
          await clear(
            error instanceof ApiError && error.code === "account_disabled"
              ? "blocked"
              : "signedOut",
          );
        throw error;
      } finally {
        if (epoch === generation) flight = null;
      }
    })();
    return flight;
  };
  const request: Request = async <T>(
    path: string,
    options = {},
  ): Promise<T> => {
    const epoch = generation;
    const initialToken = store.getState().accessToken;
    try {
      return await dependencies.request<T>(path, {
        ...options,
        token: initialToken,
      });
    } catch (error) {
      if (epoch !== generation) throw error;
      if (
        error instanceof ApiError &&
        error.status === 403 &&
        error.code === "account_disabled"
      ) {
        await clear("blocked");
        throw error;
      }
      if (
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        error.code !== "unauthorized"
      ) {
        if (
          error instanceof ApiError &&
          error.code === "forbidden" &&
          (path.startsWith("/admin/") || path.startsWith("/announcements")) &&
          initialToken
        ) {
          try {
            const user = await dependencies.request<User>("/me", {
              token: initialToken,
            });
            if (epoch === generation) setUser(user);
          } catch {
            /* Preserve the server refusal if profile lookup is unavailable. */
          }
        }
        throw error;
      }
      const currentToken = store.getState().accessToken;
      const token =
        currentToken && currentToken !== initialToken
          ? currentToken
          : await refresh();
      try {
        return await dependencies.request<T>(path, { ...options, token });
      } catch (retryError) {
        if (
          retryError instanceof ApiError &&
          (retryError.status === 401 || retryError.code === "account_disabled")
        )
          await clear(
            retryError.code === "account_disabled" ? "blocked" : "signedOut",
          );
        throw retryError;
      }
    }
  };
  return {
    store,
    request,
    refresh,
    block: () => clear("blocked"),
    async login(email: string) {
      const epoch = ++generation;
      try {
        const response = await dependencies.request<LoginResponse>(
          "/auth/login",
          { method: "POST", body: { email } },
        );
        await save(response, epoch);
        setUser(response.user);
      } catch (error) {
        if (epoch === generation)
          await clear(
            error instanceof ApiError && error.code === "account_disabled"
              ? "blocked"
              : "signedOut",
          );
        throw error;
      }
    },
    async restore() {
      const epoch = generation;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          (async () => {
            const raw = await dependencies.storage.read();
            if (!raw || epoch !== generation) throw new Error("Sign in again.");
            const tokens = await dependencies.request<Tokens>("/auth/refresh", {
              method: "POST",
              body: { refresh_token: raw },
              signal: controller.signal,
            });
            await save(tokens, epoch);
            const user = await dependencies.request<User>("/me", {
              token: tokens.access_token,
              signal: controller.signal,
            });
            if (epoch === generation) setUser(user);
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error("Session restore timed out."));
            }, 3000);
          }),
        ]);
      } catch {
        if (epoch === generation) await clear();
      } finally {
        clearTimeout(timer);
      }
    },
    async updateName(name: string) {
      const epoch = generation;
      const user = await request<User>("/me", {
        method: "PATCH",
        body: { name },
      });
      if (epoch === generation) setUser(user);
    },
    async syncProfile() {
      if (!store.getState().accessToken) return;
      const epoch = generation;
      const user = await request<User>("/me");
      if (epoch === generation) setUser(user);
    },
    async deleteAccount() {
      const epoch = generation;
      const token = store.getState().accessToken;
      await request<void>("/me", { method: "DELETE" });
      if (epoch !== generation) return;
      try {
        if (token) await dependencies.unregisterDevice?.(token);
      } catch {
        /* Backend deletion already removed devices. */
      }
      await clear();
    },
    async signOut() {
      const raw = refreshToken;
      const token = store.getState().accessToken;
      // Revoke best effort; local data is always cleared even when offline.
      let clearError: unknown;
      try {
        await clear();
      } catch (error) {
        clearError = error;
      }
      if (raw && token) {
        try {
          await dependencies.unregisterDevice?.(token);
        } catch {
          /* Device cleanup retries at the next registration. */
        }
        try {
          await dependencies.request<void>("/auth/logout", {
            method: "POST",
            body: { refresh_token: raw },
            token,
          });
        } catch {
          /* Local credentials have already been removed. */
        }
      }
      if (clearError) throw clearError;
    },
  };
}

export const session = createSession({
  request: publicRequest,
  storage: secureSessionStorage,
  clearCache: clearPrivateCache,
  clearAdminCache,
  unregisterDevice: unregisterNotifications,
});
