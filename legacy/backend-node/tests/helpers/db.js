import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import { connectDB, disconnectDB } from '../../src/db/connect.js';
import { createLogger } from '../../src/lib/logger.js';

export const silentLogger = createLogger({ level: 'silent' });

/** URI of a fresh, uniquely named database on the shared in-memory server. */
export const testDbUri = () => `${inject('mongoUri')}cp-coach-${randomUUID()}`;

/** Empties every collection but keeps the indexes. */
export const clearDB = async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

/** Builds every compiled model's indexes (needed before testing unique constraints). */
export const syncModelIndexes = async () => {
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
};

/** Registers hooks: connect + build indexes before all, clear after each, drop and disconnect after all. */
export const useTestDB = () => {
  beforeAll(async () => {
    await connectDB(testDbUri(), { logger: silentLogger });
    await syncModelIndexes();
  });
  afterEach(clearDB);
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDB({ logger: silentLogger });
  });
};
