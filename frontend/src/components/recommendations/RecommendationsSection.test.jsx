import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { problem, recommendations, recTopic } from '../../test/dashboardFixtures.js';
import { respondError, respondOk } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { RecommendationsSection } from './RecommendationsSection.jsx';

const topics = [
  recTopic('dp', [problem('474/D', { title: 'Flowers' }), problem('580/D', { title: 'Kefa and Dishes', pickedBy: 'similar_fallback' })]),
  recTopic('binary search', [problem('1324/D', { title: 'Pair of Topics', tags: ['binary search', 'sortings'] })], {
    basis: 'frequent',
    attempted: 0,
  }),
];

const serve = (list = topics, meta) => {
  const answer = recommendations(list, meta);
  respondOk('get', '/recommendations', answer.data, answer.meta);
};

describe('RecommendationsSection', () => {
  it('shows a skeleton, then topic cards with reasons and their problems', async () => {
    serve();
    renderWithProviders(<RecommendationsSection />, { signedIn: true });
    expect(screen.getByLabelText('Loading your next topics')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'dp' })).toBeInTheDocument();
    expect(screen.getByText(/You've solved 20 of 52 dp problems; dp shows up in 31% of problems at your level\./)).toBeInTheDocument();
    expect(screen.getAllByText('Problems rated 1600–1800')).toHaveLength(2);
    expect(screen.getByText('0.38')).toBeInTheDocument();
    expect(screen.getByText('New topic for you')).toBeInTheDocument();
    expect(screen.getByText('In your learning zone')).toBeInTheDocument();
    expect(screen.getByText('Common at your level')).toBeInTheDocument();
    const dpProblems = screen.getByRole('list', { name: 'Problems for dp' });
    expect(within(dpProblems).getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText(/· Broader pick/)).toBeInTheDocument();
    expect(screen.getByText(/Practice and upsolving only/)).toBeInTheDocument();
  });

  it('puts the lead topic on the plate only when asked', async () => {
    serve();
    const { container } = renderWithProviders(<RecommendationsSection plateLead />, { signedIn: true });
    await screen.findByRole('heading', { name: 'dp' });
    const plates = container.querySelectorAll('.bg-plate');
    expect(plates).toHaveLength(1);
    expect(plates[0]).toHaveTextContent('dp');
  });

  it('explains cold-start picks', async () => {
    serve(topics, { coldStart: true, userRating: null });
    renderWithProviders(<RecommendationsSection />, { signedIn: true });
    expect(await screen.findByText(/these are the topics that show up most around 1200/)).toBeInTheDocument();
  });

  it('says what to do when a topic has no problems left, and when there are no topics', async () => {
    serve([recTopic('dp', [])]);
    const { unmount } = renderWithProviders(<RecommendationsSection />, { signedIn: true });
    expect(await screen.findByText(/You have solved everything we have in this range/)).toBeInTheDocument();
    unmount();
    serve([]);
    renderWithProviders(<RecommendationsSection />, { signedIn: true });
    expect(await screen.findByText(/No topics to suggest right now/)).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    respondError('get', '/recommendations', 500, 'INTERNAL_ERROR');
    renderWithProviders(<RecommendationsSection />, { signedIn: true });
    expect(await screen.findByRole('heading', { name: "Your next topics didn't load" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
