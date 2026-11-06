# PowerSchool 插件平台 — 工程工作区与核心表单 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有「写 JSON + 校验 + 出包」的开发者工具升级为本地平台：工程工作区、核心表单（插件信息 / 表与字段 / 页面 / 导航）、raw 文件、校验、生成与下载。

**Architecture:** Fastify 服务端持有 `workspaces/<tenant>/<key>/`，浏览器通过 REST 读写；`WorkspaceStore` 接口隔离存储并预留多租户；React + Zustand 负责表单与自动保存；生成逻辑继续复用 `src/core` 纯函数。

**Tech Stack:** TypeScript、React 19、React Router、Zustand、Fastify 5、@fastify/multipart、Zod、Vitest、jsdom、Vite。

**Spec:** `docs/superpowers/specs/2026-11-06-plugin-platform-workspace-forms-design.md`

## Global Constraints

- Node.js 24+；TypeScript `strict: true`；所有应用代码位于 `src/`。
- 测试与被测代码同目录，文件名 `*.test.ts` / `*.test.tsx`；每个任务结束运行相关测试。
- 服务端只监听 `127.0.0.1`；不上传、不执行 shell；不连接 PowerSchool。
- 工作区 key 与 tenant 必须匹配 `^[a-z0-9][a-z0-9-]*$`，长度 ≤64。
- raw 文件上传单文件上限 10MB（测试可注入更小值）。
- `src/core` 保持纯函数：不引入文件系统、HTTP、React、租户概念。
- 浏览器不直接访问文件系统；`src/workspace` 不依赖 HTTP 或 React。
- UI 中文界面；PowerSchool 术语（PowerQuery、wildcards、MessageKeys、plugin.xml）保留英文。
- 每个任务独立提交；提交信息末尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- 完成门槛：`npm test`、`npm run typecheck`、`npm run build:web` 全部通过。

---

## 文件结构

```
src/
  core/
    spec/
      defaults.ts                  # 新建：createDefaultSpec
      navVersion.ts                # 新建：版本比较、递增、扁平化
      navVersion.test.ts           # 新建
    validate/index.ts              # 修改：指纹加入 pageId/schoolIds/extra
    index.ts                       # 修改：导出新函数
  workspace/
    errors.ts                      # 新建
    types.ts                       # 新建
    safePath.ts                    # 新建
    safePath.test.ts               # 新建
    localFsStore.ts                # 新建
    localFsStore.test.ts           # 新建
  server/
    actor.ts                       # 新建
    app.ts                         # 新建：buildServer 主体
    build.ts                       # 新建：build/ 原子写入
    index.ts                       # 修改：仅保留启动入口并 re-export
    routes/projects.ts             # 新建
    routes/projects.test.ts        # 新建
    server.test.ts                 # 保留，应继续通过
  web/
    api.ts                         # 新建：fetch 封装与类型
    app/
      App.tsx                      # 新建：路由
      ProjectLayout.tsx            # 新建：侧栏 + 顶栏 + Outlet
      ValidationDrawer.tsx         # 新建
      issueRoute.ts                # 新建
    components/
      LocalizedTextInput.tsx       # 新建
      RowEditor.tsx                # 新建
      TextField.tsx                # 新建
      SelectField.tsx              # 新建
      CheckboxField.tsx            # 新建
      JsonTextarea.tsx             # 新建
      SaveStatus.tsx               # 新建
      ConflictDialog.tsx           # 新建
      IssueList.tsx                # 新建
      IssueBadge.tsx               # 新建（Task 8）
      SectionIssues.tsx            # 新建（Task 8）
    pages/
      ProjectListPage.tsx          # 新建 + 测试
      OverviewPage.tsx             # 新建
      TablesPage.tsx               # 新建 + 测试
      PagesPage.tsx                # 新建 + 测试
      NavigationPage.tsx           # 新建 + 测试
      FilesPage.tsx                # 新建
      AdvancedPage.tsx             # 新建
      BuildPage.tsx                # 新建
    store/
      projectStore.ts              # 新建 + 测试（可并入页面测试）
    main.tsx                       # 修改：包 BrowserRouter
    styles.css                     # 修改：追加布局与表单样式
    App.tsx / App.test.tsx         # 删除，由 app/App.tsx 取代
    sample.ts                      # 删除
  .gitignore                       # 修改：加入 workspaces/
  package.json                     # 修改：依赖与 dev 脚本
  README.md                        # 修改：平台用法
```

---

### Task 1: 核心辅助函数（默认 spec、导航版本）

**Files:**
- Create: `src/core/spec/defaults.ts`
- Create: `src/core/spec/navVersion.ts`
- Create: `src/core/spec/navVersion.test.ts`
- Modify: `src/core/validate/index.ts:574-601`
- Modify: `src/core/index.ts`
- Modify: `src/core/validate/navigation.test.ts`（追加指纹测试）

**Interfaces:**
- Produces:
  - `createDefaultSpec(input: { key: string; name: string; publisher?: { name: string; email: string } }): PluginSpec`
  - `isValidNavVersion(version: string): boolean`
  - `compareNavVersion(a: string, b: string): number`
  - `bumpNavVersion(version: string): string`
  - `suggestNavVersion(entry: NavEntrySpec, baselineEntry: NavEntrySpec | undefined, defaultVersion: string): string`
  - `flattenNavigation(navigation: NavFileSpec[]): NavEntrySpec[]`
- Consumes: `navigationFingerprint`、`PluginSpec`、`NavEntrySpec`、`NavFileSpec`

- [ ] **Step 1: 写失败测试**

Create `src/core/spec/navVersion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NavEntrySpec, NavFileSpec } from './types';
import {
  bumpNavVersion,
  compareNavVersion,
  flattenNavigation,
  isValidNavVersion,
  suggestNavVersion,
} from './navVersion';
import { createDefaultSpec } from './defaults';
import { navigationFingerprint } from '../validate/index';

const base: NavEntrySpec = {
  htmlID: 'demo-link',
  title: { en: 'Demo' },
  sortOrder: 1,
  version: '1.0.0',
};

describe('suggestNavVersion', () => {
  it('returns the default for a new entry', () => {
    expect(suggestNavVersion(base, undefined, '2.0.0.0')).toBe('1.0.0');
  });

  it('keeps the version when the fingerprint is unchanged', () => {
    expect(suggestNavVersion({ ...base }, { ...base }, '2.0.0.0')).toBe('1.0.0');
  });

  it('bumps the last segment when content changes', () => {
    const changed = { ...base, title: { en: 'Changed' } };
    expect(suggestNavVersion(changed, base, '1.0.0')).toBe('1.0.1');
  });

  it('keeps a manually higher version', () => {
    const changed = { ...base, title: { en: 'Changed' }, version: '1.0.5' };
    expect(suggestNavVersion(changed, base, '1.0.0')).toBe('1.0.5');
  });

  it('carries 9 to 10 instead of string concatenation', () => {
    expect(bumpNavVersion('1.0.0.9')).toBe('1.0.0.10');
  });
});

describe('compareNavVersion', () => {
  it('treats missing segments as zero', () => {
    expect(compareNavVersion('1.0', '1.0.0')).toBe(0);
    expect(compareNavVersion('1.0.1', '1.0')).toBe(1);
    expect(compareNavVersion('0.9', '1.0')).toBe(-1);
  });
});

describe('isValidNavVersion', () => {
  it('accepts one to four numeric segments', () => {
    expect(isValidNavVersion('1')).toBe(true);
    expect(isValidNavVersion('1.2.3.4')).toBe(true);
    expect(isValidNavVersion('1.2.3.4.5')).toBe(false);
    expect(isValidNavVersion('1.a')).toBe(false);
  });
});

describe('flattenNavigation', () => {
  it('includes nested children', () => {
    const navigation: NavFileSpec[] = [
      {
        filename: 'demo.json',
        contextType: 'main',
        entries: [
          base,
          {
            htmlID: 'child',
            title: { en: 'Child' },
            sortOrder: 1,
            version: '1.0.0',
          },
        ],
      },
    ];
    expect(flattenNavigation(navigation).map((entry) => entry.htmlID)).toEqual([
      'demo-link',
      'child',
    ]);
  });
});

describe('navigationFingerprint', () => {
  it('tracks pageId, schoolIds order and extra', () => {
    const a = { ...base, pageId: 'p1', schoolIds: [2, 1] };
    const b = { ...base, pageId: 'p1', schoolIds: [1, 2] };
    expect(navigationFingerprint(a)).toBe(navigationFingerprint(b));
    expect(navigationFingerprint(a)).not.toBe(
      navigationFingerprint({ ...a, pageId: 'p2' }),
    );
    expect(navigationFingerprint(a)).not.toBe(
      navigationFingerprint({ ...a, extra: { badge: 'new' } }),
    );
  });
});

describe('createDefaultSpec', () => {
  it('creates a minimal valid draft', () => {
    const spec = createDefaultSpec({ key: 'demo', name: 'Demo' });
    expect(spec.key).toBe('demo');
    expect(spec.plugin.name).toBe('Demo');
    expect(spec.plugin.version).toBe('1.0.0');
    expect(spec.plugin.dbName).toBe('Demo DB');
    expect(spec.plugin.navVersion).toBe('1.0.0.0');
    expect(spec.tables).toEqual([]);
    expect(spec.rawFiles).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/core/spec/navVersion.test.ts`

Expected: FAIL，提示找不到 `./navVersion` / `./defaults`。

- [ ] **Step 3: 实现 `defaults.ts` 与 `navVersion.ts`**

`src/core/spec/defaults.ts`:

```ts
import type { PluginSpec } from './types';

export interface DefaultSpecInput {
  key: string;
  name: string;
  publisher?: { name: string; email: string };
}

export function createDefaultSpec(input: DefaultSpecInput): PluginSpec {
  return {
    schemaVersion: 1,
    key: input.key,
    plugin: {
      name: input.name,
      description: '',
      version: '1.0.0',
      dbName: `${input.name} DB`,
      dbDescription: `${input.name} DB`,
      dbVersion: '1.0.0',
      navVersion: '1.0.0.0',
      publisher: input.publisher ?? { name: input.name, email: '' },
    },
    tables: [],
    pages: [],
    navigation: [],
    powerQueries: [],
    accessRequest: [],
    permissionMappings: [],
    wildcards: [],
    messageKeys: [],
    rawFiles: [],
  };
}
```

`src/core/spec/navVersion.ts`:

```ts
import type { NavEntrySpec, NavFileSpec } from './types';
import { navigationFingerprint } from '../validate/index';

const VERSION_RE = /^\d+(\.\d+){0,3}$/;

export function isValidNavVersion(version: string): boolean {
  return VERSION_RE.test(version);
}

export function compareNavVersion(a: string, b: string): number {
  if (!isValidNavVersion(a) || !isValidNavVersion(b)) {
    throw new Error(`Invalid navigation version: ${a} / ${b}`);
  }
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const x = left[index] ?? 0;
    const y = right[index] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function bumpNavVersion(version: string): string {
  const parts = version.split('.');
  const last = Number(parts[parts.length - 1]);
  parts[parts.length - 1] = String(last + 1);
  return parts.join('.');
}

export function suggestNavVersion(
  entry: NavEntrySpec,
  baselineEntry: NavEntrySpec | undefined,
  defaultVersion: string,
): string {
  const current = entry.version || defaultVersion;
  if (!baselineEntry) return current;
  if (navigationFingerprint(entry) === navigationFingerprint(baselineEntry)) {
    return current;
  }
  const baselineVersion = baselineEntry.version;
  if (!baselineVersion || !isValidNavVersion(baselineVersion)) return current;
  if (
    entry.version &&
    isValidNavVersion(entry.version) &&
    compareNavVersion(entry.version, baselineVersion) > 0
  ) {
    return entry.version;
  }
  return bumpNavVersion(baselineVersion);
}

export function flattenNavigation(navigation: NavFileSpec[]): NavEntrySpec[] {
  const out: NavEntrySpec[] = [];
  const walk = (entries: NavEntrySpec[] | undefined): void => {
    for (const entry of entries ?? []) {
      out.push(entry);
      walk(entry.children);
    }
  };
  for (const file of navigation) walk(file.entries);
  return out;
}
```

- [ ] **Step 4: 扩展指纹字段**

Modify the `FINGERPRINT_FIELDS` array and `navigationFingerprint` in `src/core/validate/index.ts`:

```ts
const FINGERPRINT_FIELDS = [
  'title',
  'pageId',
  'pageURL',
  'sortOrder',
  'parentHTMLID',
  'districtLevelContext',
  'contextType',
  'requiredContext',
  'isNewTab',
  'isLandingPage',
  'checkParams',
  'schoolIds',
  'extra',
] as const;
```

```ts
export function navigationFingerprint(entry: NavigationEntryLike): string {
  const picked: Record<string, unknown> = {};
  for (const field of FINGERPRINT_FIELDS) picked[field] = entry[field];
  if (Array.isArray(picked.schoolIds)) {
    picked.schoolIds = [...picked.schoolIds].sort(
      (a, b) => Number(a) - Number(b),
    );
  }
  return stableStringify(picked);
}
```

- [ ] **Step 5: 导出新函数**

Modify `src/core/index.ts`:

```ts
export { createDefaultSpec } from './spec/defaults';
export type { DefaultSpecInput } from './spec/defaults';
export {
  bumpNavVersion,
  compareNavVersion,
  flattenNavigation,
  isValidNavVersion,
  suggestNavVersion,
} from './spec/navVersion';
```

- [ ] **Step 6: 运行测试**

Run: `npx vitest run src/core/spec/navVersion.test.ts src/core/validate`

Expected: PASS（既有导航测试也应通过）。

- [ ] **Step 7: 提交**

```bash
git add src/core/spec/defaults.ts src/core/spec/navVersion.ts src/core/spec/navVersion.test.ts src/core/validate/index.ts src/core/index.ts
git commit -m "feat: add default spec and navigation version helpers" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 工作区类型、错误与安全路径

**Files:**
- Create: `src/workspace/errors.ts`
- Create: `src/workspace/types.ts`
- Create: `src/workspace/safePath.ts`
- Create: `src/workspace/safePath.test.ts`

**Interfaces:**
- Produces:
  - `class WorkspaceError extends Error { code: WorkspaceErrorCode }`
  - `type WorkspaceErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'KEY_EXISTS' | 'KEY_INVALID' | 'PATH_UNSAFE' | 'BAD_REQUEST' | 'IO_ERROR'`
  - `assertValidKey(key: string): void`
  - `slugifyKey(name: string): string`
  - `safePath(root: string, relativePath: string): Promise<string>`
  - `ProjectRef`、`ProjectSummary`、`Project`、`CreateProjectInput`、`RawFileInfo`、`WorkspaceStore`

- [ ] **Step 1: 写失败测试**

Create `src/workspace/safePath.test.ts`:

```ts
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertValidKey, safePath, slugifyKey } from './safePath';
import { WorkspaceError } from './errors';

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ps-safe-path-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('assertValidKey', () => {
  it('accepts lowercase slug keys', () => {
    expect(() => assertValidKey('demo-plugin')).not.toThrow();
  });

  it('rejects unsafe keys', () => {
    expect(() => assertValidKey('../demo')).toThrow(WorkspaceError);
    expect(() => assertValidKey('Demo')).toThrow(WorkspaceError);
    expect(() => assertValidKey('a/b')).toThrow(WorkspaceError);
  });
});

