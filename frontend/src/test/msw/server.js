import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth.js';

export const server = setupServer(...authHandlers);
