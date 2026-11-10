import { spawnSync } from 'node:child_process';
import { isWindows, spawnMvnw } from '../../scripts/mvnw.mjs';

// The E2E test backend: the Spring Boot app with the `e2e` profile (backend/src/test/java/com/algolearn/e2e):
// a fresh Testcontainers PostgreSQL seeded with the E2E problems, fake Codeforces and fake AI. Docker must run.
// It only runs behind the E2E flag, so fakes can never be started by accident.
if (process.env.E2E !== '1') {
  console.error('Refusing to start: the E2E test backend needs E2E=1.');
  process.exit(1);
}

export const E2E_PORT = Number(process.env.E2E_API_PORT ?? 4100);
export const CRON_SECRET = 'e2e-cron-secret-0123456789';

// optimizedLaunch=false: no -XX:TieredStopAtLevel=1, so the JIT reaches full speed like a production JVM.
const args = ['-q', '-B', 'spring-boot:test-run', '-Dspring-boot.run.main-class=com.algolearn.e2e.E2eApplication',
  '-Dspring-boot.run.optimizedLaunch=false'];
const child = spawnMvnw(args, { env: { ...process.env, E2E: '1', E2E_API_PORT: String(E2E_PORT) } });

const stop = () => {
  if (child.exitCode !== null) return;
  if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
};
child.on('exit', (code) => process.exit(code ?? 1));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
