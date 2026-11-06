import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertValidKey, safePath, slugifyKey } from './safePath';
import { WorkspaceError } from './errors';

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ps-safe-path-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('assertValidKey', () => {
  it('accepts lowercase slug keys', () => {
    expect(() => assertValidKey('demo-plugin')).not.toThrow();
  });

  it('rejects unsafe keys', () => {
    expect(() => assertValidKey('../demo')).toThrow(WorkspaceError);
    expect(() => assertValidKey('Demo')).toThrow(WorkspaceError);
    expect(() => assertValidKey('a/b')).toThrow(WorkspaceError);
  });
});

describe('slugifyKey', () => {
  it('normalizes names', () => {
    expect(slugifyKey('Demo Plugin!')).toBe('demo-plugin');
    expect(slugifyKey('   ')).toBe('plugin');
  });
});

describe('safePath', () => {
  it('resolves a nested path inside the root', async () => {
    await mkdir(join(root, 'files'));
    await expect(safePath(root, 'files/a.txt')).resolves.toBe(
      join(root, 'files/a.txt'),
    );
  });

  it('rejects traversal and absolute paths', async () => {
    await expect(safePath(root, '../evil')).rejects.toThrow(WorkspaceError);
    await expect(safePath(root, '/etc/passwd')).rejects.toThrow(WorkspaceError);
    await expect(safePath(root, 'a\\b')).rejects.toThrow(WorkspaceError);
    await expect(safePath(root, 'a/./b')).rejects.toThrow(WorkspaceError);
  });

  it('rejects symlink segments', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'ps-outside-'));
    await writeFile(join(outside, 'secret.txt'), 'secret');
    await symlink(outside, join(root, 'link'));
    await expect(safePath(root, 'link/secret.txt')).rejects.toThrow(
      WorkspaceError,
    );
    await rm(outside, { recursive: true, force: true });
  });
});
