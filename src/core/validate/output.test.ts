import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { GeneratedFile } from '../generate/plan';
import { validateOutput } from './output';

function file(path: string, content: string): GeneratedFile {
  return { path, content, source: 'generated', encoding: 'utf8' };
}

function codes(issues: any[]) {
  return issues.map((i) => i.code);
}

describe('generated output validation', () => {
  it('accepts well-formed plugin.xml, pagecataloging JSON and paired tags', () => {
    const files = [
      file('api/plugin.xml', '<plugin name="Demo"><publisher name="P"/></plugin>'),
      file('api/pagecataloging/a.json', '{"pages":[]}\n'),
      file(
        'api/web_root/admin/demo/list.html',
        [
          '<div>',
          '~[if#school.~(curschoolid)=1]',
          '~[tlist_sql;select 1 from dual]x[/tlist_sql]',
          '[/if#school]',
          '</div>',
        ].join('\n'),
      ),
      file(
        'api/web_root/admin/demo/list.json',
        '[\n~[tlist_sql;select 1 from dual]{"id":1},\n[/tlist_sql]\n{}]\n',
      ),
    ];

    expect(codes(validateOutput(files))).toEqual([]);
  });

  it('reports malformed XML', () => {
    const files = [file('api/plugin.xml', '<plugin><publisher></plugin>')];

    expect(codes(validateOutput(files))).toContain('OUTPUT_XML_INVALID');
  });

  it('reports malformed pagecataloging JSON', () => {
    const files = [file('api/pagecataloging/a.json', '{"pages": [}')];

    expect(codes(validateOutput(files))).toContain('OUTPUT_JSON_INVALID');
  });

  it('reports unbalanced PS-HTML tags', () => {
    const files = [
      file(
        'api/web_root/admin/demo/list.html',
        '~[if#school.~(curschoolid)=1]<div>x</div>',
      ),
    ];

    expect(codes(validateOutput(files))).toContain('OUTPUT_TAG_UNBALANCED');
  });

  it('rejects unsafe zip entry names', () => {
    const zip = zipSync({ '../evil.txt': strToU8('x') });

    expect(codes(validateOutput([], { zip }))).toContain(
      'OUTPUT_ZIP_UNSAFE_PATH',
    );
  });

  it('reports an invalid zip payload', () => {
    expect(codes(validateOutput([], { zip: new Uint8Array([1, 2, 3]) }))).toContain(
      'OUTPUT_ZIP_INVALID',
    );
  });
});
