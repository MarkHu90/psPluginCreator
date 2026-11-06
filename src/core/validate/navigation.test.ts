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
    pages: [],
    navigation: [
      {
        filename: 'demo_schoolNav.json',
        contextType: 'main',
        entries: [
          {
            htmlID: 'navDemo',
            title: 'Demo',
            sortOrder: 100,
            pageURL: '/admin/demo.html',
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

function navEntry(spec: any) {
  return spec.navigation[0].entries[0];
}

describe('navigation versions', () => {
  it('requires a version on every navigation entry', () => {
    const spec = baseSpec();
    delete navEntry(spec).version;

    const issues = validateSpec(spec);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', code: 'NAV_VERSION_REQUIRED' }),
      ]),
    );
  });

  it('rejects a malformed navigation version', () => {
    const spec = baseSpec();
    navEntry(spec).version = 'v1';

    const issues = validateSpec(spec);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', code: 'NAV_VERSION_INVALID' }),
      ]),
    );
  });

  it('requires the plugin-level navVersion', () => {
    const spec = baseSpec();
    delete spec.plugin.navVersion;

    const issues = validateSpec(spec);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', code: 'NAV_VERSION_REQUIRED' }),
      ]),
    );
  });

  it('allows an unchanged entry to keep its version', () => {
    const spec = baseSpec();

    const issues = validateSpec(spec, {
      previousNavigation: [navEntry(spec)],
    });

    expect(issues.filter((i) => i.code.startsWith('NAV_VERSION_'))).toEqual([]);
  });

  it('rejects changed content without a version increment', () => {
    const spec = baseSpec();
    const previous = { ...navEntry(spec), title: 'Old title' };
    navEntry(spec).title = 'New title';

    const issues = validateSpec(spec, { previousNavigation: [previous] });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'NAV_VERSION_NOT_INCREMENTED',
        }),
      ]),
    );
  });

  it('accepts changed content with a higher version', () => {
    const spec = baseSpec();
    const previous = { ...navEntry(spec), title: 'Old title' };
    navEntry(spec).title = 'New title';
    navEntry(spec).version = '1.0.0.1';

    const issues = validateSpec(spec, { previousNavigation: [previous] });

    expect(issues.filter((i) => i.code.startsWith('NAV_VERSION_'))).toEqual([]);
  });
});
