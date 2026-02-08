import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is stale immediately by default
      staleTime: 0,

      // Cache garbage collection time (5 minutes)
      gcTime: 5 * 60 * 1000,

      // Retry failed requests (up to 3 times)
      retry: 3,

      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (can be disabled per query)
      refetchOnWindowFocus: true,

      // Don't refetch on remount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});
