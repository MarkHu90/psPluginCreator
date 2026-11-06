import { describe, expect, it } from 'vitest';
import type { NavEntrySpec, NavFileSpec } from './types';
import {
  bumpNavVersion,
  compareNavVersion,
  flattenNavigation,
  isValidNavVersion,
  suggestNavVersion,
} from './navVersion';
import { createDefaultSpec } from './defaults';
import { navigationFingerprint } from '../validate/index';

const base: NavEntrySpec = {
  htmlID: 'demo-link',
  title: { en: 'Demo' },
  sortOrder: 1,
  version: '1.0.0',
};

describe('suggestNavVersion', () => {
  it('returns the default for a new entry', () => {
    expect(suggestNavVersion(base, undefined, '2.0.0.0')).toBe('1.0.0');
  });

  it('keeps the version when the fingerprint is unchanged', () => {
    expect(suggestNavVersion({ ...base }, { ...base }, '2.0.0.0')).toBe('1.0.0');
  });

  it('bumps the last segment when content changes', () => {
    const changed = { ...base, title: { en: 'Changed' } };
    expect(suggestNavVersion(changed, base, '1.0.0')).toBe('1.0.1');
  });

  it('keeps a manually higher version', () => {
    const changed = { ...base, title: { en: 'Changed' }, version: '1.0.5' };
    expect(suggestNavVersion(changed, base, '1.0.0')).toBe('1.0.5');
  });

  it('carries 9 to 10 instead of string concatenation', () => {
    expect(bumpNavVersion('1.0.0.9')).toBe('1.0.0.10');
  });
});

describe('compareNavVersion', () => {
  it('treats missing segments as zero', () => {
    expect(compareNavVersion('1.0', '1.0.0')).toBe(0);
    expect(compareNavVersion('1.0.1', '1.0')).toBe(1);
    expect(compareNavVersion('0.9', '1.0')).toBe(-1);
  });
});

describe('isValidNavVersion', () => {
  it('accepts one to four numeric segments', () => {
    expect(isValidNavVersion('1')).toBe(true);
    expect(isValidNavVersion('1.2.3.4')).toBe(true);
    expect(isValidNavVersion('1.2.3.4.5')).toBe(false);
    expect(isValidNavVersion('1.a')).toBe(false);
  });
});

describe('flattenNavigation', () => {
  it('includes nested children', () => {
    const navigation: NavFileSpec[] = [
      {
        filename: 'demo.json',
        contextType: 'main',
        entries: [
          base,
          {
            htmlID: 'child',
            title: { en: 'Child' },
            sortOrder: 1,
            version: '1.0.0',
          },
        ],
      },
    ];
    expect(flattenNavigation(navigation).map((entry) => entry.htmlID)).toEqual([
      'demo-link',
      'child',
    ]);
  });
});

describe('navigationFingerprint', () => {
  it('tracks pageId, schoolIds order and extra', () => {
    const a = { ...base, pageId: 'p1', schoolIds: [2, 1] };
    const b = { ...base, pageId: 'p1', schoolIds: [1, 2] };
    expect(navigationFingerprint(a)).toBe(navigationFingerprint(b));
    expect(navigationFingerprint(a)).not.toBe(
      navigationFingerprint({ ...a, pageId: 'p2' }),
    );
    expect(navigationFingerprint(a)).not.toBe(
      navigationFingerprint({ ...a, extra: { badge: 'new' } }),
    );
  });
});

describe('createDefaultSpec', () => {
  it('creates a minimal valid draft', () => {
    const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
    expect(spec.key).toBe('demo');
    expect(spec.plugin.name).toBe('Demo');
    expect(spec.plugin.version).toBe('1.0.0');
    expect(spec.plugin.dbName).toBe('Demo DB');
    expect(spec.plugin.navVersion).toBe('1.0.0.0');
    expect(spec.tables).toEqual([]);
    expect(spec.rawFiles).toEqual([]);
  });
});
