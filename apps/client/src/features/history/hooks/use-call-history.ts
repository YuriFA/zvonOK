import { useQuery } from "@tanstack/react-query";

import { historyKeys } from "@/lib/react-query/query-keys";

import { historyApi } from "../services/history-api";

/**
 * Query hook for the signed-in user's call history (newest first)
 */
export function useCallHistory() {
  return useQuery({
    queryKey: historyKeys.lists(),
    queryFn: () => historyApi.listCallHistory(),
  });
}
