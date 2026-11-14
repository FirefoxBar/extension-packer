import { type ExecFileOptions, execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

function quotePath(p: string): string {
  return `"${p}"`;
}

function exec(
  command: string,
  args: string[],
  options: ExecFileOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function createZip(
  inPath: string,
  outPath: string,
): Promise<void> {
  if (process.platform === 'win32') {
    try {
      await fs.rm(outPath, { recursive: true, maxRetries: 3 });
    } catch {
      // ignore
    }
    return exec(
      'powershell.exe',
      [
        '-nologo',
        '-noprofile',
        '-command',
        '& { param([String]$myInPath, [String]$myOutPath); Add-Type -A "System.IO.Compression.FileSystem"; [IO.Compression.ZipFile]::CreateFromDirectory($myInPath, $myOutPath); exit !$? }',
        '-myInPath',
        quotePath(inPath),
        '-myOutPath',
        quotePath(outPath),
      ],
      {
        cwd: path.dirname(inPath),
        maxBuffer: Infinity,
      },
    );
  }
  return exec('zip', ['-r', '-y', outPath, '.'], {
    cwd: inPath,
    maxBuffer: Infinity,
  });
}
