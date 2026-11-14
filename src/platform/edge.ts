import { createReadStream } from 'node:fs';
import { EdgeAddonsAPI } from '@plasmohq/edge-addons-api';
import type { PlatformContext } from '../types.js';

export const edge = async ({
  options,
  info,
  zipPath,
}: PlatformContext): Promise<string> => {
  const { msClientID, msApiKey } = options;
  if (!msClientID) {
    throw new Error('msClientID not found');
  }
  if (!msApiKey) {
    throw new Error('msApiKey not found');
  }
  if (!info.extensionConfig.product_id) {
    throw new Error('product_id not found');
  }

  const client = new EdgeAddonsAPI({
    productId: info.extensionConfig.product_id,
    clientId: msClientID,
    apiKey: msApiKey,
  });

  const uploadResp = await client.upload(createReadStream(zipPath));
  console.log('[edge] upload done', uploadResp);
  const uploadStatus = await client.waitForUpload(uploadResp);
  console.log('[edge] upload check success', uploadStatus);
  const publishResp = await client.publish();
  console.log('[edge] publish done', publishResp);
  return JSON.stringify(await client.getPublishStatus(publishResp));
};
