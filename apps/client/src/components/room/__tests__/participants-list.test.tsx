import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParticipantsList } from '../ParticipantsList';

describe('ParticipantsList', () => {
  it('renders participants, count badge, and owner kick controls', () => {
    const onKickParticipant = vi.fn();

    render(
      <ParticipantsList
        participants={[
          {
            id: 'user-1',
            userId: 'user-1',
            username: 'alice',
            isMuted: false,
            isVideoOff: false,
            isConnected: true,
          },
          {
            id: 'user-2',
            userId: 'user-2',
            username: 'bob',
            isMuted: true,
            isVideoOff: true,
            isConnected: false,
          },
        ]}
        currentUserId="user-1"
        roomOwnerId="user-1"
        onKickParticipant={onKickParticipant}
      />
    );

    expect(screen.getByText('Participants').closest('div')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByLabelText('Participants list')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kick bob' }));

    expect(onKickParticipant).toHaveBeenCalledWith('user-2');
  });

  it('shows empty message when no participants', () => {
    render(
      <ParticipantsList
        participants={[]}
        currentUserId="user-1"
        roomOwnerId="user-2"
      />
    );

    expect(screen.getByText('No participants')).toBeInTheDocument();
  });
});