describe('slugifyKey', () => {
  it('normalizes names', () => {
    expect(slugifyKey('Demo Plugin!')).toBe('demo-plugin');
    expect(slugifyKey('   ')).toBe('plugin');
  });
});

describe('safePath', () => {
  it('resolves a nested path inside the root', async () => {
    await mkdir(join(root, 'files'));
    await expect(safePath(root, 'files/a.txt')).resolves.toBe(
      join(root, 'files/a.txt'),
    );
  });

  it('rejects traversal and absolute paths', async () => {
    await expect(safePath(root, '../evil')).rejects.toThrow(WorkspaceError);
    await expect(safePath(root, '/etc/passwd')).rejects.toThrow(WorkspaceError);
    await expect(safePath(root, 'a\\b')).rejects.toThrow(WorkspaceError);
    await expect(safePath(root, 'a/./b')).rejects.toThrow(WorkspaceError);
  });

  it('rejects symlink segments', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'ps-outside-'));
    await writeFile(join(outside, 'secret.txt'), 'secret');
    await symlink(outside, join(root, 'link'));
    await expect(safePath(root, 'link/secret.txt')).rejects.toThrow(
      WorkspaceError,
    );
    await rm(outside, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/workspace/safePath.test.ts`

Expected: FAIL，找不到 `./safePath` / `./errors`。

- [ ] **Step 3: 实现错误与类型**

`src/workspace/errors.ts`:

```ts
export type WorkspaceErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'KEY_EXISTS'
  | 'KEY_INVALID'
  | 'PATH_UNSAFE'
  | 'BAD_REQUEST'
  | 'IO_ERROR';

export class WorkspaceError extends Error {
  constructor(
    public readonly code: WorkspaceErrorCode,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}
```

`src/workspace/types.ts`:

```ts
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
```

- [ ] **Step 4: 实现 `safePath.ts`**

```ts
import { lstat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { WorkspaceError } from './errors';

export const KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key) || key.length > 64) {
    throw new WorkspaceError('KEY_INVALID', `Invalid project key: ${key}`);
  }
}

export function slugifyKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'plugin';
}

export async function safePath(
  root: string,
  relativePath: string,
): Promise<string> {
  if (
    !relativePath ||
    relativePath.includes('\0') ||
    relativePath.includes('\\') ||
    isAbsolute(relativePath) ||
    /^[A-Za-z]:/.test(relativePath)
  ) {
    throw new WorkspaceError('PATH_UNSAFE', `Unsafe path: ${relativePath}`);
  }

  const segments = relativePath.split('/');
  if (
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..',
    )
  ) {
    throw new WorkspaceError('PATH_UNSAFE', `Unsafe path: ${relativePath}`);
  }

  const resolvedRoot = resolve(root);
  const resolved = resolve(resolvedRoot, relativePath);
  const rel = relative(resolvedRoot, resolved);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new WorkspaceError('PATH_UNSAFE', `Unsafe path: ${relativePath}`);
  }

  let current = resolvedRoot;
  for (const segment of segments) {
    current = resolve(current, segment);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) {
        throw new WorkspaceError(
          'PATH_UNSAFE',
          `Symlink is not allowed: ${relativePath}`,
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }

  return resolved;
}
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run src/workspace/safePath.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/workspace/errors.ts src/workspace/types.ts src/workspace/safePath.ts src/workspace/safePath.test.ts
git commit -m "feat: add workspace types and safe path handling" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: LocalFsWorkspaceStore — 工程 CRUD 与 spec 读写

**Files:**
- Create: `src/workspace/localFsStore.ts`
- Create: `src/workspace/localFsStore.test.ts`

**Interfaces:**
- Consumes: `WorkspaceStore`、`createDefaultSpec`、`assertValidKey`、`slugifyKey`、`WorkspaceError`
- Produces: `class LocalFsWorkspaceStore implements WorkspaceStore { constructor(root: string) }`

- [ ] **Step 1: 写失败测试（CRUD 与 revision）**

Create `src/workspace/localFsStore.test.ts`:

```ts
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalFsWorkspaceStore } from './localFsStore';
import { WorkspaceError } from './errors';

let root = '';
let store: LocalFsWorkspaceStore;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ps-workspace-'));
  store = new LocalFsWorkspaceStore(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('project CRUD', () => {
  it('creates, lists and reads a project', async () => {
    const project = await store.create('local', { name: 'Demo Plugin' });
    expect(project.key).toBe('demo-plugin');
    expect(project.revision).toBe(1);

    const list = await store.list('local');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      key: 'demo-plugin',
      name: 'Demo Plugin',
      version: '1.0.0',
    });

    const read = await store.readSpec({
      tenant: 'local',
      key: 'demo-plugin',
    });
    expect((read.spec as { plugin: { name: string } }).plugin.name).toBe(
      'Demo Plugin',
    );
    expect(read.revision).toBe(1);
  });

  it('appends a suffix when the slug already exists', async () => {
    const first = await store.create('local', { name: 'Demo Plugin' });
    const second = await store.create('local', { name: 'Demo Plugin' });
    expect(first.key).toBe('demo-plugin');
    expect(second.key).toBe('demo-plugin-2');
  });

  it('rejects an explicit duplicate key', async () => {
    await store.create('local', { key: 'demo', name: 'Demo' });
    await expect(
      store.create('local', { key: 'demo', name: 'Other' }),
    ).rejects.toMatchObject({ code: 'KEY_EXISTS' });
  });

  it('removes a project and returns NOT_FOUND afterwards', async () => {
    await store.create('local', { name: 'Demo' });
    await store.remove({ tenant: 'local', key: 'demo' });
    await expect(
      store.get({ tenant: 'local', key: 'demo' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('spec writes', () => {
  it('increments revision and persists the spec', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    const current = (await store.readSpec(ref)).spec as {
      plugin: Record<string, unknown>;
    } & Record<string, unknown>;
    const spec = {
      ...current,
      plugin: { ...current.plugin, description: 'Updated' },
    };

    const result = await store.writeSpec(ref, spec, 1);
    expect(result.revision).toBe(2);

    const stored = JSON.parse(
      await readFile(join(root, 'local', project.key, 'plugin.json'), 'utf8'),
    );
    expect(stored.plugin.description).toBe('Updated');
  });

  it('rejects a stale revision without writing', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    const { spec } = await store.readSpec(ref);
    await store.writeSpec(ref, spec, 1);

    await expect(store.writeSpec(ref, spec, 1)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    const projectFile = JSON.parse(
      await readFile(join(root, 'local', project.key, 'project.json'), 'utf8'),
    );
    expect(projectFile.revision).toBe(2);
  });

  it('rejects a spec whose key does not match the project', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    const { spec } = await store.readSpec(ref);
    await expect(
      store.writeSpec(ref, { ...(spec as object), key: 'other' }, 1),
    ).rejects.toBeInstanceOf(WorkspaceError);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/workspace/localFsStore.test.ts`

Expected: FAIL，找不到 `./localFsStore`。

- [ ] **Step 3: 实现工程部分**

Create `src/workspace/localFsStore.ts`。本任务实现工程 CRUD、spec 与互斥锁；raw 文件与导航基准方法在下一任务补上，届时类再声明 `implements WorkspaceStore`。

```ts
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { createDefaultSpec, type PluginSpec } from '../core/index';
import { WorkspaceError } from './errors';
import { assertValidKey, safePath, slugifyKey } from './safePath';
import type {
  CreateProjectInput,
  Project,
  ProjectRef,
  ProjectSummary,
} from './types';

async function writeAtomic(
  target: string,
  data: string | Uint8Array,
): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const temp = join(
    dirname(target),
    `.${basename(target)}.tmp-${randomUUID()}`,
  );
  await writeFile(temp, data);
  await rename(temp, target);
}

export class LocalFsWorkspaceStore {
  private readonly locks = new Map<string, Promise<void>>();

  constructor(private readonly root: string) {}

  private tenantDir(tenant: string): string {
    assertValidKey(tenant);
    return resolve(this.root, tenant);
  }

  private projectDir(ref: ProjectRef): string {
    assertValidKey(ref.tenant);
    assertValidKey(ref.key);
    return resolve(this.tenantDir(ref.tenant), ref.key);
  }

  private async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.locks.get(lockKey) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate;
    });
    const queued = previous.then(() => gate);
    this.locks.set(lockKey, queued);
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(lockKey) === queued) this.locks.delete(lockKey);
    }
  }

  private async uniqueKey(tenant: string, base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    for (;;) {
      try {
        await readFile(join(this.tenantDir(tenant), candidate, 'project.json'));
        candidate = `${base}-${suffix}`;
        suffix += 1;
      } catch {
        return candidate;
      }
    }
  }

  async list(tenant: string): Promise<ProjectSummary[]> {
    const dir = this.tenantDir(tenant);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }

    const out: ProjectSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const key = entry.name;
      try {
        const project = await this.get({ tenant, key });
        const spec = JSON.parse(
          await readFile(join(this.projectDir({ tenant, key }), 'plugin.json'), 'utf8'),
        ) as PluginSpec;
        out.push({
          key,
          name: spec.plugin?.name ?? key,
          version: spec.plugin?.version ?? '',
          updatedAt: project.updatedAt,
        });
      } catch {
        // Skip corrupt or partially written projects.
      }
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async create(
    tenant: string,
    input: CreateProjectInput,
  ): Promise<Project> {
    assertValidKey(tenant);
    if (!input.name.trim()) {
      throw new WorkspaceError('BAD_REQUEST', 'Project name is required.');
    }

    let key: string;
    if (input.key !== undefined) {
      assertValidKey(input.key);
      try {
        await readFile(join(this.tenantDir(tenant), input.key, 'project.json'));
        throw new WorkspaceError('KEY_EXISTS', `Project already exists: ${input.key}`);
      } catch (error) {
        if (error instanceof WorkspaceError) throw error;
      }
      key = input.key;
    } else {
      key = await this.uniqueKey(tenant, slugifyKey(input.name));
    }

    const dir = this.projectDir({ tenant, key });
    await mkdir(this.tenantDir(tenant), { recursive: true });
    try {
      await mkdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new WorkspaceError('KEY_EXISTS', `Project already exists: ${key}`);
      }
      throw error;
    }

    const now = new Date().toISOString();
    const project: Project = {
      key,
      tenant,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    const spec = createDefaultSpec({
      key,
      name: input.name,
      publisher: input.publisher,
    });

    await writeAtomic(join(dir, 'plugin.json'), `${JSON.stringify(spec, null, 2)}\n`);
    await mkdir(join(dir, 'files'), { recursive: true });
    await writeAtomic(join(dir, 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
    return project;
  }

  async get(ref: ProjectRef): Promise<Project> {
    const target = join(this.projectDir(ref), 'project.json');
    let raw: string;
    try {
      raw = await readFile(target, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceError('NOT_FOUND', `Project not found: ${ref.key}`);
      }
      throw error;
    }
    const project = JSON.parse(raw) as Project;
    if (project.key !== ref.key || project.tenant !== ref.tenant) {
      throw new WorkspaceError('IO_ERROR', `Project metadata mismatch: ${ref.key}`);
    }
    return project;
  }

  async remove(ref: ProjectRef): Promise<void> {
    try {
      await rm(this.projectDir(ref), { recursive: true, force: false });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceError('NOT_FOUND', `Project not found: ${ref.key}`);
      }
      throw error;
    }
  }

  async readSpec(ref: ProjectRef): Promise<{
    spec: unknown;
    revision: number;
    updatedAt: string;
  }> {
    const project = await this.get(ref);
    const raw = await readFile(
      join(this.projectDir(ref), 'plugin.json'),
      'utf8',
    );
    return {
      spec: JSON.parse(raw),
      revision: project.revision,
      updatedAt: project.updatedAt,
    };
  }

  async writeSpec(
    ref: ProjectRef,
    spec: unknown,
    expectedRevision: number,
  ): Promise<{ revision: number; updatedAt: string }> {
    return this.withLock(`${ref.tenant}/${ref.key}`, async () => {
      if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
        throw new WorkspaceError('BAD_REQUEST', 'Spec must be an object.');
      }
      const project = await this.get(ref);
      if (project.revision !== expectedRevision) {
        throw new WorkspaceError(
          'CONFLICT',
          `Revision conflict: expected ${expectedRevision}, found ${project.revision}`,
          [{ revision: project.revision }],
        );
      }
      const specKey = (spec as { key?: unknown }).key;
      if (specKey !== undefined && specKey !== ref.key) {
        throw new WorkspaceError(
          'KEY_INVALID',
          `Spec key must match the project key: ${ref.key}`,
        );
      }

      const now = new Date().toISOString();
      await writeAtomic(
        join(this.projectDir(ref), 'plugin.json'),
        `${JSON.stringify(spec, null, 2)}\n`,
      );
      const next: Project = {
        ...project,
        revision: project.revision + 1,
        updatedAt: now,
      };
      await writeAtomic(
        join(this.projectDir(ref), 'project.json'),
        `${JSON.stringify(next, null, 2)}\n`,
      );
      return { revision: next.revision, updatedAt: now };
    });
  }

  buildDir(ref: ProjectRef): string {
    return join(this.projectDir(ref), 'build');
  }
}
```

Note: unused `safePath` import will be used in Task 4; keep it to avoid another edit, but TypeScript `noUnusedLocals` is not enabled, so it is fine.

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/workspace/localFsStore.test.ts`

Expected: PASS（本任务的测试只覆盖工程 CRUD 与 spec）。

- [ ] **Step 5: 提交**

```bash
git add src/workspace/localFsStore.ts src/workspace/localFsStore.test.ts
git commit -m "feat: add local filesystem workspace store for projects and specs" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: LocalFsWorkspaceStore — raw 文件与导航基准

**Files:**
- Modify: `src/workspace/localFsStore.ts`
- Modify: `src/workspace/localFsStore.test.ts`

**Interfaces:**
- Produces:
  - `listFiles(ref)`：递归返回 `files/` 下文件，跳过符号链接，按 path 排序。
  - `readFile(ref, path)` / `writeFile(ref, path, bytes)` / `deleteFile(ref, path)`：路径经 `safePath`；拒绝 `build/`、`state/` 前缀。
  - `readNavBaseline(ref)` / `writeNavBaseline(ref, nav)`：读写 `state/nav-baseline.json`。

- [ ] **Step 1: 追加失败测试**

Append to `src/workspace/localFsStore.test.ts`:

