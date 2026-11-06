import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { GeneratedFile } from './plan';
import { buildZip } from './zip';

const files: GeneratedFile[] = [
  { path: 'api/plugin.xml', content: '<plugin/>', source: 'generated' },
  { path: 'api/pagecataloging/a.json', content: '{"pages":[]}', source: 'generated' },
  { path: 'dbsetup/plugin.xml', content: '<plugin/>', source: 'generated' },
  { path: 'dbsetup/user_schema_root/U.xml', content: '<psExtension/>', source: 'generated' },
];

function names(zip: Uint8Array): string[] {
  return Object.keys(unzipSync(zip)).sort();
}

describe('zip generation', () => {
  it('builds api.zip with the api root at the archive root', () => {
    expect(names(buildZip(files, 'api'))).toEqual([
      'pagecataloging/a.json',
      'plugin.xml',
    ]);
  });

  it('builds dbsetup.zip with the db root at the archive root', () => {
    expect(names(buildZip(files, 'dbsetup'))).toEqual([
      'plugin.xml',
      'user_schema_root/U.xml',
    ]);
  });

  it('builds combined.zip with api at the root and db under dbsetup/', () => {
    expect(names(buildZip(files, 'combined'))).toEqual([
      'dbsetup/plugin.xml',
      'dbsetup/user_schema_root/U.xml',
      'pagecataloging/a.json',
      'plugin.xml',
    ]);
  });

  it('rejects unsafe paths', () => {
    expect(() =>
      buildZip(
        [{ path: 'api/../evil.txt', content: 'x', source: 'generated' }],
        'api',
      ),
    ).toThrow(/unsafe/i);
  });
});
