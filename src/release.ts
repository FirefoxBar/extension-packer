import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import type {
  ExtensionConfig,
  GitHubRelease,
  ReleaseAsset,
  ReleaseAssetConfig,
  ReleaseOptions,
} from './types.js';
import { fileExists, readJSON } from './utils.js';

/** Repository and workflow used to update the extension distribution site */
const UPDATE_WORKFLOW = {
  repo: 'FirefoxBar/ext.firefoxcn.net',
  file: 'update.yml',
  ref: 'master',
} as const;

interface TriggerUpdateWorkflowOptions {
  ghApi: string;
  appId: number | string;
  appSecret: string;
  /** Repo used to check the app installation */
  installRepo: { owner: string; repo: string };
  extName: string;
  version: string;
  assets: unknown[];
  mock?: boolean;
}

interface RequestErrorLike {
  status: number;
  response?: {
    data: unknown;
  };
}

function isRequestError(error: unknown): error is RequestErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

function hash(content: Uint8Array): string {
  const fsHash = createHash('sha256');
  fsHash.update(content);
  return fsHash.digest('hex');
}

function parseRepo(ghRepo: string): { owner: string; repo: string } | null {
  const [owner, repo] = ghRepo.split('/');
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

function parseUpdateRepo(): { owner: string; repo: string } {
  const [owner, repo] = UPDATE_WORKFLOW.repo.split('/');
  return { owner, repo };
}

/**
 * Trigger the update workflow with a GitHub App installation token, so the
 * actor of the workflow run is the app instead of a personal token holder.
 */
async function triggerUpdateWorkflow({
  ghApi,
  appId,
  appSecret,
  installRepo,
  extName,
  version,
  assets,
  mock,
}: TriggerUpdateWorkflowOptions): Promise<void> {
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    baseUrl: ghApi,
    auth: {
      appId: typeof appId === 'string' ? appId.trim() : appId,
      privateKey: appSecret.replace(/\\n/g, '\n').trim(),
    },
  });

  // 1. Use the app JWT to look up the installation id
  const { data: installation } = await appOctokit.request(
    'GET /repos/{owner}/{repo}/installation',
    {
      owner: installRepo.owner,
      repo: installRepo.repo,
    },
  );

  // 2. Exchange the JWT for an installation token
  const installationAuth = await appOctokit.auth({
    type: 'installation',
    installationId: installation.id,
  });
  const installationToken = (installationAuth as { token: string }).token;

  // 3. Dispatch the update workflow (actor: <app>[bot])
  const updateRepo = parseUpdateRepo();
  const api = new Octokit({
    auth: installationToken,
    baseUrl: ghApi,
  });
  await api.rest.actions.createWorkflowDispatch({
    owner: updateRepo.owner,
    repo: updateRepo.repo,
    workflow_id: UPDATE_WORKFLOW.file,
    ref: UPDATE_WORKFLOW.ref,
    inputs: {
      name: extName,
      version,
      assets: JSON.stringify(assets),
      mock: mock ? 'true' : 'false',
    },
  });
}

export async function release({
  ghAppId,
  ghAppSecret,
  ghApi,
  ghRepo,
  ghToken,
  version,
  tagName,
  releasePath,
  extName,
  mock,
  getDescription,
}: ReleaseOptions): Promise<void> {
  if (!ghRepo) {
    console.log('ghRepo not found');
    return;
  }
  if (!ghAppId) {
    console.log('ghAppId not found');
    return;
  }
  if (!ghAppSecret) {
    console.log('ghAppSecret not found');
    return;
  }
  if (!ghToken) {
    console.log('ghToken not found');
    return;
  }

  // Git basic infos
  const repoInfo = parseRepo(ghRepo);
  if (!repoInfo) {
    console.log(`invalid ghRepo: ${ghRepo}`);
    return;
  }
  const { owner, repo } = repoInfo;
  const octokit = new Octokit({
    auth: ghToken,
    baseUrl: ghApi,
  });

  const assets: ReleaseAsset[] = [];

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
    const info = await readJSON<ReleaseAssetConfig>(
      join(releasePath, `${file}-config.json`),
    );
    assets.push({
      id: info.id,
      name: file,
      path: fullPath,
      hash: hash(fileContent),
      content: fileContent,
      config: info,
      url: `https://github.com/${ghRepo}/releases/download/${tagName}/${file}`,
    });
  }

  if (assets.length === 0) {
    console.log('No assets found');
    return;
  }

  // Check if release is exists
  console.log('Get release info...', tagName);
  let releaseInfo: GitHubRelease;
  try {
    const res = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: tagName,
    });
    releaseInfo = res.data;
    console.log(`Release exists: #${releaseInfo.id} ${releaseInfo.name}`);
  } catch (e) {
    if (!isRequestError(e) || e.status !== 404) {
      console.log('fail: ', e);
      return;
    }
    console.log('Release not exists, creating...');
    try {
      const desc = getDescription ? getDescription({ assets }) : '';
      const res = await octokit.rest.repos.createRelease({
        owner,
        repo,
        tag_name: tagName,
        name: version,
        body: desc,
        draft: false,
        prerelease: false,
      });
      releaseInfo = res.data;
      console.log(`Release created: #${releaseInfo.id}`);
    } catch (e) {
      console.log('fail: ', e);
      return;
    }
  }

  const releaseId = releaseInfo.id;

  // Upload all assets to release
  for (const asset of assets) {
    console.log('Upload file: ', asset.path);
    try {
      await octokit.rest.repos.uploadReleaseAsset({
        owner,
        repo,
        release_id: releaseId,
        name: asset.name,
        // Octokit types expect a string, but any binary body is accepted at
        // runtime (it is passed through to fetch untouched)
        data: asset.content as unknown as string,
        headers: {
          'content-type': 'application/octet-stream',
        },
      });
      console.log('success');
    } catch (e) {
      if (isRequestError(e)) {
        console.log('fail: ', e.status, e.response?.data);
      } else {
        console.log('fail: ', e);
      }
    }
  }

  // Update release description
  try {
    console.log('Update release description...');
    const updateParams: Parameters<typeof octokit.rest.repos.updateRelease>[0] =
      {
        owner,
        repo,
        release_id: releaseId,
        tag_name: tagName,
        name: version,
        draft: false,
        prerelease: false,
      };
    const desc = getDescription
      ? getDescription({ assets, current: releaseInfo })
      : '';
    if (desc) {
      updateParams.body = desc;
    }
    await octokit.rest.repos.updateRelease(updateParams);
    console.log('success');
  } catch (e) {
    console.log('fail: ', e);
  }

  // trigger the update workflow
  const notifyAssets = assets.map(asset => {
    const extension: ExtensionConfig | undefined = asset.config.extension;
    return {
      ...asset,
      content: '',
      config: undefined,
      min_version: extension?.min_version,
      android_min_version: extension?.android_min_version,
    };
  });
  console.log('trigger the update workflow', notifyAssets);
  try {
    await triggerUpdateWorkflow({
      ghApi,
      appId: ghAppId,
      appSecret: ghAppSecret,
      installRepo: { owner, repo },
      extName,
      version,
      assets: notifyAssets,
      mock,
    });
    console.log('success');
  } catch (e) {
    if (isRequestError(e)) {
      console.log('fail: ', e.status, e.response?.data);
    } else {
      console.log('fail: ', e);
    }
  }
}
