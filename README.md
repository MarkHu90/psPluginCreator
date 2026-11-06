# PowerSchool Plugin Workbench

PowerSchool 插件工作台：**spec 校验 + 生成 + 输出校验 + CLI + Web UI** 已落地。

- 设计文档：[docs/superpowers/specs/2026-11-06-powerschool-plugin-workbench-design.md](docs/superpowers/specs/2026-11-06-powerschool-plugin-workbench-design.md)
- PowerSchool 知识库：[knowledgebase/README.md](knowledgebase/README.md)

## 环境

- Node.js 24+
- npm

```bash
npm install
npm test          # 110 个测试
npm run typecheck
npm run build:web # 构建 Web UI 到 dist/web
```

## 快速开始

### 1. 校验 spec

```bash
npm run cli -- validate path/to/plugin.json
npm run cli -- validate path/to/plugin.json --json
```

退出码：有 error 时为 1，否则为 0。`--previous previous-nav.json` 可以检查导航 version
是否相对上一版递增。

### 2. 生成插件

```bash
npm run cli -- generate path/to/plugin.json --out build
npm run cli -- generate path/to/plugin.json --out build --zip
```

生成内容：

```
build/
├── api/
│   ├── plugin.xml
│   ├── pagecataloging/*.json
│   ├── MessageKeys/*.properties
│   ├── queries_root/*.xml
│   ├── permissions_root/*.xml
│   └── web_root/...
├── dbsetup/
│   ├── plugin.xml
│   └── user_schema_root/*.xml
└── api.zip / dbsetup.zip / combined.zip   # --zip
```

生成前会跑 spec 校验与输出校验；有 error 时不写文件。

### 3. Web UI

```bash
npm run dev:server   # Fastify API，127.0.0.1:5174
npm run dev:web      # Vite，127.0.0.1:5173（/api 代理到 5174）
```

打开 `http://127.0.0.1:5173`，粘贴/打开 `plugin.json`，点击「运行校验」。
生产模式：

```bash
npm run build:web
npm start            # 服务 dist/web + /api/validate
```

## 代码用法

```ts
import {
  validateSpec,
  validateOutput,
  generatePlan,
  buildZip,
} from './src/core/index';

// 1. 校验 spec
const issues = validateSpec(spec, { previousNavigation });

// 2. 生成文件计划（纯函数）
const files = generatePlan(spec, { rawFiles });

// 3. 输出校验：XML/JSON 重解析、PS-HTML 标签配对
const outputIssues = validateOutput(files);

// 4. 打包
const combined = buildZip(files, 'combined');
```

`validateSpec` 先做 Zod 结构校验，再跑规则引擎；返回 `ValidationIssue[]`，不会抛异常。

## 已实现的关键规则

| 场景 | code |
| --- | --- |
| `student` 页面放到了 `students/` | `PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN` |
| 导航 `version` 缺失/格式错 | `NAV_VERSION_REQUIRED` / `NAV_VERSION_INVALID` |
| 导航内容变了但 version 没涨 | `NAV_VERSION_NOT_INCREMENTED` |
| PowerQuery 字段不在 `access_request` | `PQ_FIELD_NOT_IN_ACCESS_REQUEST` |
| PowerQuery 命中 Exclude List | `PQ_EXCLUDED_FIELD` |
| 页面声明的 `apiResources` 缺 permission mapping | `PERMISSION_MAPPING_MISSING` |
| PowerQuery 映射没写 `allow="post"` | `PERMISSION_METHOD_MISSING` |
| 扩展表字段/标识符/长度错误 | `TABLE_*` |
| MessageKeys / wildcards / raw 路径问题 | `MESSAGE_KEY_*` / `WILDCARD_*` / `RAW_*` |
| 输出 XML/JSON 非法、标签不配对、zip 路径不安全 | `OUTPUT_*` |

完整规则表见设计文档 §8。

## 目录

```
src/
  core/
    index.ts                 # 对外导出
    spec/
      schema.ts              # Zod schema
      types.ts               # PluginSpec 等类型
    validate/
      index.ts               # validateSpec + 规则
      powerQueryParser.ts    # PowerQuery 字段提取
      output.ts              # 生成后校验
    generate/
      plan.ts                # GeneratedFile[] 计划
      pluginXml.ts           # plugin.xml
      dbSchema.ts            # user_schema_root/*.xml
      navigation.ts          # pagecataloging/*.json
      powerQueries.ts        # queries_root/*.xml
      permissions.ts         # permissions_root/*.xml
      messageKeys.ts         # MessageKeys/*.properties
      pages.ts               # 页面 + JSON 端点 + JS
      wildcards.ts           # wildcards/*.txt
      zip.ts                 # api/dbsetup/combined zip
  cli/                       # psplugin validate / generate
  server/                    # Fastify /api/validate
  web/                       # React + Vite 校验结果页面
```

## 项目约定

- 本实例**没有 `web_root/students/`**；学生门户与家长门户共用 `/guardian/`。
  `student` 上下文页面输出到 `guardian/`；`adminStudent` 页面仍在 `admin/`。
- 外部 API：`/ws/v1` 看 `accessLevelV1Api`；`/ws/schema` 与 PowerQuery 看 `access_request`。
- 内部页面：需要 `permission_mappings`，并受 FLS/DRF 限制。
- 页面 `apiResources` 声明它调用的 PowerQuery/Table API，校验会要求对应 permission mapping。

## 下一步

- 导入现有插件 `src/core/import/*`
- 更完整的页面生成（筛选器 SQL、CSV 转义、Angular 页面）
- Web UI 的表单编辑器/文件树/生成预览（当前先展示校验结果）
- 生成后 zip 内容与 spec 的一致性核对
