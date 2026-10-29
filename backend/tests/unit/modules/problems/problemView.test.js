import { describe, expect, it } from 'vitest';
import {
  SUMMARY_FIELDS, SUMMARY_PROJECTION, toProblemDetail, toProblemSummary,
} from '../../../../src/modules/problems/helpers/problemView.js';

const doc = {
  _id: '1/A', contestId: 1, index: 'A', title: 'Theatre Square', rating: 1000, tags: ['math'],
  hasEditorial: true, source: 'hf', description: 'Pave it.', editorial: 'Ceil.', createdAt: new Date(),
};

describe('problemView', () => {
  it('never projects statement or editorial text in summaries', () => {
    expect(SUMMARY_FIELDS).not.toContain('description');
    expect(SUMMARY_FIELDS).not.toContain('editorial');
    expect(SUMMARY_PROJECTION).toBe(SUMMARY_FIELDS.join(' '));
  });

  it('maps _id to id and keeps only summary fields', () => {
    expect(toProblemSummary(doc)).toEqual({
      id: '1/A', contestId: 1, index: 'A', title: 'Theatre Square', rating: 1000, tags: ['math'],
      hasEditorial: true, source: 'hf',
    });
  });

  it('fills defaults for bulk-written cf_api rows with missing fields', () => {
    const stub = { _id: '2000/B', contestId: 2000, index: 'B', title: 'Stub' };
    expect(toProblemSummary(stub)).toMatchObject({ rating: null, tags: [], hasEditorial: false, source: 'hf' });
    expect(toProblemDetail({ ...stub, source: 'cf_api' })).toMatchObject({
      source: 'cf_api', description: '', inputFormat: '', outputFormat: '', note: '', editorial: '',
      hasStatement: false,
    });
  });

  it('keeps similarity scores when present', () => {
    const similarity = { score: 1, jaccard: 1, ratingCloseness: 1 };
    expect(toProblemSummary({ ...doc, similarity }).similarity).toEqual(similarity);
  });

  it('detail includes full text and hasStatement', () => {
    const detail = toProblemDetail(doc);
    expect(detail).toMatchObject({ id: '1/A', description: 'Pave it.', editorial: 'Ceil.', hasStatement: true });
    expect(detail).not.toHaveProperty('createdAt');
    expect(toProblemDetail({ ...doc, description: '   ' }).hasStatement).toBe(false);
  });
});
