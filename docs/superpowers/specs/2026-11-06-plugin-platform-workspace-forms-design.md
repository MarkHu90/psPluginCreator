# PowerSchool 插件平台 — 工程工作区与核心表单 设计文档

- 日期：2026-11-06
- 状态：待实现（第一切片）
- 前置文档：[PowerSchool 插件工作台设计](2026-11-06-powerschool-plugin-workbench-design.md)
- 定位：平台化第一步。把现有「写 JSON + 校验 + 出包」的开发者工具，升级为可在界面里创建和维护插件工程的平台。

## 1. 背景与目标

### 1.1 平台愿景

目标是做一个**创建 PowerSchool 定制化插件的平台**：

- **AI 辅助**：对话式增量修改，AI 通过工具调用改 spec 与页面代码，带 diff 和撤销。
- **可视化构建器**：结构化表单、实时预览、拖拽搭建、代码编辑器。
- **本地优先**：先做本地单用户运行，但数据与鉴权按多租户形状设计，后续可部署为公网 SaaS。
- **纯离线出包**：平台只生成可安装的 zip，不连接 PowerSchool 执行安装。

### 1.2 子项目拆分

平台由多个独立子系统组成，按以下顺序逐切片实现，每个切片单独 spec → plan → 实现：

| # | 子项目 | 状态 |
| --- | --- | --- |
| 1 | 工程工作区地基（本项目） | 本次设计 |
| 2 | 结构化表单编辑器（核心四块） | 本次设计 |
| 3 | 实时预览 | 后续 |
| 4 | AI 对话代理 | 后续 |
| 5 | 代码编辑器（Monaco） | 后续 |
| 6 | 拖拽式页面搭建 | 后续 |
| 7 | 导入现有插件 | 后续 |

本次交付 **#1 + #2 的核心四块**：插件信息、表与字段、页面、导航；同时提供工程工作区、raw 文件管理、生成下载、多租户接缝。

### 1.3 现状

仓库已有可复用的核心：

- `src/core/spec`：`PluginSpec` 类型与 Zod schema。
- `src/core/validate`：spec 校验与生成后校验。
- `src/core/generate`：plugin.xml、扩展表、pagecataloging、PowerQuery、权限、MessageKeys、wildcards、CRUD 页面、zip。
- `src/cli`：`validate` / `generate`。
- `src/server`：Fastify，仅 `POST /api/validate`。
- `src/web`：单页，粘贴 JSON 看校验结果。

本次不改生成器行为，只在其上增加工程存储、REST API 与表单 UI。

## 2. 范围

### 2.1 本切片包含

- 文件系统工作区：`workspaces/<tenant>/<key>/` 的工程 CRUD、spec 读写、raw 文件管理、build 产物。
- `WorkspaceStore` 接口与 `LocalFsWorkspaceStore` 实现。
- 多租户接缝：所有存储操作带 `tenant`，v1 恒为 `"local"`；鉴权解析集中在 `actor`。
- 乐观并发：`revision` 版本号，冲突返回 409。
- 草稿保存：结构/业务校验不阻止保存；校验与生成分离。
- 导航 version 自动递增：以最近一次成功生成为基准。
- REST API：工程、spec、校验、生成、下载、raw 文件。
- Web UI：工程列表、插件信息、表与字段、页面、导航、raw 文件、高级 JSON、构建页。
- 一条 `npm run dev` 启动开发环境。

### 2.2 本切片不包含

- AI 对话、实时预览、拖拽搭建、Monaco 代码编辑器。
- 导入现有插件（三个 demo 的导入回放）。
- PowerQuery、权限映射、wildcards、MessageKeys 的专用表单；这些领域可用「高级 JSON」页编辑。
- 账号、登录、真实多租户隔离、计费。
- 连接 PowerSchool 安装/升级/拉取 schema。
- 版本历史、撤销栈、协作。
- 浏览器端到端测试（Playwright）。

