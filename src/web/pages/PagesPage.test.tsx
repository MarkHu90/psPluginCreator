// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';
import { PagesPage } from './PagesPage';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
  spec.tables.push({
    extensionName: 'U_Demo',
    tableName: 'U_Demo_Items',
    childName: 'U_Demo_Items',
    comment: '',
    fields: [{ name: 'id', type: 'Integer' }],
  });
  useProjectStore.setState({
    project: { key: 'demo', tenant: 'local', createdAt: '', updatedAt: '', revision: 1 },
    spec,
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

describe('PagesPage', () => {
  it('adds a list page and a column', () => {
    render(<PagesPage />);
    fireEvent.click(screen.getByText('添加页面'));

    let spec = useProjectStore.getState().spec!;
    expect(spec.pages).toHaveLength(1);
    expect(spec.pages[0].kind).toBe('list');

    fireEvent.click(screen.getByText('添加列'));
    spec = useProjectStore.getState().spec!;
    expect(spec.pages[0].columns).toHaveLength(1);
  });

  it('switches the path prefix hint when context changes', () => {
    render(<PagesPage />);
    fireEvent.click(screen.getByText('添加页面'));
    fireEvent.change(screen.getByLabelText('上下文'), {
      target: { value: 'student' },
    });
    expect(screen.getByText(/guardian\//)).toBeTruthy();
  });
});
