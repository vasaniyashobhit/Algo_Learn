import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { HintList } from './HintList.jsx';

const HINTS = ['Think about $$$dp_i$$$.', 'Count tiles of colour $$$c_i$$$.', 'Precompute binomials.'];

const hintItems = () => within(screen.getByRole('list', { name: 'Hints' })).getAllByRole('listitem');

describe('HintList', () => {
  it('reveals hints one at a time, moving focus to the new one', async () => {
    render(<HintList hints={HINTS} />);
    expect(hintItems()).toHaveLength(1);
    expect(hintItems()[0]).toHaveTextContent('Hint 1: Think about');
    expect(hintItems()[0].querySelector('.katex')).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Next hint (2 left)' }));
    expect(hintItems()).toHaveLength(2);
    expect(hintItems()[1]).toHaveFocus();
    expect(hintItems()[1]).toHaveAttribute('data-motion', 'on');
    expect(screen.getByText('Hint 2 of 3 shown.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next hint (1 left)' }));
    expect(hintItems()).toHaveLength(3);
    expect(hintItems()[2]).toHaveFocus();
    expect(screen.queryByRole('button', { name: /Next hint/ })).not.toBeInTheDocument();
  });

  it('uses the plate only when asked', () => {
    const { rerender } = render(<HintList hints={HINTS} />);
    expect(screen.getByRole('button', { name: /Next hint/ })).toHaveClass('bg-plate');
    rerender(<HintList hints={HINTS} plate={false} />);
    expect(screen.getByRole('button', { name: /Next hint/ })).not.toHaveClass('bg-plate');
  });

  it('shows a single hint without a button', () => {
    render(<HintList hints={['Only one.']} />);
    expect(hintItems()).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reveals without the wipe under reduced motion', async () => {
    installMatchMedia({ reducedMotion: true });
    render(<HintList hints={HINTS} />);
    await userEvent.click(screen.getByRole('button', { name: /Next hint/ }));
    expect(hintItems()[1]).toHaveAttribute('data-motion', 'off');
  });
});
