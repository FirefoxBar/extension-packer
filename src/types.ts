import type { RestEndpointMethodTypes } from '@octokit/rest';

/** A release as returned by the GitHub REST API */
export type GitHubRelease =
  RestEndpointMethodTypes['repos']['getReleaseByTag']['response']['data'];

export interface BrowserConfig {
  [key: string]: unknown;
}

export interface ExtensionConfig {
  id: string;
  browser?: string;
  product_id?: string;
  min_version?: string;
  android_min_version?: string;
  [key: string]: unknown;
}

export interface PlatformItem {
  name: string;
  dist: string;
  output?: string;
  privKey?: string;
  browserConfig?: BrowserConfig;
  extensionConfig: ExtensionConfig;
}

export interface PackOptions {
  tempPath: string;
  rootPath: string;
  releasePath: string;
  msClientID?: string;
  msApiKey?: string;
  amoKey?: string;
  amoSecret?: string;
  cwsClientID?: string;
  cwsClientSecret?: string;
  cwsToken?: string;
  getManifest: (item: PlatformItem) => Promise<Record<string, unknown>>;
  getNote: (item: PlatformItem) => string;
}

export interface PlatformContext {
  options: PackOptions;
  info: PlatformItem;
  sourcePath: string;
  zipPath: string;
}

/** Contents of the `<asset>-config.json` file written by each platform */
export interface ReleaseAssetConfig {
  id: string;
  browser?: BrowserConfig;
  extension?: ExtensionConfig;
}

export interface ReleaseAsset {
  id: string;
  name: string;
  path: string;
  hash: string;
  content: Buffer;
  config: ReleaseAssetConfig;
  url: string;
}

export interface DescriptionContext {
  assets: ReleaseAsset[];
  current?: GitHubRelease;
}

export interface ReleaseOptions {
  /** GitHub App ID (the app must be installed on the repo's organization) */
  ghAppId: number | string;
  /** GitHub App private key (supports both real newlines and `\n` escapes) */
  ghAppPrivateKey: string;
  ghApi: string;
  ghRepo: string;
  ghToken: string;
  version: string;
  tagName: string;
  releasePath: string;
  extName: string;
  /** Passed to the update workflow, defaults to false */
  mock?: boolean;
  getDescription?: (context: DescriptionContext) => string;
}

export interface GetSnapshotVersionOptions {
  token: string;
  ghApi: string;
  ghRepo: string;
  ghToken: string;
  extName: string;
  writeTo: string;
}
