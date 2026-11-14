export { getSnapshotVersion } from './get-snapshot-version.js';
export { pack } from './pack.js';
export { release } from './release.js';
export type {
  BrowserConfig,
  DescriptionContext,
  ExtensionConfig,
  GetSnapshotVersionOptions,
  GitHubRelease,
  PackOptions,
  PlatformContext,
  PlatformItem,
  ReleaseAsset,
  ReleaseAssetConfig,
  ReleaseOptions,
} from './types.js';
export {
  copyDir,
  fileExists,
  getVersion,
  outputJSON,
  readJSON,
} from './utils.js';
