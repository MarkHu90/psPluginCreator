# 04 · 错误码与术语表

## 1. HTTP 状态码速查

| 码 | 含义 | 常见原因 | 处理 |
| --- | --- | --- | --- |
| 200 | OK | 成功；但批量/查询可能部分失败或 0 行 | 检查响应体 |
| 201 | Created | 新建成功 | 看 `Location` |
| 204 | No Content | 成功无响应体；也可能是对象不存在 | 结合上下文判断 |
| 304 | Not Modified | 未变化 | — |
| 400 | Bad Request | 缺 token、未登录内部 API、参数/JSON 错误、Content-Type 不符、凭据错 | 看 `message`/`error` |
| 401 | Unauthorized | 缺 Authorization、token 无效/过期、只支持内部 API 且未登录 | 刷新 token / 登录 |
| 403 | Forbidden | 字段不在 access_request、命中 exclude list、缺 permission mapping、FLS 无权限 | 见 [06-security-model](../01-api/06-security-model.md) |
| 404 | Not Found | URI 错、id 不存在 | 确认 DCID/ID |
| 405 | Method Not Allowed | 对 PowerQuery 用 GET 等 | 换方法 |
| 406 | Not Acceptable | Accept 不支持 | 改 Accept |
| 409 | Conflict | 唯一约束、更新不存在 | 查数据 |
| 413 | Too Large | 批量过大 | 拆分 |
| 415 | Unsupported Media Type | Content-Type/Accept 错 | 改头 |
| 429 | Too Many Requests | 限流 | 按 `Retry-After` |
| 500 | Internal Server Error | 服务端异常、PowerQuery SQL/配置错 | 查日志/反馈 |
| 501 | Not Implemented | 方法未实现 | — |
| 503 | Service Unavailable | 依赖缺失（动态插件服务） | 稍后重试 |
| 509 | Bandwidth Limit | 限流 | 退避 |

> 内部 API 的怪现象：同时支持内部+Partner 的端点，未登录返回 **400**；只支持内部的端点返回 **401**。

---

## 2. OAuth 错误

### 获取 token

| 状态 | error | 原因 |
| --- | --- | --- |
| 400 | `invalid_request` | 缺参数/重复参数/多种认证混用 |
| 400 | `unsupported_grant_type` | grant type 不支持 |
| 401 | `invalid_client` | Client ID/Secret 错 |

### 调用资源

| 状态 | 说明 |
| --- | --- |
| 400 | `Missing parameters: access_token` |
| 401 | `invalid_token`；过期时 `error_description="The access token has expired"` |
| 429 | `too_many_requests`；看 `Retry-After` |

---

## 3. 学生写入错误码（节选）

| 错误码 | 含义 |
| --- | --- |
| `REQUIRED_ID` / `INVALID_ID` | 学生 id 缺失/无效 |
| `INVALID_LOCAL_ID` | `local_id` 必须是唯一正整数 |
| `REQUIRED_FIRST_NAME` / `INVALID_FIRST_NAME` | 名字缺失/空白 |
| `INVALID_LAST_NAME` / `INVALID_MIDDLE_NAME` | 姓/中间名空白 |
| `REQUIRED_SCHOOL_ENROLLMENT` / `INVALID_SCHOOL_ENROLLMENT` | 学校注册缺失/无效 |
| `INVALID_ENROLLMENT_STATUS` | `enroll_status` 无效 |
| `NOT_FOUND_CURRENT_TERM` | 没有当前 term，无法验证日期 |
| `REQUIRED_PHYSICAL_*` / `REQUIRED_MAILING_*` | 地址字段缺失 |
| `REQUIRED_ALERT_MEDICAL_DESCRIPTION` | 医疗警报缺描述 |
| `REQUIRED_EMERGENCY_CONTACT_*` / `REQUIRED_DOCTOR_*` | 紧急联系人/医生信息缺失 |
| `REQUIRED_CLIENT_UID` / `REQUIRED_ACTION` | 缺 `client_uid` / `action` |
| `REQUIRED` | 必填元素没数据 |
| `UNKNOWN_ERROR` | 未知错误 |

---

## 4. Assignment / Score 错误码（PTG，历史）