```ts
describe('raw files', () => {
  it('writes, lists, reads and deletes files', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };

    await store.writeFile(ref, 'api/web_root/scripts/a.js', new Uint8Array([1, 2, 3]));
    await store.writeFile(ref, 'api/web_root/images/logo.png', new Uint8Array([4]));

    const files = await store.listFiles(ref);
    expect(files.map((file) => file.path)).toEqual([
      'api/web_root/images/logo.png',
      'api/web_root/scripts/a.js',
    ]);
    expect(files[1].size).toBe(3);
    expect(Array.from(await store.readFile(ref, 'api/web_root/scripts/a.js'))).toEqual([1, 2, 3]);

    await store.deleteFile(ref, 'api/web_root/scripts/a.js');
    expect((await store.listFiles(ref)).map((file) => file.path)).toEqual([
      'api/web_root/images/logo.png',
    ]);
  });

  it('rejects unsafe paths and reserved prefixes', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    await expect(store.writeFile(ref, '../evil', new Uint8Array())).rejects.toMatchObject({
      code: 'PATH_UNSAFE',
    });
    await expect(store.writeFile(ref, 'build/x', new Uint8Array())).rejects.toMatchObject({
      code: 'PATH_UNSAFE',
    });
  });
});

describe('navigation baseline', () => {
  it('returns null before the first build and round-trips entries', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    expect(await store.readNavBaseline(ref)).toBeNull();

    const entries = [
      {
        htmlID: 'demo',
        title: { en: 'Demo' },
        sortOrder: 1,
        version: '1.0.0',
      },
    ];
    await store.writeNavBaseline(ref, entries);
    expect(await store.readNavBaseline(ref)).toEqual(entries);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/workspace/localFsStore.test.ts`

Expected: FAIL，`listFiles` / `readNavBaseline` 尚未定义。

- [ ] **Step 3: 实现文件与基准方法**

在 `src/workspace/localFsStore.ts` 中补上文件与基准方法，并让类实现接口。先把类声明改为：

```ts
export class LocalFsWorkspaceStore implements WorkspaceStore {
```

把 `WorkspaceStore` 与 `NavEntrySpec` 加入类型导入：

```ts
import type { NavEntrySpec } from '../core/index';
import type {
  CreateProjectInput,
  Project,
  ProjectRef,
  ProjectSummary,
  RawFileInfo,
  WorkspaceStore,
} from './types';
```

然后加入以下方法：

```ts
  private filesDir(ref: ProjectRef): string {
    return join(this.projectDir(ref), 'files');
  }

  private assertRawPath(path: string): void {
    if (
      path === 'build' ||
      path.startsWith('build/') ||
      path === 'state' ||
      path.startsWith('state/') ||
      path === 'plugin.json' ||
      path === 'project.json'
    ) {
      throw new WorkspaceError('PATH_UNSAFE', `Reserved raw path: ${path}`);
    }
  }

  async listFiles(ref: ProjectRef): Promise<RawFileInfo[]> {
    await this.get(ref);
    const out: RawFileInfo[] = [];
    const walk = async (dir: string, prefix: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walk(join(dir, entry.name), rel);
        } else if (entry.isFile()) {
          const info = await stat(join(dir, entry.name));
          out.push({
            path: rel,
            size: info.size,
            updatedAt: info.mtime.toISOString(),
          });
        }
      }
    };
    await walk(this.filesDir(ref), '');
    out.sort((a, b) => a.path.localeCompare(b.path));
    return out;
  }

  async readFile(ref: ProjectRef, path: string): Promise<Uint8Array> {
    await this.get(ref);
    this.assertRawPath(path);
    const target = await safePath(this.filesDir(ref), path);
    try {
      return new Uint8Array(await readFile(target));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceError('NOT_FOUND', `File not found: ${path}`);
      }
      throw error;
    }
  }

  async writeFile(
    ref: ProjectRef,
    path: string,
    bytes: Uint8Array,
  ): Promise<void> {
    await this.get(ref);
    this.assertRawPath(path);
    await mkdir(this.filesDir(ref), { recursive: true });
    const target = await safePath(this.filesDir(ref), path);
    await writeAtomic(target, bytes);
  }

  async deleteFile(ref: ProjectRef, path: string): Promise<void> {
    await this.get(ref);
    this.assertRawPath(path);
    const target = await safePath(this.filesDir(ref), path);
    try {
      await rm(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceError('NOT_FOUND', `File not found: ${path}`);
      }
      throw error;
    }
  }

  async readNavBaseline(ref: ProjectRef): Promise<NavEntrySpec[] | null> {
    const target = join(this.projectDir(ref), 'state', 'nav-baseline.json');
    try {
      const parsed = JSON.parse(
        await readFile(target, 'utf8'),
      ) as { entries?: NavEntrySpec[] };
      return Array.isArray(parsed.entries) ? parsed.entries : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async writeNavBaseline(
    ref: ProjectRef,
    nav: NavEntrySpec[],
  ): Promise<void> {
    await writeAtomic(
      join(this.projectDir(ref), 'state', 'nav-baseline.json'),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), entries: nav }, null, 2)}\n`,
    );
  }
```

Add `stat` to the existing `node:fs/promises` import at the top of the file:

```ts
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
```

`PluginSpec` 已在 Task 3 导入；本任务按上面的代码补上 `NavEntrySpec`、`RawFileInfo` 与 `WorkspaceStore`，不要重复 `PluginSpec`。

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/workspace/localFsStore.test.ts`

Expected: PASS。

- [ ] **Step 5: 类型检查**

Run: `npm run typecheck`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/workspace/localFsStore.ts src/workspace/localFsStore.test.ts
git commit -m "feat: add raw file and navigation baseline storage" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 服务端工程路由（CRUD、spec、校验）

**Files:**
- Create: `src/server/actor.ts`
- Create: `src/server/app.ts`
- Modify: `src/server/index.ts`
- Create: `src/server/routes/projects.ts`
- Create: `src/server/routes/projects.test.ts`

**Interfaces:**
- Produces:
  - `interface Actor { tenant: string; role: 'owner' | 'editor' | 'viewer' }`
  - `resolveActor(request: unknown): Actor`
  - `buildServer(options?: ServerOptions): FastifyInstance`
  - `registerProjectRoutes(app, deps)`
- Consumes: `LocalFsWorkspaceStore`、`validateSpec`、`WorkspaceError`、`ProjectRef`

- [ ] **Step 1: 安装 multipart 依赖**

Run:

```bash
npm install @fastify/multipart
```

- [ ] **Step 2: 写失败测试（CRUD、409、validate）**

Create `src/server/routes/projects.test.ts`:

```ts
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../app';
import type { FastifyInstance } from 'fastify';
import { createDefaultSpec } from '../../core/index';

let dir = '';
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ps-server-'));
  app = buildServer({ workspacesDir: dir, maxFileBytes: 64 });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

async function createProject(key = 'demo', name = 'Demo Plugin') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { key, name },
  });
  expect(response.statusCode).toBe(201);
  return response.json() as {
    project: { key: string; revision: number };
    spec: { key: string };
  };
}

describe('project routes', () => {
  it('creates and lists projects', async () => {
    await createProject();
    const response = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(response.statusCode).toBe(200);
    expect(response.json().projects).toHaveLength(1);
    expect(response.json().projects[0].key).toBe('demo');
  });

  it('reads a project with its spec and baseline', async () => {
    await createProject();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/demo',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.project.key).toBe('demo');
    expect(body.spec.plugin.name).toBe('Demo Plugin');
    expect(body.navBaseline).toBeNull();
  });

  it('returns 404 for an unknown project', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/missing',
    });
    expect(response.statusCode).toBe(404);
  });

  it('rejects a stale revision with 409', async () => {
    const { spec } = await createProject();
    const first = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: 1 },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().revision).toBe(2);

    const second = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: 1 },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('CONFLICT');
  });

  it('validates the stored spec', async () => {
    const created = await createProject();
    const invalid = createDefaultSpec({ key: 'demo', name: 'Demo Plugin' });
    invalid.pages.push({
      id: 'p1',
      kind: 'custom',
      context: 'student',
      path: 'students/foo.html',
      title: { en: 'Foo' },
    });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec: invalid, revision: created.project.revision },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/validate',
    });
    expect(response.statusCode).toBe(200);
    expect(
      response.json().issues.map((issue: { code: string }) => issue.code),
    ).toContain('PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN');
  });

  it('deletes a project', async () => {
    await createProject();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/projects/demo',
    });
    expect(response.statusCode).toBe(204);
    const list = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(list.json().projects).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run src/server/routes/projects.test.ts`

Expected: FAIL，找不到 `../app` / 路由。

- [ ] **Step 4: 实现 actor 与 app**

`src/server/actor.ts`:

```ts
export interface Actor {
  tenant: string;
  role: 'owner' | 'editor' | 'viewer';
}

export function resolveActor(_request: unknown): Actor {
  return { tenant: 'local', role: 'owner' };
}
```

`src/server/app.ts`:

```ts
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import { validateSpec } from '../core/index';
import { LocalFsWorkspaceStore } from '../workspace/localFsStore';
import type { WorkspaceStore } from '../workspace/types';
import { resolveActor, type Actor } from './actor';
import { registerProjectRoutes } from './routes/projects';

export interface ServerOptions {
  workspacesDir?: string;
  store?: WorkspaceStore;
  actor?: (request: unknown) => Actor;
  maxFileBytes?: number;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const workspacesDir =
    options.workspacesDir ??
    process.env.WORKSPACES_DIR ??
    resolve(process.cwd(), 'workspaces');
  const store = options.store ?? new LocalFsWorkspaceStore(workspacesDir);
  const actor = options.actor ?? resolveActor;
  const maxFileBytes = options.maxFileBytes ?? 10 * 1024 * 1024;

  app.register(multipart, { limits: { fileSize: maxFileBytes } });

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/validate', async (request, reply) => {
    const body = request.body as
      | { spec?: unknown; previousNavigation?: unknown[] }
      | undefined;
    if (!body || body.spec === undefined) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'Body must include a spec.' },
      });
    }
    const issues = validateSpec(body.spec, {
      previousNavigation: body.previousNavigation as never,
    });
    return {
      issues,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    };
  });

  registerProjectRoutes(app, { store, actor, maxFileBytes });

  const here = dirname(fileURLToPath(import.meta.url));
  const webRoot = resolve(here, '../../dist/web');
  if (existsSync(webRoot)) {
    app.register(fastifyStatic, { root: webRoot, wildcard: false });
  }

  return app;
}
```

`src/server/index.ts`:

```ts
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildServer } from './app';

export { buildServer } from './app';

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const app = buildServer();
  app
    .listen({ port: 5174, host: '127.0.0.1' })
    .then(() => console.log('Plugin platform API listening on http://127.0.0.1:5174'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
```

- [ ] **Step 5: 实现工程路由**

`src/server/routes/projects.ts`:

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateSpec } from '../../core/index';
import { WorkspaceError } from '../../workspace/errors';
import type { ProjectRef, WorkspaceStore } from '../../workspace/types';
import type { Actor } from '../actor';

export interface ProjectRouteDeps {
  store: WorkspaceStore;
  actor: (request: unknown) => Actor;
  maxFileBytes: number;
}

function isPublisher(
  value: unknown,
): value is { name: string; email: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string' &&
    typeof (value as { email?: unknown }).email === 'string'
  );
}

