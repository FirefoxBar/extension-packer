import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { getVersion, outputJSON } from '../utils.js';
import { submitAddon, waitSubmit } from './amo.js';

export const xpi = async ({ options, info, sourcePath, zipPath }) => {
  const { releasePath } = options;

  const version = await getVersion(sourcePath);

  if (waitSubmit.length > 0) {
    const last = waitSubmit[waitSubmit.length - 1];
    // wait 60s for AMO submit
    const nextRun = last + 60000;
    if (Date.now() < nextRun) {
      console.log(
        `[xpi] [${info.extensionConfig.id}] wait ${nextRun - Date.now()}ms`,
      );
      await sleep(nextRun - Date.now());
    }
  }

  const outFile = join(releasePath, info.output);

  await submitAddon(options, false, 'xpi', {
    addonId: info.extensionConfig.id,
    addonVersion: version,
    channel: 'unlisted',
    distFile: zipPath,
    output: outFile,
  });

  console.log(`[xpi] [${info.extensionConfig.id}] downloaded to ${outFile}`);
  const infoFile = join(releasePath, `${info.output}-config.json`);
  await outputJSON(infoFile, {
    id: info.extensionConfig.id,
    browser: info.browserConfig,
    extension: info.extensionConfig,
  });
  return outFile;
};
