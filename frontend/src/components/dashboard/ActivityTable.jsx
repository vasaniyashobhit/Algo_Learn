import { ballText, formatDay, toBall } from '../../lib/overs.js';

const HEAD = 'label border-b border-line pb-2 text-[0.8rem] tracking-[0.1em] text-ink-soft';
const CELL = 'border-b border-line py-[0.35rem]';

/** The 30 days as a table, oldest first (the accessible alternative to the overs strip). */
export const ActivityTable = ({ id, activity, hidden }) => (
  <table id={id} hidden={hidden} className="w-full max-w-[40rem] border-collapse">
    <caption className="sr-only">Submissions per day over the last 30 days, oldest first</caption>
    <thead>
      <tr>
        <th scope="col" className={`${HEAD} text-left`}>
          Day
        </th>
        <th scope="col" className={`${HEAD} text-right`}>
          Submissions
        </th>
        <th scope="col" className={`${HEAD} text-right`}>
          Accepted
        </th>
        <th scope="col" className={`${HEAD} text-left pl-6`}>
          Result
        </th>
      </tr>
    </thead>
    <tbody>
      {activity.map((day) => (
        <tr key={day.date}>
          <th scope="row" className={`${CELL} text-left font-normal`}>
            <time dateTime={day.date}>{formatDay(day.date)}</time>
          </th>
          <td className={`${CELL} num text-right`}>{day.submissions}</td>
          <td className={`${CELL} num text-right`}>{day.accepted}</td>
          <td className={`${CELL} pl-6 text-ink-soft`}>{ballText(toBall(day))}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
