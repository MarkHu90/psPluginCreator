import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generateWildcards } from './wildcards';

describe('wildcard generation', () => {
  it('generates an admin link with a localized label', () => {
    const spec = makeSpec({
      wildcards: [
        {
          filename: 'admin_leftnav.demo.txt',
          kind: 'adminLink',
          link: {
            label: { en: 'Demo', zh: '演示' },
            href: '/admin/demo/list.html',
            htmlID: 'navDemo',
          },
        },
      ],
    });

    const [file] = generateWildcards(spec);

    expect(file.filename).toBe('admin_leftnav.demo.txt');
    expect(file.content).toContain(
      '<li><a href="/admin/demo/list.html" id="navDemo">演示 Demo</a></li>',
    );
  });

  it('wraps links in school and guardian conditions', () => {
    const spec = makeSpec({
      wildcards: [
        {
          filename: 'guardian_header.demo.txt',
          kind: 'guardianLink',
          link: { label: { en: 'Demo' }, href: '/guardian/demo.html' },
          condition: { schoolIds: [1800], guardianOnly: true },
        },
      ],
    });

    const [file] = generateWildcards(spec);
    expect(file.content).toContain('~[if#school.~(curschoolid)=1800]');
    expect(file.content).toContain('~[if#parent.isguardian]');
    expect(file.content).toContain('[/if#school]');
    expect(file.content).toContain('[/if#parent.isguardian]');
  });

  it('preserves raw content exactly', () => {
    const spec = makeSpec({
      wildcards: [
        {
          filename: 'guardian_header.demo.txt',
          kind: 'raw',
          content: '  <li>Raw</li>\n',
        },
      ],
    });

    const [file] = generateWildcards(spec);
    expect(file.content).toBe('  <li>Raw</li>\n');
  });
});
