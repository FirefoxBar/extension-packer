/**
 * 进行多渠道打包
 *
 * dist：原本的输出文件夹
 * dist-pack：用于打包的文件夹
 * dist-pack/{platform}：各个平台的文件夹
 * dist-pack/{platform}.zip：各个平台的打包文件
 * dist-pack/release：其他平台打包输出结果
 * 在这里，打包文件夹统一命名为pack
 */

import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import amo from './pack-utils/amo.js';
import crx from './pack-utils/crx.js';
import cws from './pack-utils/cws.js';
import edge from './pack-utils/edge.js';
import xpi from './pack-utils/xpi.js';
import { copyDir, getVersion, outputJSON } from './utils.js';
import { createZip } from './zip.js';

const packUtils = {
  amo,
  cws,
  xpi,
  edge,
  crx,
};

export async function pack(options, platform) {
  const { tempPath, releasePath, browserConfig, extensionConfig, getManifest } =
    options;

  /**
   * 打包一个平台的产物
   * @param {*} platform
   * @param {*} extensionConfig 对应extension.json中的单项配置
   * @returns
   */
  const prepareOnePlatform = async (platform, extensionConfig) => {
    if (typeof packUtils[platform.name] === 'undefined') {
      console.error(`pack-utils for ${platform.name} not found`);
      return;
    }
    const dirName = `${platform.name}_${extensionConfig.browser}`;
    const thisPack = join(tempPath, dirName);
    const zipPath = join(tempPath, `${dirName}.zip`);
    try {
      // 复制一份到dist下面
      await copyDir(platform.dist, thisPack);
      // 重新生成manifest
      const version = await getVersion(thisPack);
      await outputJSON(
        join(thisPack, 'manifest.json'),
        getManifest(extensionConfig.browser, {
          dev: false,
          version,
          packer: platform.name,
        }),
      );
      // 打包成zip
      console.log(`[${platform.name}] zip ${thisPack} -> ${zipPath}`);
      await createZip(thisPack, zipPath);
    } catch (e) {
      console.error(`[${platform.name}] prepare error`);
      console.error(e);
    }
    return { dirName, thisPack, zipPath };
  };

  const packOnePlatform = async (
    platform,
    prepare,
    browserConfig,
    extensionConfig,
  ) => {
    const { thisPack, zipPath } = prepare;
    if (typeof packUtils[platform.name] === 'undefined') {
      console.error(`pack-utils for ${platform.name} not found`);
      return;
    }
    try {
      const res = await packUtils[platform.name]({
        options,
        info: platform,
        sourcePath: thisPack,
        zipPath,
        browserConfig,
        extensionConfig,
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
    const platformConfig = extensionConfig[one.name];
    for (const item of platformConfig) {
      const browser = browserConfig[item.browser];
      const prepare = await prepareOnePlatform(one, item);
      queue.push(packOnePlatform(one, { ...prepare }, browser, item));
    }
  }

  await Promise.all(queue);
}
