declare module 'crx3' {
  export interface Crx3Options {
    /** Path to the private key, generated if it does not exist */
    keyPath?: string;
    /** Path of the output CRX file */
    crxPath?: string;
    /** Path of the output ZIP file */
    zipPath?: string;
    /** URL used as the CRX update URL */
    crxURL?: string;
    /** Extra fields merged into the generated manifest */
    [key: string]: unknown;
  }

  /**
   * Create a CRX3 package from the given files
   */
  export default function crx3(
    files: string[] | NodeJS.ReadableStream,
    options?: Crx3Options,
  ): Promise<void>;
}
