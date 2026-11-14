import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { platforms } from './platform/index.js';
import type { PackOptions, PlatformItem } from './types.js';
import { copyDir, outputJSON } from './utils.js';
import { createZip } from './zip.js';

interface PreparedPlatform {
  dirName: string;
  thisPack: string;
  zipPath: string;
}

export async function pack(
  options: PackOptions,
  platform: PlatformItem[],
): Promise<void> {
  const { tempPath, releasePath, getManifest } = options;

  /**
   * 打包一个平台的产物
   */
  const prepareOnePlatform = async (
    item: PlatformItem,
  ): Promise<PreparedPlatform | undefined> => {
    const { name, dist, extensionConfig } = item;
    if (typeof platforms[name] === 'undefined') {
      console.error(`pack-utils for ${name} not found`);
      return;
    }
    const dirName = `${name}_${extensionConfig.browser}`;
    const thisPack = join(tempPath, dirName);
    const zipPath = join(tempPath, `${dirName}.zip`);
    try {
      // 复制一份到dist下面
      await copyDir(dist, thisPack);
      // 重新生成manifest
      await outputJSON(
        join(thisPack, 'manifest.json'),
        await getManifest(item),
      );
      // 打包成zip
      console.log(`[${name}] zip ${thisPack} -> ${zipPath}`);
      await createZip(thisPack, zipPath);
    } catch (e) {
      console.error(`[${name}] prepare error`);
      console.error(e);
    }
    return { dirName, thisPack, zipPath };
  };

  const packOnePlatform = async (
    item: PlatformItem,
    prepare: PreparedPlatform,
  ): Promise<void> => {
    const { thisPack, zipPath } = prepare;
    const packer = platforms[item.name];
    if (typeof packer === 'undefined') {
      console.error(`pack-utils for ${item.name} not found`);
      return;
    }
    try {
      const res = await packer({
        options,
        info: item,
        sourcePath: thisPack,
        zipPath,
      });
      console.log(`[${item.name}] pack success: ${res}`);
    } catch (e) {
      console.error(`[${item.name}] pack error`);
      console.error(e);
    }
    try {
      await unlink(zipPath);
    } catch {
      // ignore
    }
  };

  // 检查打包目录是否存在
  await rimraf(tempPath);
  await rimraf(releasePath);
  await mkdir(tempPath, {
    recursive: true,
  });
  await mkdir(releasePath, {
    recursive: true,
  });

  const queue: Promise<void>[] = [];

  for (const one of platform) {
    const prepare = await prepareOnePlatform(one);
    if (typeof prepare === 'undefined') {
      continue;
    }
    queue.push(packOnePlatform(one, prepare));
  }

  await Promise.all(queue);
}
