import { createReadStream } from 'node:fs';
import { EdgeAddonsAPI } from '@plasmohq/edge-addons-api';

export default async function ({
  options,
  zipPath,
  browserConfig,
  extensionConfig,
}) {
  const { msClientID, msApiKey, getNote } = options;
  if (!msClientID) {
    throw new Error('msClientID not found');
  }
  if (!msApiKey) {
    throw new Error('msApiKey not found');
  }

  const client = new EdgeAddonsAPI({
    productId: extensionConfig.product_id,
    clientId: msClientID,
    apiKey: msApiKey,
  });

  const uploadResp = await client.upload(createReadStream(zipPath));
  console.log('[edge] upload done', uploadResp);
  const uploadStatus = await client.waitForUpload(uploadResp);
  console.log('[edge] upload check success', uploadStatus);
  const publishResp = await client.publish(getNote(browserConfig));
  console.log('[edge] publish done', publishResp);
  return JSON.stringify(await client.getPublishStatus(publishResp));
}