## 3. 架构

### 3.1 分层

```
浏览器 (React + Vite)
   │  REST /api
   ▼
Fastify 服务端
   ├─ routes/projects      工程 API
   ├─ actor                租户/身份解析（v1 恒为 local）
   ├─ workspace            WorkspaceStore + LocalFsWorkspaceStore
   └─ core                 spec 校验 + 生成 + 打包（既有纯函数）
   ▼
workspaces/<tenant>/<key>/ 磁盘上的工程
```

约束：

- `core` 保持纯函数，不感知文件系统、HTTP、租户。
- 工作区存储只依赖 Node 文件系统；不引入数据库。
- CLI 继续直接读目录，与平台共享同一套 `plugin.json` 与 `files/`。
- 浏览器不直接访问文件系统；一切经服务端 API。

### 3.2 目录结构

```
src/
  core/
    spec/
      defaults.ts             # 新增：createDefaultSpec
      navVersion.ts           # 新增：suggestNavVersion / compareNavVersion
  workspace/
    types.ts                  # ProjectRef / Project / ProjectSummary / WorkspaceStore
    errors.ts                 # WorkspaceError 及错误码
    safePath.ts               # 路径归一化与逃逸防护
    localFsStore.ts           # LocalFsWorkspaceStore
    localFsStore.test.ts
  server/
    app.ts                    # buildServer 重命名/扩展，支持注入配置
    actor.ts                  # resolveActor
    routes/projects.ts        # 工程路由
    routes/projects.test.ts
  web/
    main.tsx
    app/
      App.tsx                 # 路由与布局
      ProjectLayout.tsx       # 左侧导航 + 顶部工具条
      ValidationDrawer.tsx
    pages/
      ProjectListPage.tsx
      OverviewPage.tsx
      TablesPage.tsx
      PagesPage.tsx
      NavigationPage.tsx
      FilesPage.tsx
      AdvancedPage.tsx
      BuildPage.tsx
    components/
      LocalizedTextInput.tsx
      RowEditor.tsx           # 通用行表格（新增/删除/排序）
      SaveStatus.tsx
      ConflictDialog.tsx
      IssueBadge.tsx
    store/
      projectStore.ts         # Zustand
      api.ts                  # fetch 封装
    styles.css
```

`workspaces/` 加入 `.gitignore`。

### 3.3 数据流

```
打开工程   GET  /api/projects/:key           → { project, spec }
编辑表单   updateSpec(path, value)            → 本地不可变更新，标记 dirty
自动保存   PUT  /api/projects/:key/spec       → { revision } 校验乐观锁
自动校验   POST /api/projects/:key/validate   → issues
生成       POST /api/projects/:key/generate   → build/ 原子替换 + nav 基准
下载       GET  /api/projects/:key/download/:artifact
```

## 4. 工作区存储

### 4.1 磁盘布局

```
workspaces/                      # 可由 WORKSPACES_DIR 覆盖；加入 .gitignore
  <tenant>/                      # v1 为 local/；多租户时按 tenant 分区
    <key>/
      project.json               # 元数据与 revision
      plugin.json                # PluginSpec，唯一事实来源（允许草稿）
      files/                     # raw 文件，路径即插件包内相对路径
      build/                     # 生成产物：api/ dbsetup/ *.zip
      state/nav-baseline.json    # 最近一次成功生成的导航快照
```

- `tenant` 与 `key` 都必须是安全目录名：`^[a-z0-9][a-z0-9-]*$`，长度 ≤64。
- `plugin.json` 内的 `key` 必须等于目录名；读取时若不一致视为工程损坏（`IO_ERROR`）。
- `files/` 中的文件保持字节原样；路径与 `PluginSpec.rawFiles[].path` 一致。

### 4.2 `project.json`

