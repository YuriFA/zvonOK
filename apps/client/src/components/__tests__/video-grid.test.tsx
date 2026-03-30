import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoGrid, VideoTile } from '@/components/video-grid';

describe('VideoGrid', () => {
  it('renders a two-column grid layout', () => {
    const { container } = render(
      <VideoGrid>
        <div>solo</div>
      </VideoGrid>
    );

    expect(container.firstChild).toHaveClass('flex-1', 'relative', 'size-full');
  });

  it('applies custom className', () => {
    const { container } = render(
      <VideoGrid className="max-w-5xl mx-auto">
        <div>solo</div>
      </VideoGrid>
    );

    expect(container.firstChild).toHaveClass('flex-1', 'max-w-5xl', 'mx-auto');
  });

  it('renders all children in the grid', () => {
    const { container } = render(
      <VideoGrid>
        {Array.from({ length: 10 }, (_, index) => {
          const participantId = `participant-${index}`;

          return <div key={participantId}>{participantId}</div>;
        })}
      </VideoGrid>
    );

    expect(container.firstChild).toHaveClass('flex-1');
    expect((container.firstChild as HTMLElement).querySelectorAll(':scope > div')).toHaveLength(10);
  });
});

describe('VideoTile', () => {
  it('maintains a 16:9 aspect ratio in the shared component', () => {
    render(
      <VideoTile>
        <div>content</div>
      </VideoTile>
    );

    expect(screen.getByText('content').parentElement).toHaveClass('aspect-video', 'overflow-hidden', 'rounded-lg');
  });
});