import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function getSnapshotVersion({
  token,
  gitHubApi,
  gitHubRepo,
  gitHubToken,
  extName,
  writeTo,
}) {
  if (!token) {
    return;
  }

  // const pkgJson = await readJSON(join(__dirname, '../package.json'));
  // const { version: versionPrefix } = pkgJson;
  // console.log('Get latest release version from package.json');

  // Get latest release version
  const gitHubBaseURL = `${gitHubApi}/repos/${gitHubRepo}`;
  const gitHubApiHeader = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${gitHubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  const latestRelease = await fetch(`${gitHubBaseURL}/releases/latest`, {
    headers: gitHubApiHeader,
  });
  const versionPrefix = (await latestRelease.json()).tag_name.replace(/^v/, '');

  // Get remote version
  const params = new URLSearchParams();
  params.append('name', extName);
  params.append('ver', versionPrefix);
  params.append('token', token);

  const resp = await fetch(
    'https://server-api.sylibs.com/ext/snapshot.php?' + params.toString(),
  );
  const text = await resp.text();

  if (/^(\d+)$/.test(text)) {
    await mkdir(join(__dirname, '../temp/'), {
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

main();
