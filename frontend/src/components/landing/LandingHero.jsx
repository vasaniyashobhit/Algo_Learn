import { ParallaxLayer } from '../motion/ParallaxLayer.jsx';
import { Wipe } from '../motion/Wipe.jsx';
import { Button } from '../ui/Button.jsx';
import { SampleBoard } from './SampleBoard.jsx';

/**
 * A floodlit board. The beams, the board and the headline strap sit on separate planes that
 * travel at different speeds while you scroll (still under reduced motion).
 */
export const LandingHero = () => (
  <section className="relative isolate overflow-hidden pt-12" aria-labelledby="hero-title">
    <ParallaxLayer depth={0.35} className="absolute inset-x-0 -top-[20%] bottom-0 -z-10" aria-hidden="true">
      <i className="beam" />
      <i className="beam" />
      <i className="beam" />
    </ParallaxLayer>

    <ParallaxLayer depth={0.12} className="wrap">
      <SampleBoard />
    </ParallaxLayer>

    <div className="wrap relative -mt-12">
      <Wipe
        delay={0.2}
        className="max-w-[760px] bg-band px-8 pt-[1.6rem] pb-[1.8rem] shadow-[var(--shadow),inset_0_6px_0_var(--plate)]"
      >
        <h1 id="hero-title" className="text-[clamp(2.6rem,5.4vw,var(--step-4))] leading-[0.92]">
          Your weakest topic, up on the board.
        </h1>
        <p className="text-step-lead text-ink-soft">
          AlgoLearn scores your Codeforces history on 36 topics and 630 topic pairs, then picks the problems that
          fix the lowest score.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="plate" to="/signup">
            Get my topic card
          </Button>
          <Button variant="outline" href="#how">
            How it works
          </Button>
        </div>
      </Wipe>
    </div>
  </section>
);
