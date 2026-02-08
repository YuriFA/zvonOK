import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string()
    .max(100, 'Room name must be at most 100 characters')
    .optional(),
  maxParticipants: z.number()
    .min(2, 'Minimum 2 participants required')
    .max(50, 'Maximum 50 participants allowed')
    .optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
