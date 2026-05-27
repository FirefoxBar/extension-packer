import { getInput } from '@actions/core';
import * as packer from '.';
import { fileExists } from './utils';

async function main() {
  const script = getInput('script');

  if (await fileExists(script)) {
    const s = require(script);
    await s.run(packer);
  }
}

main();
