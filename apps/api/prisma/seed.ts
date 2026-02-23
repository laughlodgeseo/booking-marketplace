import 'dotenv/config';
import { runDemoSeed } from './seed/demo';

async function main() {
  if (process.env.SEED_MODE === 'demo') {
    await runDemoSeed();
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./seed/legacy');
}

void main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('❌ Seed entry failed:', error);
  process.exitCode = 1;
});
