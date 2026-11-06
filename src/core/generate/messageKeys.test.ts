import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generateMessageKeys } from './messageKeys';

describe('MessageKeys generation', () => {
  it('sorts keys and escapes properties characters', () => {
    const spec = makeSpec({
      messageKeys: [
        {
          locale: 'US_en',
          filename: 'demo.US_en.properties',
          entries: [
            { key: 'demo.b', value: 'B' },
            { key: 'demo.a', value: 'A = 1' },
          ],
        },
      ],
    });

    const [file] = generateMessageKeys(spec);

    expect(file.filename).toBe('demo.US_en.properties');
    expect(file.content).toBe('demo.a=A \\= 1\ndemo.b=B\n');
  });

  it('uses the default filename when none is supplied', () => {
    const spec = makeSpec({
      messageKeys: [{ locale: 'US_en', entries: [{ key: 'a', value: 'A' }] }],
    });

    expect(generateMessageKeys(spec)[0].filename).toBe(
      'message-keysep.US_en.properties',
    );
  });
});
