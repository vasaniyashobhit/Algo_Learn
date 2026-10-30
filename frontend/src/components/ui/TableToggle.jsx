import { Button } from './Button.jsx';

/** Switches a chart to its data table and back. `controls` is the table's id. */
export const TableToggle = ({ showTable, onToggle, controls }) => (
  <Button variant="text" aria-expanded={showTable} aria-controls={controls} onClick={onToggle}>
    {showTable ? 'Show chart' : 'Show as table'}
  </Button>
);
