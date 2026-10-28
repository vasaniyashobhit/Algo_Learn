import mongoose from 'mongoose';
import { ExternalServiceError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';
import { logger as defaultLogger } from '../lib/logger.js';

// Strip `$`-operators from user-supplied filters, and reject unknown filter paths.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// Listeners are attached once per connection and always log to the latest connectDB logger.
const connectionLoggers = new WeakMap();

const attachConnectionLogging = (connection, logger) => {
  const attached = connectionLoggers.has(connection);
  connectionLoggers.set(connection, logger);
  if (attached) return;
  const log = () => connectionLoggers.get(connection);
  connection.on('disconnected', () => log().warn('MongoDB disconnected'));
  connection.on('reconnected', () => log().info('MongoDB reconnected'));
  connection.on('error', (err) => log().error({ err }, 'MongoDB connection error'));
};

/** Connects the default Mongoose connection. Never logs the URI (it holds credentials). */
export const connectDB = async (uri, { logger = defaultLogger, serverSelectionTimeoutMS = 10_000 } = {}) => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS });
    const { connection } = mongoose;
    attachConnectionLogging(connection, logger);
    logger.info({ host: connection.host, db: connection.name }, 'MongoDB connected');
    return connection;
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    throw new ExternalServiceError(codes.DB_UNAVAILABLE, 'Could not connect to the database', null, {
      statusCode: 503,
      cause: err,
    });
  }
};

/** Closes the default connection. Safe to call when already disconnected. */
export const disconnectDB = async ({ logger = defaultLogger } = {}) => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (err) {
    throw new ExternalServiceError(codes.DB_UNAVAILABLE, 'Could not close the database connection', null, {
      statusCode: 503,
      cause: err,
    });
  }
};
