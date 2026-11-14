import { createRequire } from 'node:module';
import { getInput } from '@actions/core';
import * as packer from './index.js';
import { fileExists } from './utils.js';

const require = createRequire(import.meta.url);

interface ActionScript {
  run(packer: typeof import('./index.js')): Promise<void> | void;
}

async function main(): Promise<void> {
  const script = getInput('script');

  if (await fileExists(script)) {
    const s = require(script) as ActionScript;
    await s.run(packer);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
