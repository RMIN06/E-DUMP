import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

export function useFocusRead(query: {
  isStale: boolean;
  isFetching: boolean;
  refetch(): Promise<unknown>;
}) {
  const current = useRef(query);
  current.current = query;
  useFocusEffect(
    useCallback(() => {
      const query = current.current;
      if (query.isStale && !query.isFetching) void query.refetch();
    }, []),
  );
}
