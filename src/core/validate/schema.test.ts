import { describe, expect, it } from 'vitest';
import { validateSpec } from './index';

function codes(issues: any[]) {
  return issues.map((i) => i.code);
}

describe('spec shape', () => {
  it('rejects a non-object spec', () => {
    expect(codes(validateSpec(null))).toContain('SPEC_INVALID');
  });

  it('rejects a spec without required plugin metadata', () => {
    expect(codes(validateSpec({}))).toContain('SPEC_INVALID');
  });

  it('rejects a non-object page entry instead of throwing', () => {
    const spec = {
      schemaVersion: 1,
      key: 'demo',
      plugin: { name: 'Demo', publisher: { name: 'P', email: 'p@example.com' } },
      pages: [null],
    };

    expect(codes(validateSpec(spec))).toContain('SPEC_INVALID');
  });
});
