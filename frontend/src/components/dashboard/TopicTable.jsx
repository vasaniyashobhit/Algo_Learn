import { LEVEL_LABELS, formatStrength, strengthLevel } from '../../lib/strength.js';

const HEAD = 'label border-b border-line pb-2 text-[0.8rem] tracking-[0.1em] text-ink-soft';
const CELL = 'border-b border-line py-2 text-right';

/** The radar's numbers as a real table (the accessible alternative to the chart). */
export const TopicTable = ({ id, rows, hidden }) => (
  <table id={id} hidden={hidden} className="w-full border-collapse">
    <caption className="sr-only">Topic strength on your {rows.length} most practised topics</caption>
    <thead>
      <tr>
        <th scope="col" className={`${HEAD} text-left`}>
          Topic
        </th>
        <th scope="col" className={`${HEAD} text-right`}>
          Strength (0–1)
        </th>
        <th scope="col" className={`${HEAD} text-right`}>
          Solved
        </th>
        <th scope="col" className={`${HEAD} text-right`}>
          Tried
        </th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.topic}>
          <th scope="row" className="border-b border-line py-2 text-left font-display text-step-lead font-bold uppercase">
            {row.topic}
          </th>
          <td className={CELL}>
            <span className="fig text-step-1">{formatStrength(row.strength)}</span>{' '}
            <span className="text-step--1 text-ink-soft">{LEVEL_LABELS[strengthLevel(row.strength)]}</span>
          </td>
          <td className={`${CELL} num`}>{row.solved}</td>
          <td className={`${CELL} num`}>{row.attempted}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
