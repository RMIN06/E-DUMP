import * as SecureStore from "expo-secure-store";
import { Directory, Paths } from "expo-file-system";
import { queryClient } from "../api/queryClient";
import { privateCache } from "../api/cache";
import { cancelDownloads } from "./files";

const key = "edump.refresh";
export function clearAdminCache() {
  queryClient.removeQueries({
    predicate: (query) =>
      ["admin-users", "admin-reports"].includes(String(query.queryKey[0])),
  });
}
export const secureSessionStorage = {
  read: () => SecureStore.getItemAsync(key),
  write: (token: string) =>
    SecureStore.setItemAsync(key, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  remove: () => SecureStore.deleteItemAsync(key),
};

export async function clearPrivateCache() {
  const results = await Promise.allSettled([
    privateCache.clear(),
    (async () => {
      await cancelDownloads();
      await queryClient.cancelQueries();
      queryClient.clear();
      const files = new Directory(Paths.cache, "files");
      if (files.exists) files.delete();
    })(),
  ]);
  if (results.some((result) => result.status === "rejected"))
    throw new Error("Couldn't clear saved data. Try again.");
}
