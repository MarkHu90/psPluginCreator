import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { GeneratedFile, ZipArtifact } from '../core/index';
import { safePath } from '../workspace/safePath';

const buildLocks = new Map<string, Promise<void>>();

async function withBuildLock<T>(
  buildDir: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockKey = resolve(buildDir);
  const previous = buildLocks.get(lockKey) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolveGate) => {
    release = resolveGate;
  });
  const queued = previous.then(() => gate);
  buildLocks.set(lockKey, queued);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (buildLocks.get(lockKey) === queued) buildLocks.delete(lockKey);
  }
}

async function writeBuildUnlocked(
  buildDir: string,
  files: GeneratedFile[],
  zips?: Record<ZipArtifact, Uint8Array>,
): Promise<void> {
  const parent = dirname(buildDir);
  await mkdir(parent, { recursive: true });
  const temp = await mkdtemp(join(parent, '.build-tmp-'));
  let backup: string | undefined;

  try {
    for (const file of files) {
      const target = await safePath(temp, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }
    if (zips) {
      for (const [artifact, bytes] of Object.entries(zips)) {
        await writeFile(join(temp, `${artifact}.zip`), bytes);
      }
    }

    backup = `${buildDir}.old-${Date.now()}`;
    try {
      await rename(buildDir, backup);
    } catch (error) {
      backup = undefined;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await rename(temp, buildDir);
    if (backup) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    try {
      await rm(temp, { recursive: true, force: true });
    } catch {
      // Cleanup failure must not prevent restoring the previous build.
    }
    if (backup) {
      await rename(backup, buildDir).catch(() => undefined);
    }
    throw error;
  }
}

export async function writeBuildAtomically(
  buildDir: string,
  files: GeneratedFile[],
  zips?: Record<ZipArtifact, Uint8Array>,
): Promise<void> {
  await withBuildLock(buildDir, () => writeBuildUnlocked(buildDir, files, zips));
}
