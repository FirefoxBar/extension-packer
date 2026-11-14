import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import crx3 from 'crx3';
import type { PlatformContext } from '../types.js';
import { outputJSON } from '../utils.js';

export const crx = async ({
  options,
  info,
  sourcePath,
  zipPath,
}: PlatformContext): Promise<string> => {
  const { releasePath, tempPath } = options;

  if (!info.privKey) {
    throw new Error('privKey not found');
  }
  if (!info.output) {
    throw new Error('output not found');
  }

  const keyPath = join(tempPath, 'crx_key.pem');
  await writeFile(keyPath, info.privKey, {
    encoding: 'utf-8',
  });

  const out = join(releasePath, info.output);

  await crx3([join(sourcePath, 'manifest.json')], {
    keyPath,
    crxPath: out,
    zipPath,
    crxURL: 'http://127.0.0.1:8080/example-extension.crx',
  });

  const infoFile = join(releasePath, `${info.output}-config.json`);
  await outputJSON(infoFile, {
    id: info.extensionConfig.id,
    browser: info.browserConfig,
    extension: info.extensionConfig,
  });

  return out;
};
