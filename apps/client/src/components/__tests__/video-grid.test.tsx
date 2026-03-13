import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoGrid, VideoTile } from '@/components/video-grid';

describe('VideoGrid', () => {
  it('uses a single-column layout for one participant', () => {
    const { container } = render(
      <VideoGrid>
        <div>solo</div>
      </VideoGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1', 'max-w-3xl', 'mx-auto');
  });

  it('uses a two-column layout for four participants', () => {
    const { container } = render(
      <VideoGrid>
        {Array.from({ length: 4 }, (_, index) => {
          const participantId = `participant-${index}`;

          return <div key={participantId}>{participantId}</div>;
        })}
      </VideoGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'max-w-5xl', 'mx-auto');
  });

  it('keeps the task-defined three-column layout for ten participants', () => {
    const { container } = render(
      <VideoGrid>
        {Array.from({ length: 10 }, (_, index) => {
          const participantId = `participant-${index}`;

          return <div key={participantId}>{participantId}</div>;
        })}
      </VideoGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-2', 'sm:grid-cols-3');
    expect(container.firstChild).not.toHaveClass('xl:grid-cols-4');
  });
});

describe('VideoTile', () => {
  it('maintains a 16:9 aspect ratio in the shared component', () => {
    render(
      <VideoTile>
        <div>content</div>
      </VideoTile>
    );

    expect(screen.getByText('content').parentElement).toHaveClass('aspect-video', 'overflow-hidden');
  });
});