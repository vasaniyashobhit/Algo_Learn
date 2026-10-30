import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card.jsx';
import { Spinner } from './Spinner.jsx';
import { Tag } from './Tag.jsx';

describe('Card', () => {
  it('is a band panel by default and can be any element', () => {
    render(
      <Card as="section" aria-label="Stats">
        Body
      </Card>,
    );
    const card = screen.getByRole('region', { name: 'Stats' });
    expect(card.className).toContain('bg-band');
  });

  it('supports the chalk scoreboard tone and falls back for unknown tones', () => {
    const { rerender } = render(<Card tone="chalk">Board</Card>);
    expect(screen.getByText('Board').className).toContain('bg-chalk');
    rerender(<Card tone="nope">Board</Card>);
    expect(screen.getByText('Board').className).toContain('bg-band');
  });
});

describe('Tag', () => {
  it('renders a topic', () => {
    render(<Tag>dp</Tag>);
    expect(screen.getByText('dp').className).toContain('bg-band-2');
  });

  it('labels a gap tag in words, not just colour', () => {
    render(<Tag tone="gap">combinatorics</Tag>);
    expect(screen.getByText(/combinatorics/)).toHaveTextContent('combinatorics (concept gap)');
  });
});

describe('Spinner', () => {
  it('is decorative', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
