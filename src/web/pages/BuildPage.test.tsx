// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';
import { BuildPage } from './BuildPage';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        issues: [
          {
            severity: 'error',
            code: 'PAGE_MISSING',
            message: 'Page is invalid.',
            path: 'pages.0',
          },
        ],
        errors: 1,
        warnings: 0,
      }),
    }),
  );
  useProjectStore.setState({
    project: {
      key: 'demo',
      tenant: 'local',
      createdAt: '',
      updatedAt: '',
      revision: 1,
    },
    spec: createDefaultSpec({ key: 'demo', name: 'Demo' }),
    revision: 1,
    navBaseline: null,
    issues: [],
    saveState: 'idle',
    conflict: null,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('BuildPage', () => {
  it('disables generate when mount validation reports errors', async () => {
    render(<BuildPage />);

    await waitFor(() => {
      expect(useProjectStore.getState().issues).toHaveLength(1);
    });

    const button = screen.getByRole('button', {
      name: '生成',
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('flushes pending edits before generating', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        calls.push({ url, method });
        if (method === 'PUT' && url.endsWith('/spec')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ revision: 2, updatedAt: '' }),
          };
        }
        if (url.endsWith('/generate')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              files: [],
              artifacts: { api: true, dbsetup: true, combined: true },
              warnings: [],
              navBaseline: [],
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ issues: [], errors: 0, warnings: 0 }),
        };
      }),
    );

    render(<BuildPage />);
    useProjectStore.getState().update('plugin.name', 'Edited Before Build');
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      expect(calls.some((call) => call.url.endsWith('/generate'))).toBe(true);
    });

    const putIndex = calls.findIndex(
      (call) => call.method === 'PUT' && call.url.endsWith('/spec'),
    );
    const generateIndex = calls.findIndex((call) =>
      call.url.endsWith('/generate'),
    );
    expect(putIndex).toBeGreaterThanOrEqual(0);
    expect(putIndex).toBeLessThan(generateIndex);
  });
});
