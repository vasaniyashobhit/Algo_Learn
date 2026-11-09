import { startMemoryServer, stopMemoryServer } from '../helpers/mongoServer.js';

/** One in-memory mongod for the whole run; each test file uses its own database on it. */
export default async ({ provide }) => {
  const server = await startMemoryServer();
  provide('mongoUri', server.getUri());
  return async () => stopMemoryServer(server);
};
