import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generateDbSchema } from './dbSchema';

describe('database schema generation', () => {
  it('groups tables that share an extensionName into one file', () => {
    const spec = makeSpec({
      tables: [
        {
          extensionName: 'U_Demo',
          schemaFile: 'U_Demo.xml',
          tableName: 'U_Demo_One',
          childName: 'U_Demo_One',
          comment: 'One',
          fields: [{ name: 'name', type: 'String', length: 100 }],
        },
        {
          extensionName: 'U_Demo',
          schemaFile: 'U_Demo.xml',
          tableName: 'U_Demo_Two',
          childName: 'U_Demo_Two',
          comment: 'Two',
          fields: [{ name: 'score', type: 'Integer' }],
        },
      ],
    });

    const files = generateDbSchema(spec);

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('U_Demo.xml');
    expect(files[0].content).toContain('<extensionname>U_Demo</extensionname>');
    expect(files[0].content).toContain('dbTableName="U_Demo_One"');
    expect(files[0].content).toContain('dbTableName="U_Demo_Two"');
    expect(files[0].content).toContain('<field name="name" type="String" length="100"/>');
    expect(files[0].content).toContain('<field name="score" type="Integer"/>');
  });

  it('writes separate files for separate extension groups', () => {
    const spec = makeSpec({
      tables: [
        {
          extensionName: 'U_One',
          tableName: 'U_One',
          childName: 'U_One',
          comment: '',
          fields: [{ name: 'a', type: 'Integer' }],
        },
        {
          extensionName: 'U_Two',
          tableName: 'U_Two',
          childName: 'U_Two',
          comment: '',
          fields: [{ name: 'b', type: 'Integer' }],
        },
      ],
    });

    const files = generateDbSchema(spec);
    expect(files.map((f) => f.filename).sort()).toEqual(['U_One.xml', 'U_Two.xml']);
  });

  it('escapes XML in comments and supports table type', () => {
    const spec = makeSpec({
      tables: [
        {
          extensionName: 'U_Demo',
          tableName: 'U_Demo',
          childName: 'U_Demo',
          comment: 'A & B',
          type: 'oneToOne',
          fields: [{ name: 'name', type: 'String', length: 50 }],
        },
      ],
    });

    const [file] = generateDbSchema(spec);
    expect(file.content).toContain('type="oneToOne"');
    expect(file.content).toContain('comment="A &amp; B"');
  });
});