| 错误码 | 含义 |
| --- | --- |
| `MISSING_REQUEST_DATA` | 无请求数据 |
| `ASSIGNMENT_NAME_REQUIRED` / `_TOO_LONG` | 名称缺失/超长 |
| `ASSIGNMENT_ABBREVIATION_REQUIRED` / `_TOO_LONG` | 缩写缺失/超长 |
| `ASSIGNMENT_DESCRIPTION_REQUIRED` / `_TOO_LONG` | 描述缺失/超长 |
| `INVALID_ASSIGNMENT_CATEGORY` | 类别不是 HOMEWORK/QUIZ/TEST/PROJECT |
| `INVALID_SCORING_TYPE` | 不是 POINTS/PERCENTAGE/LETTERGRADE |
| `INVALID_PUBLISH_STATE` | 发布状态无效 |
| `INVALID_ASSIGNMENT_WEIGHT` | 权重超 0–10 |
| `INVALID_POINTS_POSSIBLE` | 分数上限超 0–10000 |
| `INVALID_EXTRA_CREDIT_POINTS` | 加分超范围 |
| `INVALID_PUBLISH_DAYS_BEFORE_DUE` | 0–60 |
| `CANNOT_INCLUDE_IN_FINAL_GRADES_UNLESS_ASSIGNMENT_IS_PUBLISHED` | 未发布不能计入期末 |
| `ASSIGNMENT_NAME_OR_ABBREVIATION_IN_USE` | 名称/缩写重复 |
| `NO_PRIMARY_TEACHER_ASSIGNED_TO_SECTION` | 无主讲教师 |
| `UNABLE_TO_DELETE_USED_FOR_ASSIGNMENT_BASED_WEIGHTING` | 被加权使用，不能删 |

Score 错误：

| 错误码 | 含义 |
| --- | --- |
| `BAD_NUMBER_FORMATTING_FOR_ENTERED_SCORE` | 分数不是合法数字 |
| `SCORE_CANNOT_BE_BELOW_ZERO` | 分数 < 0 |
| `INVALID_HIGH_SCORE_FOR_ASSIGNMENT` | 超过满分 |
| `GRADE_ENTERED_DOES_NOT_EXIST_IN_GRADE_SCALE` | 分数不在 grade scale |
| `SECTION_DEFAULT_GRADESCALE_NOT_FOUND` | section 没默认 grade scale |
| `NO_GRADES_IN_GRADE_SCALE` | grade scale 没配置等级 |
| `POINTS_POSSIBLE_MUST_BE_ONE_HUNDRED` | PERCENTAGE 时满分必须 100 |
| `INCOMPATIBLE_SCORE_FOR_SCORING_TYPE` | 分数与评分类型不匹配 |
| `COMMENT_TOO_LONG` | 评语 > 2048 |

> PTG 在 SIS 22.5 起不可用；新集成用 PTP 表/PowerQuery。

---

## 5. 事件订阅错误码

| 错误码 | 含义 |
| --- | --- |
| `KEY_TOO_LONG` | key > 1000 |
| `CALLBACK_URL_REQUIRED` | 缺 callback_url |
| `CALLBACK_URL_TOO_LONG` | > 500 |
| `CALLBACK_URL_NOT_HTTPS` | 非 https |
| `RESOURCE_REQUIRED` / `RESOURCE_TOO_LONG` / `RESOURCE_NOT_VALID` | 资源路径问题 |
| `EVENT_TYPE_REQUIRED` / `EVENTTYPE_TOO_LONG` / `INVALID_EVENT_TYPE` | 事件类型问题 |

---

## 6. 表/扩展错误

| 响应 | 含义 |
| --- | --- |
| `At least one column lacks sufficient permission` | 过滤或 projection 用了未授权字段 |
| `Extension u_xxx is not recognized.` | `extensions=` 里的扩展名不存在 |
| 403 on DELETE | 删除要求表内**所有列** `FullAccess` |
| 扩展启用失败 | 表/字段命中 exclude list、schema XML 错、字段重名 |

---

## 7. PS-HTML / 导航常见问题

| 现象 | 原因 |
| --- | --- |
| 页面 403 | 缺 permission mapping / 用户无页面权限 |
| 数据为空 | DRF/FLS 裁剪；或 SQL 条件错 |
| 导航不显示 | `version` 未递增、`htmlID` 冲突、`parentHTMLID` 不存在、用户无 `originalParentUrl` 权限、插件未启用 |
| 导航在旧版本不生效 | 23.5 以下不支持 pagecataloging |
| `data-title` 显示 key | MessageKeys 缺文案 |
| DirectTable 不保存 | `ac=prim` 缺失、字段名不是 `[Table]column`、没有 `DirectTable.Select` |
| JSON 解析失败 | 末尾缺 `{}` 哨兵、字符串未 `;json`、日期未 `to_char` |
| 学生页面无上下文 | URL 缺 `frn=~(studentfrn)` |
| `tlist_child` 关联错 | 父表/FRN 用错（Users vs Teachers） |

