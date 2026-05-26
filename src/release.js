import { Blob } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { URLSearchParams } from 'node:url';
import { get } from 'lodash-es';
import { fileExists, getVersion, readJSON } from './utils.js';

function hash(content) {
  const fsHash = createHash('sha256');
  fsHash.update(content);
  return fsHash.digest('hex');
}

export async function release({
  token,
  gitHubApi,
  gitHubRepo,
  gitHubToken,
  distRootPath,
  browserConfig,
  tagName,
  releasePath,
  extName,
}) {
  if (!gitHubRepo) {
    console.log('gitHubRepo not found');
    return;
  }
  if (!token) {
    console.log('token not found');
    return;
  }
  if (!gitHubToken) {
    console.log('gitHubToken not found');
    return;
  }

  // Get version
  let version = '';
  const browserList = Object.keys(browserConfig);
  for (const browser of browserList) {
    const path = join(distRootPath, browser);
    if (await fileExists(join(path, 'manifest.json'))) {
      version = await getVersion(path);
      console.log(`Get version from ${path}`);
      break;
    }
  }
  if (!version) {
    console.log('version not found');
    return;
  }

  // Git basic infos
  const gitName = repo.split('/');
  const gitHubBaseURL = `${gitHubApi}/repos/${gitHubRepo}`;
  const gitHubApiHeader = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${gitHubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  const assets = [];

  const dirContent = await readdir(releasePath);
  for (const file of dirContent) {
    if (!file.endsWith('.xpi') && !file.endsWith('.crx')) {
      continue;
    }
    const fullPath = join(releasePath, file);
    if (!(await fileExists(fullPath))) {
      continue;
    }
    const fileContent = await readFile(fullPath);
    const info = await readJSON(join(releasePath, `${file}-config.json`));
    assets.push({
      id: info.id,
      name: file,
      path: fullPath,
      hash: hash(fileContent),
      content: fileContent,
      config: info,
      url: `https://github.com/${repo}/releases/download/${tagName}/${file}`,
    });
  }

  if (assets.length === 0) {
    console.log('No assets found');
    return;
  }

  // Check if release is exists
  console.log('Get release info...', tagName);
  const res = await fetch(`${gitHubBaseURL}/releases`, {
    headers: gitHubApiHeader,
  });
  let releaseInfo = (await res.json()).find(x => x.tag_name === tagName);
  if (!releaseInfo) {
    console.log('Release not exists, creating...');
    try {
      const res = await fetch(`${gitHubBaseURL}/releases`, {
        method: 'POST',
        headers: gitHubApiHeader,
        body: JSON.stringify({
          owner: gitName[0],
          repo: gitName[1],
          tag_name: tagName,
          name: version,
          body: '',
          draft: false,
          prerelease: false,
        }),
      });
      releaseInfo = await res.json();
      console.log(`Release created: #${releaseInfo.id}`);
    } catch (e) {
      console.log('fail: ', e);
      return;
    }
  } else {
    console.log(`Release exists: #${releaseInfo.id} ${releaseInfo.name}`);
  }
  const releaseId = releaseInfo.id;
  const releaseUploadUrl = releaseInfo.upload_url.replace(
    /\/assets(.*)$/,
    '/assets',
  );

  // Upload all assets to release
  for (const it of assets) {
    const fileContent = await readFile(it.path);
    const blob = new Blob([fileContent], {
      type: 'application/octet-stream',
    });
    console.log('Upload file: ', it.path);
    try {
      await fetch(`${releaseUploadUrl}?name=${encodeURIComponent(it.name)}`, {
        method: 'PUT',
        body: blob,
        headers: {
          ...gitHubApiHeader,
          'Content-Type': 'application/octet-stream',
        },
      });
      console.log('success');
    } catch (e) {
      console.log('fail: ', e.response.status, e.response.data);
    }
  }

  // Update release description
  try {
    console.log('Update release description...');
    await fetch(`${gitHubBaseURL}/releases/${releaseId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        tag_name: tagName,
        name: version,
        draft: false,
        prerelease: false,
      }),
      headers: gitHubApiHeader,
    });
    console.log('success');
  } catch (e) {
    console.log('fail: ', e);
  }

  // notify the update server
  const notifyAssets = assets.map(x => ({
    ...x,
    content: '',
    config: undefined,
    min_version: get(x, 'config.extension.min_version'),
  }));
  console.log('notify the update server', notifyAssets);
  const params = new URLSearchParams({
    token: token,
    name: extName,
    version,
    assets: JSON.stringify(notifyAssets),
  });
  await fetch('https://server-api.sylibs.com/ext/update.php', {
    method: 'POST',
    body: params.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

main();
