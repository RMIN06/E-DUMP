import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

export type AdminUser = components["schemas"]["User"];
export type AdminReport = components["schemas"]["AdminReport"];
export type UserPatch = components["schemas"]["UserPatch"];
export const useAdminUsers = (q: string) =>
  useQuery({
    queryKey: ["admin-users", q],
    queryFn: ({ signal }) =>
      api<AdminUser[]>(`/admin/users?q=${encodeURIComponent(q.trim())}`, {
        signal,
      }),
  });
export const useAdminReports = (enabled = true) =>
  useQuery({
    queryKey: ["admin-reports"],
    queryFn: ({ signal }) =>
      api<AdminReport[]>("/admin/reports?status=open", { signal }),
    enabled,
  });