---

## 8. 术语表

| 术语 | 全称/含义 |
| --- | --- |
| **API** | Application Programming Interface；本文特指 PowerSchool SIS REST API |
| **Access Token** | OAuth 2.0 的 Bearer token；外部调用凭据；25.3 起 12 小时 |
| **Client Credentials** | OAuth 两腿流程；应用代表自己 |
| **Authorization Code** | OAuth 三腿流程；应用代表用户 |
| **Session Cookie** | `psaid`；浏览器登录会话 |
| **OAuth** | 外部认证协议；PowerSchool 支持 client credentials 与 authorization code |
| **OIDC** | OpenID Connect；基于 OAuth 2.0 的身份层 |
| **SAML** | 企业 SSO 协议；PowerSchool 可做 IdP 或 SP |
| **IdP / SP** | Identity Provider / Service Provider |
| **Relying Party** | OIDC 中接收身份断言的应用 |
| **DCID** | 多数核心表的代理主键 |
| **FRN** | 3 位表号 + DCID，用于页面上下文 |
| **PowerQuery** | 插件定义的只读 SQL 资源 |
| **PQ DAT** | PowerQuery Data Access Tag；`~(*powerquery;...)` |
| **DAT** | Data Access Tag；PS-HTML 里取数据的标签 |
| **PS-HTML** | PowerSchool 传统页面语言（HTML + `~()`/`~[]` 标签） |
| **DirectTable** | 内置表 CRUD 机制（`~[DirectTable.Select:...]` + `ac=prim`） |
| **tlist_sql** | 页面内执行 SQL 的旧标签；**强弃用** |
| **tlist_child** | 1:N 扩展表的自动表格 |
| **tlist_standalone** | standalone 扩展表的自动表格 |
| **Expansion** | `/ws/v1` 的按需展开子对象 |
| **Extension** | 1:1 数据库扩展；也可用 `extensions=` 请求 |
| **FLS** | Field Level Security；字段级权限 |
| **DRF** | Data Restriction Framework；行级数据限制（专利） |
| **Access Request** | 插件字段白名单 `<access_request>` |
| **Permission Mapping** | 页面权限 → API 资源/方法的映射 |
| **Exclude List** | 禁止 API 访问的表/字段 |
| **Page Catalog** | 23.5+ 导航的页面元数据表 |
| **Enhanced Navigation** | 23.5+ 左侧导航框架 |
| **App Nav / Detail Nav** | 主导航 / 学生-教职工详情导航 |
| **PDS** | PowerSchool Design System；图标/组件/样式 |
| **PTP** | PowerTeacher Pro；新一代成绩册 |
| **PTG** | PowerTeacher Gradebook；22.5 起不可用 |
| **PSM** | PowerSchool Management? 一组 PTP 相关表前缀（`PSM_*`） |
| **DEM** | Data Export Manager；PowerQuery 导出界面 |
| **Delta Pull** | Data Version 增量拉取 |
| **changeListener** | Data Version 订阅根元素 |
| **Webhook** | 事件回调 URL |
| **CSP** | Content Security Policy；`<cdn_request>` 配置 |
| **Insertion Point** | `~[cust.insertion_point:...]` 自定义内容注入点 |
| **Wildcard** | `web_root/wildcards/*.txt` 传统注入文件 |
| **Message Key** | i18n 键，如 `psx.htmlc.myplugin.title` |
| **Codepmap** | 数据本地化映射，如 `CourseName` |
| **angularCustomizations** | Angular 组件的全局定制对象 |
| **Selector** | Angular 组件标签名，如 `pss-studentsearch` |
| **PowerQuery DAT** | 22.9+；把 PowerQuery 变成 DAT |
| **Validation Dashboard** | 26.5+ 配置校验仪表盘 |

---

## 9. 版本差异提醒

| 版本 | 变化 |
| --- | --- |
| 22.5 | PowerTeacher Gradebook API 不可用 |
| 23.5 | Enhanced Navigation（pagecataloging） |
| 25.2 | `accessLevelV1Api` 控制 `/ws/v1` |
| 25.3 | access token 30 天 → 12 小时 |
| 25.5.1 | `WHENCREATED` 等审计字段移出 exclude list |
| 26.5 | Validation Dashboard |

> 客户环境版本可能落后/超前。实施前先看 `/ws/v1/metadata` 的 `powerschool_version`。
