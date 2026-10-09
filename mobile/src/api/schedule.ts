import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

export type ScheduleSlot = components["schemas"]["ScheduleSlot"];
export const useSchedule = () =>
  useQuery({
    queryKey: ["schedule"],
    queryFn: ({ signal }) => api<ScheduleSlot[]>("/schedule", { signal }),
    staleTime: 60_000,
  });
