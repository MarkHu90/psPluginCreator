import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generatePluginXml } from './pluginXml';

describe('plugin.xml generation', () => {
  it('generates the API plugin manifest with oauth and access_request', () => {
    const spec = makeSpec({
      plugin: {
        ...makeSpec().plugin,
        name: 'Demo & Friends',
        oauth: { enabled: true, accessLevelV1Api: 'FULL' },
      },
      accessRequest: [
        { table: 'STUDENTS', field: 'DCID', access: 'ViewOnly' },
        { table: 'STUDENTS', field: 'LAST_NAME', access: 'FullAccess' },
      ],
    });

    const xml = generatePluginXml(spec, 'api');

    expect(xml).toContain('<plugin');
    expect(xml).toContain('name="Demo &amp; Friends"');
    expect(xml).toContain('<oauth accessLevelV1Api="FULL"/>');
    expect(xml).toContain(
      '<field table="STUDENTS" field="DCID" access="ViewOnly"/>',
    );
    expect(xml).toContain(
      '<field table="STUDENTS" field="LAST_NAME" access="FullAccess"/>',
    );
  });

  it('generates the DB manifest with the db name and version', () => {
    const spec = makeSpec({
      plugin: {
        ...makeSpec().plugin,
        dbName: 'Demo DB',
        dbVersion: '2.0.0',
      },
    });

    const xml = generatePluginXml(spec, 'db');

    expect(xml).toContain('name="Demo DB"');
    expect(xml).toContain('version="2.0.0"');
    expect(xml).not.toContain('<oauth');
  });

  it('omits oauth when disabled', () => {
    const spec = makeSpec({
      plugin: {
        ...makeSpec().plugin,
        oauth: { enabled: false, accessLevelV1Api: 'NONE' },
      },
    });

    expect(generatePluginXml(spec, 'api')).not.toContain('<oauth');
  });
});
