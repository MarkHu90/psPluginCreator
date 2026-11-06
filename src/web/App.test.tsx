// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('workbench UI', () => {
  it('renders validation issues returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          issues: [
            {
              severity: 'error',
              code: 'PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN',
              message: 'Student pages must use guardian/.',
              path: 'pages.p1.path',
            },
          ],
          errors: 1,
          warnings: 0,
        }),
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /运行校验/ }));

    await waitFor(() => {
      expect(
        screen.getByText('PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN'),
      ).toBeTruthy();
    });
    expect(screen.getByText('Student pages must use guardian/.')).toBeTruthy();
    expect(screen.getByText('1 错误 / 0 警告')).toBeTruthy();
  });
});
