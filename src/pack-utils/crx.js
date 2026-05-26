import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ChromeExtension from 'crx';
import { outputJSON } from '../utils.js';

async function createCrx(fileContent, keyContent) {
  if (!keyContent) {
    throw new Error('No priv key');
  }
  const crx = new ChromeExtension({
    codebase: 'http://localhost:8000/myExtension.crx',
    privateKey: keyContent,
  });

  crx.loaded = true;

  const crxBuffer = await crx.pack(fileContent);

  return crxBuffer;
}

async function packCrx({
  options,
  info,
  zipPath,
  browserConfig,
  extensionConfig,
}) {
  const { releasePath } = options;

  const fileContent = await readFile(zipPath);
  if (typeof process.env[extensionConfig.priv_key] === 'undefined') {
    throw new Error(`${extensionConfig.priv_key} not found`);
  }
  const content = await createCrx(fileContent, info.privKey);
  const out = join(releasePath, info.output);
  await writeFile(out, content);

  const infoFile = join(releasePath, `${info.output}-config.json`);
  await outputJSON(infoFile, {
    id: extensionConfig.id,
    browser: browserConfig,
    extension: extensionConfig,
  });

  return out;
}

export default packCrx;
