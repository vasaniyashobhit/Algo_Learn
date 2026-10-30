import { formatStrength, SAMPLE_PLAYER, SAMPLE_TOPICS } from '../../lib/landingContent.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';

const HEAD_BASE = 'pb-[0.4rem] text-[0.9rem] tracking-[0.1em] opacity-70';
const HEAD = `${HEAD_BASE} text-right`;
const FIGURE = 'fig pl-6 text-right text-[clamp(1.6rem,3.4vw,3rem)]';

/** The chalk scoreboard: a real table, so the cricket look has a plain, readable structure. */
export const SampleBoard = () => (
  <div className="bg-chalk px-[1.8rem] pt-[1.4rem] pb-[4.5rem] text-chalk-ink shadow-panel">
    <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b-[3px] border-current pb-[0.8rem] font-display uppercase">
      <h2 id="board-title" className="m-0 text-[1.6rem]">
        Topic strength
      </h2>
      <span className="text-base font-semibold tracking-[0.08em] opacity-75">Scoreboard · sample data</span>
      <span className="ml-auto flex items-baseline gap-4 text-[1.6rem] font-bold">
        {SAMPLE_PLAYER.handle}
        <span className="fig">{SAMPLE_PLAYER.rating}</span>
      </span>
    </div>
    <div className="scroll-x">
      <table className="w-full border-collapse font-display uppercase" aria-labelledby="board-title">
        <thead>
          <tr>
            <th scope="col" className={`${HEAD_BASE} text-left`}>
              Topic
            </th>
            <th scope="col" className={HEAD}>
              Strength (0–1)
            </th>
            <th scope="col" className={HEAD}>
              Solved
            </th>
            <th scope="col" className={HEAD}>
              Tried
            </th>
          </tr>
        </thead>
        <StaggerList as="tbody">
          {SAMPLE_TOPICS.map(({ topic, strength, solved, tried, weak }) => (
            <StaggerItem as="tr" key={topic} className="border-t border-current/25">
              <th scope="row" className="text-left text-[clamp(1.6rem,3.4vw,3rem)] leading-[1.1] font-bold">
                {topic}
                {weak && <span className="ml-3 align-middle text-[0.9rem] tracking-[0.1em] text-chalk-miss">Weak</span>}
              </th>
              <td className={`${FIGURE} ${weak ? 'text-chalk-miss' : ''}`}>{formatStrength(strength)}</td>
              <td className={FIGURE}>{solved}</td>
              <td className={FIGURE}>{tried}</td>
            </StaggerItem>
          ))}
        </StaggerList>
      </table>
    </div>
  </div>
);
