import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roomKeys } from '@/lib/react-query/query-keys';
import { roomApi } from '../services/room-api';
import type { CreateRoomInput } from '../types/room.types';

interface UseCreateRoomOptions {
  onSuccess?: (room: { slug: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Mutation hook for creating a new room
 * Pre-populates the new room in cache for immediate navigation
 */
export function useCreateRoom(options?: UseCreateRoomOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoomInput) => roomApi.createRoom(data),

    onSuccess: (room) => {
      // Pre-populate the new room in cache for immediate navigation
      queryClient.setQueryData(roomKeys.detail(room.slug), room);

      options?.onSuccess?.(room);
    },

    onError: options?.onError,
  });
}
