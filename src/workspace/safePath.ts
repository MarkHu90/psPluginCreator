import { lstat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { WorkspaceError } from './errors';

export const KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key) || key.length > 64) {
    throw new WorkspaceError('KEY_INVALID', `Invalid project key: ${key}`);
  }
}

export function slugifyKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'plugin';
}

export async function safePath(
  root: string,
  relativePath: string,
): Promise<string> {
  if (
    !relativePath ||
    relativePath.includes('\0') ||
    relativePath.includes('\\') ||
    isAbsolute(relativePath) ||
    /^[A-Za-z]:/.test(relativePath)
  ) {
    throw new WorkspaceError('PATH_UNSAFE', `Unsafe path: ${relativePath}`);
  }

  const segments = relativePath.split('/');
  if (
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..',
    )
  ) {
    throw new WorkspaceError('PATH_UNSAFE', `Unsafe path: ${relativePath}`);
  }

  const resolvedRoot = resolve(root);
  const resolved = resolve(resolvedRoot, relativePath);
  const rel = relative(resolvedRoot, resolved);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new WorkspaceError('PATH_UNSAFE', `Unsafe path: ${relativePath}`);
  }

  let current = resolvedRoot;
  for (const segment of segments) {
    current = resolve(current, segment);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) {
        throw new WorkspaceError(
          'PATH_UNSAFE',
          `Symlink is not allowed: ${relativePath}`,
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }

  return resolved;
}
