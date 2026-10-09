import { QueryClient } from "@tanstack/react-query";

// Auth responses are never query-cached or persisted.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 60_000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      networkMode: "always",
    },
  },
});
