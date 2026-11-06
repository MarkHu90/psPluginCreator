import type { PluginSpec } from './types';

export interface DefaultSpecInput {
  key: string;
  name: string;
  publisher?: { name: string; email: string };
}

export function createDefaultSpec(input: DefaultSpecInput): PluginSpec {
  return {
    schemaVersion: 1,
    key: input.key,
    plugin: {
      name: input.name,
      description: '',
      version: '1.0.0',
      dbName: `${input.name} DB`,
      dbDescription: `${input.name} DB`,
      dbVersion: '1.0.0',
      navVersion: '1.0.0.0',
      publisher: input.publisher ?? { name: input.name, email: '' },
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
}
