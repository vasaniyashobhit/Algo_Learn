import { describe, expect, it } from 'vitest';
import {
  findExactMatch, firstLine, searchQuery, statementOf, stripIndexPrefix,
} from '../../../../src/modules/stuck/helpers/problemMatch.js';
import { STATEMENT } from '../../../helpers/stuck.js';

const LONG = 'Theatre Square in the capital city of Berland has a rectangular shape with the size n × m meters.';

describe('problem match helpers', () => {
  it('reads the first non-empty line and strips an index prefix', () => {
    expect(firstLine('\n  \n  A. Title \nrest')).toBe('A. Title');
    expect(firstLine(undefined)).toBe('');
    expect(stripIndexPrefix('A. Theatre Square')).toBe('Theatre Square');
    expect(stripIndexPrefix('1950F2 - Hard Version')).toBe('Hard Version');
    expect(stripIndexPrefix('B1) Easy')).toBe('Easy');
    expect(stripIndexPrefix('Array Game')).toBe('Array Game');
  });

  it('builds a text-search string without quotes or minus signs', () => {
    expect(searchQuery('"exact" -not  here')).toBe('exact not here');
    expect(searchQuery('x'.repeat(2000))).toHaveLength(600);
    expect(searchQuery(null)).toBe('');
  });

  it('matches by title (index prefix, case and spaces ignored)', () => {
    const hit = { _id: '1/A', title: 'Theatre  square' };
    expect(findExactMatch(STATEMENT, [{ _id: '2/A', title: 'Other' }, hit])).toBe(hit);
  });

  it('matches by the start of a long enough description', () => {
    const description = `${LONG}\n${LONG} Each flagstone is a × a.`;
    const hit = { _id: '1/A', title: 'Different name', description };
    expect(findExactMatch(`Problem\n${description}\nInput: n m a`, [hit])).toBe(hit);
    const short = { _id: '3/A', title: 'X', description: 'n × m meters.' };
    expect(findExactMatch(`Problem\n${LONG}`, [short])).toBeNull();
  });

  it('returns null when nothing matches exactly', () => {
    expect(findExactMatch(STATEMENT, [{ _id: '9/A', title: 'Watermelon', description: '' }])).toBeNull();
    expect(findExactMatch('', [])).toBeNull();
  });

  it('builds a statement from the stored fields', () => {
    expect(statementOf({ title: 'T', description: 'D', inputFormat: 'I', outputFormat: '', note: 'N' }))
      .toBe('T\n\nD\n\nInput\nI\n\nNote\nN');
  });
});
