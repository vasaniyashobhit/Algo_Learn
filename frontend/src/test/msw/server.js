import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth.js';
import { dashboardHandlers } from './handlers/dashboard.js';

export const server = setupServer(...authHandlers, ...dashboardHandlers);