export function sendWorkspaceError(
  reply: FastifyReply,
  error: unknown,
): FastifyReply {
  if (error instanceof WorkspaceError) {
    const status: Record<WorkspaceError['code'], number> = {
      NOT_FOUND: 404,
      CONFLICT: 409,
      KEY_EXISTS: 409,
      KEY_INVALID: 400,
      PATH_UNSAFE: 400,
      BAD_REQUEST: 400,
      IO_ERROR: 500,
    };
    return reply.code(status[error.code]).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? [],
      },
    });
  }
  return reply.code(500).send({
    error: {
      code: 'IO_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  });
}

export function registerProjectRoutes(
  app: FastifyInstance,
  deps: ProjectRouteDeps,
): void {
  const refOf = (request: FastifyRequest, key: string): ProjectRef => ({
    tenant: deps.actor(request).tenant,
    key,
  });

  app.get('/api/projects', async (request) => {
    const tenant = deps.actor(request).tenant;
    return { projects: await deps.store.list(tenant) };
  });

  app.post('/api/projects', async (request, reply) => {
    const body = request.body as
      | { key?: unknown; name?: unknown; publisher?: unknown }
      | undefined;
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'name is required.' },
      });
    }
    try {
      const tenant = deps.actor(request).tenant;
      const project = await deps.store.create(tenant, {
        key: typeof body.key === 'string' ? body.key : undefined,
        name: body.name,
        publisher: isPublisher(body.publisher) ? body.publisher : undefined,
      });
      const { spec } = await deps.store.readSpec({
        tenant,
        key: project.key,
      });
      return reply.code(201).send({ project, spec });
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.get('/api/projects/:key', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      const project = await deps.store.get(ref);
      const { spec } = await deps.store.readSpec(ref);
      const navBaseline = await deps.store.readNavBaseline(ref);
      return { project, spec, navBaseline };
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.put('/api/projects/:key/spec', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const body = request.body as
      | { spec?: unknown; revision?: unknown }
      | undefined;
    if (!body || body.spec === undefined || typeof body.revision !== 'number') {
      return reply.code(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: 'Body must include spec and numeric revision.',
        },
      });
    }
    try {
      return await deps.store.writeSpec(ref, body.spec, body.revision);
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.delete('/api/projects/:key', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      await deps.store.remove(ref);
      return reply.code(204).send();
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.post('/api/projects/:key/validate', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      const { spec } = await deps.store.readSpec(ref);
      const navBaseline = await deps.store.readNavBaseline(ref);
      const issues = validateSpec(spec, {
        previousNavigation: (navBaseline ?? undefined) as never,
      });
      return {
        issues,
        errors: issues.filter((issue) => issue.severity === 'error').length,
        warnings: issues.filter((issue) => issue.severity === 'warning').length,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        const issues = [
          {
            severity: 'error' as const,
            code: 'SPEC_INVALID',
            message: 'plugin.json is not valid JSON.',
          },
        ];
        return { issues, errors: 1, warnings: 0 };
      }
      return sendWorkspaceError(reply, error);
    }
  });
}
```

- [ ] **Step 6: 运行测试与类型检查**

Run:
```bash
npx vitest run src/server
npm run typecheck
```

Expected: PASS（既有 `server.test.ts` 也应通过）。

- [ ] **Step 7: 提交**

```bash
git add package.json package-lock.json src/server/actor.ts src/server/app.ts src/server/index.ts src/server/routes/projects.ts src/server/routes/projects.test.ts
git commit -m "feat: add project CRUD, spec and validation API" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: 生成、下载与 raw 上传

**Files:**
- Create: `src/server/build.ts`
- Modify: `src/server/routes/projects.ts`
- Modify: `src/server/routes/projects.test.ts`

**Interfaces:**
- Produces:
  - `writeBuildAtomically(buildDir: string, files: GeneratedFile[], zips?: Record<ZipArtifact, Uint8Array>): Promise<void>`
  - `POST /api/projects/:key/generate` → `{ files, artifacts, warnings, navBaseline }`
  - `GET /api/projects/:key/download/:artifact`
  - `GET/PUT/DELETE /api/projects/:key/files`

- [ ] **Step 1: 追加失败测试**

Append to `src/server/routes/projects.test.ts`:

```ts
import { unzipSync } from 'fflate';

function multipartBody(
  boundary: string,
  filename: string,
  content: string,
): string {
  return [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    'Content-Type: application/octet-stream',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

describe('generate and download', () => {
  it('refuses to generate while validation has errors', async () => {
    const created = await createProject();
    const invalid = createDefaultSpec({ key: 'demo', name: 'Demo Plugin' });
    invalid.pages.push({
      id: 'p1',
      kind: 'custom',
      context: 'student',
      path: 'students/foo.html',
      title: { en: 'Foo' },
    });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec: invalid, revision: created.project.revision },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/generate',
      payload: {},
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_FAILED');
  });

  it('generates build output, baseline and a downloadable zip', async () => {
    const created = await createProject();
    const spec = createDefaultSpec({
      key: 'demo',
      name: 'Demo Plugin',
      publisher: { name: 'P', email: 'p@example.com' },
    });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: created.project.revision },
    });

    const generated = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/generate',
      payload: {},
    });
    expect(generated.statusCode).toBe(200);
    const body = generated.json();
    expect(body.files).toContain('api/plugin.xml');
    expect(body.artifacts).toEqual({ api: true, dbsetup: true, combined: true });
    expect(body.navBaseline).toEqual([]);

    const download = await app.inject({
      method: 'GET',
      url: '/api/projects/demo/download/combined',
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers['content-disposition']).toContain(
      'demo-combined.zip',
    );
    const entries = unzipSync(new Uint8Array(download.rawPayload));
    expect(Object.keys(entries)).toContain('plugin.xml');
  });

  it('returns BUILD_MISSING before the first build', async () => {
    await createProject();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/demo/download/combined',
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('BUILD_MISSING');
  });
});

describe('raw files API', () => {
  it('uploads, lists and deletes a raw file', async () => {
    await createProject();
    const boundary = '----ps-test';
    const upload = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=api/web_root/scripts/a.js',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'a.js', 'console.log(1);'),
    });
    expect(upload.statusCode).toBe(201);
    expect(upload.json().file.path).toBe('api/web_root/scripts/a.js');

    const list = await app.inject({
      method: 'GET',
      url: '/api/projects/demo/files',
    });
    expect(list.json().files).toHaveLength(1);

    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/projects/demo/files?path=api/web_root/scripts/a.js',
    });
    expect(deleted.statusCode).toBe(204);
  });

  it('rejects unsafe paths and oversized uploads', async () => {
    await createProject();
    const boundary = '----ps-test';
    const unsafe = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=../evil',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'evil', 'x'),
    });
    expect(unsafe.statusCode).toBe(400);

    const tooLarge = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=big.bin',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'big.bin', 'x'.repeat(65)),
    });
    expect(tooLarge.statusCode).toBe(413);
  });

  it('includes referenced raw files in the generated build', async () => {
    const created = await createProject();
    const boundary = '----ps-test';
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=api/web_root/scripts/a.js',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'a.js', 'console.log(1);'),
    });

    const spec = createDefaultSpec({
      key: 'demo',
      name: 'Demo Plugin',
      publisher: { name: 'P', email: 'p@example.com' },
    });
    spec.rawFiles.push({ path: 'api/web_root/scripts/a.js' });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: created.project.revision },
    });

    const generated = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/generate',
      payload: {},
    });
    expect(generated.statusCode).toBe(200);
    expect(generated.json().files).toContain(
      'api/web_root/scripts/a.js',
    );
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/server/routes/projects.test.ts`

Expected: FAIL，生成/下载/文件路由 404。

- [ ] **Step 3: 实现 `build.ts`**

`src/server/build.ts`:

```ts
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { GeneratedFile, ZipArtifact } from '../core/index';
import { safePath } from '../workspace/safePath';

export async function writeBuildAtomically(
  buildDir: string,
  files: GeneratedFile[],
  zips?: Record<ZipArtifact, Uint8Array>,
): Promise<void> {
  const parent = dirname(buildDir);
  await mkdir(parent, { recursive: true });
  const temp = await mkdtemp(join(parent, '.build-tmp-'));
  let backup: string | undefined;

  try {
    for (const file of files) {
      const target = await safePath(temp, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }
    if (zips) {
      for (const [artifact, bytes] of Object.entries(zips)) {
        await writeFile(join(temp, `${artifact}.zip`), bytes);
      }
    }

    backup = `${buildDir}.old-${Date.now()}`;
    try {
      await rename(buildDir, backup);
    } catch (error) {
      backup = undefined;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await rename(temp, buildDir);
    if (backup) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(temp, { recursive: true, force: true });
    if (backup) {
      await rename(backup, buildDir).catch(() => undefined);
    }
    throw error;
  }
}
```

- [ ] **Step 4: 实现生成、下载、文件路由**

Add these imports to `src/server/routes/projects.ts`:

```ts
import { access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import {
  buildZip,
  flattenNavigation,
  generatePlan,
  validateOutput,
  type PluginSpec,
  type ValidationIssue,
  type ZipArtifact,
} from '../../core/index';
import { writeBuildAtomically } from '../build';
```

Append inside `registerProjectRoutes`:

```ts
  app.post('/api/projects/:key/generate', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const body = request.body as { zip?: unknown } | undefined;
    const withZip = body?.zip !== false;

    try {
      const { spec: rawSpec } = await deps.store.readSpec(ref);
      const specIssues = validateSpec(rawSpec);
      if (specIssues.some((issue) => issue.severity === 'error')) {
        return reply.code(422).send({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Spec validation failed.',
            details: specIssues,
          },
        });
      }

      const spec = rawSpec as PluginSpec;
      const rawFiles = new Map<string, Uint8Array>();
      const missing: ValidationIssue[] = [];
      for (const raw of spec.rawFiles) {
        try {
          rawFiles.set(raw.path, await deps.store.readFile(ref, raw.path));
        } catch {
          missing.push({
            severity: 'error',
            code: 'RAW_FILE_MISSING',
            message: `Raw file is missing: ${raw.path}`,
            path: raw.path,
          });
        }
      }
      if (missing.length) {
        return reply.code(422).send({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Raw files are missing.',
            details: missing,
          },
        });
      }

      const files = generatePlan(spec, { rawFiles });
      const zips = withZip
        ? {
            api: buildZip(files, 'api'),
            dbsetup: buildZip(files, 'dbsetup'),
            combined: buildZip(files, 'combined'),
          }
        : undefined;
      const outputIssues = validateOutput(files, { zip: zips?.combined });
      const issues = [...specIssues, ...outputIssues];
      if (issues.some((issue) => issue.severity === 'error')) {
        return reply.code(422).send({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Output validation failed.',
            details: issues,
          },
        });
      }

      await writeBuildAtomically(deps.store.buildDir(ref), files, zips);
      const navBaseline = flattenNavigation(spec.navigation);
      await deps.store.writeNavBaseline(ref, navBaseline);

      return {
        files: files.map((file) => file.path),
        artifacts: { api: withZip, dbsetup: withZip, combined: withZip },
        warnings: issues.filter((issue) => issue.severity === 'warning'),
        navBaseline,
      };
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.get('/api/projects/:key/download/:artifact', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const artifact = (request.params as { artifact: string })
      .artifact as ZipArtifact;
    if (!['api', 'dbsetup', 'combined'].includes(artifact)) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Unknown artifact.' },
      });
    }
    try {
      await deps.store.get(ref);
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
    const target = join(deps.store.buildDir(ref), `${artifact}.zip`);
    try {
      await access(target);
    } catch {
      return reply.code(409).send({
        error: { code: 'BUILD_MISSING', message: 'Run generate first.' },
      });
    }
    reply.header(
      'Content-Disposition',
      `attachment; filename="${ref.key}-${artifact}.zip"`,
    );
    reply.type('application/zip');
    return reply.send(createReadStream(target));
  });

  app.get('/api/projects/:key/files', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    try {
      return { files: await deps.store.listFiles(ref) };
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });

  app.put('/api/projects/:key/files', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const path = (request.query as { path?: string }).path;
    if (!path) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'path query is required.' },
      });
    }
    try {
      const upload = await request.file();
      if (!upload) {
        return reply.code(400).send({
          error: { code: 'BAD_REQUEST', message: 'file is required.' },
        });
      }
      const bytes = await upload.toBuffer();
      await deps.store.writeFile(ref, path, bytes);
      const files = await deps.store.listFiles(ref);
      const file = files.find((entry) => entry.path === path) ?? {
        path,
        size: bytes.length,
        updatedAt: new Date().toISOString(),
      };
      return reply.code(201).send({ file });
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.code(413).send({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File exceeds ${deps.maxFileBytes} bytes.`,
          },
        });
      }
      return sendWorkspaceError(reply, error);
    }
  });

  app.delete('/api/projects/:key/files', async (request, reply) => {
    const ref = refOf(request, (request.params as { key: string }).key);
    const path = (request.query as { path?: string }).path;
    if (!path) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'path query is required.' },
      });
    }
    try {
      await deps.store.deleteFile(ref, path);
      return reply.code(204).send();
    } catch (error) {
      return sendWorkspaceError(reply, error);
    }
  });
```

Remove the unused `NavEntrySpec` / `GeneratedFile` imports if TypeScript reports them; only import what is used.

- [ ] **Step 5: 运行测试**

Run: `npx vitest run src/server`

Expected: PASS，包括 raw 上传 413 与 generate/download。

- [ ] **Step 6: 提交**

```bash
git add src/server/build.ts src/server/routes/projects.ts src/server/routes/projects.test.ts
git commit -m "feat: add generate, download and raw file API" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: Web 外壳、API 客户端、工程列表

**Files:**
- Modify: `package.json`
- Create: `src/web/api.ts`
- Create: `src/web/store/projectStore.ts`
- Create: `src/web/app/App.tsx`
- Create: `src/web/app/ProjectLayout.tsx`
- Create: `src/web/app/ValidationDrawer.tsx`
- Create: `src/web/app/issueRoute.ts`
- Create: `src/web/components/SaveStatus.tsx`
- Create: `src/web/components/ConflictDialog.tsx`
- Create: `src/web/components/IssueList.tsx`
- Create: `src/web/pages/ProjectListPage.tsx`
- Create: `src/web/pages/ProjectListPage.test.tsx`
- Modify: `src/web/main.tsx`
- Delete: `src/web/App.tsx`, `src/web/App.test.tsx`, `src/web/sample.ts`
- Modify: `src/web/styles.css`

**Interfaces:**
- Produces:
  - `api` 对象：`listProjects`、`createProject`、`getProject`、`deleteProject`、`putSpec`、`validate`、`generate`、`listFiles`、`uploadFile`、`deleteFile`、`downloadUrl`
  - `useProjectStore(state)` / `useProjectStore.getState()`
  - 路由 `/`、`/projects/:key/*`
- Consumes: 服务端 API（Task 5/6）

- [ ] **Step 1: 安装依赖**

Run:

```bash
npm install react-router-dom zustand
npm install -D concurrently
```

- [ ] **Step 2: 写失败测试**

Create `src/web/pages/ProjectListPage.test.tsx`:

```tsx
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
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run src/web/pages/ProjectListPage.test.tsx`

Expected: FAIL，找不到 `./ProjectListPage`。

- [ ] **Step 4: 实现 API 客户端**

`src/web/api.ts`:

```ts
import type {
  NavEntrySpec,
  PluginSpec,
  ValidationIssue,
} from '../core/index';

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

export interface GenerateResult {
  files: string[];
  artifacts: { api: boolean; dbsetup: boolean; combined: boolean };
  warnings: ValidationIssue[];
  navBaseline: NavEntrySpec[];
}

export interface ValidateResult {
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string; details?: unknown[] };
    };
    throw new ApiError(
      response.status,
      body.error?.code ?? 'REQUEST_FAILED',
      body.error?.message ?? response.statusText,
      body.error?.details ?? [],
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listProjects: () =>
    request<{ projects: ProjectSummary[] }>('/api/projects'),
  createProject: (input: {
    key?: string;
    name: string;
    publisher?: { name: string; email: string };
  }) =>
    request<{ project: Project; spec: PluginSpec }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getProject: (key: string) =>
    request<{
      project: Project;
      spec: PluginSpec;
      navBaseline: NavEntrySpec[] | null;
    }>(`/api/projects/${encodeURIComponent(key)}`),
  deleteProject: (key: string) =>
    request<void>(`/api/projects/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),
  putSpec: (key: string, spec: PluginSpec, revision: number) =>
    request<{ revision: number; updatedAt: string }>(
      `/api/projects/${encodeURIComponent(key)}/spec`,
      {
        method: 'PUT',
        body: JSON.stringify({ spec, revision }),
      },
    ),
  validate: (key: string) =>
    request<ValidateResult>(
      `/api/projects/${encodeURIComponent(key)}/validate`,
      { method: 'POST', body: '{}' },
    ),
  generate: (key: string) =>
    request<GenerateResult>(
      `/api/projects/${encodeURIComponent(key)}/generate`,
      { method: 'POST', body: '{}' },
    ),
  listFiles: (key: string) =>
    request<{ files: Array<{ path: string; size: number; updatedAt: string }> }>(
      `/api/projects/${encodeURIComponent(key)}/files`,
    ),
  uploadFile: async (key: string, file: File, path: string) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(
      `/api/projects/${encodeURIComponent(key)}/files?path=${encodeURIComponent(path)}`,
      { method: 'PUT', body: form },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string; details?: unknown[] };
      };
      throw new ApiError(
        response.status,
        body.error?.code ?? 'REQUEST_FAILED',
        body.error?.message ?? response.statusText,
        body.error?.details ?? [],
      );
    }
    return (await response.json()) as {
      file: { path: string; size: number; updatedAt: string };
    };
  },
  deleteFile: (key: string, path: string) =>
    request<void>(
      `/api/projects/${encodeURIComponent(key)}/files?path=${encodeURIComponent(path)}`,
      { method: 'DELETE' },
    ),
  downloadUrl: (key: string, artifact: 'api' | 'dbsetup' | 'combined') =>
    `/api/projects/${encodeURIComponent(key)}/download/${artifact}`,
};
```

Note: `request` sets JSON content type only when `init.body` is present; the `POST` validate/generate pass `'{}'`. For DELETE no body. For multipart, `uploadFile` bypasses `request` so the browser sets the boundary.

- [ ] **Step 5: 实现 store**

`src/web/store/projectStore.ts`:

```ts
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
  reload(): Promise<void>;
  overwrite(): Promise<void>;
  validateNow(): Promise<void>;
  generate(): Promise<GenerateResult | null>;
  clearConflict(): void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let validateTimer: ReturnType<typeof setTimeout> | undefined;

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
      set({
        project: result.project,
        spec: result.spec,
        navBaseline: result.navBaseline,
        revision: result.project.revision,
        issues: [],
        saveState: 'idle',
        loading: false,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        set({ loading: false, notFound: true, project: null, spec: null });
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
    set({ spec: setIn(spec, path, value), saveState: 'dirty' });
    scheduleSave(get);
  },

  replaceSpec(spec) {
    set({ spec, saveState: 'dirty' });
    scheduleSave(get);
  },

  async saveNow() {
    const { project, spec, revision, saveState } = get();
    if (!project || !spec || saveState === 'saving') return;
    if (saveTimer) clearTimeout(saveTimer);
    set({ saveState: 'saving' });
    try {
      const result = await api.putSpec(project.key, spec, revision);
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
  },

  async reload() {
    const project = get().project;
    if (!project) return;
    await get().load(project.key);
  },

  async overwrite() {
    const { project, spec, conflict } = get();
    if (!project || !spec || !conflict) return;
    set({ saveState: 'saving', conflict: null });
    try {
      const result = await api.putSpec(project.key, spec, conflict.revision);
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

  clearConflict() {
    set({ conflict: null, saveState: 'dirty' });
  },
}));
```

- [ ] **Step 6: 实现通用组件与布局**

`src/web/components/SaveStatus.tsx`:

```tsx
import { useProjectStore } from '../store/projectStore';

const LABELS: Record<string, string> = {
  idle: '',
  dirty: '有未保存修改',
  saving: '保存中…',
  saved: '已保存',
  conflict: '保存冲突',
  error: '保存失败',
};

export function SaveStatus() {
  const state = useProjectStore((store) => store.saveState);
  if (!LABELS[state]) return null;
  return <span className={`save-status save-${state}`}>{LABELS[state]}</span>;
}
```

`src/web/components/ConflictDialog.tsx`:

```tsx
import { useProjectStore } from '../store/projectStore';

export function ConflictDialog() {
  const conflict = useProjectStore((store) => store.conflict);
  const reload = useProjectStore((store) => store.reload);
  const overwrite = useProjectStore((store) => store.overwrite);
  if (!conflict) return null;
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-label="保存冲突">
        <h2>其他窗口已修改这个工程</h2>
        <p>服务器上有更新的版本。你可以载入服务器版本，或用自己的版本覆盖。</p>
        <div className="dialog-actions">
          <button type="button" onClick={() => void reload()}>
            载入服务器版本
          </button>
          <button type="button" className="danger" onClick={() => void overwrite()}>
            用我的版本覆盖
          </button>
        </div>
      </div>
    </div>
  );
}
```

`src/web/components/IssueList.tsx`:

```tsx
import { useState } from 'react';
import type { ValidationIssue } from '../../core/index';

