// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';
import { TablesPage } from './TablesPage';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
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

describe('TablesPage', () => {
  it('adds a table and a field', () => {
    render(<TablesPage />);
    fireEvent.click(screen.getByText('添加表'));

    let spec = useProjectStore.getState().spec!;
    expect(spec.tables).toHaveLength(1);
    expect(spec.tables[0].tableName).toBe('U_New_Table');

    fireEvent.click(screen.getByText('添加字段'));
    spec = useProjectStore.getState().spec!;
    expect(spec.tables[0].fields).toHaveLength(1);
    expect(spec.tables[0].fields[0].name).toBe('new_field');
  });

  it('edits the table name through the form', () => {
    render(<TablesPage />);
    fireEvent.click(screen.getByText('添加表'));
    fireEvent.change(screen.getByLabelText('表名'), {
      target: { value: 'U_Demo_Items' },
    });
    const spec = useProjectStore.getState().spec!;
    expect(spec.tables[0].tableName).toBe('U_Demo_Items');
  });
});
