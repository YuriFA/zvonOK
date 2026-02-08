import { useQuery } from '@tanstack/react-query';
import { roomKeys } from '@/lib/react-query/query-keys';
import { roomApi } from '../services/room-api';

/**
 * Fetch a single room by slug
 * Useful for room detail pages
 */
export function useRoom(slug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: roomKeys.detail(slug),
    queryFn: () => roomApi.getRoomBySlug(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes - room details change less often
    enabled: enabled && !!slug,
  });
}
