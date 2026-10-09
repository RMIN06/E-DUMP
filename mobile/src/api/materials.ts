import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

export type Material = components["schemas"]["Material"];
export type MaterialKind = Material["kind"];
export type MaterialPage = components["schemas"]["MaterialPage"];
export type Download = components["schemas"]["Download"];
export type ReportReason = components["schemas"]["ReportCreate"]["reason"];
export type MaterialFilters = {
  kind: MaterialKind | "all";
  chapter: string;
  q: string;
};

export function materialPath(
  slug: string,
  filters: MaterialFilters,
  cursor?: string,
) {
  const params = new URLSearchParams();
  if (filters.kind !== "all") params.set("kind", filters.kind);
  if (filters.chapter !== "all") params.set("chapter", filters.chapter);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (cursor) params.set("cursor", cursor);
  return `/subjects/${encodeURIComponent(slug)}/materials?${params.toString()}`;
}
export const useMaterials = (slug: string, filters: MaterialFilters) =>
  useInfiniteQuery({
    queryKey: ["materials", slug, filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<MaterialPage>(materialPath(slug, filters, pageParam), { signal }),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    getPreviousPageParam: () => undefined,
    maxPages: 2,
    staleTime: 60_000,
  });
export const useMaterial = (id: string) =>
  useQuery({
    queryKey: ["material", id],
    queryFn: ({ signal }) =>
      api<Material>(`/materials/${encodeURIComponent(id)}`, { signal }),
  });
export const getDownload = (id: string) =>
  api<Download>(`/materials/${encodeURIComponent(id)}/download`);
