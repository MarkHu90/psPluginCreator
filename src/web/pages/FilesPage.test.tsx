// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';
import { FilesPage } from './FilesPage';

const fetchMock = vi.fn();

async function flush() {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) {
      await Promise.resolve();
    }
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT' && String(input).includes('/files?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            file: { path: '', size: 0, updatedAt: '' },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      };
    },
  );
  vi.stubGlobal('fetch', fetchMock);
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

describe('FilesPage', () => {
  it('uploads into the configured directory with a nested path', async () => {
    render(<FilesPage />);
    await flush();

    fireEvent.change(screen.getByLabelText('上传到目录'), {
      target: { value: 'api/web_root/admin/' },
    });
    const file = new File(['content'], 'logo.png', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('上传文件'), {
      target: { files: [file] },
    });
    await flush();

    const expected = 'api/web_root/admin/logo.png';
    const uploadCall = fetchMock.mock.calls.find(([input, init]) => {
      return (
        String(input).includes(`?path=${encodeURIComponent(expected)}`) &&
        (init as RequestInit | undefined)?.method === 'PUT'
      );
    });
    expect(uploadCall).toBeTruthy();
    expect(useProjectStore.getState().spec!.rawFiles).toEqual([
      { path: expected },
    ]);
  });
});
