import { createStore } from "zustand/vanilla";
import type { components } from "../api/schema";
import {
  ApiError,
  publicRequest,
  type Request,
  type RequestOptions,
} from "../api/transport";
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
  | "restoring"
  | "restoreFailed"
  | "signedOut"
  | "needsName"
  | "signedIn"
  | "blocked";
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
  let restoreFlight: Promise<void> | null = null;
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
    if (epoch !== generation) throw new Error("Session changed.");
    // Retain a rotated credential in memory if the device write needs retrying.
    refreshToken = tokens.refresh_token;
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
  const refresh = (signal?: AbortSignal) => {
    if (flight) return flight;
    const epoch = generation;
    flight = (async () => {
      try {
        const raw = refreshToken ?? (await dependencies.storage.read());
        if (epoch !== generation) throw new Error("Session changed.");
        if (!raw) throw new ApiError(401, "invalid_token", "Sign in again.");
        const tokens = await dependencies.request<Tokens>("/auth/refresh", {
          method: "POST",
          body: { refresh_token: raw },
          timeoutMs: 75_000,
          signal,
        });
        return await save(tokens, epoch);
      } catch (error) {
        if (
          epoch === generation &&
          error instanceof ApiError &&
          (error.status === 401 || error.code === "account_disabled")
        )
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
    options: RequestOptions = {},
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
          : await refresh(options.signal);
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
  const restore = () => {
    if (restoreFlight) return restoreFlight;
    const epoch = generation;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    store.setState({ status: "restoring" });
    restoreFlight = (async () => {
      try {
        await Promise.race([
          (async () => {
            if (!store.getState().accessToken) await refresh(controller.signal);
            const user = await request<User>("/me", {
              signal: controller.signal,
            });
            if (epoch === generation && !controller.signal.aborted)
              setUser(user);
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error("Session restore timed out."));
            }, 90_000);
          }),
        ]);
      } catch (error) {
        if (epoch === generation) {
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.code === "account_disabled")
          )
            await clear(
              error.code === "account_disabled" ? "blocked" : "signedOut",
            );
          else store.setState({ status: "restoreFailed", user: null });
        }
      } finally {
        clearTimeout(timer);
        restoreFlight = null;
      }
    })();
    return restoreFlight;
  };
  return {
    store,
    request,
    refresh,
    restore,
    block: () => clear("blocked"),
    async requestCode(email: string) {
      return dependencies.request<{
        challenge_id: string;
        expires_in: number;
        retry_after: number;
      }>("/auth/login", { method: "POST", body: { email }, timeoutMs: 75_000 });
    },
    async login(email: string, code: string, challengeId: string) {
      const epoch = ++generation;
      try {
        const response = await dependencies.request<LoginResponse>(
          "/auth/verify",
          {
            method: "POST",
            body: { email, code, challenge_id: challengeId },
            timeoutMs: 75_000,
          },
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
