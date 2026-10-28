import { afterEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../../../src/db/connect.js';
import { ExternalServiceError } from '../../../src/errors/httpErrors.js';
import { testDbUri } from '../../helpers/db.js';

const fakeLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

afterEach(async () => {
  await disconnectDB({ logger: fakeLogger() });
});

describe('connectDB', () => {
  it('sets sanitizeFilter and strictQuery globally', () => {
    expect(mongoose.get('sanitizeFilter')).toBe(true);
    expect(mongoose.get('strictQuery')).toBe(true);
  });

  it('connects and logs host and db name, never the URI', async () => {
    const logger = fakeLogger();
    const uri = testDbUri();
    const connection = await connectDB(uri, { logger });
    expect(connection.readyState).toBe(1);
    expect(logger.info).toHaveBeenCalledWith(
      { host: '127.0.0.1', db: uri.split('/').at(-1) },
      'MongoDB connected',
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(uri);
  });

  it('logs reconnects, disconnects and connection errors', async () => {
    const logger = fakeLogger();
    const connection = await connectDB(testDbUri(), { logger });
    connection.emit('reconnected');
    connection.emit('error', new Error('boom'));
    expect(logger.info).toHaveBeenCalledWith('MongoDB reconnected');
    expect(logger.error).toHaveBeenCalledWith({ err: expect.any(Error) }, 'MongoDB connection error');
    await disconnectDB({ logger });
    expect(logger.warn).toHaveBeenCalledWith('MongoDB disconnected');
  });

  it('attaches the connection listeners only once', async () => {
    await connectDB(testDbUri(), { logger: fakeLogger() });
    const count = mongoose.connection.listenerCount('reconnected');
    await disconnectDB({ logger: fakeLogger() });
    await connectDB(testDbUri(), { logger: fakeLogger() });
    expect(mongoose.connection.listenerCount('reconnected')).toBe(count);
  });

  it('throws a 503 DB_UNAVAILABLE error with the cause when the server is unreachable', async () => {
    const logger = fakeLogger();
    const err = await connectDB('mongodb://127.0.0.1:1/nope', { logger, serverSelectionTimeoutMS: 300 })
      .catch((error) => error);
    expect(err).toBeInstanceOf(ExternalServiceError);
    expect(err).toMatchObject({ statusCode: 503, code: 'DB_UNAVAILABLE' });
    expect(err.cause).toBeInstanceOf(Error);
    expect(logger.error).toHaveBeenCalledWith({ err: err.cause }, 'MongoDB connection failed');
  });
});

describe('disconnectDB', () => {
  it('closes the connection and logs it', async () => {
    await connectDB(testDbUri(), { logger: fakeLogger() });
    const logger = fakeLogger();
    await disconnectDB({ logger });
    expect(mongoose.connection.readyState).toBe(0);
    expect(logger.info).toHaveBeenCalledWith('MongoDB connection closed');
  });

  it('is safe when already disconnected', async () => {
    await expect(disconnectDB({ logger: fakeLogger() })).resolves.toBeUndefined();
  });

  it('wraps a failure in a typed 503 error', async () => {
    const failure = new Error('close failed');
    vi.spyOn(mongoose, 'disconnect').mockRejectedValueOnce(failure);
    const err = await disconnectDB({ logger: fakeLogger() }).catch((error) => error);
    expect(err).toMatchObject({ statusCode: 503, code: 'DB_UNAVAILABLE', cause: failure });
  });
});
