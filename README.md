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
npm run build:web && npm start   # 生产模式：由 5174 提供 dist/web
```

开发模式打开 `http://127.0.0.1:5173`；生产模式打开 `http://127.0.0.1:5174`。

## 已实现

- 工程工作区：`workspaces/local/<key>/`，包含元数据 `project.json`、spec `plugin.json`、`files/`、`build/`、`state/`；`build/`、`state/` 在第一次生成时创建。
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
