import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

const key = "edump.class-cache";
export const cacheMaxAge = 7 * 24 * 60 * 60 * 1000;
const allowed = new Set([
  "subjects",
  "subject",
  "schedule",
  "materials",
  "material",
]);

type Storage = Pick<typeof AsyncStorage, "getItem" | "setItem" | "removeItem">;
export function createPrivateCache(storage: Storage, client: QueryClient) {
  let generation = 0;
  let unsubscribe: (() => void) | undefined;
  let queue = Promise.resolve();
  const enqueue = (action: () => Promise<void>) => {
    queue = queue.catch(() => undefined).then(action);
    return queue;
  };
  const stop = () => {
    generation += 1;
    unsubscribe?.();
    unsubscribe = undefined;
  };
  return {
    async start(userId: string) {
      stop();
      const epoch = generation;
      const buster = `m2:${userId}`;
      const persister = createAsyncStoragePersister({
        key,
        throttleTime: 0,
        storage: {
          getItem: (name) => storage.getItem(name),
          removeItem: (name) => enqueue(() => storage.removeItem(name)),
          setItem: (name, value) =>
            enqueue(async () => {
              if (epoch === generation) await storage.setItem(name, value);
            }),
        },
      });
      try {
        const saved = await persister.restoreClient();
        if (epoch !== generation) return;
        if (
          saved &&
          saved.buster === buster &&
          Date.now() - saved.timestamp <= cacheMaxAge &&
          saved.timestamp <= Date.now()
        ) {
          hydrate(client, {
            mutations: [],
            queries: saved.clientState.queries.filter((query) =>
              allowed.has(String(query.queryKey[0])),
            ),
          });
        } else await persister.removeClient();
      } catch {
        await persister.removeClient();
      }
      if (epoch !== generation) return;
      unsubscribe = client.getQueryCache().subscribe(() => {
        const state = dehydrate(client, {
          shouldDehydrateMutation: () => false,
          shouldDehydrateQuery: (query) =>
            allowed.has(String(query.queryKey[0])) &&
            query.state.status === "success",
        });
        for (const query of state.queries) {
          const data = query.state.data;
          if (
            data &&
            typeof data === "object" &&
            "pages" in data &&
            "pageParams" in data &&
            Array.isArray(data.pages) &&
            Array.isArray(data.pageParams)
          ) {
            query.state = {
              ...query.state,
              data: {
                ...data,
                pages: data.pages.slice(-2),
                pageParams: data.pageParams.slice(-2),
              },
            };
          }
        }
        void persister.persistClient({
          buster,
          timestamp: Date.now(),
          clientState: state,
        });
      });
    },
    stop,
    async clear() {
      stop();
      await enqueue(() => storage.removeItem(key));
    },
  };
}
export const privateCache = createPrivateCache(AsyncStorage, queryClient);
