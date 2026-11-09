import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../../src/db/connect.js';
import { createLogger } from '../../src/lib/logger.js';
import { Problem } from '../../src/modules/problems/problem.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { Submission } from '../../src/modules/sync/submission.model.js';
import { TopicStat } from '../../src/modules/stats/topicStat.model.js';
import { StuckQuery } from '../../src/modules/stuck/stuckQuery.model.js';
import { LlmCache } from '../../src/modules/llm/llmCache.model.js';
import { PracticeItem } from '../../src/modules/practice/practiceItem.model.js';

const logger = createLogger({ level: 'silent' });
const SYNC = process.argv.includes('--sync');
const NAMESPACE_NOT_FOUND = 26;

// A collection that does not exist yet simply has no indexes.
const listIndexes = async (model) => {
  try {
    return await model.collection.indexes();
  } catch (err) {
    if (err.code === NAMESPACE_NOT_FOUND) return [];
    throw err;
  }
};

await connectDB(process.env.MONGODB_URI, { logger });
try {
  console.log('db name:', mongoose.connection.db.databaseName);
  const count = (filter) => Problem.countDocuments(filter);
  console.log('problems', {
    total: await count({}),
    hf: await count({ source: 'hf' }),
    cf_api: await count({ source: 'cf_api' }),
    withRating: await count({ rating: mongoose.trusted({ $ne: null }) }),
    withTags: await count({ tagCount: mongoose.trusted({ $gt: 0 }) }),
    withEditorial: await count({ hasEditorial: true }),
    special: await count({ tags: '*special' }),
  });

  for (const model of [Problem, User, Submission, TopicStat, StuckQuery, LlmCache, PracticeItem]) {
    const existing = await listIndexes(model);
    const diff = await model.diffIndexes();
    console.log(`\n[${model.collection.name}]`, existing.map((i) =>
      `${i.name}${i.unique ? ' unique' : ''}${i.partialFilterExpression ? ' partial' : ''}`
      + `${i.collation ? ` collation(s${i.collation.strength})` : ''}`
      + `${i.expireAfterSeconds !== undefined ? ` ttl=${i.expireAfterSeconds}s` : ''}`
      + `${i.weights ? ` weights=${JSON.stringify(i.weights)}` : ''}`).join(' | '));
    console.log('  toCreate:', JSON.stringify(diff.toCreate), ' toDrop:', JSON.stringify(diff.toDrop));
    if (SYNC && diff.toCreate.length) {
      if (diff.toDrop.length) await model.createIndexes();
      else await model.syncIndexes();
      console.log('  created:', JSON.stringify((await model.diffIndexes()).toCreate.length === 0));
    }
  }

  const fields = 'title contestId index rating tags source tagCount hasEditorial description editorial';
  const cfApi = await Problem.findOne({ source: 'cf_api' }).select(fields).lean();
  for (const id of ['1/A', '1723/GP1', '921/01', cfApi?._id]) {
    const p = await Problem.findById(id).select(fields).lean();
    console.log('\n' + id, p && {
      title: p.title, contestId: p.contestId, index: p.index, rating: p.rating,
      ratingType: typeof p.rating, tags: p.tags, tagsIsArray: Array.isArray(p.tags), source: p.source,
      descriptionChars: p.description?.length ?? 0, editorialChars: p.editorial?.length ?? 0,
    });
  }

  const hits = await Problem.find({ $text: mongoose.trusted({ $search: 'binary search on answer' }) },
    { score: { $meta: 'textScore' }, title: 1, tags: 1 })
    .sort({ score: { $meta: 'textScore' } }).limit(5).lean();
  const totalHits = await count({ $text: mongoose.trusted({ $search: 'binary search on answer' }) });
  console.log('\n$text hits:', totalHits, hits.map((h) => `${h._id} ${h.title}`));
} finally {
  await disconnectDB({ logger });
}