export function IssueList({
  issues,
  onSelect,
}: {
  issues: ValidationIssue[];
  onSelect?: (issue: ValidationIssue) => void;
}) {
  const [filter, setFilter] = useState('');
  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? issues.filter((issue) =>
        [issue.code, issue.message, issue.path]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      )
    : issues;

  if (issues.length === 0) {
    return <p className="muted">没有校验问题。</p>;
  }

  return (
    <div className="issue-list">
      <input
        aria-label="过滤校验问题"
        placeholder="按 code / message / path 过滤"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <ul>
        {visible.map((issue, index) => (
          <li key={`${issue.code}-${index}`}>
            <button
              type="button"
              className={`issue issue-${issue.severity}`}
              onClick={() => onSelect?.(issue)}
            >
              <span className="issue-severity">{issue.severity}</span>
              <span className="issue-code">{issue.code}</span>
              <span className="issue-message">{issue.message}</span>
              {issue.path ? <span className="issue-path">{issue.path}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/web/app/issueRoute.ts`:

```ts
import type { ValidationIssue } from '../../core/index';

const ROUTES: Record<string, string> = {
  plugin: 'overview',
  table: 'tables',
  page: 'pages',
  navigation: 'navigation',
  powerQuery: 'advanced',
  accessRequest: 'advanced',
  permissionMapping: 'advanced',
  wildcard: 'advanced',
  messageKey: 'advanced',
  raw: 'files',
  generatedFile: 'build',
  zip: 'build',
};

export function issueRoute(issue: ValidationIssue): string {
  return ROUTES[issue.target?.type ?? ''] ?? 'build';
}
```

`src/web/app/ValidationDrawer.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IssueList } from '../components/IssueList';
import { useProjectStore } from '../store/projectStore';
import { issueRoute } from './issueRoute';

export function ValidationDrawer() {
  const issues = useProjectStore((store) => store.issues);
  const project = useProjectStore((store) => store.project);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const errors = issues.filter((issue) => issue.severity === 'error').length;

  return (
    <>
      <button
        type="button"
        className={`issues-toggle ${errors ? 'has-errors' : ''}`}
        onClick={() => setOpen((value) => !value)}
      >
        校验：{errors} 错误 / {issues.length - errors} 警告
      </button>
      {open ? (
        <aside className="validation-drawer">
          <header>
            <h2>校验结果</h2>
            <button type="button" onClick={() => setOpen(false)}>
              关闭
            </button>
          </header>
          <IssueList
            issues={issues}
            onSelect={(issue) => {
              if (!project) return;
              navigate(`/projects/${project.key}/${issueRoute(issue)}`);
              setOpen(false);
            }}
          />
        </aside>
      ) : null}
    </>
  );
}
```

`src/web/app/ProjectLayout.tsx`:

```tsx
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ConflictDialog } from '../components/ConflictDialog';
import { SaveStatus } from '../components/SaveStatus';
import { useProjectStore } from '../store/projectStore';
import { ValidationDrawer } from './ValidationDrawer';

const LINKS = [
  ['overview', '插件信息'],
  ['tables', '表与字段'],
  ['pages', '页面'],
  ['navigation', '导航'],
  ['files', 'Raw 文件'],
  ['advanced', '高级 JSON'],
  ['build', '构建'],
] as const;

export function ProjectLayout() {
  const { key = '' } = useParams();
  const load = useProjectStore((store) => store.load);
  const project = useProjectStore((store) => store.project);
  const loading = useProjectStore((store) => store.loading);
  const notFound = useProjectStore((store) => store.notFound);
  const validateNow = useProjectStore((store) => store.validateNow);
  const saveNow = useProjectStore((store) => store.saveNow);
  const saveState = useProjectStore((store) => store.saveState);

  useEffect(() => {
    if (key) void load(key);
  }, [key, load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveNow]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);

  if (loading) return <main className="app">加载中…</main>;
  if (notFound || !project) {
    return (
      <main className="app">
        <p>工程不存在。</p>
        <Link to="/">返回工程列表</Link>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="back-link">
          ← 工程列表
        </Link>
        <h1>{project.key}</h1>
        <nav>
          {LINKS.map(([slug, label]) => (
            <NavLink
              key={slug}
              to={`/projects/${project.key}/${slug}`}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <SaveStatus />
          <button type="button" onClick={() => void validateNow()}>
            重新校验
          </button>
          <Link to={`/projects/${project.key}/build`} className="button-link">
            构建
          </Link>
          <ValidationDrawer />
        </header>
        <Outlet />
      </section>
      <ConflictDialog />
    </div>
  );
}
```

`src/web/app/App.tsx`（本任务只挂工程列表与布局；后续任务逐步添加子路由，保证每个任务结束时 typecheck 通过）：

```tsx
import { Route, Routes } from 'react-router-dom';
import { ProjectListPage } from '../pages/ProjectListPage';
import { ProjectLayout } from './ProjectLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:key" element={<ProjectLayout />}>
        <Route
          index
          element={<p className="muted">从左侧选择一个配置页。</p>}
        />
      </Route>
    </Routes>
  );
}
```

`src/web/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 7: 实现工程列表页**

`src/web/pages/ProjectListPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type ProjectSummary } from '../api';

export function ProjectListPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [publisherEmail, setPublisherEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const result = await api.listProjects();
    setProjects(result.projects);
  }, []);

  useEffect(() => {
    void refresh().catch((cause: Error) => setError(cause.message));
  }, [refresh]);

  async function create() {
    setError('');
    try {
      const result = await api.createProject({
        key: key.trim() || undefined,
        name,
        publisher:
          publisherName.trim() || publisherEmail.trim()
            ? { name: publisherName, email: publisherEmail }
            : undefined,
      });
      setOpen(false);
      await refresh();
      navigate(`/projects/${result.project.key}/overview`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建失败');
    }
  }

  async function remove(projectKey: string) {
    const typed = window.prompt(
      `删除工程 ${projectKey}？此操作不可撤销。输入 key 以确认：`,
    );
    if (typed !== projectKey) return;
    await api.deleteProject(projectKey);
    await refresh();
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">PowerSchool SIS</p>
          <h1>插件平台</h1>
          <p className="subtitle">创建、配置并导出 PowerSchool 定制化插件</p>
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          新建工程
        </button>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {projects.length === 0 ? (
        <p className="muted">还没有工程。点击「新建工程」开始。</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>名称</th>
              <th>Key</th>
              <th>版本</th>
              <th>更新时间</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.key}>
                <td>{project.name}</td>
                <td>{project.key}</td>
                <td>{project.version}</td>
                <td>{new Date(project.updatedAt).toLocaleString()}</td>
                <td>
                  <Link to={`/projects/${project.key}/overview`}>打开</Link>{' '}
                  <button type="button" onClick={() => void remove(project.key)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-label="新建工程">
            <h2>新建工程</h2>
            <label>
              Key（可空）
              <input value={key} onChange={(event) => setKey(event.target.value)} />
            </label>
            <label>
              名称
              <input
                aria-label="名称"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              发布者名称
              <input
                value={publisherName}
                onChange={(event) => setPublisherName(event.target.value)}
              />
            </label>
            <label>
              发布者邮箱
              <input
                value={publisherEmail}
                onChange={(event) => setPublisherEmail(event.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={() => setOpen(false)}>
                取消
              </button>
              <button type="button" onClick={() => void create()} disabled={!name.trim()}>
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 8: 追加样式**

Append to `src/web/styles.css`:

```css
.shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; min-width: 1024px; }
.button-link { padding: 6px 10px; border: 1px solid #c6cfda; border-radius: 6px; text-decoration: none; color: #253247; }
.nav-entry-row { border: 1px solid #e3e8ef; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
.nav-entry-list > button { margin-top: 6px; }
.sidebar { border-right: 1px solid #d9dee5; padding: 20px 16px; background: #f7f9fb; }
.sidebar nav { display: grid; gap: 4px; margin-top: 16px; }
.sidebar nav a { padding: 8px 10px; border-radius: 6px; color: #253247; text-decoration: none; }
.sidebar nav a.active { background: #e3edf9; font-weight: 600; }
.back-link { color: #5a6b82; text-decoration: none; font-size: 13px; }
.workspace { padding: 20px 24px 60px; min-width: 0; }
.topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.save-status { font-size: 13px; color: #5a6b82; }
.save-conflict, .save-error { color: #b3261e; font-weight: 600; }
.issues-toggle.has-errors { color: #b3261e; font-weight: 600; }
.issue-list ul { list-style: none; padding: 0; display: grid; gap: 6px; }
.issue { display: grid; grid-template-columns: 70px 220px 1fr; gap: 10px; width: 100%; text-align: left; padding: 8px; border: 1px solid #d9dee5; border-radius: 6px; background: #fff; cursor: pointer; }
.issue-error { border-left: 3px solid #b3261e; }
.issue-warning { border-left: 3px solid #c27c0e; }
.issue-code { font-family: ui-monospace, monospace; font-size: 12px; }
.issue-path { grid-column: 1 / -1; color: #5a6b82; font-size: 12px; }
.validation-drawer { position: fixed; top: 0; right: 0; width: 520px; height: 100vh; overflow: auto; background: #fff; border-left: 1px solid #d9dee5; padding: 20px; box-shadow: -8px 0 24px rgba(15, 30, 50, .08); }
.validation-drawer header { display: flex; justify-content: space-between; align-items: center; }
.form-section { border: 1px solid #d9dee5; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fff; }
.form-section h2 { margin-top: 0; font-size: 16px; }
.field { display: grid; gap: 4px; margin-bottom: 10px; }
.field > span { font-size: 13px; color: #44536a; }
.field input, .field select, .field textarea { padding: 7px 9px; border: 1px solid #c6cfda; border-radius: 6px; font: inherit; }
.localized { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.row-editor > .row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 10px; border: 1px dashed #d9dee5; border-radius: 6px; margin-bottom: 8px; }
.row-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.row-actions { display: flex; gap: 4px; align-items: start; }
.dialog-backdrop { position: fixed; inset: 0; background: rgba(15, 30, 50, .35); display: grid; place-items: center; z-index: 20; }
.dialog { background: #fff; border-radius: 10px; padding: 20px; width: 460px; display: grid; gap: 10px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
.muted { color: #5a6b82; }
.error-text { color: #b3261e; }
```

- [ ] **Step 9: 删除旧入口并运行测试**

Run:

```bash
rm src/web/App.tsx src/web/App.test.tsx src/web/sample.ts
npx vitest run src/web/pages/ProjectListPage.test.tsx
npm run typecheck
```

Expected: PASS。本任务的 `App.tsx` 只引用 `ProjectListPage` 与 `ProjectLayout`，因此不依赖后续任务的页面文件；后续任务会逐步追加路由。

- [ ] **Step 10: 提交**

```bash
git add package.json package-lock.json src/web
git commit -m "feat: add web shell, project store and project list" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 8: 通用表单组件、概览页、表与字段页

**Files:**
- Create: `src/web/components/LocalizedTextInput.tsx`
- Create: `src/web/components/RowEditor.tsx`
- Create: `src/web/components/TextField.tsx`
- Create: `src/web/components/SelectField.tsx`
- Create: `src/web/components/CheckboxField.tsx`
- Create: `src/web/components/JsonTextarea.tsx`
- Create: `src/web/pages/OverviewPage.tsx`
- Create: `src/web/pages/TablesPage.tsx`
- Create: `src/web/pages/TablesPage.test.tsx`

**Interfaces:**
- Produces:
  - `<LocalizedTextInput label value onChange />`
  - `<RowEditor rows onChange createRow addLabel>{render}</RowEditor>`
  - `<TextField label value onChange type />`、`<SelectField label value options onChange />`、`<CheckboxField label checked onChange />`、`<JsonTextarea label value onChange />`
- Consumes: `useProjectStore` 的 `spec`、`update`

- [ ] **Step 1: 写失败测试**

Create `src/web/pages/TablesPage.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/web/pages/TablesPage.test.tsx`

Expected: FAIL，找不到 `./TablesPage`。

- [ ] **Step 3: 实现通用组件**

`src/web/components/TextField.tsx`:

```tsx
export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
```

`src/web/components/SelectField.tsx`:

```tsx
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value as T)}
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

`src/web/components/CheckboxField.tsx`:

```tsx
export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="field checkbox">
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
```

`src/web/components/LocalizedTextInput.tsx`:

```tsx
import type { LocalizedText } from '../../core/index';

export function LocalizedTextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
}) {
  return (
    <div className="localized">
      <label className="field">
        <span>{label} (en)</span>
        <input
          aria-label={`${label} (en)`}
          value={value.en}
          onChange={(event) => onChange({ ...value, en: event.target.value })}
        />
      </label>
      <label className="field">
        <span>{label} (zh)</span>
        <input
          aria-label={`${label} (zh)`}
          placeholder="中文（可选）"
          value={value.zh ?? ''}
          onChange={(event) => onChange({ ...value, zh: event.target.value })}
        />
      </label>
    </div>
  );
}
```

`src/web/components/RowEditor.tsx`:

```tsx
import type { ReactNode } from 'react';

export function RowEditor<T>({
  rows,
  onChange,
  createRow,
  addLabel,
  children,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  createRow: () => T;
  addLabel: string;
  children: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  function updateAt(index: number, patch: Partial<T>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="row-editor">
      {rows.map((row, index) => (
        <div className="row" key={index}>
          <div className="row-fields">
            {children(row, (patch) => updateAt(index, patch))}
          </div>
          <div className="row-actions">
            <button type="button" aria-label="上移" onClick={() => move(index, -1)}>
              ↑
            </button>
            <button type="button" aria-label="下移" onClick={() => move(index, 1)}>
              ↓
            </button>
            <button
              type="button"
              aria-label="删除"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, createRow()])}>
        {addLabel}
      </button>
    </div>
  );
}
```

`src/web/components/JsonTextarea.tsx`:

```tsx
import { useState } from 'react';

export function JsonTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2),
  );
  const [error, setError] = useState('');

  return (
    <label className="field">
      <span>{label} (JSON)</span>
      <textarea
        aria-label={label}
        rows={3}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (!next.trim()) {
            setError('');
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(next));
            setError('');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'JSON 无效');
          }
        }}
      />
      {error ? <span className="error-text">{error}</span> : null}
    </label>
  );
}
```

- [ ] **Step 4: 实现概览页**

`src/web/pages/OverviewPage.tsx`:

```tsx
import { useProjectStore } from '../store/projectStore';
import { CheckboxField } from '../components/CheckboxField';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';

export function OverviewPage() {
  const spec = useProjectStore((store) => store.spec);
  const update = useProjectStore((store) => store.update);
  if (!spec) return null;

  const oauthEnabled = spec.plugin.oauth?.enabled ?? false;
  const level = spec.plugin.oauth?.accessLevelV1Api ?? 'NONE';

  return (
    <section>
      <h2>插件信息</h2>
      <div className="form-section">
        <TextField label="名称" value={spec.plugin.name} onChange={(value) => update('plugin.name', value)} />
        <TextField label="描述" value={spec.plugin.description} onChange={(value) => update('plugin.description', value)} />
        <TextField label="版本" value={spec.plugin.version} onChange={(value) => update('plugin.version', value)} />
        <TextField label="DB 名称" value={spec.plugin.dbName} onChange={(value) => update('plugin.dbName', value)} />
        <TextField label="DB 描述" value={spec.plugin.dbDescription} onChange={(value) => update('plugin.dbDescription', value)} />
        <TextField label="DB 版本" value={spec.plugin.dbVersion} onChange={(value) => update('plugin.dbVersion', value)} />
        <TextField label="导航版本" value={spec.plugin.navVersion} onChange={(value) => update('plugin.navVersion', value)} />
        <TextField label="发布者名称" value={spec.plugin.publisher.name} onChange={(value) => update('plugin.publisher.name', value)} />
        <TextField label="发布者邮箱" value={spec.plugin.publisher.email} onChange={(value) => update('plugin.publisher.email', value)} />
        <CheckboxField
          label="启用 OAuth"
          checked={oauthEnabled}
          onChange={(enabled) =>
            update('plugin.oauth', { enabled, accessLevelV1Api: level })
          }
        />
        {oauthEnabled ? (
          <SelectField
            label="V1 API 访问级别"
            value={level}
            options={[
              { value: 'NONE', label: 'NONE' },
              { value: 'READ', label: 'READ' },
              { value: 'FULL', label: 'FULL' },
            ]}
            onChange={(value) =>
              update('plugin.oauth', { enabled: true, accessLevelV1Api: value })
            }
          />
        ) : null}
      </div>

      <div className="form-section">
        <h2>摘要</h2>
        <p>表 {spec.tables.length} · 页面 {spec.pages.length} · 导航文件 {spec.navigation.length} · raw 文件 {spec.rawFiles.length}</p>
      </div>
    </section>
  );
}
```

`src/web/pages/TablesPage.tsx`:

```tsx
import { useState } from 'react';
import type { FieldSpec, TableSpec } from '../../core/index';
import { IssueBadge } from '../components/IssueBadge';
import { RowEditor } from '../components/RowEditor';
import { SectionIssues } from '../components/SectionIssues';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useProjectStore } from '../store/projectStore';

function newTable(): TableSpec {
  return {
    extensionName: 'U_New',
    schemaFile: 'U_New.xml',
    tableName: 'U_New_Table',
    childName: 'U_New_Table',
    comment: '',
    type: 'standalone',
    primaryKey: 'id',
    fields: [],
  };
}

function newField(): FieldSpec {
  return { name: 'new_field', type: 'String', length: 100, comment: '' };
}

export function TablesPage() {
  const spec = useProjectStore((store) => store.spec);
  const issues = useProjectStore((store) => store.issues);
  const update = useProjectStore((store) => store.update);
  const [selected, setSelected] = useState(0);
  if (!spec) return null;

  const tables = spec.tables;
  const index = Math.min(selected, Math.max(tables.length - 1, 0));
  const table = tables[index];

  function setTables(next: TableSpec[]) {
    update('tables', next);
  }

  function patchTable(patch: Partial<TableSpec>) {
    setTables(tables.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  return (
    <section className="split">
      <aside className="list-pane">
        <h2>表</h2>
        <ul>
          {tables.map((entry, i) => (
            <li key={i}>
              <button
                type="button"
                className={i === index ? 'active' : ''}
                onClick={() => setSelected(i)}
              >
                {entry.tableName}{' '}
                <IssueBadge issues={issues} type="table" id={entry.tableName} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setTables([...tables, newTable()]);
            setSelected(tables.length);
          }}
        >
          添加表
        </button>
      </aside>

      <div className="detail-pane">
        {!table ? (
          <p className="muted">还没有表。点击「添加表」。</p>
        ) : (
          <div className="form-section">
            <SectionIssues
              issues={issues.filter(
                (issue) =>
                  issue.target?.type === 'table' &&
                  issue.target?.id === table.tableName,
              )}
            />
            <div className="section-header">
              <h2>表详情</h2>
              <button
                type="button"
                onClick={() => {
                  setTables(tables.filter((_, i) => i !== index));
                  setSelected(0);
                }}
              >
                删除表
              </button>
            </div>
            <TextField label="Extension" value={table.extensionName} onChange={(value) => patchTable({ extensionName: value })} />
            <TextField label="Schema 文件" value={table.schemaFile} onChange={(value) => patchTable({ schemaFile: value })} />
            <TextField label="表名" value={table.tableName} onChange={(value) => patchTable({ tableName: value, childName: value })} />
            <TextField label="Child 名称" value={table.childName} onChange={(value) => patchTable({ childName: value })} />
            <TextField label="注释" value={table.comment} onChange={(value) => patchTable({ comment: value })} />
            <SelectField
              label="类型"
              value={table.type ?? 'standalone'}
              options={[
                { value: 'standalone', label: 'standalone' },
                { value: 'oneToOne', label: 'oneToOne' },
                { value: 'oneToMany', label: 'oneToMany' },
              ]}
              onChange={(value) => patchTable({ type: value })}
            />
            <TextField label="主键" value={table.primaryKey} onChange={(value) => patchTable({ primaryKey: value })} />

            <h3>字段</h3>
            <RowEditor
              rows={table.fields}
              onChange={(fields) => patchTable({ fields })}
              createRow={newField}
              addLabel="添加字段"
            >
              {(field, patch) => (
                <>
                  <TextField label="字段名" value={field.name} onChange={(value) => patch({ name: value })} />
                  <SelectField
                    label="字段类型"
                    value={field.type}
                    options={[
                      { value: 'Integer', label: 'Integer' },
                      { value: 'String', label: 'String' },
                      { value: 'Date', label: 'Date' },
                      { value: 'DateTime', label: 'DateTime' },
                      { value: 'Decimal', label: 'Decimal' },
                    ]}
                    onChange={(value) => patch({ type: value })}
                  />
                  <TextField
                    label="长度"
                    type="number"
                    value={field.length}
                    onChange={(value) => patch({ length: value ? Number(value) : undefined })}
                  />
                  <TextField label="注释" value={field.comment} onChange={(value) => patch({ comment: value })} />
                </>
              )}
            </RowEditor>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: 添加 IssueBadge / SectionIssues 并注册概览/表路由**

`src/web/components/IssueBadge.tsx`:

```tsx
import type { ValidationIssue } from '../../core/index';

export function IssueBadge({
  issues,
  type,
  id,
}: {
  issues: ValidationIssue[];
  type: string;
  id: string;
}) {
  const count = issues.filter(
    (issue) => issue.target?.type === type && issue.target?.id === id,
  ).length;
  if (!count) return null;
  return (
    <span className="issue-badge" title={`${count} 个校验问题`}>
      {count}
    </span>
  );
}
```

`src/web/components/SectionIssues.tsx`:

```tsx
import type { ValidationIssue } from '../../core/index';

export function SectionIssues({ issues }: { issues: ValidationIssue[] }) {
  const visible = issues.filter((issue) => issue.severity === 'error');
  if (visible.length === 0) return null;
  return (
    <ul className="section-issues">
      {visible.map((issue, index) => (
        <li key={`${issue.code}-${index}`}>
          <strong>{issue.code}</strong> {issue.message}
        </li>
      ))}
    </ul>
  );
}
```

Update `src/web/app/App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { OverviewPage } from '../pages/OverviewPage';
import { ProjectListPage } from '../pages/ProjectListPage';
import { TablesPage } from '../pages/TablesPage';
import { ProjectLayout } from './ProjectLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:key" element={<ProjectLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="tables" element={<TablesPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 6: 追加样式**

Append to `src/web/styles.css`:

```css
.split { display: grid; grid-template-columns: 240px 1fr; gap: 20px; }
.list-pane ul { list-style: none; padding: 0; display: grid; gap: 4px; }
.list-pane li button { width: 100%; text-align: left; padding: 8px; border: 1px solid #d9dee5; border-radius: 6px; background: #fff; }
.list-pane li button.active { background: #e3edf9; font-weight: 600; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.issue-badge { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #b3261e; color: #fff; font-size: 11px; font-weight: 700; }
.section-issues { margin: 0 0 12px; padding: 10px 12px; border-left: 3px solid #b3261e; background: #fdf3f2; border-radius: 4px; list-style: none; }
.section-issues code { font-family: ui-monospace, monospace; font-size: 12px; }
```

- [ ] **Step 7: 运行测试**

Run: `npx vitest run src/web/pages/TablesPage.test.tsx`

Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add src/web/components src/web/pages/OverviewPage.tsx src/web/pages/TablesPage.tsx src/web/pages/TablesPage.test.tsx src/web/styles.css src/web/app/App.tsx
git commit -m "feat: add overview and table form editors" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 9: 页面表单

**Files:**
- Create: `src/web/pages/PagesPage.tsx`
- Create: `src/web/pages/PagesPage.test.tsx`

**Interfaces:**
- Consumes: `PageSpec`、`ListColumnSpec`、`FormFieldSpec`、`FilterSpec`、`JoinSpec`、`RowEditor`、`LocalizedTextInput`、`JsonTextarea`
- Produces: `/projects/:key/pages` 的完整表单

- [ ] **Step 1: 写失败测试**

Create `src/web/pages/PagesPage.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/web/pages/PagesPage.test.tsx`

Expected: FAIL，找不到 `./PagesPage`。

- [ ] **Step 3: 实现页面表单**

`src/web/pages/PagesPage.tsx`:

```tsx
import { useState } from 'react';
import type {
  FilterSpec,
  FormFieldSpec,
  JoinSpec,
  ListColumnSpec,
  PageSpec,
} from '../../core/index';
import { IssueBadge } from '../components/IssueBadge';
import { JsonTextarea } from '../components/JsonTextarea';
import { LocalizedTextInput } from '../components/LocalizedTextInput';
import { RowEditor } from '../components/RowEditor';
import { SectionIssues } from '../components/SectionIssues';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { CheckboxField } from '../components/CheckboxField';
import { useProjectStore } from '../store/projectStore';

const CONTEXT_ROOT: Record<string, string> = {
  admin: 'admin/',
  adminStudent: 'admin/',
  teacher: 'teachers/',
  teacherStudent: 'teachers/',
  guardian: 'guardian/',
  student: 'guardian/',
};

function newPage(): PageSpec {
  return {
    id: 'page-1',
    kind: 'list',
    context: 'admin',
    path: 'admin/demo/page-1.html',
    title: { en: 'New Page' },
    table: undefined,
    columns: [],
  };
}

function newColumn(): ListColumnSpec {
  return { column: '', label: { en: '' }, type: 'string', sortable: true };
}

function newFormField(): FormFieldSpec {
  return { column: '', label: { en: '' }, widget: 'text' };
}

function newFilter(): FilterSpec {
  return {
    param: 'filter',
    column: '',
    operator: '=',
    widget: 'text',
    label: { en: '' },
  };
}

function newJoin(): JoinSpec {
  return { table: '', on: '', type: 'left' };
}

export function PagesPage() {
  const spec = useProjectStore((store) => store.spec);
  const issues = useProjectStore((store) => store.issues);
  const update = useProjectStore((store) => store.update);
  const [selected, setSelected] = useState(0);
  if (!spec) return null;

  const pages = spec.pages;
  const index = Math.min(selected, Math.max(pages.length - 1, 0));
  const page = pages[index];

  function setPages(next: PageSpec[]) {
    update('pages', next);
  }

  function patchPage(patch: Partial<PageSpec>) {
    setPages(pages.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  const prefix = CONTEXT_ROOT[page?.context ?? 'admin'] ?? 'admin/';

  return (
    <section className="split">
      <aside className="list-pane">
        <h2>页面</h2>
        <ul>
          {pages.map((entry, i) => (
            <li key={i}>
              <button
                type="button"
                className={i === index ? 'active' : ''}
                onClick={() => setSelected(i)}
              >
                {entry.title.en || entry.id}{' '}
                <IssueBadge issues={issues} type="page" id={entry.id} />
                <small>{entry.kind} · {entry.context}</small>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            const next = [...pages, newPage()];
            setPages(next);
            setSelected(next.length - 1);
          }}
        >
          添加页面
        </button>
      </aside>

      <div className="detail-pane">
        {!page ? (
          <p className="muted">还没有页面。点击「添加页面」。</p>
        ) : (
          <div className="form-section">
            <SectionIssues
              issues={issues.filter(
                (issue) =>
                  issue.target?.type === 'page' &&
                  issue.target?.id === page.id,
              )}
            />
            <div className="section-header">
              <h2>页面详情</h2>
              <button
                type="button"
                onClick={() => {
                  setPages(pages.filter((_, i) => i !== index));
                  setSelected(0);
                }}
              >
                删除页面
              </button>
            </div>

            <TextField label="ID" value={page.id} onChange={(value) => patchPage({ id: value })} />
            <SelectField
              label="类型"
              value={page.kind}
              options={[
                { value: 'list', label: 'list' },
                { value: 'edit', label: 'edit' },
                { value: 'settings', label: 'settings' },
                { value: 'dashboard', label: 'dashboard' },
                { value: 'custom', label: 'custom' },
                { value: 'raw', label: 'raw' },
              ]}
              onChange={(value) => patchPage({ kind: value })}
            />
            <SelectField
              label="上下文"
              value={page.context}
              options={[
                { value: 'admin', label: 'admin' },
                { value: 'adminStudent', label: 'adminStudent' },
                { value: 'teacher', label: 'teacher' },
                { value: 'teacherStudent', label: 'teacherStudent' },
                { value: 'guardian', label: 'guardian' },
                { value: 'student', label: 'student' },
              ]}
              onChange={(value) => patchPage({ context: value })}
            />
            <p className="muted">路径应位于 {prefix}；保存前请自行确认。</p>
            <TextField label="路径" value={page.path} onChange={(value) => patchPage({ path: value })} />
            <LocalizedTextInput label="标题" value={page.title} onChange={(value) => patchPage({ title: value })} />
            <SelectField
              label="表"
              value={page.table}
              options={spec.tables.map((table) => ({
                value: table.tableName,
                label: table.tableName,
              }))}
              onChange={(value) => patchPage({ table: value })}
            />
            <SelectField
              label="学生范围"
              value={page.studentScope}
              options={[
                { value: 'curstudid', label: 'curstudid' },
                { value: 'gpv.studentid', label: 'gpv.studentid' },
                { value: 'none', label: 'none' },
              ]}
              onChange={(value) => patchPage({ studentScope: value })}
            />
            <TextField label="记录 ID 参数" value={page.recordIdParam} onChange={(value) => patchPage({ recordIdParam: value })} />
            <JsonTextarea label="API 资源" value={page.apiResources} onChange={(value) => patchPage({ apiResources: value as string[] | undefined })} />

            {page.kind === 'list' ? (
              <>
                <h3>列</h3>
                <RowEditor rows={page.columns ?? []} onChange={(columns) => patchPage({ columns })} createRow={newColumn} addLabel="添加列">
                  {(column, patch) => (
                    <>
                      <TextField label="列名" value={column.column} onChange={(value) => patch({ column: value })} />
                      <LocalizedTextInput label="列标签" value={column.label} onChange={(value) => patch({ label: value })} />
                      <SelectField
                        label="列类型"
                        value={column.type}
                        options={[
                          { value: 'string', label: 'string' },
                          { value: 'number', label: 'number' },
                          { value: 'date', label: 'date' },
                          { value: 'datetime', label: 'datetime' },
                        ]}
                        onChange={(value) => patch({ type: value })}
                      />
                      <TextField label="宽度" value={column.width} onChange={(value) => patch({ width: value })} />
                      <CheckboxField label="可排序" checked={column.sortable ?? false} onChange={(value) => patch({ sortable: value })} />
                    </>
                  )}
                </RowEditor>

                <h3>筛选器</h3>
                <RowEditor rows={page.filters ?? []} onChange={(filters) => patchPage({ filters })} createRow={newFilter} addLabel="添加筛选器">
                  {(filter, patch) => (
                    <>
                      <TextField label="参数" value={filter.param} onChange={(value) => patch({ param: value })} />
                      <TextField label="列" value={filter.column} onChange={(value) => patch({ column: value })} />
                      <SelectField
                        label="操作符"
                        value={filter.operator}
                        options={[
                          { value: '=', label: '=' },
                          { value: '>=', label: '>=' },
                          { value: '<=', label: '<=' },
                          { value: '>', label: '>' },
                        ]}
                        onChange={(value) => patch({ operator: value })}
                      />
                      <SelectField
                        label="控件"
                        value={filter.widget}
                        options={[
                          { value: 'select', label: 'select' },
                          { value: 'text', label: 'text' },
                          { value: 'date', label: 'date' },
                        ]}
                        onChange={(value) => patch({ widget: value })}
                      />
                      <LocalizedTextInput label="筛选标签" value={filter.label} onChange={(value) => patch({ label: value })} />
                      <TextField label="选项 SQL" value={filter.optionsSql} onChange={(value) => patch({ optionsSql: value })} />
                      <CheckboxField label="客户端筛选" checked={filter.clientSide ?? false} onChange={(value) => patch({ clientSide: value })} />
                      <JsonTextarea label="选项" value={filter.options} onChange={(value) => patch({ options: value as FilterSpec['options'] })} />
                    </>
                  )}
                </RowEditor>

                <h3>关联</h3>
                <RowEditor rows={page.joins ?? []} onChange={(joins) => patchPage({ joins })} createRow={newJoin} addLabel="添加关联">
                  {(join, patch) => (
                    <>
                      <TextField label="关联表" value={join.table} onChange={(value) => patch({ table: value })} />
                      <TextField label="关联条件" value={join.on} onChange={(value) => patch({ on: value })} />
                      <SelectField
                        label="关联类型"
                        value={join.type}
                        options={[
                          { value: 'left', label: 'left' },
                          { value: 'inner', label: 'inner' },
                        ]}
                        onChange={(value) => patch({ type: value })}
                      />
                    </>
                  )}
                </RowEditor>

                <TextField label="排序" value={page.orderBy} onChange={(value) => patchPage({ orderBy: value })} />
                <CheckboxField label="CSV 导出" checked={page.csvExport ?? false} onChange={(value) => patchPage({ csvExport: value })} />
              </>
            ) : null}

            {page.kind === 'edit' || page.kind === 'settings' ? (
              <>
                <h3>表单字段</h3>
                <RowEditor rows={page.fields ?? []} onChange={(fields) => patchPage({ fields })} createRow={newFormField} addLabel="添加字段">
                  {(field, patch) => (
                    <>
                      <TextField label="字段名" value={field.column} onChange={(value) => patch({ column: value })} />
                      <LocalizedTextInput label="字段标签" value={field.label} onChange={(value) => patch({ label: value })} />
                      <SelectField
                        label="控件"
                        value={field.widget}
                        options={[
                          { value: 'text', label: 'text' },
                          { value: 'textarea', label: 'textarea' },
                          { value: 'integer', label: 'integer' },
                          { value: 'decimal', label: 'decimal' },
                          { value: 'date', label: 'date' },
                          { value: 'checkbox', label: 'checkbox' },
                          { value: 'select', label: 'select' },
                          { value: 'hidden', label: 'hidden' },
                          { value: 'readonly', label: 'readonly' },
                        ]}
                        onChange={(value) => patch({ widget: value })}
                      />
                      <CheckboxField label="必填" checked={field.required ?? false} onChange={(value) => patch({ required: value })} />
                      <CheckboxField label="只读" checked={field.readonly ?? false} onChange={(value) => patch({ readonly: value })} />
                      <CheckboxField label="隐藏" checked={field.hidden ?? false} onChange={(value) => patch({ hidden: value })} />
                      <TextField label="最大长度" type="number" value={field.maxLength} onChange={(value) => patch({ maxLength: value ? Number(value) : undefined })} />
                      <TextField label="默认值" value={field.defaultValue} onChange={(value) => patch({ defaultValue: value })} />
                      <JsonTextarea label="选项" value={field.options} onChange={(value) => patch({ options: value as FormFieldSpec['options'] })} />
                      <JsonTextarea label="SQL 选项" value={field.sqlOptions} onChange={(value) => patch({ sqlOptions: value as FormFieldSpec['sqlOptions'] })} />
                    </>
                  )}
                </RowEditor>
              </>
            ) : null}

            {page.kind === 'dashboard' || page.kind === 'custom' ? (
              <label className="field">
                <span>自定义正文</span>
                <textarea
                  aria-label="自定义正文"
                  rows={10}
                  value={page.customBody ?? ''}
                  onChange={(event) => patchPage({ customBody: event.target.value })}
                />
              </label>
            ) : null}

            {page.kind === 'raw' ? (
              <p className="muted">raw 页面内容来自 Raw 文件页中相同路径的文件。</p>
            ) : null}

            <h3>页头 / 页脚覆盖</h3>
            <TextField label="页头" value={page.chrome?.header} onChange={(value) => patchPage({ chrome: { ...page.chrome, header: value } })} />
            <TextField label="页脚" value={page.chrome?.footer} onChange={(value) => patchPage({ chrome: { ...page.chrome, footer: value } })} />
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 注册页面路由**

Update `src/web/app/App.tsx` to add the pages route:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { OverviewPage } from '../pages/OverviewPage';
import { PagesPage } from '../pages/PagesPage';
import { ProjectListPage } from '../pages/ProjectListPage';
import { TablesPage } from '../pages/TablesPage';
import { ProjectLayout } from './ProjectLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:key" element={<ProjectLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="pages" element={<PagesPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run src/web/pages/PagesPage.test.tsx`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/web/pages/PagesPage.tsx src/web/pages/PagesPage.test.tsx src/web/app/App.tsx
git commit -m "feat: add page form editor" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 10: 导航表单与版本建议

**Files:**
- Create: `src/web/pages/NavigationPage.tsx`
- Create: `src/web/pages/NavigationPage.test.tsx`

**Interfaces:**
- Consumes: `suggestNavVersion`、`useProjectStore.navBaseline`、`NavFileSpec`、`NavEntrySpec`
- Produces: 导航文件与条目树编辑；内容变化时自动建议版本

- [ ] **Step 1: 写失败测试**

Create `src/web/pages/NavigationPage.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/web/pages/NavigationPage.test.tsx`

Expected: FAIL，找不到 `./NavigationPage`。

- [ ] **Step 3: 实现导航页**

`src/web/pages/NavigationPage.tsx`:

```tsx
import { useState } from 'react';
import {
  suggestNavVersion,
  type NavEntrySpec,
  type NavFileSpec,
} from '../../core/index';
import { IssueBadge } from '../components/IssueBadge';
import { LocalizedTextInput } from '../components/LocalizedTextInput';
import { SectionIssues } from '../components/SectionIssues';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { CheckboxField } from '../components/CheckboxField';
import { JsonTextarea } from '../components/JsonTextarea';
import { useProjectStore } from '../store/projectStore';

function newNavFile(): NavFileSpec {
  return {
    filename: 'new-nav.json',
    contextType: 'main',
    entries: [],
  };
}

function newEntry(): NavEntrySpec {
  return {
    htmlID: `entry-${Date.now()}`,
    title: { en: 'New Entry' },
    sortOrder: 1,
    version: '1.0.0',
  };
}

function NavEntryEditor({
  entry,
  onChange,
  baseline,
  defaultVersion,
  depth,
}: {
  entry: NavEntrySpec;
  onChange: (entry: NavEntrySpec) => void;
  baseline: Map<string, NavEntrySpec>;
  defaultVersion: string;
  depth: number;
}) {
  const issues = useProjectStore((store) => store.issues);
  const suggested = suggestNavVersion(
    entry,
    baseline.get(entry.htmlID),
    defaultVersion,
  );
  const baselineEntry = baseline.get(entry.htmlID);

  function patch(next: Partial<NavEntrySpec>) {
    const merged = { ...entry, ...next };
    const nextVersion = suggestNavVersion(
      merged,
      baseline.get(merged.htmlID),
      defaultVersion,
    );
    onChange({ ...merged, version: nextVersion || defaultVersion });
  }

  return (
    <div className="nav-entry" style={{ marginLeft: depth * 16 }}>
      <IssueBadge issues={issues} type="navigation" id={entry.htmlID} />
      <div className="row-fields">
        <TextField label="htmlID" value={entry.htmlID} onChange={(value) => patch({ htmlID: value })} />
        <LocalizedTextInput label="条目标题" value={entry.title} onChange={(value) => patch({ title: value })} />
        <TextField label="排序" type="number" value={entry.sortOrder} onChange={(value) => patch({ sortOrder: Number(value) || 0 })} />
        <TextField label="版本" value={entry.version} onChange={(value) => onChange({ ...entry, version: value })} />
        <TextField label="pageId" value={entry.pageId} onChange={(value) => patch({ pageId: value })} />
        <TextField label="pageURL" value={entry.pageURL ?? ''} onChange={(value) => patch({ pageURL: value })} />
        <TextField label="schoolIds" value={(entry.schoolIds ?? []).join(',')} onChange={(value) => patch({ schoolIds: value.split(',').map((part) => Number(part.trim())).filter((part) => Number.isFinite(part) && part > 0) })} />
        <SelectField
          label="上下文类型"
          value={entry.contextType}
          options={[
            { value: 'main', label: 'main' },
            { value: 'student', label: 'student' },
            { value: 'staff', label: 'staff' },
          ]}
          onChange={(value) => patch({ contextType: value })}
        />
        <SelectField
          label="必需上下文"
          value={entry.requiredContext}
          options={[
            { value: 'student', label: 'student' },
            { value: 'staff', label: 'staff' },
          ]}
          onChange={(value) => patch({ requiredContext: value })}
        />
        <SelectField
          label="学区层级"
          value={entry.districtLevelContext === undefined ? undefined : String(entry.districtLevelContext) as '0' | '1' | '2'}
          options={[
            { value: '0', label: '0' },
            { value: '1', label: '1' },
            { value: '2', label: '2' },
          ]}
          onChange={(value) => patch({ districtLevelContext: Number(value) as 0 | 1 | 2 })}
        />
        <TextField label="父 htmlID" value={entry.parentHTMLID} onChange={(value) => patch({ parentHTMLID: value })} />
        <CheckboxField label="新标签页" checked={entry.isNewTab ?? false} onChange={(value) => patch({ isNewTab: value })} />
        <CheckboxField label="落地页" checked={entry.isLandingPage ?? false} onChange={(value) => patch({ isLandingPage: value })} />
        <CheckboxField label="检查参数" checked={entry.checkParams ?? false} onChange={(value) => patch({ checkParams: value })} />
        <JsonTextarea label="extra" value={entry.extra} onChange={(value) => patch({ extra: value as Record<string, unknown> | undefined })} />
      </div>

      {baselineEntry && suggested !== entry.version ? (
        <p className="muted">内容已变化，版本建议 {suggested}。</p>
      ) : null}

      <NavEntryList
        entries={entry.children ?? []}
        onChange={(children) => onChange({ ...entry, children })}
        baseline={baseline}
        defaultVersion={defaultVersion}
        depth={depth + 1}
        addLabel="添加子条目"
      />
    </div>
  );
}

function NavEntryList({
  entries,
  onChange,
  baseline,
  defaultVersion,
  depth,
  addLabel,
}: {
  entries: NavEntrySpec[];
  onChange: (entries: NavEntrySpec[]) => void;
  baseline: Map<string, NavEntrySpec>;
  defaultVersion: string;
  depth: number;
  addLabel: string;
}) {
  return (
    <div className="nav-entry-list">
      {entries.map((entry, index) => (
        <div className="nav-entry-row" key={index}>
          <NavEntryEditor
            entry={entry}
            baseline={baseline}
            defaultVersion={defaultVersion}
            depth={depth}
            onChange={(next) =>
              onChange(entries.map((item, i) => (i === index ? next : item)))
            }
          />
          <button
            type="button"
            aria-label="删除条目"
            onClick={() => onChange(entries.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...entries, { ...newEntry(), version: defaultVersion }])
        }
      >
        {addLabel}
      </button>
    </div>
  );
}

export function NavigationPage() {
  const spec = useProjectStore((store) => store.spec);
  const issues = useProjectStore((store) => store.issues);
  const update = useProjectStore((store) => store.update);
  const navBaseline = useProjectStore((store) => store.navBaseline);
  const [selected, setSelected] = useState(0);
  if (!spec) return null;

  const files = spec.navigation;
  const index = Math.min(selected, Math.max(files.length - 1, 0));
  const file = files[index];
  const baseline = new Map(
    (navBaseline ?? []).map((entry) => [entry.htmlID, entry]),
  );

  function setFiles(next: NavFileSpec[]) {
    update('navigation', next);
  }

  return (
    <section className="split">
      <aside className="list-pane">
        <h2>导航文件</h2>
        <ul>
          {files.map((entry, i) => (
            <li key={i}>
              <button
                type="button"
                className={i === index ? 'active' : ''}
                onClick={() => setSelected(i)}
              >
                {entry.filename}
                <small>{entry.contextType} · {entry.entries.length} 条目</small>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setFiles([...files, newNavFile()]);
            setSelected(files.length);
          }}
        >
          添加导航文件
        </button>
      </aside>

      <div className="detail-pane">
        {!file ? (
          <p className="muted">还没有导航文件。</p>
        ) : (
          <div className="form-section">
            <SectionIssues
              issues={issues.filter(
                (issue) =>
                  issue.target?.type === 'navigation' &&
                  issue.target?.id !== undefined &&
                  file.entries.some(
                    (entry) => entry.htmlID === issue.target?.id,
                  ),
              )}
            />
            <TextField label="文件名" value={file.filename} onChange={(value) => setFiles(files.map((entry, i) => (i === index ? { ...entry, filename: value } : entry)))} />
            <SelectField
              label="文件上下文"
              value={file.contextType}
              options={[
                { value: 'main', label: 'main' },
                { value: 'student', label: 'student' },
                { value: 'staff', label: 'staff' },
              ]}
              onChange={(value) => setFiles(files.map((entry, i) => (i === index ? { ...entry, contextType: value } : entry)))}
            />
            <NavEntryList
              entries={file.entries}
              onChange={(entries) => setFiles(files.map((entry, i) => (i === index ? { ...entry, entries } : entry)))}
              baseline={baseline}
              defaultVersion={spec.plugin.navVersion}
              depth={0}
              addLabel="添加条目"
            />
          </div>
        )}
      </div>
    </section>
  );
}
```

Note: the test expects `screen.getByLabelText('条目标题 (en)')` to be unique. With one entry it is.

- [ ] **Step 4: 注册导航路由**

Replace `src/web/app/App.tsx` with:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { NavigationPage } from '../pages/NavigationPage';
import { OverviewPage } from '../pages/OverviewPage';
import { PagesPage } from '../pages/PagesPage';
import { ProjectListPage } from '../pages/ProjectListPage';
import { TablesPage } from '../pages/TablesPage';
import { ProjectLayout } from './ProjectLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:key" element={<ProjectLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="pages" element={<PagesPage />} />
        <Route path="navigation" element={<NavigationPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run src/web/pages/NavigationPage.test.tsx`

Expected: PASS（标题变化后 version 变为 `1.0.1`）。

- [ ] **Step 6: 提交**

```bash
git add src/web/pages/NavigationPage.tsx src/web/pages/NavigationPage.test.tsx src/web/app/App.tsx
git commit -m "feat: add navigation editor with version suggestions" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 11: 文件页、高级 JSON 页、构建页

**Files:**
- Create: `src/web/pages/FilesPage.tsx`
- Create: `src/web/pages/AdvancedPage.tsx`
- Create: `src/web/pages/BuildPage.tsx`
- Create: `src/web/pages/AdvancedPage.test.tsx`

**Interfaces:**
- Consumes: `api.listFiles`、`api.uploadFile`、`api.deleteFile`、`api.downloadUrl`、`useProjectStore.replaceSpec/generate`
- Produces: raw 文件上传删除、高级 JSON 编辑、生成与下载

- [ ] **Step 1: 写失败测试**

Create `src/web/pages/AdvancedPage.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/web/pages/AdvancedPage.test.tsx`

Expected: FAIL，找不到 `./AdvancedPage`。

- [ ] **Step 3: 实现文件页**

`src/web/pages/FilesPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useProjectStore } from '../store/projectStore';

interface FileInfo {
  path: string;
  size: number;
  updatedAt: string;
}

export function FilesPage() {
  const project = useProjectStore((store) => store.project);
  const spec = useProjectStore((store) => store.spec);
  const update = useProjectStore((store) => store.update);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!project) return;
    const result = await api.listFiles(project.key);
    setFiles(result.files);
  }, [project]);

  useEffect(() => {
    void refresh().catch((cause: Error) => setError(cause.message));
  }, [refresh]);

  if (!project || !spec) return null;

  async function upload(list: FileList | null) {
    if (!list) return;
    setError('');
    try {
      for (const file of Array.from(list)) {
        const path = (file as File & { webkitRelativePath?: string })
          .webkitRelativePath || file.name;
        await api.uploadFile(project.key, file, path);
        const current = useProjectStore.getState().spec;
        if (current && !current.rawFiles.some((raw) => raw.path === path)) {
          update('rawFiles', [...current.rawFiles, { path }]);
        }
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '上传失败');
    }
  }

  async function remove(path: string) {
    setError('');
    const rawPage = spec.pages.find(
      (page) => page.kind === 'raw' && page.path === path,
    );
    if (
      rawPage &&
      !window.confirm(`页面 ${rawPage.id} 引用了该文件，仍要删除？`)
    ) {
      return;
    }
    try {
      await api.deleteFile(project.key, path);
      const nextRaw = spec.rawFiles.filter((raw) => raw.path !== path);
      if (nextRaw.length !== spec.rawFiles.length) update('rawFiles', nextRaw);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败');
    }
  }

  return (
    <section>
      <h2>Raw 文件</h2>
      <p className="muted">
        上传后会加入 spec.rawFiles 并参与生成。删除会同步移除引用；raw 页面引用的文件请谨慎删除。
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      <input
        aria-label="上传文件"
        type="file"
        multiple
        onChange={(event) => void upload(event.target.files)}
      />
      <table className="grid">
        <thead>
          <tr>
            <th>路径</th>
            <th>大小</th>
            <th>更新时间</th>
            <th>引用</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const referenced = spec.rawFiles.some((raw) => raw.path === file.path);
            return (
              <tr key={file.path}>
                <td>{file.path}</td>
                <td>{file.size}</td>
                <td>{new Date(file.updatedAt).toLocaleString()}</td>
                <td>{referenced ? '已引用' : '未引用'}</td>
                <td>
                  <button type="button" onClick={() => void remove(file.path)}>
                    删除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 4: 实现高级 JSON 页**

`src/web/pages/AdvancedPage.tsx`:

```tsx
import { useState } from 'react';
import type { PluginSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';

export function AdvancedPage() {
  const spec = useProjectStore((store) => store.spec);
  const replaceSpec = useProjectStore((store) => store.replaceSpec);
  const [text, setText] = useState(() => JSON.stringify(spec, null, 2));
  const [error, setError] = useState('');

  if (!spec) return null;

  function apply(next: string) {
    setText(next);
    try {
      const parsed = JSON.parse(next) as PluginSpec;
      replaceSpec(parsed);
      setError('');
    } catch (cause) {
      setError(`JSON 无效：${cause instanceof Error ? cause.message : ''}`);
    }
  }

  return (
    <section>
      <h2>高级 JSON</h2>
      <p className="muted">
        这里可以编辑整份 spec，包括 PowerQuery、权限映射、wildcards 和 MessageKeys。解析失败不会保存。
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      <label className="field">
        <span>Spec JSON</span>
        <textarea
          aria-label="Spec JSON"
          rows={30}
          value={text}
          onChange={(event) => apply(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          const formatted = JSON.stringify(JSON.parse(text), null, 2);
          setText(formatted);
          setError('');
        }}
      >
        格式化
      </button>
    </section>
  );
}
```

- [ ] **Step 5: 实现构建页**

`src/web/pages/BuildPage.tsx`:

```tsx
import { useState } from 'react';
import { api, type GenerateResult } from '../api';
import { IssueList } from '../components/IssueList';
import { useProjectStore } from '../store/projectStore';

export function BuildPage() {
  const project = useProjectStore((store) => store.project);
  const issues = useProjectStore((store) => store.issues);
  const generate = useProjectStore((store) => store.generate);
  const validateNow = useProjectStore((store) => store.validateNow);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!project) return null;
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  async function run() {
    setLoading(true);
    setError('');
    try {
      await validateNow();
      const generated = await generate();
      setResult(generated);
      if (!generated) {
        setError('生成失败：请先修复校验错误。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>构建</h2>
      <button type="button" onClick={() => void run()} disabled={loading || hasErrors}>
        {loading ? '生成中…' : '生成'}
      </button>
      {hasErrors ? <p className="muted">存在校验错误，修复后才能生成。</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <h3>校验结果</h3>
      <IssueList issues={issues} />

      {result ? (
        <>
          <h3>下载</h3>
          <p>
            {(['combined', 'api', 'dbsetup'] as const).map((artifact) => (
              <a key={artifact} href={api.downloadUrl(project.key, artifact)}>
                下载 {artifact}.zip
              </a>
            ))}
          </p>
          <h3>生成文件</h3>
          <ul>
            {result.files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
```

Note: the download links render three anchors without separators; acceptable. `GenerateResult` import is used.

- [ ] **Step 6: 注册全部剩余路由**

Replace `src/web/app/App.tsx` with the complete route table:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdvancedPage } from '../pages/AdvancedPage';
import { BuildPage } from '../pages/BuildPage';
import { FilesPage } from '../pages/FilesPage';
import { NavigationPage } from '../pages/NavigationPage';
import { OverviewPage } from '../pages/OverviewPage';
import { PagesPage } from '../pages/PagesPage';
import { ProjectListPage } from '../pages/ProjectListPage';
import { TablesPage } from '../pages/TablesPage';
import { ProjectLayout } from './ProjectLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:key" element={<ProjectLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="pages" element={<PagesPage />} />
        <Route path="navigation" element={<NavigationPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="advanced" element={<AdvancedPage />} />
        <Route path="build" element={<BuildPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 7: 运行测试与类型检查**

Run:

```bash
npx vitest run src/web
npm run typecheck
```

Expected: PASS。若 typecheck 报未使用变量，删除对应导入。

- [ ] **Step 8: 提交**

```bash
git add src/web/pages/FilesPage.tsx src/web/pages/AdvancedPage.tsx src/web/pages/BuildPage.tsx src/web/pages/AdvancedPage.test.tsx src/web/app/App.tsx
git commit -m "feat: add raw files, advanced JSON and build UI" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 12: 开发脚本、忽略目录与文档

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: `npm run dev` 一条命令启动；`workspaces/` 不进版本库；README 反映平台用法

- [ ] **Step 1: 修改脚本**

Update `package.json` scripts to:

```json
{
  "dev": "concurrently -k \"tsx watch src/server/index.ts\" \"vite\"",
  "dev:server": "tsx watch src/server/index.ts",
  "dev:web": "vite",
  "build:web": "vite build",
  "start": "tsx src/server/index.ts",
  "cli": "tsx src/cli/index.ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 2: 忽略工作区**

Append to `.gitignore`:

```gitignore
workspaces/
```

- [ ] **Step 3: 更新 README**

Replace the README content with:

```markdown
# PowerSchool 插件平台

创建、配置并导出 PowerSchool 定制化插件的本地平台。

- 设计文档：[docs/superpowers/specs/2026-11-06-plugin-platform-workspace-forms-design.md](docs/superpowers/specs/2026-11-06-plugin-platform-workspace-forms-design.md)
- 实现计划：[docs/superpowers/plans/2026-11-06-plugin-platform-workspace-forms.md](docs/superpowers/plans/2026-11-06-plugin-platform-workspace-forms.md)
- PowerSchool 知识库：[knowledgebase/README.md](knowledgebase/README.md)

## 环境

- Node.js 24+
- npm

```bash
npm install
npm run dev       # 服务端 5174 + Vite 5173
npm test
npm run typecheck
npm run build:web
```

打开 `http://127.0.0.1:5173`。

## 已实现

- 工程工作区：`workspaces/local/<key>/`，包含 `plugin.json`、`files/`、`build/`、`state/`。
- 核心表单：插件信息、表与字段、页面、导航（含 version 自动建议）。
- raw 文件上传/删除；高级 JSON 编辑整份 spec。
- 校验、生成、`api.zip` / `dbsetup.zip` / `combined.zip` 下载。
- 乐观锁：多标签页同时编辑会提示冲突。
- 多租户接缝：`WorkspaceStore` 与 `actor`，v1 固定为 `local`。

## CLI

```bash
npm run cli -- validate path/to/plugin.json
npm run cli -- generate path/to/plugin.json --out build --zip
```

## 项目约定

- 本实例没有 `web_root/students/`；学生与家长门户共用 `guardian/`。
- `/ws/v1` 看 `accessLevelV1Api`；`/ws/schema` 与 PowerQuery 看 `access_request`。
- 内部页面需要 `permission_mappings`，并受 FLS/DRF 限制。
- 平台只生成可安装 zip，不连接 PowerSchool 执行安装。
```

- [ ] **Step 4: 全量验证**

Run:

```bash
npm test
npm run typecheck
npm run build:web
```

Expected: 全部 PASS。

- [ ] **Step 5: 手动冒烟**

Run `npm run dev`，打开 `http://127.0.0.1:5173`，确认：

1. 新建工程 → 概览页填写发布者邮箱。
2. Tables 页添加表与字段。
3. Pages 页添加 list 页面与列。
4. Navigation 页添加条目。
5. 构建页生成并下载 `combined.zip`。
6. 刷新页面后数据仍在。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json .gitignore README.md
git commit -m "chore: add dev script and platform docs" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```
