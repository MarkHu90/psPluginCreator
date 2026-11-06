import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generateNavigation } from './navigation';

function specWithNav(nav: any, pages: any[] = []) {
  return makeSpec({
    pages,
    navigation: [nav],
  });
}

describe('pagecataloging JSON generation', () => {
  it('generates a titled entry with pageId-derived URL and version', () => {
    const spec = specWithNav(
      {
        filename: 'demo_schoolNav.json',
        contextType: 'main',
        entries: [
          {
            htmlID: 'navDemo',
            title: { en: 'Demo', zh: '演示' },
            sortOrder: 100,
            version: '1.0.0.0',
            pageId: 'list',
            districtLevelContext: 1,
          },
        ],
      },
      [
        {
          id: 'list',
          kind: 'list',
          context: 'admin',
          path: 'admin/demo/list.html',
          title: { en: 'List' },
          table: 'U_Demo',
          columns: [{ column: 'name', label: { en: 'Name' } }],
        },
      ],
    );

    const [file] = generateNavigation(spec);
    const json = JSON.parse(file.content);

    expect(file.filename).toBe('demo_schoolNav.json');
    expect(json.pages[0]).toMatchObject({
      htmlID: 'navDemo',
      title: '演示 Demo',
      sortOrder: 100,
      version: '1.0.0.0',
      pageURL: '/admin/demo/list.html',
      contextType: 'main',
      districtLevelContext: 1,
    });
  });

  it('adds frn for student-context pages', () => {
    const spec = specWithNav(
      {
        filename: 'demo_studentNav.json',
        contextType: 'student',
        entries: [
          {
            htmlID: 'navStudent',
            title: { en: 'Student' },
            sortOrder: 10,
            version: '1.0.0.0',
            pageId: 'studentPage',
          },
        ],
      },
      [
        {
          id: 'studentPage',
          kind: 'custom',
          context: 'student',
          path: 'guardian/demo/student.html',
          title: { en: 'Student' },
        },
      ],
    );

    const [file] = generateNavigation(spec);
    const json = JSON.parse(file.content);

    expect(json.pages[0].pageURL).toBe(
      '/guardian/demo/student.html?frn=~(studentfrn)',
    );
  });

  it('wraps admin URLs with schoolIds conditions', () => {
    const spec = specWithNav(
      {
        filename: 'demo_schoolNav.json',
        contextType: 'main',
        entries: [
          {
            htmlID: 'navDemo',
            title: { en: 'Demo' },
            sortOrder: 100,
            version: '1.0.0.0',
            pageId: 'list',
            schoolIds: [1800, 2206],
          },
        ],
      },
      [
        {
          id: 'list',
          kind: 'custom',
          context: 'admin',
          path: 'admin/demo/list.html',
          title: { en: 'List' },
        },
      ],
    );

    const [file] = generateNavigation(spec);
    const json = JSON.parse(file.content);

    expect(json.pages[0].pageURL).toBe(
      '~[if#school.~(curschoolid)=1800,2206]/admin/demo/list.html[/if#school]',
    );
  });

  it('inherits parentHTMLID for children and keeps explicit URLs', () => {
    const spec = specWithNav({
      filename: 'demo_schoolNav.json',
      contextType: 'main',
      entries: [
        {
          htmlID: 'navParent',
          title: { en: 'Parent' },
          sortOrder: 100,
          version: '1.0.0.0',
          pageURL: null,
          children: [
            {
              htmlID: 'navChild',
              title: { en: 'Child' },
              sortOrder: 10,
              version: '1.0.0.0',
              pageURL: '/admin/demo/child.html',
            },
          ],
        },
      ],
    });

    const [file] = generateNavigation(spec);
    const json = JSON.parse(file.content);

    expect(json.pages[0].children[0].parentHTMLID).toBe('navParent');
    expect(json.pages[0].children[0].pageURL).toBe('/admin/demo/child.html');
  });
});
