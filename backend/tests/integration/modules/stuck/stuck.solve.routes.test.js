import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { STATEMENT, coachAnswer, fakeFetch, fakeLlm, fakeLookup, html, page } from '../../../helpers/stuck.js';
import { STUCK_PATH, postStuck, stuckApp, stuckUser } from '../../../helpers/stuckRoutes.js';
import { STUCK_FALLBACK_NOTICE } from '../../../../src/config/constants.js';
import { StuckQuery } from '../../../../src/modules/stuck/stuckQuery.model.js';

useTestDB();

const theatre = () => problemAt('1/A', {
  title: 'Theatre Square', description: 'Pave the theatre square with flagstones.', tags: ['math'], rating: 1000, editorial: 'Ceil both.',
});

describe('POST /api/v1/stuck (text and URL)', () => {
  it('answers a Codeforces URL from the DB with the AI answer (201)', async () => {
    await seedProblems([theatre(), problemAt('4/A', { tags: ['math'], rating: 800 })]);
    const llm = fakeLlm({ coach: { answer: coachAnswer(), source: 'ai', provider: 'gemini', model: 'a' } });
    const app = stuckApp({ llm });
    const { auth, user } = await stuckUser(app);
    const res = await postStuck(app, auth, { inputType: 'url', url: 'https://codeforces.com/problemset/problem/1/A' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: expect.stringMatching(/^[a-f\d]{24}$/), inputType: 'url', createdAt: expect.any(String), source: 'ai', notice: null,
      problem: { matchedProblemId: '1/A', title: 'Theatre Square', tags: ['math'], tagsSource: 'db', rating: 1000 },
      hints: coachAnswer().hints, hasSolution: true, editorialAvailable: true,
      gap: { items: [expect.objectContaining({ topicKey: 'math', status: 'unseen' })] },
      similar: { items: [expect.objectContaining({ id: '4/A' })], easier: true },
    });
    expect(res.body.data).not.toHaveProperty('solution');
    const stored = await StuckQuery.findById(res.body.data.id).lean();
    expect(String(stored.userId)).toBe(user.id);
    expect(stored.solution).toMatchObject({ code: 'int main() {}' });
  });

  it('answers pasted text with the never-blank fallback', async () => {
    await seedProblems([theatre()]);
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    const res = await postStuck(app, auth, { inputType: 'text', text: STATEMENT });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      source: 'fallback', notice: STUCK_FALLBACK_NOTICE, fallbackReason: 'AI_UNAVAILABLE', hasSolution: false,
      problem: { matchedProblemId: '1/A', tagsSource: 'db' },
    });
    expect(res.body.data.hints).toContain('From the editorial: Ceil both.');
  });

  it('reads another web page through the SSRF-checked fetch', async () => {
    const fetchImpl = fakeFetch({ 'https://example.com/p': page(html(`<main>${STATEMENT}</main>`)) });
    const app = stuckApp({ fetchImpl, lookup: fakeLookup({ 'example.com': ['93.184.216.34'] }) });
    const { auth } = await stuckUser(app);
    const res = await postStuck(app, auth, { inputType: 'url', url: 'https://example.com/p' });
    expect(res.status).toBe(201);
    expect(res.body.data.problem.title).toBe('Theatre Square');
  });

  it('refuses a private URL with 400 URL_NOT_ALLOWED', async () => {
    const app = stuckApp({ lookup: fakeLookup({ 'internal.example': ['10.1.2.3'] }) });
    const { auth } = await stuckUser(app);
    expectErrorShape(await postStuck(app, auth, { inputType: 'url', url: 'http://internal.example/' }), 400, 'URL_NOT_ALLOWED', { reason: 'private' });
  });

  it('maps a failed fetch to 502 URL_FETCH_FAILED', async () => {
    const app = stuckApp({ lookup: fakeLookup({ 'example.com': ['93.184.216.34'] }) });
    const { auth } = await stuckUser(app);
    expectErrorShape(await postStuck(app, auth, { inputType: 'url', url: 'https://example.com/gone' }), 502, 'URL_FETCH_FAILED',
      { reason: 'status', status: 404 });
  });

  it('validates the body and the text length', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    const missing = await postStuck(app, auth, {});
    expect(missing.status).toBe(400);
    expect(missing.body.error.details).toEqual([expect.objectContaining({ field: 'body.inputType' })]);
    expectErrorShape(await postStuck(app, auth, { inputType: 'text', text: 'too short' }), 400, 'PROBLEM_TEXT_TOO_SHORT',
      { minLength: 40, length: 9 });
    const noText = await postStuck(app, auth, { inputType: 'text' });
    expect(noText.body.error).toMatchObject({ code: 'VALIDATION_FAILED', details: [{ field: 'body.text', message: expect.any(String) }] });
    expect(await StuckQuery.countDocuments()).toBe(0);
  });

  it('requires authentication', async () => {
    expectErrorShape(await request(stuckApp()).post(STUCK_PATH).send({ inputType: 'text', text: STATEMENT }), 401, 'AUTH_REQUIRED');
  });
});
