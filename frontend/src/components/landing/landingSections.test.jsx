import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FEATURES, STEPS } from '../../lib/landingContent.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { ClosingCall } from './ClosingCall.jsx';
import { FeatureGrid } from './FeatureGrid.jsx';
import { HowItWorks } from './HowItWorks.jsx';
import { LandingHero } from './LandingHero.jsx';
import { PracticeBand } from './PracticeBand.jsx';

describe('landing sections', () => {
  it('LandingHero has the headline, the plate action and the parallax planes', () => {
    const { container } = renderWithProviders(<LandingHero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your weakest topic, up on the board.');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how');
    expect(container.querySelectorAll('.beam')).toHaveLength(3);
    expect([...container.querySelectorAll('[data-depth]')].map((el) => el.dataset.depth)).toEqual(['0.35', '0.12']);
  });

  it('HowItWorks lists the three steps in order', () => {
    renderWithProviders(<HowItWorks />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('h3').textContent)).toEqual(STEPS.map((step) => step.title));
  });

  it('FeatureGrid defines every feature', () => {
    renderWithProviders(<FeatureGrid />);
    FEATURES.forEach(({ title }) => expect(screen.getByText(title).tagName).toBe('DT'));
  });

  it('PracticeBand states the practice-only rule', () => {
    renderWithProviders(<PracticeBand />);
    expect(screen.getByText(/Not for live rated contests or placement tests/)).toBeInTheDocument();
  });

  it('ClosingCall ends on a sign-up action and the data note', () => {
    renderWithProviders(<ClosingCall />);
    expect(screen.getByRole('link', { name: 'Create a free account' })).toHaveAttribute('href', '/signup');
    expect(screen.getByText(/Figures on this page are sample data/)).toBeInTheDocument();
  });
});
