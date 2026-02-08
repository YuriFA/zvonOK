import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createRoomSchema, type CreateRoomInput } from '../validation/create-room.schema';
import { useCreateRoom } from '../hooks';
import { ApiError, ValidationError } from '@/lib/api/api.errors';

interface CreateRoomFormProps {
  onSuccess?: (room: { slug: string }) => void;
  onCancel?: () => void;
}

export function CreateRoomForm({ onSuccess, onCancel }: CreateRoomFormProps) {
  const navigate = useNavigate();
  const createRoom = useCreateRoom({
    onSuccess: (room) => {
      if (onSuccess) {
        onSuccess(room);
      }

      navigate(`/room/${room.slug}/lobby`);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateRoomInput>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      maxParticipants: 10,
    },
  });

  const onSubmit = async (data: CreateRoomInput) => {
    createRoom.mutate(data, {
      onError: (error) => {
        if (error instanceof ValidationError) {
          setError('root', {
            type: 'manual',
            message: error.message,
          });
        } else if (error instanceof ApiError) {
          setError('root', {
            type: 'manual',
            message: 'Failed to create room. Please try again.',
          });
        } else {
          setError('root', {
            type: 'manual',
            message: 'An unexpected error occurred.',
          });
        }
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {createRoom.error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {createRoom.error.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Room Name (Optional)</Label>
        <Input
          id="name"
          type="text"
          placeholder="My Awesome Room"
          disabled={createRoom.isPending}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxParticipants">Max Participants</Label>
        <Input
          id="maxParticipants"
          type="number"
          min={2}
          max={50}
          disabled={createRoom.isPending}
          {...register('maxParticipants', { valueAsNumber: true })}
        />
        {errors.maxParticipants && (
          <p className="text-sm text-destructive">{errors.maxParticipants.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={createRoom.isPending}>
          {createRoom.isPending ? 'Creating...' : 'Create Room'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createRoom.isPending}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
