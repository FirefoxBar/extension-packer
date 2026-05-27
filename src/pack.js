import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { platforms } from './platform';
import { copyDir, outputJSON } from './utils';
import { createZip } from './zip';

export async function pack(options, platform) {
  const { tempPath, releasePath, getManifest } = options;

  /**
   * 打包一个平台的产物
   * @param {*} platform
   * @returns
   */
  const prepareOnePlatform = async platform => {
    const { name, dist, extensionConfig } = platform;
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
        await getManifest(platform),
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

  const packOnePlatform = async (platform, prepare) => {
    const { thisPack, zipPath } = prepare;
    if (typeof platforms[platform.name] === 'undefined') {
      console.error(`pack-utils for ${platform.name} not found`);
      return;
    }
    try {
      const res = await platforms[platform.name]({
        options,
        info: platform,
        sourcePath: thisPack,
        zipPath,
      });
      console.log(`[${platform.name}] pack success: ${res}`);
    } catch (e) {
      console.error(`[${platform.name}] pack error`);
      console.error(e);
    }
    try {
      await unlink(zipPath);
    } catch (_) {
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

  const queue = [];

  for (const one of platform) {
    const prepare = await prepareOnePlatform(one);
    queue.push(packOnePlatform(one, { ...prepare }));
  }

  await Promise.all(queue);
}
