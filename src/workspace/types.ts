import type { NavEntrySpec } from '../core/index';

export type ProjectRef = { tenant: string; key: string };

export interface ProjectSummary {
  key: string;
  name: string;
  version: string;
  updatedAt: string;
}

export interface Project {
  key: string;
  tenant: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface CreateProjectInput {
  key?: string;
  name: string;
  publisher?: { name: string; email: string };
}

export interface RawFileInfo {
  path: string;
  size: number;
  updatedAt: string;
}

export interface WorkspaceStore {
  list(tenant: string): Promise<ProjectSummary[]>;
  create(tenant: string, input: CreateProjectInput): Promise<Project>;
  get(ref: ProjectRef): Promise<Project>;
  remove(ref: ProjectRef): Promise<void>;

  readSpec(
    ref: ProjectRef,
  ): Promise<{ spec: unknown; revision: number; updatedAt: string }>;
  writeSpec(
    ref: ProjectRef,
    spec: unknown,
    expectedRevision: number,
  ): Promise<{ revision: number; updatedAt: string }>;

  listFiles(ref: ProjectRef): Promise<RawFileInfo[]>;
  readFile(ref: ProjectRef, path: string): Promise<Uint8Array>;
  writeFile(ref: ProjectRef, path: string, bytes: Uint8Array): Promise<void>;
  deleteFile(ref: ProjectRef, path: string): Promise<void>;

  readNavBaseline(ref: ProjectRef): Promise<NavEntrySpec[] | null>;
  writeNavBaseline(ref: ProjectRef, nav: NavEntrySpec[]): Promise<void>;

  buildDir(ref: ProjectRef): string;
}
