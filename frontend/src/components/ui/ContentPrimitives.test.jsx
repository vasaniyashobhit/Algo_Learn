import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { CopyButton } from './CopyButton.jsx';
import { Markdown } from './Markdown.jsx';
import { Pager } from './Pager.jsx';
import { StrengthBar } from './StrengthBar.jsx';

describe('Markdown', () => {
  it('renders Codeforces LaTeX with KaTeX and markdown emphasis', () => {
    const { container } = render(<Markdown>{'Given $$$n \\le 10^5$$$ and **k**.\n\n$$$$$$\\sum a_i$$$$$$'}</Markdown>);
    expect(container.querySelectorAll('.katex')).toHaveLength(2);
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(screen.getByText('k', { selector: 'strong' })).toBeInTheDocument();
  });

  it('never renders raw HTML and survives a broken formula', () => {
    const { container } = render(<Markdown>{'<img src=x onerror="alert(1)"> and $$$\\frac{1$$$'}</Markdown>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toMatch(/and/);
  });
});

describe('Pager', () => {
  it('moves between pages and hides with one page', async () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(<Pager page={1} totalPages={3} onChange={onChange} label="Pages" />);
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 1 / of 3');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(2);
    rerender(<Pager page={1} totalPages={1} onChange={onChange} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

describe('CopyButton', () => {
  it('explains when the browser refuses to copy', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    renderWithProviders(<CopyButton text="x" />);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(await screen.findByText(/didn't let us copy/)).toBeInTheDocument();
  });
});

describe('StrengthBar', () => {
  it('fills to the strength and grows in, or sits still under reduced motion', () => {
    const { rerender } = render(<StrengthBar value={0.29} />);
    const fill = () => screen.getByTestId('strength-bar').firstChild;
    expect(fill()).toHaveStyle({ width: '29%' });
    expect(fill()).toHaveAttribute('data-motion', 'on');
    installMatchMedia({ reducedMotion: true });
    rerender(<StrengthBar value={null} />);
    expect(fill()).toHaveStyle({ width: '0%' });
    rerender(<StrengthBar value={1.4} key="again" />);
    expect(fill()).toHaveStyle({ width: '100%' });
  });
});
