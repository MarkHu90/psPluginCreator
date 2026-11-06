import { create } from 'zustand';
import type { NavEntrySpec, PluginSpec, ValidationIssue } from '../../core/index';
import {
  ApiError,
  api,
  type GenerateResult,
  type Project,
} from '../api';

export type SaveState =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'conflict'
  | 'error';

interface ConflictState {
  revision: number;
}

interface ProjectStore {
  project: Project | null;
  spec: PluginSpec | null;
  navBaseline: NavEntrySpec[] | null;
  revision: number;
  issues: ValidationIssue[];
  saveState: SaveState;
  error: string;
  conflict: ConflictState | null;
  loading: boolean;
  notFound: boolean;

  load(key: string): Promise<void>;
  update(path: string, value: unknown): void;
  replaceSpec(spec: PluginSpec): void;
  saveNow(): Promise<void>;
  flushSave(): Promise<boolean>;
  reload(): Promise<void>;
  overwrite(): Promise<void>;
  validateNow(): Promise<void>;
  generate(): Promise<GenerateResult | null>;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let validateTimer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | null = null;
let savedSpec: PluginSpec | null = null;

function setIn<T>(value: T, path: string, next: unknown): T {
  const parts = path.split('.');
  const clone = (Array.isArray(value) ? [...value] : { ...value }) as Record<
    string,
    unknown
  >;
  let cursor: Record<string, unknown> = clone;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const current = cursor[key];
    cursor[key] = Array.isArray(current)
      ? [...current]
      : { ...((current as object) ?? {}) };
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = next;
  return clone as unknown as T;
}

function scheduleSave(get: () => ProjectStore): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void get().saveNow();
  }, 800);
}

function scheduleValidate(get: () => ProjectStore): void {
  if (validateTimer) clearTimeout(validateTimer);
  validateTimer = setTimeout(() => {
    void get().validateNow();
  }, 1200);
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
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

  async load(key) {
    if (saveTimer) clearTimeout(saveTimer);
    if (validateTimer) clearTimeout(validateTimer);
    set({ loading: true, notFound: false, error: '' });
    try {
      const result = await api.getProject(key);
      savedSpec = result.spec;
      set({
        project: result.project,
        spec: result.spec,
        navBaseline: result.navBaseline,
        revision: result.project.revision,
        issues: [],
        saveState: 'idle',
        conflict: null,
        loading: false,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        set({
          loading: false,
          notFound: true,
          project: null,
          spec: null,
          conflict: null,
          saveState: 'idle',
        });
        return;
      }
      set({
        loading: false,
        error: error instanceof Error ? error.message : '加载失败',
      });
    }
  },

  update(path, value) {
    const spec = get().spec;
    if (!spec) return;
    const next = setIn(spec, path, value);
    if (get().conflict) {
      // Keep local edits while the conflict dialog is open so overwrite uses
      // the latest spec, but do not autosave with a stale revision.
      set({ spec: next });
      return;
    }
    set({ spec: next, saveState: 'dirty' });
    scheduleSave(get);
  },

  replaceSpec(spec) {
    if (get().conflict) {
      set({ spec });
      return;
    }
    set({ spec, saveState: 'dirty' });
    scheduleSave(get);
  },

  async saveNow() {
    if (saveTimer) clearTimeout(saveTimer);
    const previous = inFlight;
    const current = (async () => {
      if (previous) await previous;
      const { project, spec, revision, saveState, conflict } = get();
      if (!project || !spec) return;
      if (conflict || saveState === 'conflict') return;
      if (saveState === 'saved' && spec === savedSpec) return;
      set({ saveState: 'saving' });
      try {
        const result = await api.putSpec(project.key, spec, revision);
        if (get().spec !== spec) {
          // A newer edit landed while this request was in flight. Keep it dirty
          // and send it rather than reporting a stale save as complete.
          set({
            revision: result.revision,
            saveState: 'dirty',
            conflict: null,
            error: '',
          });
          scheduleSave(get);
          return;
        }
        savedSpec = spec;
        set({
          revision: result.revision,
          saveState: 'saved',
          conflict: null,
          error: '',
        });
        scheduleValidate(get);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const detail = error.details[0] as { revision?: number } | undefined;
          set({
            saveState: 'conflict',
            conflict: { revision: detail?.revision ?? 0 },
          });
          return;
        }
        set({
          saveState: 'error',
          error: error instanceof Error ? error.message : '保存失败',
        });
      }
    })();
    inFlight = current;
    try {
      await current;
    } finally {
      if (inFlight === current) inFlight = null;
    }
  },

  async flushSave() {
    for (;;) {
      if (inFlight) {
        await inFlight;
        continue;
      }
      const { project, spec, saveState, conflict } = get();
      if (!project || !spec) return false;
      if (conflict || saveState === 'conflict' || saveState === 'error') {
        return false;
      }
      if (saveState === 'dirty' || spec !== savedSpec) {
        await get().saveNow();
        continue;
      }
      return true;
    }
  },

  async reload() {
    const project = get().project;
    if (!project) return;
    await get().load(project.key);
  },

  async overwrite() {
    const { project, spec, conflict } = get();
    if (!project || !spec || !conflict || inFlight) return;
    if (saveTimer) clearTimeout(saveTimer);
    set({ saveState: 'saving', conflict: null });
    const current = (async () => {
      try {
        const result = await api.putSpec(project.key, spec, conflict.revision);
        if (get().spec !== spec) {
          set({
            revision: result.revision,
            saveState: 'dirty',
            error: '',
          });
          scheduleSave(get);
          return;
        }
        savedSpec = spec;
        set({ revision: result.revision, saveState: 'saved', error: '' });
        scheduleValidate(get);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const detail = error.details[0] as { revision?: number } | undefined;
          set({
            saveState: 'conflict',
            conflict: { revision: detail?.revision ?? 0 },
          });
          return;
        }
        set({
          saveState: 'error',
          error: error instanceof Error ? error.message : '保存失败',
        });
      }
    })();
    inFlight = current;
    try {
      await current;
    } finally {
      if (inFlight === current) inFlight = null;
    }
  },

  async validateNow() {
    const project = get().project;
    if (!project) return;
    try {
      const result = await api.validate(project.key);
      set({ issues: result.issues });
    } catch {
      // Keep the previous issues; the save state already surfaces request errors.
    }
  },

  async generate() {
    const project = get().project;
    if (!project) return null;
    try {
      const result = await api.generate(project.key);
      set({
        issues: result.warnings,
        navBaseline: result.navBaseline,
      });
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        set({ issues: error.details as ValidationIssue[] });
        return null;
      }
      set({ error: error instanceof Error ? error.message : '生成失败' });
      return null;
    }
  },
}));
