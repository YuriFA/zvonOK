import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roomKeys } from '@/lib/react-query/query-keys';
import { roomApi } from '../services/room-api';

interface UseEndRoomOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Mutation hook for ending a room
 * Removes all room queries from cache
 */
export function useEndRoom(options?: UseEndRoomOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => roomApi.endRoom(roomId),

    onSuccess: () => {
      // Remove all room queries from cache
      queryClient.removeQueries({
        queryKey: roomKeys.all,
      });

      options?.onSuccess?.();
    },

    onError: options?.onError,
  });
}
