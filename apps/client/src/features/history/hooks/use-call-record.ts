import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { historyKeys } from "@/lib/react-query/query-keys";

import { historyApi } from "../services/history-api";

/**
 * Query hook for one call record with its chat transcript
 */
export function useCallRecord(id: string) {
  return useQuery({
    queryKey: historyKeys.detail(id),
    queryFn: () => historyApi.getCallRecord(id),
    enabled: id.length > 0,
  });
}

interface UseDeleteCallRecordOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Mutation hook for deleting one call record
 */
export function useDeleteCallRecord(options?: UseDeleteCallRecordOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => historyApi.deleteCallRecord(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: historyKeys.all });
      options?.onSuccess?.();
    },

    onError: options?.onError,
  });
}
