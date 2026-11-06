// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSpec } from '../../core/index';
import type { Project } from '../api';
import { useProjectStore } from './projectStore';

const project: Project = {
  key: 'demo',
  tenant: 'local',
  createdAt: '2026-11-06T05:00:00.000Z',
  updatedAt: '2026-11-06T05:00:00.000Z',
  revision: 1,
};

function resetStore(): void {
  useProjectStore.setState({
    project: null,
    spec: null,
    navBaseline: null,
    revision: 0,
    issues: [],
    saveState: 'idle',
    error: '',
    conflict: null,
    loading: false,
    notFound: false,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((value) => {
    resolve = value;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStore();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('projectStore conflict recovery', () => {
  it('clears the conflict after loading the server version', async () => {
    const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
    useProjectStore.setState({
      project,
      spec,
      revision: 1,
      conflict: { revision: 2 },
      saveState: 'conflict',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          project: { ...project, revision: 2 },
          spec,
          navBaseline: [],
        }),
      }),
    );

    await useProjectStore.getState().reload();

    const state = useProjectStore.getState();
    expect(state.conflict).toBeNull();
    expect(state.saveState).toBe('idle');
    expect(state.revision).toBe(2);
  });

  it('does not save while a conflict is unresolved', async () => {
    const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    useProjectStore.setState({
      project,
      spec,
      revision: 1,
      conflict: { revision: 2 },
      saveState: 'conflict',
    });

    await useProjectStore.getState().saveNow();
    useProjectStore.getState().update('plugin.name', 'Edited behind the dialog');
    await vi.advanceTimersByTimeAsync(800);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useProjectStore.getState().conflict).toEqual({ revision: 2 });
    expect(useProjectStore.getState().spec?.plugin.name).toBe(
      'Edited behind the dialog',
    );
  });

  it('resaves an edit made while a save is in flight', async () => {
    const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
    useProjectStore.setState({
      project,
      spec,
      revision: 1,
      conflict: null,
      saveState: 'dirty',
    });

    const firstResponse = deferred<{
      ok: boolean;
      status: number;
      json: () => Promise<{ revision: number; updatedAt: string }>;
    }>();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstResponse.promise)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          revision: 3,
          updatedAt: '2026-11-06T05:01:00.000Z',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const firstSave = useProjectStore.getState().saveNow();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    useProjectStore
      .getState()
      .update('plugin.name', 'Edited While Saving');

    firstResponse.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        revision: 2,
        updatedAt: '2026-11-06T05:00:30.000Z',
      }),
    });
    await firstSave;

    // The in-flight response must not claim the newer edit was saved.
    expect(useProjectStore.getState().saveState).toBe('dirty');

    await vi.advanceTimersByTimeAsync(800);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondInit = fetchMock.mock.calls[1][1] as RequestInit;
    const secondBody = JSON.parse(secondInit.body as string) as {
      spec: { plugin: { name: string } };
      revision: number;
    };
    expect(secondBody.spec.plugin.name).toBe('Edited While Saving');
    expect(useProjectStore.getState().saveState).toBe('saved');
    expect(useProjectStore.getState().revision).toBe(3);
  });
});
