import * as SecureStore from "expo-secure-store";
import { Directory } from "expo-file-system";
import { secureSessionStorage, clearPrivateCache } from "../src/lib/storage";
import { queryClient } from "../src/api/queryClient";
import { studentEmail } from "../src/lib/email";

const mockDelete = jest.fn();
let mockExists = true;
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}));
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  Directory: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockExists;
    },
    delete: mockDelete,
  })),
}));

describe("AUTH-1/AUTH-4: private storage and email mirror", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockExists = true;
  });
  test.each(["l251234@lhr.nu.edu.pk", " L251234@LHR.NU.EDU.PK "])(
    "accepts %s",
    (email) => expect(studentEmail(email)).toBe("l251234@lhr.nu.edu.pk"),
  );
  test.each(["l242530@lhr.nu.edu.pk", " L242530@LHR.NU.EDU.PK "])(
    "accepts only the owner-approved exception %s",
    (email) => expect(studentEmail(email)).toBe("l242530@lhr.nu.edu.pk"),
  );
  test.each([
    "l25123@lhr.nu.edu.pk",
    "l261234@lhr.nu.edu.pk",
    "l242531@lhr.nu.edu.pk",
    "l242529@lhr.nu.edu.pk",
    "l242530+class@lhr.nu.edu.pk",
    "l242530@lhr.nu.edu.pk.evil.com",
    "l242530@lhr.nu.edu.pk\n",
    "l242530@gmail.com",
    "l２42530@lhr.nu.edu.pk",
    "l251234@gmail.com",
    "l251234@lhr.nu.edu.pk.evil.com",
    "x@l251234@lhr.nu.edu.pk",
    "l251234@lhr.nu.edu.pk\n",
    "l25１234@lhr.nu.edu.pk",
    "l25 1234@lhr.nu.edu.pk",
    "x".repeat(65),
  ])("rejects %s", (email) => expect(studentEmail(email)).toBeNull());
  test("SecureStore keeps only the refresh token", async () => {
    await secureSessionStorage.read();
    await secureSessionStorage.write("refresh");
    await secureSessionStorage.remove();
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("edump.refresh");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "edump.refresh",
      "refresh",
      { keychainAccessible: 6 },
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("edump.refresh");
  });
  test.each([true, false])(
    "query data and cached downloads are cleared (files exist: %s)",
    async (exists) => {
      mockExists = exists;
      queryClient.setQueryData(["private"], "private material");
      await clearPrivateCache();
      expect(queryClient.getQueryData(["private"])).toBeUndefined();
      expect(Directory).toHaveBeenCalledWith("file:///cache", "files");
      expect(mockDelete).toHaveBeenCalledTimes(exists ? 1 : 0);
    },
  );
});
