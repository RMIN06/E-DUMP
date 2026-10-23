import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

export type Announcement = components["schemas"]["Announcement"];
export type AnnouncementWrite = components["schemas"]["AnnouncementWrite"];
export type AnnouncementPatch = components["schemas"]["AnnouncementPatch"];
export type Attachment = components["schemas"]["Attachment"];
export const updateTypes = ["quiz", "task", "datesheet", "general"] as const;
export function updatePath(type: string, subject?: string, cursor?: string) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (subject) params.set("subject", subject);
  if (cursor) params.set("cursor", cursor);
  return `/announcements?${params.toString()}`;
}
export const useUpdates = (type = "all", subject?: string) =>
  useInfiniteQuery({
    queryKey: ["announcements", type, subject, "deadline-order"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<components["schemas"]["AnnouncementPage"]>(
        updatePath(type, subject, pageParam),
        { signal },
      ),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    getPreviousPageParam: () => undefined,
    maxPages: 2,
    staleTime: 60_000,
  });
export const useAnnouncement = (id: string) =>
  useQuery({
    queryKey: ["announcement", id],
    queryFn: ({ signal }) =>
      api<Announcement>(`/announcements/${encodeURIComponent(id)}`, { signal }),
    enabled: Boolean(id),
  });
export const useUpcoming = () =>
  useQuery({
    queryKey: ["upcoming"],
    queryFn: ({ signal }) =>
      api<Announcement[]>("/announcements/upcoming", { signal }),
    staleTime: 60_000,
  });
export const useUnreadCount = () =>
  useQuery({
    queryKey: ["unread-updates"],
    queryFn: ({ signal }) =>
      api<components["schemas"]["UnreadCount"]>("/announcements/unread-count", {
        signal,
      }),
    refetchInterval: 60_000,
  });
export const getAttachmentDownload = (id: string, fileId: string) =>
  api<components["schemas"]["Download"]>(
    `/announcements/${encodeURIComponent(id)}/attachments/${encodeURIComponent(fileId)}/download`,
  );