```json
{
  "key": "demo",
  "tenant": "local",
  "createdAt": "2026-11-06T05:00:00.000Z",
  "updatedAt": "2026-11-06T05:10:00.000Z",
  "revision": 7
}
```

- `revision` 从 1 开始，每次成功写 spec 加 1。
- `updatedAt` 为最近一次 spec 写入时间；列表页的更新时间取此值。

### 4.3 类型与接口

```ts
// src/workspace/types.ts
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
  key?: string;                       // 缺省由 name slug 化
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

  readSpec(ref: ProjectRef): Promise<{
    spec: unknown;
    revision: number;
    updatedAt: string;
  }>;
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

- 工作区根目录由 `WORKSPACES_DIR` 指定，默认 `<cwd>/workspaces`。
- `list` 读取 `workspaces/<tenant>/*/project.json` 与 `plugin.json`，按 `updatedAt` 倒序返回；跳过损坏工程并在服务端日志记录。
- `create` 使用 `createDefaultSpec`；显式 `key` 已存在时抛 `KEY_EXISTS`。未提供 `key` 时按名称 slug 化：转小写、非字母数字替换为 `-`、合并连续 `-`、去掉首尾 `-`；结果为空时用 `plugin`；冲突时追加 `-2`、`-3`。
- `writeSpec` 接受任意 JSON 值（草稿），只要求可序列化；结构问题由校验报告。
- `writeNavBaseline` 写扁平条目数组（递归收集所有 `entries`，含 children）。

### 4.4 默认 spec

```ts
createDefaultSpec({ key, name, publisher? }): PluginSpec
```

- `schemaVersion: 1`，`key` 为工程 key。
- `plugin.name = name`；`description = ""`。
- `version = "1.0.0"`；`dbVersion = "1.0.0"`；`navVersion = "1.0.0.0"`。
- `dbName = "${name} DB"`；`dbDescription = "${name} DB"`。
- `publisher = publisher ?? { name, email: "" }`。
- 其余数组为空：`tables`、`pages`、`navigation`、`powerQueries`、`accessRequest`、`permissionMappings`、`wildcards`、`messageKeys`、`rawFiles`。
- 空 email 会让校验报 `PUBLISHER_INVALID`，这是预期行为：新建工程后由概览页提示补全。

### 4.5 安全路径

`safePath(root, relative)`：

- 拒绝空串、绝对路径、反斜杠、盘符（`C:`）、NUL、任何 `.` / `..` 段。
- 归一化后必须位于 `root` 内（`path.relative` 不以 `..` 开头）。
- 对已存在的每一段做 `lstat`，拒绝符号链接。
- 写文件时先创建父目录，再复核最近存在的祖先目录的 `realpath` 仍在 root 内。
- raw 文件路径同样经过该函数；`build/` 与 `state/` 为服务端保留目录，raw 写入拒绝这些前缀。

### 4.6 原子写与并发

- 单文件写入：写同目录临时文件（`.<name>.tmp-<random>`）→ `fsync` 可选 → `rename` 覆盖。
- `build/` 生成：写入同级临时目录 `build.tmp-<random>` → 输出校验 → 旧 `build` 重命名为 `build.old-<random>` → 临时目录重命名为 `build` → 删除旧目录；任一步失败清理临时目录，不留半成品。
- 进程内按 `tenant/key` 串行化写操作（Promise 队列），避免同一进程内并发写互相覆盖。
- 跨进程并发不做文件锁；`revision` 检查为「读-比较-写」，本地单服务场景够用；多实例部署时换数据库事务。

## 5. 导航 version 自动递增

### 5.1 基准语义

- `state/nav-baseline.json` 在**每次成功生成**后写入：

```json
{
  "generatedAt": "2026-11-06T05:20:00.000Z",
  "entries": [ /* 扁平 NavEntrySpec[]，含 children */ ]
}
```

- 校验时读取该文件，作为 `validateSpec` 的 `previousNavigation`。
- 基准代表“上一次成功出包”的导航，而不是每次编辑的上一版。这样 version 的语义与实际发布的插件一致。

### 5.2 指纹

同 `htmlID` 的条目做稳定指纹，字段为：

`title`、`pageId`、`pageURL`、`sortOrder`、`parentHTMLID`、`districtLevelContext`、`contextType`、`requiredContext`、`isNewTab`、`isLandingPage`、`checkParams`、`schoolIds`、`extra`。

- 不含 `version` 与 `children`（children 按自己的 `htmlID` 单独比较）。
- 对象键按字典序序列化，数组中 `schoolIds` 排序后比较，保证稳定。
- `undefined` 与缺失字段等价。

### 5.3 `suggestNavVersion`

```ts
suggestNavVersion(
  entry: NavEntrySpec,
  baselineEntry: NavEntrySpec | undefined,
  defaultVersion: string,          // 通常为 plugin.navVersion
): string
```

规则：

1. 无 `baselineEntry`（新条目）：返回 `entry.version || defaultVersion`。
2. 指纹相同：返回 `entry.version || defaultVersion`，不递增。
3. 指纹不同：
   - 若 `entry.version` 存在且 `compareNavVersion(entry.version, baselineEntry.version) > 0`，保留用户值。
   - 否则取 `baselineEntry.version`，最后一段 +1（`1.0.0` → `1.0.1`，`1.0.0.9` → `1.0.0.10`）。
4. `baselineEntry.version` 缺失或非法时回退 `defaultVersion`。

`compareNavVersion` 按段数值比较，缺失段视为 0，最多 4 段。版本格式沿用现有校验：1–4 段数字。

### 5.4 UI 行为

- 表单中修改任一指纹字段后，立即计算建议值；若与当前值不同，在版本输入框旁提示「检测到内容变化，建议 1.0.0.2」，并自动填入建议值。
- 用户手动改成更大的值后不再自动覆盖；改小到不大于基准时才再次提示。
- 新增条目默认填 `plugin.navVersion`。
- 生成成功后基准更新，提示消失。

## 6. 服务端 API

### 6.1 配置与启动

```ts
buildServer(options?: {
  workspacesDir?: string;
  store?: WorkspaceStore;
  actor?: (req) => Actor;
})
```

- 默认 `workspacesDir = process.env.WORKSPACES_DIR ?? resolve(cwd, "workspaces")`。
- 默认 `actor` 返回 `{ tenant: "local", role: "owner" }`。
- 测试通过注入 `workspacesDir`（临时目录）与默认 actor。
- 仍然只监听 `127.0.0.1:5174`。

### 6.2 路由

| 方法 | 路径 | 请求 | 成功响应 |
| --- | --- | --- | --- |
| GET | `/api/health` | — | `{ ok: true }` |
| GET | `/api/projects` | — | `{ projects: ProjectSummary[] }` |
| POST | `/api/projects` | `{ key?, name, publisher? }` | 201 `{ project, spec }` |
| GET | `/api/projects/:key` | — | `{ project, spec, navBaseline }` |
| DELETE | `/api/projects/:key` | — | 204 |
| PUT | `/api/projects/:key/spec` | `{ spec, revision }` | `{ revision, updatedAt }` |
| POST | `/api/projects/:key/validate` | `{}` | `{ issues, errors, warnings }` |
| POST | `/api/projects/:key/generate` | `{ zip?: boolean }` | `{ files, artifacts, warnings, navBaseline }` |
| GET | `/api/projects/:key/download/:artifact` | — | zip 流 |
| GET | `/api/projects/:key/files` | — | `{ files: RawFileInfo[] }` |
| PUT | `/api/projects/:key/files?path=...` | multipart `file` | 201 `{ file: RawFileInfo }` |
| DELETE | `/api/projects/:key/files?path=...` | — | 204 |
| POST | `/api/validate` | `{ spec, previousNavigation? }` | 保留：无工程上下文的快速校验 |

### 6.3 关键行为

**校验**

- 读取 `plugin.json` 与 `state/nav-baseline.json`，调用 `validateSpec(spec, { previousNavigation })`。
- 返回 `{ issues, errors, warnings }`，与现有 `/api/validate` 一致。
- `plugin.json` 不是合法 JSON 对象时，路由捕获解析错误并返回 `SPEC_INVALID` issue，不抛 500。
- `navBaseline` 是扁平的 `NavEntrySpec[]`；无基准时为 `null`。GET 工程与生成响应都返回它，供导航表单计算建议版本。

**生成**

1. 读取 spec 并校验；有 error 返回 422 `VALIDATION_FAILED`，`details` 为 issues；不写 `build/`。
2. 调用现有 `generatePlan(spec, { rawFiles })`：raw 内容通过 `store.readFile` 从 `files/` 读取；引用缺失时返回 422，issue code 为 `RAW_FILE_MISSING`。
3. `validateOutput(files)`；有 error 同样 422。
4. 原子写 `build/`；`zip !== false` 时生成三个 zip。
5. 写 `state/nav-baseline.json`（扁平导航条目）。
6. 返回 `{ files: string[], artifacts: { api: boolean, dbsetup: boolean, combined: boolean }, warnings, navBaseline }`。

**下载**

- `artifact ∈ { api, dbsetup, combined }`；文件不存在返回 409 `BUILD_MISSING`。
- `Content-Disposition: attachment; filename="<key>-<artifact>.zip"`。
- 先确认 `build/` 内路径安全，再 `createReadStream`。

**raw 文件**

- multipart 单文件上限 10MB，超限 413 `FILE_TOO_LARGE`。
- `path` 必填，经 `safePath`；拒绝写入 `build/`、`state/`、`project.json`、`plugin.json`。
- 上传同名文件覆盖；列表递归 `files/`，返回 POSIX 相对路径、字节大小、mtime。

### 6.4 错误格式

```json
{ "error": { "code": "CONFLICT", "message": "...", "details": [] } }
```

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 缺字段、JSON 无法解析 |
| 400 | `KEY_INVALID` / `PATH_UNSAFE` | 非法 key / 路径逃逸 |
| 404 | `NOT_FOUND` | 工程或文件不存在 |
| 409 | `CONFLICT` | revision 不匹配 |
| 409 | `KEY_EXISTS` | 创建时 key 已存在 |
| 409 | `BUILD_MISSING` | 下载前尚未生成 |
| 413 | `FILE_TOO_LARGE` | 上传超过 10MB |
| 422 | `VALIDATION_FAILED` | 生成前校验有 error |
| 500 | `IO_ERROR` | 文件系统错误 |

### 6.5 现有接口兼容

- `/api/validate` 保持不变，前端旧的快速校验逻辑可继续使用。
- `src/web/App.tsx` 将被新的路由外壳替换；校验结果展示组件抽取为 `ValidationIssueList` 复用。

## 7. Web UI

### 7.1 路由

```
/                                  工程列表：新建、打开、删除；空状态引导
/projects/:key/overview            插件信息
/projects/:key/tables              表与字段
/projects/:key/pages               页面
/projects/:key/navigation          导航
/projects/:key/files               raw 文件
/projects/:key/advanced            spec 全文 JSON
/projects/:key/build               校验、生成、下载
```

- `/projects/:key` 重定向到 `overview`。
- 未知 key 显示工程不存在与返回列表入口。

### 7.2 布局

- 左侧：工程名 + 分组导航（配置 / 资源 / 交付）；底部显示插件版本。
- 顶部工具条：保存状态、「重新校验」、「生成」、校验错误计数。
- 主区域：表单或列表。
- 校验抽屉：从右侧滑出，按 severity/code/path 过滤；点击 issue 跳到目标页并高亮。
- 移动端不专门适配；最小宽度 1024px。

### 7.3 工程 store

```ts
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error';

