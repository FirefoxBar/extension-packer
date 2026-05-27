import { ChromeWebstoreAPI } from '@plasmohq/chrome-webstore-api';

export const cws = async ({ options, zipPath, info }) => {
  const { cwsClientID, cwsClientSecret, cwsToken } = options;
  if (!cwsClientID) {
    throw new Error('cwsClientID not found');
  }
  if (!cwsClientSecret) {
    throw new Error('cwsClientSecret not found');
  }
  if (!cwsToken) {
    throw new Error('cwsToken not found');
  }

  const id = info.extensionConfig.id;

  const client = new ChromeWebstoreAPI({
    extId: id,
    refreshToken: cwsToken,
    clientId: cwsClientID,
    clientSecret: cwsClientSecret,
  });

  const res = await client.submit({
    filePath: zipPath,
  });

  return JSON.stringify(res);
};
