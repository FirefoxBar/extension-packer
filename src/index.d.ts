export interface ReleaseOptions {
  token: string;
  gitHubApi: string;
  gitHubRepo: string;
  gitHubToken: string;
  distRootPath: string;
  browserConfig: string;
  tagName: string;
  releasePath: string;
  extName: string;
}

export declare function release(options: ReleaseOptions): Promise<void>;

export interface PlatformItem {
  name: string;
  dist: string;
  output?: string;
  privKey?: string;
  browserConfig?: any;
  extensionConfig?: any;
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
  getManifest: (item: PlatformItem) => Promise<any>;
  getNote: (item: PlatformItem) => string;
}

export declare function pack(
  options: PackOptions,
  platform: Array<PlatformItem>,
): Promise<void>;

export interface GetSnapshotVersionOptions {
  token: string;
  gitHubApi: string;
  gitHubRepo: string;
  gitHubToken: string;
  extName: string;
  writeTo: string;
}

export declare function getSnapshotVersion(
  options: GetSnapshotVersionOptions,
): Promise<void>;
