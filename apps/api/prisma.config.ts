import { defineConfig } from 'prisma/config';
import * as fs from 'fs';
import * as path from 'path';

function readEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  const hash = trimmed.indexOf('#');
  if (hash === -1) return trimmed;
  return trimmed.slice(0, hash).trim();
}

function loadLocalEnvFiles() {
  const cwd = process.cwd();
  const envPaths = [path.join(cwd, '.env.local'), path.join(cwd, '.env')];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;

    const contents = fs.readFileSync(envPath, 'utf8');
    const lines = contents.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const normalized = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length)
        : trimmed;
      const eqIndex = normalized.indexOf('=');
      if (eqIndex <= 0) continue;

      const key = normalized.slice(0, eqIndex).trim();
      const value = readEnvValue(normalized.slice(eqIndex + 1));

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnvFiles();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
