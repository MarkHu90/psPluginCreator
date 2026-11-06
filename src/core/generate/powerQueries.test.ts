import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generatePowerQueries } from './powerQueries';

describe('PowerQuery XML generation', () => {
  it('generates a query with args, columns and CDATA SQL', () => {
    const spec = makeSpec({
      powerQueries: [
        {
          filename: 'com.acme.demo.named_queries.xml',
          queries: [
            {
              name: 'com.acme.demo.list',
              coreTable: 'U_DEMO',
              flattened: true,
              tags: 'demo',
              summary: 'Demo list',
              description: 'Returns demo rows',
              args: [
                {
                  name: 'schoolid',
                  column: 'U_DEMO.SCHOOLID',
                  type: 'primitive',
                  required: true,
                },
              ],
              columns: [{ column: 'U_DEMO.NAME', alias: 'U_DEMO.NAME' }],
              sql: 'select name from u_demo where schoolid = :schoolid order by name',
            },
          ],
        },
      ],
    });

    const [file] = generatePowerQueries(spec);

    expect(file.filename).toBe('com.acme.demo.named_queries.xml');
    expect(file.content).toContain('<queries>');
    expect(file.content).toContain('name="com.acme.demo.list"');
    expect(file.content).toContain('coreTable="U_DEMO"');
    expect(file.content).toContain('flattened="true"');
    expect(file.content).toContain('<summary>Demo list</summary>');
    expect(file.content).toContain('<arg name="schoolid" column="U_DEMO.SCHOOLID" type="primitive" required="true"/>');
    expect(file.content).toContain('<column column="U_DEMO.NAME">U_DEMO.NAME</column>');
    expect(file.content).toContain('<![CDATA[');
    expect(file.content).toContain('where schoolid = :schoolid');
  });

  it('supports dat and escapes XML text', () => {
    const spec = makeSpec({
      powerQueries: [
        {
          filename: 'com.acme.demo.named_queries.xml',
          queries: [
            {
              name: 'com.acme.demo.dat',
              coreTable: 'Students',
              flattened: true,
              dat: true,
              summary: 'A & B',
              args: [],
              columns: [{ column: 'Students.DCID', alias: 'STUDENTS.DCID' }],
              sql: 'select dcid from students',
            },
          ],
        },
      ],
    });

    const [file] = generatePowerQueries(spec);

    expect(file.content).toContain('dat="true"');
    expect(file.content).toContain('<summary>A &amp; B</summary>');
  });
});
