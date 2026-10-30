import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/matchMedia.js';
import { StaggerItem } from './StaggerItem.jsx';
import { StaggerList } from './StaggerList.jsx';

const renderList = () =>
  render(
    <StaggerList as="ol" aria-label="Steps">
      <StaggerItem>Link your handle</StaggerItem>
      <StaggerItem>Read your card</StaggerItem>
    </StaggerList>,
  );

describe('StaggerList and StaggerItem', () => {
  it('renders the list with items hidden behind the wipe until they enter', () => {
    renderList();
    const list = screen.getByRole('list', { name: 'Steps' });
    expect(list.tagName).toBe('OL');
    expect(list).toHaveAttribute('data-motion', 'on');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].style.clipPath).toMatch(/inset/);
  });

  it('shows every item at once under reduced motion', () => {
    installMatchMedia({ reducedMotion: true });
    renderList();
    expect(screen.getByRole('list')).toHaveAttribute('data-motion', 'off');
    screen.getAllByRole('listitem').forEach((item) => expect(item.style.clipPath).toBe(''));
  });

  it('supports table rows', () => {
    render(
      <table>
        <StaggerList as="tbody">
          <StaggerItem as="tr">
            <td>Greedy</td>
          </StaggerItem>
        </StaggerList>
      </table>,
    );
    expect(screen.getByRole('row')).toHaveTextContent('Greedy');
  });
});
