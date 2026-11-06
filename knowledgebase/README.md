# PowerSchool SIS 开发知识库

本知识库系统整理了 **PowerSchool SIS API** 与 **PowerSchool SIS Customization** 两大部分，面向本仓库的
PowerSchool 插件工作台（plugin workbench）开发，也可作为日常插件开发的查阅手册。

## 资料来源

- PowerSchool Developer Portal：`https://support.powerschool.com/developer/`（需登录）
- 抓取日期：**2026-11-06**
- 页面范围：门户中 **PS SIS API**、**PS SIS Customization** 两个栏目及其全部子页面；另抓取了门户内置的
  Core Resources / PowerQuery Resources Swagger 规范。
- 凭据只用于抓取文档，**没有**写入本知识库；文中所有服务器地址、Client ID、Secret 均为占位符。

完整的页面清单与原始 slug 见 [_sources.md](_sources.md)。

> 注意：PowerSchool SIS 版本迭代很快，不同版本文档与行为可能有差异。文中标注了已知的版本门槛
> （如 `25.2.0.0+`、`23.5.0.0+`）。在客户环境实施前，请以该实例的 **PowerSchool 版本**和门户最新文档为准。

## 怎么用

按任务找入口：

| 我要做什么 | 先读 |
| --- | --- |
| 快速理解 PS SIS / 插件 / API 全貌 | [00-overview.md](00-overview.md) |
| 让外部系统调用 API（OAuth） | [01-api/01-authentication.md](01-api/01-authentication.md) |
| 搞清楚分页、搜索、状态码、批量写入 | [01-api/02-api-conventions.md](01-api/02-api-conventions.md) |
| 查 v1 标准资源（学生/学校/课程/…） | [01-api/03-core-endpoints.md](01-api/03-core-endpoints.md) |
| 写 PowerQuery 或直接读写表 | [01-api/04-schema-and-powerqueries.md](01-api/04-schema-and-powerqueries.md) |
| 做增量同步 / 事件回调 | [01-api/05-events-and-delta.md](01-api/05-events-and-delta.md) |
| 配置插件权限、字段白名单、DRF | [01-api/06-security-model.md](01-api/06-security-model.md) |
| 做 SSO（OpenID / OIDC / SAML） | [01-api/07-sso.md](01-api/07-sso.md) |
| 复制常见调用代码 | [01-api/08-recipes.md](01-api/08-recipes.md) |
| 打包一个插件（plugin.xml / 目录结构） | [02-customization/01-plugin-package.md](02-customization/01-plugin-package.md) |
| 建扩展表（U_ 表） | [02-customization/02-database-extensions.md](02-customization/02-database-extensions.md) |
| 写 PS-HTML 页面 / DirectTable / JSON 端点 | [02-customization/03-pages-and-ps-html.md](02-customization/03-pages-and-ps-html.md) |
| 把页面挂到左侧导航（23.5+） | [02-customization/04-enhanced-navigation.md](02-customization/04-enhanced-navigation.md) |
| 定制 Start Page / Angular 组件 / 联系人 / 事件 UI | [02-customization/05-angular-customization.md](02-customization/05-angular-customization.md) |
| 定制 PowerTeacher Pro | [02-customization/06-powerteacher-pro.md](02-customization/06-powerteacher-pro.md) |
| 做 Validation Dashboard | [02-customization/07-validation-dashboard.md](02-customization/07-validation-dashboard.md) |
| 写 PowerQuery DAT | [02-customization/08-powerquery-dat.md](02-customization/08-powerquery-dat.md) |
| 查全部 API 路径 | [03-reference/01-endpoint-catalog.md](03-reference/01-endpoint-catalog.md) |
| 查内置 PowerQuery | [03-reference/02-powerquery-catalog.md](03-reference/02-powerquery-catalog.md) |
| 理解 DCID / ID / FRN / 表关系 | [03-reference/03-database-ids.md](03-reference/03-database-ids.md) |
| 排查 403/400/500、导航不显示 | [04-playbook.md](04-playbook.md) |

## 目录结构

