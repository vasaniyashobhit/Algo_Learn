import { MongoMemoryServer } from 'mongodb-memory-server';

// Kept free of `vitest` imports: globalSetup runs outside the test workers.
export const startMemoryServer = async () => MongoMemoryServer.create();

export const stopMemoryServer = async (server) => server.stop();
