import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Octokit } from '@octokit/rest';
import type { GetSnapshotVersionOptions } from './types.js';

export async function getSnapshotVersion({
  token,
  ghApi,
  ghRepo,
  ghToken,
  extName,
  writeTo,
}: GetSnapshotVersionOptions): Promise<void> {
  if (!token) {
    return;
  }

  // Get latest release version
  const [owner, repo] = ghRepo.split('/');
  const octokit = new Octokit({
    auth: ghToken,
    baseUrl: ghApi,
  });
  const latestRelease = await octokit.rest.repos.getLatestRelease({
    owner,
    repo,
  });
  const versionPrefix = latestRelease.data.tag_name.replace(/^v/, '');

  // Get remote version
  const params = new URLSearchParams();
  params.append('name', extName);
  params.append('ver', versionPrefix);
  params.append('token', token);

  const resp = await fetch(
    `https://server-api.sylibs.com/ext/snapshot.php?${params.toString()}`,
  );
  const text = await resp.text();

  if (/^(\d+)$/.test(text)) {
    const dir = dirname(writeTo);
    await mkdir(dir, {
      recursive: true,
    });
    const newVersion = `${versionPrefix}.${text}`;
    await writeFile(writeTo, newVersion, {
      encoding: 'utf8',
    });
    console.log(`Got version: ${newVersion}, wrote to: ${writeTo}`);
  } else {
    console.log(`Invalid version: ${text}`);
  }
}
