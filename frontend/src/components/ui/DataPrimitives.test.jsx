import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Mark } from './Mark.jsx';
import { PanelHeading } from './PanelHeading.jsx';
import { QueryState } from './QueryState.jsx';
import { SegmentedControl } from './SegmentedControl.jsx';
import { TableToggle } from './TableToggle.jsx';

const state = (overrides) => ({ isPending: false, isError: false, data: undefined, refetch: vi.fn(), ...overrides });
const view = (query, extra = {}) => (
  <QueryState
    query={query}
    skeleton={<p>skeleton</p>}
    errorTitle="Panel didn't load"
    isEmpty={(data) => data.length === 0}
    empty={<p>empty</p>}
    {...extra}
  >
    {(data) => <p>data: {data.length}</p>}
  </QueryState>
);
const renderState = (query, extra) => render(view(query, extra));

describe('QueryState', () => {
  it('walks skeleton → data → empty', () => {
    const { rerender } = renderState(state({ isPending: true }));
    expect(screen.getByText('skeleton')).toBeInTheDocument();
    rerender(view(state({ data: [1, 2] })));
    expect(screen.getByText('data: 2')).toBeInTheDocument();
    rerender(view(state({ data: [] })));
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('shows a user-specific error with retry and reference, but keeps cached data on a failed refetch', async () => {
    const query = state({ isError: true, error: { code: 'INTERNAL_ERROR', status: 500, requestId: 'req-q' } });
    const { unmount } = renderState(query);
    expect(screen.getByRole('heading', { name: "Panel didn't load" })).toBeInTheDocument();
    expect(screen.getByText('req-q')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(query.refetch).toHaveBeenCalled();
    unmount();
    renderState(state({ isError: true, error: {}, data: [1] }));
    expect(screen.getByText('data: 1')).toBeInTheDocument();
  });

  it('hides the reference for a known, expected error', () => {
    renderState(state({ isError: true, error: { code: 'NOT_FOUND', status: 404, requestId: 'req-x' } }), { errorContext: 'practice' });
    expect(screen.getByText("That problem isn't in your practice list any more.")).toBeInTheDocument();
    expect(screen.queryByText('req-x')).not.toBeInTheDocument();
  });
});

describe('small data primitives', () => {
  it('Mark carries its meaning for screen readers, not by colour', () => {
    render(<Mark shape="solved" label="Solved" />);
    expect(screen.getByText('Solved')).toHaveClass('sr-only');
  });

  it('PanelHeading puts the plain title first and the cricket caption after', () => {
    render(<PanelHeading id="t" title="Weak topics" caption="Batting card" action={<button type="button">x</button>} />);
    const heading = screen.getByRole('heading', { name: 'Weak topics' });
    expect(heading.nextElementSibling).toHaveTextContent('Batting card');
    expect(screen.getByRole('button', { name: 'x' })).toBeInTheDocument();
  });

  it('SegmentedControl reports the pressed option and changes', async () => {
    const onChange = vi.fn();
    const options = [{ value: null, label: 'All', count: 3 }, { value: 'todo', label: 'To do' }];
    render(<SegmentedControl label="Show" options={options} value={null} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'All 3' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'To do' }));
    expect(onChange).toHaveBeenCalledWith('todo');
  });

  it('TableToggle names what it will show', () => {
    const { rerender } = render(<TableToggle showTable={false} controls="t" onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Show as table' })).toHaveAttribute('aria-controls', 't');
    rerender(<TableToggle showTable controls="t" onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Show chart' })).toHaveAttribute('aria-expanded', 'true');
  });
});
