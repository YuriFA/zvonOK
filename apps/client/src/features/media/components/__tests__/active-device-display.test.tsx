import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ActiveDeviceDisplay } from '../active-device-display';
import type { MediaDevice } from '../../hooks/use-media-devices';

function device(deviceId: string, label: string, kind: MediaDevice['kind']): MediaDevice {
  return { deviceId, label, kind, groupId: 'group-1' };
}

describe('ActiveDeviceDisplay', () => {
  it('shows device names in full mode', () => {
    render(
      <ActiveDeviceDisplay
        camera={device('cam-1', 'FaceTime HD Camera', 'videoinput')}
        microphone={device('mic-1', 'Built-in Mic', 'audioinput')}
        speaker={device('spk-1', 'Built-in Speakers', 'audiooutput')}
        compact={false}
      />
    );

    expect(screen.getAllByText('Camera: FaceTime HD Camera').length).toBe(2);
    expect(screen.getAllByText('Microphone: Built-in Mic').length).toBe(2);
    expect(screen.getAllByText('Speaker: Built-in Speakers').length).toBe(2);
  });

  it('shows icons (and sr-only labels) in compact mode', () => {
    render(
      <ActiveDeviceDisplay
        camera={device('cam-1', 'FaceTime HD Camera', 'videoinput')}
        microphone={device('mic-1', 'Built-in Mic', 'audioinput')}
        speaker={device('spk-1', 'Built-in Speakers', 'audiooutput')}
        compact={true}
      />
    );

    // Labels are present via sr-only spans
    expect(screen.getByText('Camera: FaceTime HD Camera')).toBeInTheDocument();
    expect(screen.getByText('Microphone: Built-in Mic')).toBeInTheDocument();
    expect(screen.getByText('Speaker: Built-in Speakers')).toBeInTheDocument();
  });

  it('renders off states when audio/video disabled', () => {
    render(
      <ActiveDeviceDisplay
        camera={device('cam-1', 'FaceTime HD Camera', 'videoinput')}
        microphone={device('mic-1', 'Built-in Mic', 'audioinput')}
        speaker={undefined}
        compact={true}
        isVideoEnabled={false}
        isAudioEnabled={false}
      />
    );

    expect(screen.getByText('Camera off')).toBeInTheDocument();
    expect(screen.getByText('Microphone off')).toBeInTheDocument();
    expect(screen.getByText('No speaker')).toBeInTheDocument();
  });
});
