// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';
import { NavigationPage } from './NavigationPage';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
  spec.navigation.push({
    filename: 'demo.json',
    contextType: 'main',
    entries: [
      {
        htmlID: 'demo-link',
        title: { en: 'Demo' },
        sortOrder: 1,
        version: '1.0.0',
      },
    ],
  });
  useProjectStore.setState({
    project: { key: 'demo', tenant: 'local', createdAt: '', updatedAt: '', revision: 1 },
    spec,
    revision: 1,
    navBaseline: [
      {
        htmlID: 'demo-link',
        title: { en: 'Demo' },
        sortOrder: 1,
        version: '1.0.0',
      },
    ],
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

describe('NavigationPage', () => {
  it('bumps the version when a title changes', () => {
    render(<NavigationPage />);
    fireEvent.change(screen.getByLabelText('条目标题 (en)'), {
      target: { value: 'Changed' },
    });
    const spec = useProjectStore.getState().spec!;
    expect(spec.navigation[0].entries[0].version).toBe('1.0.1');
  });

  it('adds a navigation file and entry', () => {
    render(<NavigationPage />);
    fireEvent.click(screen.getByText('添加导航文件'));
    let spec = useProjectStore.getState().spec!;
    expect(spec.navigation).toHaveLength(2);

    fireEvent.click(screen.getByText('添加条目'));
    spec = useProjectStore.getState().spec!;
    expect(spec.navigation[1].entries[0].version).toBe('1.0.0.0');
  });
});
