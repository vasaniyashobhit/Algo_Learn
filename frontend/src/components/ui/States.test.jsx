import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { EmptyState } from './EmptyState.jsx';
import { ErrorState } from './ErrorState.jsx';
import { Skeleton } from './Skeleton.jsx';

describe('EmptyState', () => {
  it('shows the title, body, action and a decorative figure', () => {
    render(
      <EmptyState figure="0" title="No handle linked yet" action={<button type="button">Link handle</button>}>
        <p>Link your Codeforces handle to see your topic card.</p>
      </EmptyState>,
    );
    expect(screen.getByRole('heading', { name: 'No handle linked yet' })).toBeInTheDocument();
    expect(screen.getByText('0')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Link handle' })).toBeInTheDocument();
  });

  it('works with a title only', () => {
    const { container } = render(<EmptyState title="Nothing yet" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});

describe('ErrorState', () => {
  it('shows the message, a retry button and the request id', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Codeforces isn't responding." requestId="req-42" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('req-42')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('has no buttons or reference when none are given', () => {
    render(<ErrorState title="Oops" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('sweeps and is hidden from screen readers', () => {
    render(<Skeleton className="h-4" />);
    const block = screen.getByTestId('skeleton');
    expect(block).toHaveClass('skeleton', 'h-4');
    expect(block).toHaveAttribute('aria-hidden', 'true');
    expect(block).toHaveAttribute('data-motion', 'on');
  });

  it('stops sweeping under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('data-motion', 'off');
  });
});