```
knowledgebase/
├── README.md                     # 本文件：索引与阅读路径
├── 00-overview.md                # 平台、API 版图、定制手段、选型决策树
├── 01-api/
│   ├── 01-authentication.md      # OAuth client credentials、token、session cookie、自动注册
│   ├── 02-api-conventions.md     # 方法、版本、搜索、分页、expansion、校验、状态码
│   ├── 03-core-endpoints.md      # /ws/v1 标准资源详解
│   ├── 04-schema-and-powerqueries.md  # /ws/schema/table 与 PowerQuery
│   ├── 05-events-and-delta.md    # 事件订阅、Webhook、Data Version 增量拉取
│   ├── 06-security-model.md      # access_request、permission mapping、exclude list、DRF
│   ├── 07-sso.md                 # OpenID 2.0 / OIDC / SAML
│   └── 08-recipes.md             # 可直接套用的请求示例
├── 02-customization/
│   ├── 01-plugin-package.md      # plugin.zip 结构、plugin.xml 全部元素
│   ├── 02-database-extensions.md # 1:1 / 1:N / standalone 扩展表与 tlist 标签
│   ├── 03-pages-and-ps-html.md   # PS-HTML、页面骨架、DirectTable、JSON 端点
│   ├── 04-enhanced-navigation.md # 23.5+ 导航 JSON（PageCatalog / Navigation）
│   ├── 05-angular-customization.md # Start Page、Schoology 考勤、Incidents、Student Contacts
│   ├── 06-powerteacher-pro.md    # PowerTeacher Pro 页面定制
│   ├── 07-validation-dashboard.md# 26.5+ 校验仪表盘
│   └── 08-powerquery-dat.md      # 22.9+ PowerQuery DAT
├── 03-reference/
│   ├── 01-endpoint-catalog.md    # 自动生成：409 个核心 API 操作
│   ├── 02-powerquery-catalog.md  # 自动生成：438 个内置 PowerQuery
│   ├── 03-database-ids.md        # 主键、伪键、外键、Teachers/Users/SchoolStaff
│   └── 04-errors-and-glossary.md # 错误码与术语表
├── 04-playbook.md                # 端到端实施清单与排错
└── _sources.md                   # 门户页面 slug 清单
```

## 三条主线

理解 PowerSchool 开发，抓住三条主线即可：

1. **数据从哪来**
   - `/ws/v1/*`：版本化 REST 资源，覆盖 District / School / Student / Staff / Course / Section / Term 等核心对象。
   - `/ws/schema/query/*`：PowerQuery，可自定义 SQL，返回任意形状的数据；插件开发的主力。
   - `/ws/schema/table/*`：直接对表/扩展表做 CRUD，适合简单表维护。
2. **权限怎么过**
   - 外部调用：`<oauth>`；`/ws/v1` 看 `accessLevelV1Api`，`/ws/schema` 与 PowerQuery 看
     `<access_request>`（字段级白名单），两者都受排除表/字段规则约束。
   - 内部调用（浏览器会话）：`permission_mappings`（页面 → 资源/HTTP 方法）+ FLS + DRF。
3. **界面怎么挂**
   - 页面：`web_root/**` 下的 PS-HTML 页面（或 Angular 定制）。
   - 导航：23.5+ 用 `pagecataloging/*.json`；更老的教师/家长/学生门户常用 `wildcards/*.txt`。
   - 应用内定制：`angularCustomizations`（Start Page、Schoology 考勤、Incidents 等）。

## 与仓库现有 spec 的对应

本仓库 `docs/superpowers/specs/2026-11-06-powerschool-plugin-workbench-design.md` 定义的
`api/` + `dbsetup/` 双包结构、`pagecataloging`、`user_schema_root`、`MessageKeys`、`wildcards`
都能在本知识库中找到对应的官方规则：

- 包结构与 `plugin.xml` → [02-customization/01-plugin-package.md](02-customization/01-plugin-package.md)
- `user_schema_root/*.xml` → [02-customization/02-database-extensions.md](02-customization/02-database-extensions.md)
- 页面 / DirectTable / JSON 端点 → [02-customization/03-pages-and-ps-html.md](02-customization/03-pages-and-ps-html.md)
- 导航 JSON → [02-customization/04-enhanced-navigation.md](02-customization/04-enhanced-navigation.md)
- 权限 → [01-api/06-security-model.md](01-api/06-security-model.md)

## 校验实现

本知识库的关键规则已经落成代码校验（`src/core/validate/`）：

- `validateSpec(spec, { previousNavigation? })`：Zod 结构校验 + 规则引擎。
- 已覆盖：`student` 页面只能放 `guardian/`、导航 `version` 必填/递增、PowerQuery 字段必须
  出现在 `access_request`、扩展表/页面/MessageKeys/raw 路径等。
- 规则码与说明见设计文档
  [§8 校验规则](../docs/superpowers/specs/2026-11-06-powerschool-plugin-workbench-design.md#8-校验规则)。
- 生成器 `src/core/generate/` 已能输出 plugin.xml、schema XML、pagecataloging、PowerQuery、
  permission mappings、MessageKeys、页面/JSON/JS、wildcards 和 zip。
- 运行：
  - `npm test`（110 个测试）、`npm run typecheck`
  - `npm run cli -- validate <spec.json>` / `npm run cli -- generate <spec.json> --zip`
  - `npm run dev:server` + `npm run dev:web` 打开校验结果页面

## 约定

- 中文叙述，保留英文技术术语（PowerQuery、DAT、FRN、DRF 等），便于与官方文档对照。
- 代码块中的 `{...}` 为占位符，不要直接提交真实凭据。
- “门户原文”指 Developer Portal 对应页面；本知识库是归纳，不是逐字翻译。
- 标注 `⚠️` 的是容易踩坑或文档之间存在差异的地方。
- **本项目现场约定**：没有 `web_root/students/`；学生门户与家长门户共用 `/guardian/`。
  学生页放在 `web_root/guardian/`。官方文档在部分版本可能出现 `/students/`，以现场为准。
