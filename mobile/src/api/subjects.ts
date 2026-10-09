import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

export type Subject = components["schemas"]["Subject"];
export const useSubjects = () =>
  useQuery({
    queryKey: ["subjects"],
    queryFn: ({ signal }) => api<Subject[]>("/subjects", { signal }),
    staleTime: 300_000,
  });
export const useSubject = (slug: string) =>
  useQuery({
    queryKey: ["subject", slug],
    queryFn: ({ signal }) =>
      api<Subject>(`/subjects/${encodeURIComponent(slug)}`, { signal }),
    staleTime: 300_000,
    enabled: Boolean(slug),
  });
