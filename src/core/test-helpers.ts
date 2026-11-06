import type { PluginSpec } from './spec/types';

export function makeSpec(overrides: Partial<PluginSpec> = {}): PluginSpec {
  const base: PluginSpec = {
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
      oauth: { enabled: true, accessLevelV1Api: 'READ' },
    },
    tables: [],
    pages: [],
    navigation: [],
    powerQueries: [],
    accessRequest: [],
    permissionMappings: [],
    wildcards: [],
    messageKeys: [],
    rawFiles: [],
  };

  return {
    ...base,
    ...overrides,
    plugin: { ...base.plugin, ...(overrides.plugin ?? {}) },
  };
}
