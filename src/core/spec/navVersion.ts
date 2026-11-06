import type { NavEntrySpec, NavFileSpec } from './types';
import { navigationFingerprint } from '../validate/index';

const VERSION_RE = /^\d+(\.\d+){0,3}$/;

export function isValidNavVersion(version: string): boolean {
  return VERSION_RE.test(version);
}

export function compareNavVersion(a: string, b: string): number {
  if (!isValidNavVersion(a) || !isValidNavVersion(b)) {
    throw new Error(`Invalid navigation version: ${a} / ${b}`);
  }
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const x = left[index] ?? 0;
    const y = right[index] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function bumpNavVersion(version: string): string {
  const parts = version.split('.');
  const last = Number(parts[parts.length - 1]);
  parts[parts.length - 1] = String(last + 1);
  return parts.join('.');
}

export function suggestNavVersion(
  entry: NavEntrySpec,
  baselineEntry: NavEntrySpec | undefined,
  defaultVersion: string,
): string {
  const current = entry.version || defaultVersion;
  if (!baselineEntry) return current;
  if (navigationFingerprint(entry) === navigationFingerprint(baselineEntry)) {
    return current;
  }
  const baselineVersion = baselineEntry.version;
  if (!baselineVersion || !isValidNavVersion(baselineVersion)) return current;
  if (
    entry.version &&
    isValidNavVersion(entry.version) &&
    compareNavVersion(entry.version, baselineVersion) > 0
  ) {
    return entry.version;
  }
  return bumpNavVersion(baselineVersion);
}

export function flattenNavigation(navigation: NavFileSpec[]): NavEntrySpec[] {
  const out: NavEntrySpec[] = [];
  const walk = (entries: NavEntrySpec[] | undefined): void => {
    for (const entry of entries ?? []) {
      out.push(entry);
      walk(entry.children);
    }
  };
  for (const file of navigation) walk(file.entries);
  return out;
}
