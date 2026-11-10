import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4100;
const WEB_PORT = 5174;
const isCI = Boolean(process.env.CI);

/**
 * Runs the production build of the frontend (vite preview) against the E2E test backend (Spring Boot
 * e2e profile: Testcontainers Postgres, seeded problems, fake Codeforces and AI). Nothing real is ever called.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Two workers everywhere (as in CI): with one worker per core the machine is saturated and the practice
  // specs race the post-sync recommendations refetch (seen with the legacy backend too).
  workers: 2,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
  webServer: [
    {
      // Spring Boot e2e profile (Testcontainers Postgres); a cold CI build compiles the backend first.
      command: 'node server/start.js',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      env: { E2E: '1', E2E_API_PORT: String(API_PORT), CLIENT_URL: `http://localhost:${WEB_PORT}` },
      reuseExistingServer: !isCI,
      timeout: 420_000,
    },
    {
      command: `npm run build -w frontend && npm run preview -w frontend -- --port ${WEB_PORT} --strictPort`,
      cwd: '..',
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_PROXY: `http://localhost:${API_PORT}` },
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  ],
});
