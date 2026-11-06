import { describe, expect, it } from 'vitest';
import { validateSpec } from './index';

function baseSpec(): any {
  return {
    schemaVersion: 1,
    key: 'demo',
    plugin: {
      name: 'Demo Plugin',
      description: 'Demo',
      version: '1.0.0',
      dbName: 'Demo Plugin DB',
      dbDescription: 'Demo DB',
      dbVersion: '1.0.0',
      navVersion: '1.0.0.0',
      publisher: { name: 'Example Publisher', email: 'publisher@example.com' },
    },
    tables: [],
    pages: [
      {
        id: 'page1',
        kind: 'custom',
        context: 'admin',
        path: 'admin/page1.html',
        title: { en: 'Page 1' },
      },
    ],
    navigation: [
      {
        filename: 'demo_schoolNav.json',
        contextType: 'main',
        entries: [
          {
            htmlID: 'nav1',
            title: 'Nav 1',
            sortOrder: 100,
            pageId: 'page1',
            version: '1.0.0.0',
          },
        ],
      },
    ],
    powerQueries: [],
    wildcards: [],
    messageKeys: [],
    rawFiles: [],
    accessRequest: [],
  };
}

function codes(issues: any[]) {
  return issues.map((i) => i.code);
}

function entry(spec: any) {
  return spec.navigation[0].entries[0];
}

describe('navigation structure', () => {
  it('rejects duplicate htmlIDs across navigation files', () => {
    const spec = baseSpec();
    spec.navigation.push({
      filename: 'demo_studentNav.json',
      contextType: 'student',
      entries: [{ ...entry(spec) }],
    });

    expect(codes(validateSpec(spec))).toContain('NAV_HTMLID_DUPLICATE');
  });

  it('rejects a pageId that does not exist', () => {
    const spec = baseSpec();
    entry(spec).pageId = 'missing';

    expect(codes(validateSpec(spec))).toContain('NAV_PAGEID_UNKNOWN');
  });

  it('requires pageURL to start with /admin', () => {
    const spec = baseSpec();
    delete entry(spec).pageId;
    entry(spec).pageURL = 'admin/page1.html';

    expect(codes(validateSpec(spec))).toContain('NAV_PAGEURL_INVALID');
  });

  it('allows a conditional pageURL wrapper containing /admin', () => {
    const spec = baseSpec();
    delete entry(spec).pageId;
    entry(spec).pageURL =
      '~[if#school.~(curschoolid)=1800]/admin/page1.html[/if#school]';

    expect(codes(validateSpec(spec))).not.toContain('NAV_PAGEURL_INVALID');
  });

  it('rejects an unsupported contextType', () => {
    const spec = baseSpec();
    entry(spec).contextType = 'district';

    expect(codes(validateSpec(spec))).toContain('NAV_CONTEXT_INVALID');
  });

  it('rejects an unsupported requiredContext', () => {
    const spec = baseSpec();
    entry(spec).requiredContext = 'parent';

    expect(codes(validateSpec(spec))).toContain('NAV_REQUIRED_CONTEXT_INVALID');
  });

  it('rejects an invalid districtLevelContext', () => {
    const spec = baseSpec();
    entry(spec).districtLevelContext = 3;

    expect(codes(validateSpec(spec))).toContain('NAV_DISTRICT_LEVEL_INVALID');
  });

  it('warns when parentHTMLID is not defined in the spec', () => {
    const spec = baseSpec();
    entry(spec).parentHTMLID = 'navExternalCategory';

    const issues = validateSpec(spec);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'NAV_PARENT_UNKNOWN',
        }),
      ]),
    );
  });

  it('rejects an unsafe navigation filename', () => {
    const spec = baseSpec();
    spec.navigation[0].filename = '../evil.json';

    expect(codes(validateSpec(spec))).toContain('NAV_FILENAME_INVALID');
  });
});
