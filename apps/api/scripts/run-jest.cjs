#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const forwarded = process.argv.slice(2).filter((arg) => arg !== '--');
const jestBin = require.resolve('jest/bin/jest');
const args = [jestBin, '--runInBand', ...forwarded];

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
