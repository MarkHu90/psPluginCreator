// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectListPage } from './ProjectListPage';

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ProjectListPage', () => {
  it('renders projects returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          projects: [
            {
              key: 'demo',
              name: 'Demo Plugin',
              version: '1.0.0',
              updatedAt: '2026-11-06T05:00:00.000Z',
            },
          ],
        }),
      }),
    );

    render(
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Demo Plugin')).toBeTruthy();
    });
    expect(screen.getByText('demo')).toBeTruthy();
  });

  it('creates a project from the dialog', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: { key: 'new-plugin' },
          spec: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              key: 'new-plugin',
              name: 'New Plugin',
              version: '1.0.0',
              updatedAt: '2026-11-06T05:00:00.000Z',
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('新建工程'));
    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: 'New Plugin' },
    });
    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });
});
