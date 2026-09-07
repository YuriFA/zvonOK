/**
 * Query keys factory for rooms
 * Provides type-safe, hierarchical query keys
 */
export const roomKeys = {
  all: ["rooms"] as const,

  details: () => [...roomKeys.all, "detail"] as const,

  detail: (slug: string) => [...roomKeys.details(), slug] as const,
} as const;

/**
 * Type assertion for query keys
 */
export type RoomKeys = typeof roomKeys;

/**
 * Query keys factory for call history
 */
export const historyKeys = {
  all: ["history"] as const,

  lists: () => [...historyKeys.all, "list"] as const,

  details: () => [...historyKeys.all, "detail"] as const,

  detail: (id: string) => [...historyKeys.details(), id] as const,
} as const;

/**
 * Type assertion for query keys
 */
export type HistoryKeys = typeof historyKeys;
