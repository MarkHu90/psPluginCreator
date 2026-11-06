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
    navigation: [],
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

function oneQuery(spec: any, query: any) {
  spec.powerQueries = [
    {
      filename: 'com.acme.named_queries.xml',
      queries: [{ name: 'com.acme.students.list', ...query }],
    },
  ];
}

describe('PowerQuery access_request coverage', () => {
  it('rejects a query column that is missing from access_request', () => {
    const spec = baseSpec();
    oneQuery(spec, {
      columns: [{ column: 'STUDENTS.LASTFIRST', alias: 'STUDENTS.LASTFIRST' }],
      sql: 'select s.lastfirst from students s',
    });

    expect(codes(validateSpec(spec))).toContain('PQ_FIELD_NOT_IN_ACCESS_REQUEST');
  });

  it('accepts a query whose declared columns are all in access_request', () => {
    const spec = baseSpec();
    oneQuery(spec, {
      columns: [{ column: 'STUDENTS.LASTFIRST', alias: 'STUDENTS.LASTFIRST' }],
      sql: 'select s.lastfirst from students s order by s.lastfirst',
    });
    spec.accessRequest = [{ table: 'STUDENTS', field: 'LASTFIRST', access: 'ViewOnly' }];

    expect(codes(validateSpec(spec))).not.toContain('PQ_FIELD_NOT_IN_ACCESS_REQUEST');
  });

  it('checks arg columns as well as result columns', () => {
    const spec = baseSpec();
    oneQuery(spec, {
      args: [{ name: 'schoolid', column: 'STUDENTS.SCHOOLID' }],
      columns: [{ column: 'STUDENTS.LASTFIRST', alias: 'STUDENTS.LASTFIRST' }],
      sql: 'select s.lastfirst from students s where s.schoolid = :schoolid',
    });
    spec.accessRequest = [{ table: 'STUDENTS', field: 'LASTFIRST', access: 'ViewOnly' }];

    const issues = validateSpec(spec);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PQ_FIELD_NOT_IN_ACCESS_REQUEST',
          message: expect.stringContaining('STUDENTS.SCHOOLID'),
        }),
      ]),
    );
  });

  it('resolves SQL table aliases before checking access_request', () => {
    const spec = baseSpec();
    oneQuery(spec, {
      columns: [{ column: 'STUDENTS.LASTFIRST', alias: 'STUDENTS.LASTFIRST' }],
      sql: [
        'select s.lastfirst, c.course_number',
        '  from students s',
        '  join cc c on c.studentid = s.id',
        ' where s.dcid = :dcid',
        ' order by s.lastfirst',
      ].join('\n'),
    });
    spec.accessRequest = [
      { table: 'STUDENTS', field: 'LASTFIRST', access: 'ViewOnly' },
      { table: 'CC', field: 'STUDENTID', access: 'ViewOnly' },
      { table: 'STUDENTS', field: 'ID', access: 'ViewOnly' },
      { table: 'STUDENTS', field: 'DCID', access: 'ViewOnly' },
    ];

    const issues = validateSpec(spec);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PQ_FIELD_NOT_IN_ACCESS_REQUEST',
          message: expect.stringContaining('CC.COURSE_NUMBER'),
        }),
      ]),
    );
  });

  it('matches access_request entries case-insensitively', () => {
    const spec = baseSpec();
    oneQuery(spec, {
      columns: [{ column: 'STUDENTS.LASTFIRST', alias: 'STUDENTS.LASTFIRST' }],
      sql: 'select s.lastfirst from students s order by s.lastfirst',
    });
    spec.accessRequest = [{ table: 'students', field: 'lastfirst', access: 'ViewOnly' }];

    expect(codes(validateSpec(spec))).not.toContain('PQ_FIELD_NOT_IN_ACCESS_REQUEST');
  });

  it('rejects excluded tables referenced by a query', () => {
    const spec = baseSpec();
    oneQuery(spec, {
      columns: [{ column: 'BLOBS.DATA', alias: 'BLOBS.DATA' }],
      sql: 'select b.data from blobs b',
    });
    spec.accessRequest = [{ table: 'BLOBS', field: 'DATA', access: 'ViewOnly' }];

    expect(codes(validateSpec(spec))).toContain('PQ_EXCLUDED_FIELD');
  });
});

describe('access_request entries', () => {
  it('rejects an invalid access level', () => {
    const spec = baseSpec();
    spec.accessRequest = [{ table: 'STUDENTS', field: 'LASTFIRST', access: 'Read' }];

    expect(codes(validateSpec(spec))).toContain('ACCESS_FIELD_INVALID');
  });

  it('rejects conflicting duplicate access entries', () => {
    const spec = baseSpec();
    spec.accessRequest = [
      { table: 'STUDENTS', field: 'LASTFIRST', access: 'ViewOnly' },
      { table: 'STUDENTS', field: 'LASTFIRST', access: 'FullAccess' },
    ];

    expect(codes(validateSpec(spec))).toContain('ACCESS_FIELD_DUPLICATE');
  });

  it('rejects excluded tables in access_request', () => {
    const spec = baseSpec();
    spec.accessRequest = [{ table: 'BLOBS', field: 'DATA', access: 'ViewOnly' }];

    expect(codes(validateSpec(spec))).toContain('ACCESS_EXCLUDED_FIELD');
  });
});
