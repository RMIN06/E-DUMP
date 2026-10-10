import {
  secureSessionStorage,
  clearPrivateCache,
  clearAdminCache,
} from "../src/lib/storage.web";
import { queryClient } from "../src/api/queryClient";
import { privateCache } from "../src/api/cache";
import { clearDownloads } from "../src/lib/files";
jest.mock("../src/api/queryClient", () => ({
  queryClient: {
    removeQueries: jest.fn(),
    cancelQueries: jest.fn(async () => undefined),
    clear: jest.fn(),
  },
}));
jest.mock("../src/api/cache", () => ({
  privateCache: { clear: jest.fn(async () => undefined) },
}));
jest.mock("../src/lib/files", () => ({
  clearDownloads: jest.fn(async () => undefined),
}));
test("browser storage never saves refresh secrets and clears private data", async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  expect(await secureSessionStorage.read()).toBeNull();
  await secureSessionStorage.write("must-not-be-stored");
  expect([...values.values()]).toEqual(["present"]);
  expect(await secureSessionStorage.read()).toBe("browser-cookie");
  await secureSessionStorage.remove();
  expect(await secureSessionStorage.read()).toBeNull();
  clearAdminCache();
  await clearPrivateCache();
  expect(privateCache.clear).toHaveBeenCalled();
  expect(clearDownloads).toHaveBeenCalled();
  expect(queryClient.clear).toHaveBeenCalled();
  jest.mocked(clearDownloads).mockRejectedValueOnce(new Error("failed"));
  await expect(clearPrivateCache()).rejects.toThrow(
    "Couldn't clear saved data.",
  );
});
