import { queryClient } from "../api/queryClient";
import { privateCache } from "../api/cache";
import { clearDownloads } from "./files";

// Only a non-secret presence marker is accessible to JavaScript. The refresh
// credential is held in a Secure, HttpOnly, same-origin cookie by the edge API.
const key = "edump.browser-session";
export const secureSessionStorage = {
  async read() {
    return localStorage.getItem(key) ? "browser-cookie" : null;
  },
  async write(_token: string) {
    localStorage.setItem(key, "present");
  },
  async remove() {
    localStorage.removeItem(key);
  },
};
export function clearAdminCache() {
  queryClient.removeQueries({
    predicate: (query) =>
      ["admin-users", "admin-reports"].includes(String(query.queryKey[0])),
  });
}
export async function clearPrivateCache() {
  const results = await Promise.allSettled([
    privateCache.clear(),
    clearDownloads(),
    queryClient.cancelQueries(),
  ]);
  queryClient.clear();
  if (results.some((result) => result.status === "rejected"))
    throw new Error("Couldn't clear saved data. Try again.");
}
