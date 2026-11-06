// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';
import { AdvancedPage } from './AdvancedPage';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  useProjectStore.setState({
    project: { key: 'demo', tenant: 'local', createdAt: '', updatedAt: '', revision: 1 },
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

describe('AdvancedPage', () => {
  it('updates the spec from valid JSON', () => {
    render(<AdvancedPage />);
    const textarea = screen.getByLabelText('Spec JSON');
    const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
    spec.plugin.description = 'Edited';
    fireEvent.change(textarea, {
      target: { value: JSON.stringify(spec, null, 2) },
    });
    expect(useProjectStore.getState().spec!.plugin.description).toBe('Edited');
  });

  it('does not update the spec for invalid JSON', () => {
    render(<AdvancedPage />);
    const textarea = screen.getByLabelText('Spec JSON');
    fireEvent.change(textarea, { target: { value: '{ bad' } });
    expect(useProjectStore.getState().spec!.plugin.description).toBe('');
    expect(screen.getByText(/JSON 无效|Unexpected/)).toBeTruthy();
  });

  it('rejects non-object JSON without saving', () => {
    render(<AdvancedPage />);
    const textarea = screen.getByLabelText('Spec JSON');
    const before = useProjectStore.getState().spec;

    for (const value of ['null', '[]']) {
      fireEvent.change(textarea, { target: { value } });
      expect(useProjectStore.getState().spec).toBe(before);
      expect(screen.getByText('JSON 必须是对象。')).toBeTruthy();
    }
  });

  it('resyncs the textarea after the store spec is reloaded', async () => {
    render(<AdvancedPage />);
    const textarea = screen.getByLabelText('Spec JSON') as HTMLTextAreaElement;
    const reloaded = createDefaultSpec({ key: 'demo', name: 'Reloaded' });

    await act(async () => {
      useProjectStore.setState({ spec: reloaded });
    });

    expect(textarea.value).toBe(JSON.stringify(reloaded, null, 2));
  });
});
