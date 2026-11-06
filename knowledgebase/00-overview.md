# 00 · PowerSchool SIS 开发总览

## 1. 平台构成

PowerSchool SIS 是一个多门户的学生信息系统（Student Information System）：

| 门户 | 路径前缀 | 主要用户 |
| --- | --- | --- |
| Admin Portal | `/admin/` | 学校/学区管理员、教务 |
| Teacher Portal | `/teachers/` | 教师 |
| PowerTeacher Pro | `/teachers/powerteacher-pro/` | 教师（新一代成绩册 SPA） |
| Guardian / Student Portal | `/guardian/` | 家长与学生（本项目现场：两者共用 `/guardian/`，**没有独立的 `/students/` 目录**） |

底层是 **Oracle 数据库**，核心业务表以 `STUDENTS`、`SCHOOLS`、`SECTIONS`、`CC`（选课/注册）、
`COURSES`、`TERMS`、`USERS`、`SCHOOLSTAFF` 等为中心。很多“表”其实是视图（例如 `TEACHERS`），
主键体系也有历史包袱，详见 [03-reference/03-database-ids.md](03-reference/03-database-ids.md)。

## 2. 扩展方式全景

PowerSchool 提供四层扩展能力，从“最官方/最稳定”到“最贴近数据库”：

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 插件包 (Plugin ZIP)                                       │
│    plugin.xml + 页面 + 导航 + 扩展表 + PowerQuery + 权限映射  │
├─────────────────────────────────────────────────────────────┤
│ 2. REST / Schema API                                         │
│    /ws/v1/*  /ws/schema/query/*  /ws/schema/table/*          │
├─────────────────────────────────────────────────────────────┤
│ 3. 服务端页面 (PS-HTML)                                      │
│    DirectTable、tlist_sql、~[wc:*]、DAT、gpv                 │
├─────────────────────────────────────────────────────────────┤
│ 4. 前端定制 (Angular / AngularJS)                            │
│    angularCustomizations、页面 insertion point、PTP 定制     │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 插件包

一个插件本质是一个 ZIP，根目录必须有 `plugin.xml`。可选目录：

| 目录 | 作用 |
| --- | --- |
| `MessageKeys/` | 国际化 properties |
| `pagecataloging/` | 23.5+ 左侧导航 JSON |
| `permissions_root/` | 内部 API 的权限映射 |
| `queries_root/` | PowerQuery 定义 |
| `user_schema_root/` | 数据库扩展表定义 |
| `data_change_configuration_root/` | Data Version 增量订阅 |
| `web_root/` | 页面、脚本、图片、wildcards |

详见 [02-customization/01-plugin-package.md](02-customization/01-plugin-package.md)。

**本仓库的约定**是把“API 插件”和“数据库插件”拆成两个 ZIP（`api/`、`dbsetup/`），
再打一个把两者合并的 `combined.zip`。官方也支持一个 ZIP 同时包含这些目录。

### 2.2 API 版图

| API | 前缀 | 认证 | 典型用途 |
| --- | --- | --- | --- |
| 版本化 REST | `/ws/v1/...` | OAuth / 会话 cookie | 标准对象 CRUD、分页、expansion |
| PowerQuery | `/ws/schema/query/{name}` | OAuth / 会话 cookie | 自定义 SQL、报表、复杂关联 |
| Table API | `/ws/schema/table/{table}` | OAuth / 会话 cookie | 扩展表/部分核心表 CRUD |
| Metadata | `/ws/schema/table`、`/ws/schema/area`、`/ws/v1/metadata` | 同上 | 表结构、字段、分页上限 |
| Events | `/ws/v1/event_subscription` | OAuth | Webhook 订阅数据变更 |
| Data Version | `/ws/dataversion/{app}/{version}` | OAuth | 增量/Delta 拉取 |
| 三腿 OAuth / OIDC | `/oauth2/*` | OAuth 2.0 | 代表用户 SSO / 取用户身份 |

**关键区别：**

- **外部调用**（你的服务器 → SIS）：必须用 OAuth 2.0 **client credentials** 换 access token。
  插件里声明 `<oauth>`；如要走 `/ws/v1`，25.2+ 还需 `accessLevelV1Api="READ|FULL"`。
- **内部调用**（浏览器里已登录的用户 → 同源页面脚本）：用 `psaid` 会话 cookie。
  PowerSchool **先检查 access token，再检查 cookie**；token 无效时回落到 cookie。

### 2.3 定制手段

| 场景 | 首选方案 | 备注 |
| --- | --- | --- |
| 新增业务表 | `user_schema_root` 扩展表 | 1:1 / 1:N / standalone 三种 |
| 列表/编辑/设置页 | PS-HTML + DirectTable + JSON 端点 | 传统但稳定；本仓库生成器走这条路 |
| 复杂查询/报表 | PowerQuery | 可被外部 API、内部页面、Data Export Manager 复用 |
| 管理页里的单个值 | PowerQuery DAT（22.9+） | `~(*powerquery;query=...)` |
| 左侧导航 | `pagecataloging/*.json`（23.5+） | 老门户/教师/家长仍常用 wildcards |
| Start Page / Schoology 考勤 / Incidents | `angularCustomizations` | 组件异步渲染，必须等函数可用 |
| PowerTeacher Pro | `web_root/teachers/powerteacher-pro/**` | 用 `data-linked-from-*` 挂菜单 |
| 联系人编辑页 | insertion point + `psCustomizationUtils.addExtensions` | 扩展字段绑定 `extensionModel` |
| 校验仪表盘 | PowerQuery + permission mapping + JS 注册 | 26.5.0.0+ |

## 3. 选型决策树

### 3.1 数据读取

```
需要的数据是否正好是 /ws/v1 暴露的标准对象？
├─ 是 → 用 /ws/v1（expansions 控制返回体积）
└─ 否 → 数据能否用一条 SQL 表达？
        ├─ 能 → PowerQuery（插件 queries_root）
        └─ 不能/需要多步 → 拆分多个 PowerQuery，或直接 Table API 读扩展表
```

### 3.2 数据写入

```
目标表是扩展表（U_*）吗？
├─ 是 → Table API（POST/PUT/DELETE /ws/schema/table/...）
│        或 PS-HTML DirectTable
└─ 否 → 是 Student/Student Test/Fee 等标准对象？
        ├─ 是 → /ws/v1（注意 accessLevelV1Api）
        └─ 否 → 用 DirectTable 页面，或 PowerQuery 只读 + 自定义服务端逻辑
```

> PowerQuery 是**只读**的（SELECT）；不要试图在 PowerQuery 里写 INSERT/UPDATE。

### 3.3 页面放哪

| 用户 | 目录 | 页头/页脚标签 |
| --- | --- | --- |
| 管理员（非学生上下文） | `web_root/admin/...` | `~[wc:admin_header_css]` / `~[wc:admin_navigation_css]` / `~[wc:admin_footer_css]` |
| 管理员（学生上下文） | `web_root/admin/students/...` | `~[wc:admin_header_frame_css]` / `~[wc:admin_navigation_frame_css]` / `~[wc:admin_footer_frame_css]` |
| 教师 | `web_root/teachers/...` | `~[wc:teachers_header_fr_css]` / `~[wc:teachers_footer_fr_css]` |
| 家长 / 学生 | `web_root/guardian/...` | `~[wc:guardian_header_yui]` / `~[wc:guardian_footer]`（学生门户同样走 `/guardian/`，本项目没有 `web_root/students/`） |

## 4. 一个请求的完整安全链路

以“外部插件读学生”为例：

```
插件安装
  └─ plugin.xml 声明 <oauth>（/ws/v1 还需 accessLevelV1Api）
       └─ 若访问 /ws/schema 或 PowerQuery：管理员批准 <access_request> 字段清单
            └─ 生成 Client ID / Secret
                 └─ 你的服务器 POST /oauth/access_token (Basic base64(id:secret))
                      └─ 拿到 Bearer token（12 小时；25.3 前为 30 天）
                           └─ GET /ws/v1/school/25/student?expansions=demographics
                                └─ PowerSchool 检查：
                                   1) token 有效性
                                   2) /ws/v1：accessLevelV1Api 是否允许
                                      /ws/schema 或 PowerQuery：access_request 是否覆盖字段
                                   3) 是否命中 exclude list
                                   4) 内部 API 才检查 permission mapping
                                   5) 内部 API 才应用 DRF 行级限制
```

内部 API（会话 cookie）多两道：`permission_mappings` 与 DRF；字段无权限时**静默剔除**，
而外部 OAuth 是**直接 403**。完整对照见 [01-api/06-security-model.md](01-api/06-security-model.md)。

## 5. 版本门槛速查

| 能力 | 最低版本 |
| --- | --- |
| PowerQuery 基本执行 | 8.2.0 |
| DRF / 内部 API 执行 PowerQuery | 9.0.0 |
| 表视图可用于 PowerQuery | 9.2.0 |
| Data Version (Delta Pull) | 10.0 |
| Three-legged OAuth / OIDC | 20.11.0.0 |
| Enhanced Navigation（`pagecataloging`） | 23.5.0.0 |
| `accessLevelV1Api`（v1 API 访问开关） | 25.2.0.0 |
| Access token 从 30 天改为 12 小时 | 25.3.0.0 |
| Validation Dashboard | 26.5.0.0 |
| PowerQuery DAT | 22.9.0.0 |
| Schoology 考勤集成定制 | 21.4.1.0 |

## 6. 建议的学习顺序

1. 先读 [01-api/01-authentication.md](01-api/01-authentication.md) 和
   [02-api-conventions.md](01-api/02-api-conventions.md)，能发出第一个请求。
2. 用 [03-core-endpoints.md](01-api/03-core-endpoints.md) 熟悉标准对象。
3. 读 [04-schema-and-powerqueries.md](01-api/04-schema-and-powerqueries.md)，这是插件开发的核心生产力。
4. 读 [06-security-model.md](01-api/06-security-model.md)，避免 403。
5. 再进入 [02-customization/](02-customization/) 做页面、扩展表、导航。
6. 最后看 [04-playbook.md](04-playbook.md) 做端到端落地和排错。
