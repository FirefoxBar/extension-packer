import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import crx3 from 'crx3';
import { outputJSON } from '../utils.js';

async function packCrx({
  options,
  info,
  sourcePath,
  zipPath,
  browserConfig,
  extensionConfig,
}) {
  const { releasePath, tempPath } = options;

  if (!info.privKey) {
    throw new Error('privKey not found');
  }

  await writeFile(join(tempPath, 'crx_key.pem'), info.privKey, {
    encoding: 'utf-8',
  });

  const out = join(releasePath, info.output);

  await crx3([join(sourcePath, 'manifest.json')], {
    keyPath: join(tempPath, 'crx_key.pem'),
    crxPath: out,
    zipPath: zipPath,
    crxURL: 'http://127.0.0.1:8080/example-extension.crx',
  });

  const infoFile = join(releasePath, `${info.output}-config.json`);
  await outputJSON(infoFile, {
    id: extensionConfig.id,
    browser: browserConfig,
    extension: extensionConfig,
  });

  return out;
}

export default packCrx;