interface ProjectStore {
  project: Project | null;
  spec: PluginSpec | null;
  revision: number;
  issues: ValidationIssue[];
  saveState: SaveState;
  lastSavedAt: string | null;
  conflict: { revision: number; spec: unknown } | null;

  load(key: string): Promise<void>;
  update(path: string, value: unknown): void;     // 不可变更新
  saveNow(): Promise<void>;
  reload(): Promise<void>;
  overwriteWithServerRevision(): Promise<void>;
  validateNow(): Promise<void>;
  generate(): Promise<GenerateResult | null>;
}
```

- `update` 立即更新本地 spec 并进入 `dirty`；800ms 防抖后 `saveNow`。
- 保存成功：`revision` 更新、`saveState = 'saved'`、`lastSavedAt` 更新；随后 1200ms 防抖自动校验。
- 保存失败 409：进入 `conflict`，暂停自动保存，弹出 `ConflictDialog`；可选择「载入服务器版本」或「用我的版本覆盖」（带服务器 revision 重试）。
- 保存其他错误：`saveState = 'error'`，顶部显示重试。
- `Cmd/Ctrl+S` 立即保存；`beforeunload` 在有未保存修改时提示。

### 7.4 各页面

**工程列表 `/`**

- 卡片/表格：名称、key、版本、更新时间。
- 「新建工程」对话框：key（可空，自动 slug）、名称、publisher 名称与邮箱。
- 每行「打开」「删除」；删除二次确认，输入 key 确认。

**概览 `/overview`**

- 插件信息表单：name、description、version、dbName、dbDescription、dbVersion、navVersion、publisher.name/email、oauth.enabled、oauth.accessLevelV1Api。
- `description` 是单个字符串，不做中英并排；`LocalizedText` 只用于标题、标签等字段。
- 只读摘要：表数、页面数、导航条目数、raw 文件数。
- 空 publisher.email 时内联提示。

**表 `/tables`**

- 左：表列表（extensionName.tableName），可新增/删除。
- 右：表详情：extensionName、schemaFile（默认 `${extensionName}.xml`）、tableName、childName、comment、type、primaryKey。
- 字段行编辑器：name、type、length（仅 String 启用）、comment；支持上移/下移。
- 新增表默认 `type=standalone`、`primaryKey=id`、`childName=tableName`。

**页面 `/pages`**

- 左：页面列表（title.en、kind、context、path），可新增/删除/跳转到生成预览（本切片仅列出，不渲染）。
- 右：按 `kind` 分块：
  - 公共：id、kind、context、path、title(en/zh)、table、studentScope、recordIdParam、apiResources、chrome。
  - `list`：columns 行编辑器（column、label、type、sortable、width）、filters（param、column、operator、widget、label、options、optionsSql、clientSide）、joins（table、on、type）、orderBy、csvExport。
  - `edit` / `settings`：fields 行编辑器（column、label、widget、required、readonly、hidden、maxLength、defaultValue、options、sqlOptions）。
  - `dashboard` / `custom`：customBody 文本域。
  - `raw`：提示页面内容来自 `files/` 中相同路径的文件。
- 绑定表用下拉选择 `tables[]`；字段/列用已选表的字段下拉，但保留自由输入（核心表场景）。
- context 变更时显示路径提示，不自动改写 path。

**导航 `/navigation`**

- 左：导航文件列表（filename、contextType、条目数）。
- 右：条目树编辑器：htmlID、title(en/zh)、sortOrder、version、pageId（页面下拉）、pageURL、schoolIds、contextType、requiredContext、districtLevelContext、parentHTMLID、isNewTab、isLandingPage、checkParams、children。
- 版本提示与自动递增按 §5.4；建议时按 `htmlID` 在 `navBaseline` 中查找同条目。
- 新增条目：继承文件级 contextType，version 默认 `plugin.navVersion`。
- 删除父条目时其 children 一并删除（确认提示）。

**raw 文件 `/files`**

- 列表：路径、大小、更新时间；上传（多选）、删除。
- 不提供在线编辑；文本编辑留给代码编辑器切片。
- 上传成功后自动把该路径追加到 `spec.rawFiles`（已存在则跳过）；删除文件时同步移除对应的 `rawFiles` 条目。若文件被 `kind: "raw"` 页面引用，删除前额外警告。
- 列表区分「已引用」与「未引用」文件；未引用文件保留在 `files/` 但不参与生成。

**高级 `/advanced`**

- 整份 spec 的 JSON textarea；解析失败只提示不保存。
- 保存走同一 `update`/自动保存管线。
- 顶部提示：PowerQuery、权限、wildcards、MessageKeys 目前在此编辑。

**构建 `/build`**

- 校验摘要与 issue 列表（复用抽屉组件）。
- 「生成」按钮：有 error 时禁用并提示；生成中显示加载状态。
- 成功后展示：生成文件树（只读）、三个 zip 的下载按钮、生成时间。
- 生成失败展示结构化 issues。

### 7.5 表单通用约定

- 行表格统一用 `RowEditor`：新增、删除、上移/下移；不做拖动排序（留给拖拽切片）。
- `LocalizedTextInput`：en 必填、zh 可空，并排显示。
- 输入不做本地业务校验；只做 `required`、数字范围、长度等 HTML 约束和即时提示；最终以服务端 issues 为准。
- issue 高亮：`target.id` 匹配列表行；`path` 前缀匹配字段容器。匹配不到时只在抽屉展示。
- 所有删除操作二次确认；工程删除额外要求输入 key。

## 8. 多租户预留

- 所有 `WorkspaceStore` 方法显式接收 `tenant` 或 `ProjectRef.tenant`；v1 路由从 `resolveActor(req)` 取租户，不读请求体。
- 存储路径 `workspaces/<tenant>/<key>/`；切换 tenant 不需要改路由或 store 接口。
- `Actor`：

```ts
interface Actor {
  tenant: string;
  role: "owner" | "editor" | "viewer";
}
```

- v1 不校验 role；后续在路由层加 `requireRole('editor')` 之类中间件，并替换 `resolveActor` 为会话/JWT 解析。
- 不实现跨租户列举、共享、迁移。

## 9. 测试策略

沿用 Vitest；测试文件与被测代码同目录。

**工作区层**

- `localFsStore.test.ts`：
  - 创建/列表/读取/删除；显式 key 冲突。
  - `writeSpec` revision 递增；旧 revision → `CONFLICT` 且不写入。
  - 原子写：写入失败时旧文件保持不变（用不可写目录或 mock）。
  - `safePath`：`..`、绝对路径、反斜杠、符号链接、保留目录全部拒绝。
  - raw 文件读写删、递归列表。
  - nav 基准读写与 children 扁平化。

**core**

- `navVersion.test.ts`：新增、指纹未变、内容变化、手动更高值、版本段缺失、`9 → 10` 进位。

**服务端**

- `projects.test.ts`（`app.inject` + 临时 `WORKSPACES_DIR`）：
  - 工程 CRUD 与 404。
  - PUT spec 成功与 409。
  - validate 返回 issues。
  - generate：有 error 422、成功写 build 与基准、返回文件列表。
  - download：未生成 409、生成后 200 且 zip 可解。
  - 上传：正常、超 10MB 413、路径逃逸 400。
  - tenant 默认 `local`；注入自定义 actor 时路径落在对应 tenant。

**Web**

- `ProjectListPage`：渲染列表、空状态。
- `TablesPage`：新增/删除表与字段；自动保存调用（mock fetch + fake timers）。
- `NavigationPage`：内容变化触发版本建议并提示。
- `SaveStatus` / `ConflictDialog`：状态切换与两个冲突动作。
- 校验抽屉：issue 跳转回调。

**完成门槛**

- `npm test`、`npm run typecheck`、`npm run build:web` 全部通过。
- 新增测试与既有 110 个测试共同通过。

## 10. 依赖与脚本

**运行时依赖**

- `react-router-dom`
- `zustand`
- `@fastify/multipart`

**开发依赖**

- `concurrently`

**脚本**

```json
{
  "dev": "concurrently -k \"tsx watch src/server/index.ts\" \"vite\"",
  "dev:server": "tsx watch src/server/index.ts",
  "dev:web": "vite",
  "build:web": "vite build",
  "start": "tsx src/server/index.ts",
  "cli": "tsx src/cli/index.ts",
  "test": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

- Vite 继续代理 `/api` 到 `127.0.0.1:5174`。
- `WORKSPACES_DIR` 可选，默认 `./workspaces`。

## 11. 验收标准

1. `npm run dev` 一条命令启动；浏览器完成「新建工程 → 填插件信息 → 建表与字段 → 建页面 → 配导航 → 校验 → 生成 → 下载 `combined.zip`」全流程。
2. 刷新页面、重启服务后工程与 spec 完整保留。
3. 两个标签页同时编辑时，后保存方收到 409；可载入服务器版本或强制覆盖，不丢数据。
4. 修改导航条目内容后 version 自动递增；手动改高不回退；重新生成后基准更新。
5. 生成前有 error 时返回 422 且不写 `build/`；成功时 `build/` 原子替换，三个 zip 可下载。
6. raw 文件可上传/删除，并被生成结果引用。
7. 所有路径操作限制在 `workspaces/` 内；`..`、绝对路径、符号链接逃逸、保留目录写入均被拒绝。
8. `WorkspaceStore` 与 `actor` 接缝存在：把 actor 的 tenant 改为其他值后，工程落在对应目录，路由代码无需修改。
9. 高级 JSON 页可编辑整份 spec，解析失败不保存。
10. `npm test`、`npm run typecheck`、`npm run build:web` 全部通过。

## 12. 实施顺序

供后续 writing-plans 拆分：

1. `core/spec/defaults.ts` + `core/spec/navVersion.ts` 及测试。
2. `workspace/types.ts`、`errors.ts`、`safePath.ts`、`localFsStore.ts` 及测试。
3. `server/actor.ts`、`server/app.ts` 改造、`server/routes/projects.ts` 及测试。
4. Web 外壳：路由、布局、API 封装、Zustand store、工程列表、保存状态与冲突弹窗。
5. 概览页与表页表单。
6. 页面表单。
7. 导航表单与版本建议。
8. raw 文件页、高级 JSON 页、构建页。
9. `npm run dev`、README 更新、`.gitignore` 增加 `workspaces/`。

## 13. 风险与取舍

- **页面编辑器体量大**：`PageSpec` 字段多。用按 `kind` 分块 + 通用 `RowEditor` 控制复杂度；复杂页面仍可用高级 JSON。
- **草稿保存**：允许保存非法 spec 会带来「看起来存上了但生成失败」。通过顶部错误计数、构建页禁用生成、校验抽屉持续可见来缓解。
- **导航基准粒度**：基准是「上一次成功生成」，适合单环境本地工作流。将来多环境/多客户时，基准应跟随环境而不是工程，届时扩展为 `state/environments/<id>/nav-baseline.json`。
- **跨进程并发**：v1 不做文件锁。单机单服务足够；部署多实例时由 `WorkspaceStore` 的新实现提供事务级并发控制。
- **raw 文件与生成路径冲突**：沿用既有校验 `RAW_PATH_CONFLICT`；上传时不做额外拦截，避免把生成规则复制到存储层。
- **不做账号**：`actor` 是接缝而不是实现。公网部署前必须补上认证、授权和租户隔离测试。
