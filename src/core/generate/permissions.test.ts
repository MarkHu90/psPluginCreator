import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generatePermissionMappings } from './permissions';

describe('permission_mappings XML generation', () => {
  it('generates page-to-resource mappings with allow attributes', () => {
    const spec = makeSpec({
      permissionMappings: [
        {
          filename: 'demo.permission_mappings.xml',
          mappings: [
            {
              page: '/admin/demo/list.html',
              resources: [
                {
                  path: '/ws/schema/query/com.acme.demo.list',
                  allow: 'post',
                },
                { path: '/ws/schema/table/u_demo', allow: 'get' },
              ],
            },
          ],
        },
      ],
    });

    const [file] = generatePermissionMappings(spec);

    expect(file.filename).toBe('demo.permission_mappings.xml');
    expect(file.content).toContain('<permission_mappings>');
    expect(file.content).toContain('name="/admin/demo/list.html"');
    expect(file.content).toContain(
      '<implies allow="post">/ws/schema/query/com.acme.demo.list</implies>',
    );
    expect(file.content).toContain(
      '<implies allow="get">/ws/schema/table/u_demo</implies>',
    );
  });

  it('omits allow when it is not specified', () => {
    const spec = makeSpec({
      permissionMappings: [
        {
          filename: 'demo.permission_mappings.xml',
          mappings: [
            {
              page: '/admin/demo/list.html',
              resources: [{ path: '/ws/schema/query/com.acme.demo.list' }],
            },
          ],
        },
      ],
    });

    const [file] = generatePermissionMappings(spec);
    expect(file.content).toContain(
      '<implies>/ws/schema/query/com.acme.demo.list</implies>',
    );
  });
});
