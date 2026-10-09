import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { api } from "../src/api/client";
import {
  materialPath,
  useMaterials,
  useMaterial,
  getDownload,
} from "../src/api/materials";
jest.mock("../src/api/client", () => ({ api: jest.fn() }));
const filters = { kind: "notes" as const, chapter: "3", q: " chapter & 3 " };
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
test("combined filters and cursor are URL encoded", () => {
  expect(materialPath("coal/lab", filters, "a+/=")).toBe(
    "/subjects/coal%2Flab/materials?kind=notes&chapter=3&q=chapter+%26+3&cursor=a%2B%2F%3D",
  );
  expect(materialPath("coal", { kind: "all", chapter: "all", q: " " })).toBe(
    "/subjects/coal/materials?",
  );
});
test("cursor pagination retains at most two pages and sends cancellation signals", async () => {
  jest
    .mocked(api)
    .mockResolvedValueOnce({
      items: [{ id: "first" }],
      chapters: [3],
      next_cursor: "second",
    })
    .mockResolvedValueOnce({
      items: [{ id: "second" }],
      chapters: [3],
      next_cursor: "third",
    })
    .mockResolvedValueOnce({
      items: [{ id: "third" }],
      chapters: [3],
      next_cursor: null,
    });
  const { result } = await renderHook(() => useMaterials("coal", filters), {
    wrapper,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);
  expect(result.current.data?.pages).toHaveLength(1);
  await act(async () => {
    await result.current.fetchNextPage({ throwOnError: true });
  });
  expect(api).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  await act(async () => {
    await result.current.fetchNextPage();
  });
  await waitFor(() =>
    expect(
      result.current.data?.pages.flatMap((page) =>
        page.items.map((item) => item.id),
      ),
    ).toEqual(["second", "third"]),
  );
  expect(result.current.hasNextPage).toBe(false);
  expect(api).toHaveBeenLastCalledWith(
    expect.stringContaining("cursor=third"),
    { signal: expect.any(AbortSignal) },
  );
});
test("detail is query cached but a signed download URL is never cached", async () => {
  jest.mocked(api).mockResolvedValue({ id: "one" });
  const { result } = await renderHook(() => useMaterial("one"), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await getDownload("one");
  expect(api).toHaveBeenLastCalledWith("/materials/one/download");
  expect(
    client
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey),
  ).toEqual([["material", "one"]]);
});
