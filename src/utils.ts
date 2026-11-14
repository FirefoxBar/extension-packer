import fs from 'node:fs/promises';
import path from 'node:path';
import cpr from 'cpr';

export interface JSONReadOptions {
  encoding?: BufferEncoding;
}

export interface JSONWriteOptions {
  encoding?: BufferEncoding;
  spaces?: string | number;
}

/**
 * Check if a file exists
 */
export async function fileExists(fullPath: string): Promise<boolean> {
  try {
    await fs.access(fullPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON file
 * @param file - The path to the JSON file
 * @param options - Options for reading the file
 * @returns The parsed JSON object
 */
export async function readJSON<T = unknown>(
  file: string,
  options: JSONReadOptions = {},
): Promise<T> {
  const data = await fs.readFile(file, options.encoding ?? 'utf8');
  return JSON.parse(data) as T;
}

/**
 * Write a JSON file, creating parent directories if needed
 * @param file - The path to the JSON file
 * @param data - The data to write
 * @param options - Options for writing the file
 */
export async function outputJSON(
  file: string,
  data: unknown,
  options: JSONWriteOptions = {},
): Promise<void> {
  // Ensure the directory exists
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });

  // Stringify the data
  const jsonData = JSON.stringify(data, null, options.spaces);

  // Write the file
  await fs.writeFile(file, jsonData, options.encoding ?? 'utf8');
}

export function copyDir(source: string, target: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    cpr(
      source,
      target,
      {
        deleteFirst: true,
        overwrite: true,
        confirm: false,
      },
      (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      },
    );
  });
}

export async function getVersion(p: string): Promise<string> {
  const manifest = await readJSON<{ version: string }>(
    path.join(p, 'manifest.json'),
  );
  return manifest.version;
}
