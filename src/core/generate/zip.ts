import { strToU8, zipSync } from 'fflate';
import type { GeneratedFile } from './plan';

export type ZipArtifact = 'api' | 'dbsetup' | 'combined';

export class UnsafeZipPathError extends Error {
  constructor(path: string) {
    super(`Unsafe zip path: ${path}`);
    this.name = 'UnsafeZipPathError';
  }
}

export class DuplicateZipEntryError extends Error {
  constructor(path: string) {
    super(`Duplicate zip entry: ${path}`);
    this.name = 'DuplicateZipEntryError';
  }
}

function mapPath(path: string, artifact: ZipArtifact): string | null {
  if (artifact === 'api') {
    return path.startsWith('api/') ? path.slice(4) : null;
  }
  if (artifact === 'dbsetup') {
    return path.startsWith('dbsetup/') ? path.slice('dbsetup/'.length) : null;
  }
  return path.startsWith('api/') ? path.slice(4) : path;
}

function isSafeEntry(path: string): boolean {
  if (!path || path.startsWith('/') || path.startsWith('\\')) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  if (path.includes('\\')) return false;
  return !path.split('/').includes('..');
}

export function buildZip(
  files: GeneratedFile[],
  artifact: ZipArtifact,
): Uint8Array {
  const entries: Record<string, Uint8Array> = {};

  for (const file of files) {
    const mapped = mapPath(file.path, artifact);
    if (mapped === null) continue;
    if (!isSafeEntry(mapped)) throw new UnsafeZipPathError(mapped);
    if (entries[mapped]) throw new DuplicateZipEntryError(mapped);
    entries[mapped] =
      typeof file.content === 'string' ? strToU8(file.content) : file.content;
  }

  return zipSync(entries, { level: 9 });
}
