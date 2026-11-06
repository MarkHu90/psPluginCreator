// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
});
