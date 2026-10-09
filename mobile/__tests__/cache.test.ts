import { QueryClient } from "@tanstack/react-query";
import { createPrivateCache, cacheMaxAge } from "../src/api/cache";

const settle = () => new Promise((resolve) => setTimeout(resolve, 15));
function setup() {
  const values = new Map<string, string>();
  const storage = {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  const cache = createPrivateCache(storage, client);
  return { values, storage, client, cache };
}

test("offline class cache excludes auth and mutations and limits list pages", async () => {
  const { values, client, cache } = setup();
  await cache.start("student-id");
  client.setQueryData(["auth"], { access_token: "never-persist-this" });
  client.setQueryData(["me"], { email: "never-persist-email" });
  client.setQueryData(["admin-users"], [{ email: "never-persist-admin-email" }]);
  client.setQueryData(["admin-reports"], [{ note: "never-persist-report" }]);
  client.setQueryData(["materials", "coal"], {
    pages: [1, 2, 3],
    pageParams: [null, "a", "b"],
  });
  client.setQueryData(["subjects"], ["COAL"]);
  await settle();
  const saved = values.get("edump.class-cache") ?? "";
  expect(saved).not.toContain("never-persist");
  const decoded = JSON.parse(saved);
  expect(decoded.clientState.mutations).toEqual([]);
  expect(
    decoded.clientState.queries.find(
      (query: { queryKey: string[] }) => query.queryKey[0] === "materials",
    ).state.data,
  ).toEqual({ pages: [2, 3], pageParams: ["a", "b"] });
  cache.stop();
  client.clear();
});

test("same user restores saved lists and a different user cannot read them", async () => {
  const { client, cache, storage } = setup();
  await cache.start("one");
  client.setQueryData(["subjects"], ["DS"]);
  await settle();
  cache.stop();
  client.clear();
  await cache.start("one");
  expect(client.getQueryData(["subjects"])).toEqual(["DS"]);
  cache.stop();
  client.clear();
  await cache.start("two");
  expect(client.getQueryData(["subjects"])).toBeUndefined();
  expect(storage.removeItem).toHaveBeenCalled();
  cache.stop();
  client.clear();
});

test.each(["expired", "corrupt", "future"])(
  "discards %s persisted data",
  async (kind) => {
    const { client, cache, values } = setup();
    values.set(
      "edump.class-cache",
      kind === "corrupt"
        ? "{"
        : JSON.stringify({
            buster: "m2:one",
            timestamp:
              Date.now() + (kind === "future" ? 10000 : -cacheMaxAge - 1),
            clientState: { mutations: [], queries: [] },
          }),
    );
    await cache.start("one");
    expect(values.has("edump.class-cache")).toBe(false);
    cache.stop();
    client.clear();
  },
);

test("sign-out waits for an in-flight disk write then removes it", async () => {
  const { client, cache, storage, values } = setup();
  let finish: (() => void) | undefined;
  storage.setItem.mockImplementationOnce(async (key, value) => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    values.set(key, value);
  });
  await cache.start("one");
  client.setQueryData(["subjects"], ["DS"]);
  await settle();
  const clearing = cache.clear();
  client.setQueryData(["subjects"], ["COAL"]);
  finish?.();
  await clearing;
  await settle();
  expect(values.size).toBe(0);
  client.clear();
});
