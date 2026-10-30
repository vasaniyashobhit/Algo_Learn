import { ClosingCall } from '../components/landing/ClosingCall.jsx';
import { FeatureGrid } from '../components/landing/FeatureGrid.jsx';
import { HowItWorks } from '../components/landing/HowItWorks.jsx';
import { LandingHero } from '../components/landing/LandingHero.jsx';
import { PracticeBand } from '../components/landing/PracticeBand.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

export const LandingPage = () => {
  usePageTitle('Your Codeforces topic coach');
  return (
    <>
      <LandingHero />
      <HowItWorks />
      <FeatureGrid />
      <PracticeBand />
      <ClosingCall />
    </>
  );
};
