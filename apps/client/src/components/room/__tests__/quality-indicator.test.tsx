import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QualityIndicator } from '../QualityIndicator';
import type { QualityScore, QualityStats } from '@/lib/sfu/types';

describe('QualityIndicator', () => {
  const createScore = (level: QualityScore['level'], score: number): QualityScore => ({
    level,
    score,
  });

  const createStats = (overrides?: Partial<QualityStats>): QualityStats => ({
    bitrate: 1500,
    packetLoss: 0.5,
    rtt: 50,
    width: 1280,
    height: 720,
    fps: 30,
    ...overrides,
  });

  it('renders excellent quality badge', () => {
    const score = createScore('excellent', 95);
    render(<QualityIndicator score={score} />);

    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByLabelText('Connection quality: excellent')).toBeInTheDocument();
  });

  it('renders good quality badge', () => {
    const score = createScore('good', 75);
    render(<QualityIndicator score={score} />);

    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders fair quality badge', () => {
    const score = createScore('fair', 50);
    render(<QualityIndicator score={score} />);

    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('renders poor quality badge', () => {
    const score = createScore('poor', 25);
    render(<QualityIndicator score={score} />);

    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('shows detailed stats in tooltip', () => {
    const score = createScore('excellent', 95);
    const stats = createStats();

    render(<QualityIndicator score={score} stats={stats} />);

    const indicator = screen.getByLabelText('Connection quality: excellent');
    expect(indicator).toHaveAttribute('title');
    const title = indicator.getAttribute('title');
    expect(title).toContain('Quality: Excellent (95/100)');
    expect(title).toContain('Bitrate: 1.5 Mbps');
    expect(title).toContain('RTT: 50ms');
    expect(title).toContain('Packet Loss: 0.5%');
    expect(title).toContain('Resolution: 1280x720');
  });

  it('shows bitrate in compact mode with showDetails', () => {
    const score = createScore('good', 70);
    const stats = createStats({ bitrate: 2500 });

    render(<QualityIndicator score={score} stats={stats} showDetails compact />);

    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('2.5 Mbps')).toBeInTheDocument();
  });

  it('formats bitrate correctly for low values', () => {
    const score = createScore('fair', 45);
    const stats = createStats({ bitrate: 500 });

    render(<QualityIndicator score={score} stats={stats} showDetails compact />);

    expect(screen.getByText('500 kbps')).toBeInTheDocument();
  });

  it('does not show bitrate when showDetails is false', () => {
    const score = createScore('good', 70);
    const stats = createStats({ bitrate: 2500 });

    render(<QualityIndicator score={score} stats={stats} compact />);

    expect(screen.queryByText('2.5 Mbps')).not.toBeInTheDocument();
  });
});
