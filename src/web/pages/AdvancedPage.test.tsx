// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
});
