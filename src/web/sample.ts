import type { PluginSpec } from '../core/index';

export const sampleSpec: PluginSpec = {
  schemaVersion: 1,
  key: 'demo',
  plugin: {
    name: 'Demo Plugin',
    description: 'A demo plugin',
    version: '1.0.0',
    dbName: 'Demo Plugin DB',
    dbDescription: 'A demo plugin DB',
    dbVersion: '1.0.0',
    navVersion: '1.0.0.0',
    publisher: { name: 'Example Publisher', email: 'publisher@example.com' },
    oauth: { enabled: true, accessLevelV1Api: 'READ' },
  },
  tables: [],
  pages: [
    {
      id: 'hello',
      kind: 'custom',
      context: 'admin',
      path: 'admin/demo/hello.html',
      title: { en: 'Hello', zh: '你好' },
      customBody: '<p>Hello from the workbench.</p>',
    },
  ],
  navigation: [],
  powerQueries: [],
  accessRequest: [],
  permissionMappings: [],
  wildcards: [],
  messageKeys: [],
  rawFiles: [],
};
