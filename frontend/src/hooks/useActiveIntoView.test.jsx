import { render } from '@testing-library/react';
import { MemoryRouter, NavLink } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useActiveIntoView } from './useActiveIntoView.js';

const Strip = ({ links = true }) => {
  const ref = useActiveIntoView();
  return (
    <nav ref={ref}>
      {links && (
        <>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/history">History</NavLink>
        </>
      )}
    </nav>
  );
};

const renderAt = (path, props) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Strip {...props} />
    </MemoryRouter>,
  );

describe('useActiveIntoView', () => {
  afterEach(() => {
    delete Element.prototype.scrollIntoView;
  });

  it('scrolls the current page link into view (nearest, so the page itself does not jump)', () => {
    const scroll = vi.fn(function record() {
      scroll.target = this.textContent;
    });
    Element.prototype.scrollIntoView = scroll;
    renderAt('/history');
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    expect(scroll.target).toBe('History');
  });

  it('does nothing when no link is current or scrollIntoView is missing (jsdom)', () => {
    expect(() => renderAt('/elsewhere')).not.toThrow();
    expect(() => renderAt('/history', { links: true })).not.toThrow();
  });
});
