# 02 · API 通用约定：方法、版本、搜索、分页、扩展与校验

本文适用于 `/ws/v1/*`、`/ws/schema/*` 等数据访问资源。各资源支持的方法/参数可能不同，以对应资源文档为准。

## 1. HTTP 方法与 URL 形态

| 目标 | URL | GET | POST | PUT | DELETE |
| --- | --- | --- | --- | --- | --- |
| Collection | `/ws/{resource}/` | 列出成员 URI | 新建 | 整体替换集合 | 删除整个集合 |
| Record | `/ws/{resource}/{id}` | 取单条 | 在集合中新建 | 替换/创建单条 | 删除单条 |

不是所有资源都支持全部方法。PowerQuery 只支持 **POST**（即使用于查询）；对 PowerQuery 用 GET 会得到 405。

## 2. 请求头与数据格式

| Header | 作用 | 值 |
| --- | --- | --- |
| `Accept` | 期望的响应格式 | `application/json` / `application/xml` |
| `Content-Type` | 请求体格式 | `application/json` / `application/xml` |

- 版本化资源（`/ws/v1`）默认支持 XML 与 JSON；部分较新的非版本化资源**只支持 JSON**。
- 请求体说 JSON、实际是 XML，会得到 400/415。
- 建议始终显式设置两个头，避免环境差异。

## 3. 版本化策略

- **Versioned endpoints**：`/ws/v1/...`，遵循近似 SemVer 的兼容承诺。
- **Unversioned endpoints**：`/ws/schema/...` 等，不承诺向后兼容。

规则：

- 版本号 `X.Y.Z`；破坏兼容 → X；向后兼容新功能 → Y；修 bug → Z。
- URL 只带主版本：`/ws/v1/school`，不是 `/ws/v1.0.0/school`。
- 每个资源/字段会标注首次出现的版本。

## 4. 响应码

### 4.1 分组

| 范围 | 含义 |
| --- | --- |
| 2xx | 请求被识别并执行 |
| 3xx | 需要换地址（少见） |
| 4xx | 客户端可修正（URI/参数/权限） |
| 5xx | 改请求也未必能解决（服务端/配置/PowerQuery 定义错误） |

### 4.2 常见码与坑

| Code | 含义 | 关键点 |
| --- | --- | --- |
| 200 | OK | **不代表业务全部成功**：PowerQuery 可能 0 行；批量写入可能部分失败，错误在响应体 |
| 201 | Created | 通常在 `Location` 头返回新资源 URL |
| 204 | No Content | 成功但无响应体；也可能是“对象不存在” |
| 304 | Not Modified | 资源未变化 |
| 400 | Bad Request | 最常见：缺 token、未登录访问内部 API、参数错误、JSON 结构错误、Content-Type 不符、凭据错误 |
| 401 | Unauthorized | 缺 Authorization，或 token 无效/过期 |
| 403 | Forbidden | 认证通过但无权限：字段不在 `access_request`、命中 exclude list、缺 permission mapping |
| 404 | Not Found | URI 不存在，或路径里的具体资源 id 不存在 |
| 405 | Method Not Allowed | 例如对 PowerQuery 用 GET |
| 406 | Not Acceptable | `Accept` 无法满足 |
| 409 | Conflict | 唯一约束冲突、更新不存在的资源等 |
| 413 | Request Entity Too Large | 批量请求过大 |
| 415 | Unsupported Media Type | Content-Type/Accept 不支持 |
| 429 | Too Many Requests | 限流；看 `Retry-After` |
| 500 | Internal Server Error | 服务端异常或 PowerQuery 配置错误；建议反馈论坛 |
| 501 | Not Implemented | 方法尚未实现 |
| 503 | Service Unavailable | 依赖缺失（常见于动态插件 REST 服务） |
| 509 | Bandwidth Limit Exceeded | 限流（旧表述） |

> ⚠️ 内部 API 的一个怪现象：如果端点同时支持内部和 Partner API，**未登录时会返回 400**；
> 如果端点只支持内部 API，未登录返回 **401**。

### 4.3 错误体

通用结构：

```xml
<errorMessage>
  <message>ID Translation Issues</message>
  <errors>
    <field>source_product_attribute</field>
    <code>INVALID_URL_PATH</code>
  </errors>
</errorMessage>
```

| 路径 | 含义 |
| --- | --- |
| `errorMessage/message` | 人类可读描述 |
| `errorMessage/errors/resource` | 相关实体（可选） |
| `errorMessage/errors/field` | 相关字段 |
| `errorMessage/errors/code` | 错误码字符串 |

批量写入时，单条错误在 `batch_result`：

```xml
<assignment_score>
  <student><id>31988</id></student>
  <batch_result>
    <code>409</code>
    <reason>BAD_NUMBER_FORMATTING_FOR_ENTERED_SCORE</reason>
  </batch_result>
</assignment_score>
```

## 5. 搜索（FIQL）

适用于支持 `q=` 的资源。

```
q={field}{operator}{value};{field}{operator}{value}
```

- `;` 表示 **AND**。
- 每个字段只能出现一次。
- 整个 `q=` 的值需要 URL 编码。
- 日期格式 `YYYY-MM-DD`。

### 5.1 运算符

| 运算符 | 含义 |
| --- | --- |
| `==` | 等于 |
| `=gt=` | 大于 |
| `=ge=` | 大于等于 |
| `=lt=` | 小于 |
| `=le=` | 小于等于 |
| `*` | 字符串通配，只能放末尾 |
| `(A,B)` | 多值（配 `==`） |

### 5.2 示例

```http
# 预注册学生
GET /ws/v1/school/3/student?q=school_enrollment.enroll_status==P

# 在读 + 预注册
GET /ws/v1/school/3/student?q=school_enrollment.enroll_status==(A,P)

# 多个条件 AND
GET /ws/v1/school/3/student?q=school_enrollment.enroll_status==I;school_enrollment.entry_date=lt=2004-08-25

# 姓氏前缀
GET /ws/v1/school/3/student?q=name.last_name==Ada*
```

错误示例：漏第二个 `=`、字段名拼错、漏 `q=` 都会 400。

## 6. 分页

### 6.1 计数

```
GET /ws/v1/school/3/student/count
→ {"resource":{"count":616}}
```

### 6.2 翻页

```
?page={n}&pagesize={size}
```

- 默认 `page=1`。
- 推荐流程：先取 `/count`，再逐页累加，直到累计 >= count。

### 6.3 页大小上限

- 插件默认 **100**；管理员可在 **Plugin Management Configuration → Data Configuration** 调整到 **1–1000**。
- 未传 `pagesize` 时，实际值 = `min(系统默认 100, 插件设置)`。
- 请求的 `pagesize` 不能超过插件设置，否则报错。
- PowerQuery **不受**此上限约束（可 `pagesize=0` 流式返回）。

### 6.4 特殊情况

| 输入 | 行为 |
| --- | --- |
| `page` > 2147483647 | 忽略，返回第一页 |
| 不存在的页码 | 返回空数组 |
| `page` 为负数/非数字/空 | 忽略，返回第一页 |
| `pagesize` 超过上限 | 报错 |
| `pagesize` 为负 | 使用系统默认 |
| `pagesize` 非数字/空 | 400 |

## 7. Expansions（展开）

版本化资源支持按需展开子对象，减少响应体积。

```http
GET /ws/v1/school/3/student?expansions=phones,addresses
```

- 响应里的 `@expansions` 列出**所有可用**展开项（不代表都返回了）。
- 请求多个用逗号分隔。
- 未知展开项：**忽略**。
- 请求了不支持的数据组：400。
- 重复项：去重。
- 空数据组：返回空标签；非 expansion 的空字段直接不出现。

学生常用 expansions：

`demographics, addresses, alerts, phones, school_enrollment, ethnicity_race, contact, contact_info, initial_enrollment, schedule_setup, fees, lunch, counselors, global_id`

> 只请求当下需要的 expansions；展开越多，服务端和网络开销越大。

## 8. Extensions（扩展字段，1:1）

扩展字段可像 expansion 一样请求，但**只返回数据库扩展表**里的 1:1 数据。

```http
GET /ws/v1/student/2?extensions=studentcorefields
```

- 响应 `@extensions` 列出可用扩展。
- 未知扩展：400（`Extension u_dentistry is not recognized.`）。
- 扩展表无数据：不返回该扩展标签。
- 若资源可写（如 Student），用户自定义扩展也可写。
- 核心扩展 `studentcorefields` 需要先跑扩展 schema migration。

> 1:N 扩展不在 `extensions` 参数里展开；用 Table API 或 PowerQuery 读。

## 9. 写入与校验

支持 POST/PUT 的可写资源会做校验，规则 = 资源规则 + **District → Data Validation Configuration**。

### 9.1 必需的包装与字段

- 集合根元素：如 `<students>` / `{"students":{...}}`。
- 每条记录必须有：
  - `client_uid`：仅用于把响应关联回请求，不持久化，单次请求内唯一即可。
  - `action`：`INSERT` 或 `UPDATE`。

```xml
<students>
  <student>
    <client_uid>123</client_uid>
    <action>INSERT</action>
    ...
  </student>
</students>
```

### 9.2 类型转换陷阱

格式不正确的值会被当作 **null/空**，不会进入校验：

| 输入 | 期望 | 结果 |
| --- | --- | --- |
| `01012013` | `YYYY-MM-DD` | null |
| `A123`（school_number） | 数字 | null |

所有字符串会 **自动 trim** 前后空格（请求和响应都是）。

### 9.3 响应结构

```xml
<results>
  <insert_count>1</insert_count>
  <update_count>0</update_count>
  <delete_count>0</delete_count>
  <result>
    <client_uid>123</client_uid>
    <status>SUCCESS</status>
    <action>INSERT</action>
    <success_message>
      <id>54543</id>
      <ref>https://{school}/ws/v1/student/3</ref>
    </success_message>
  </result>
  <result>
    <client_uid>124</client_uid>
    <status>ERROR</status>
    <action>UPDATE</action>
    <error_message>
      <error>
        <field>student/school_enrollment/school_number</field>
        <error_code>INVALID_SCHOOL_NUMBER</error_code>
        <error_description>School Number is invalid.</error_description>
      </error>
    </error_message>
  </result>
</results>
```

- `status` = `SUCCESS` / `ERROR`。
- 整个请求即使部分失败也可能返回 **200**，必须逐条检查 `result`。
- 更新时发送**空元素**表示清空该字段（XML：`<tag></tag>`）。

### 9.4 No-op

只带 `id` / `action` 或空子元素的更新会被视为 no-op，返回成功。

## 10. 流式与大数据

- PowerQuery 支持 `pagesize=0` 流式返回，客户端必须按 chunk 处理。
- `/ws/v1` 受插件页大小上限约束，不能无限大。
- 批量写入注意 413（请求体过大）。

## 11. 幂等与重试

- GET/PUT/DELETE 通常可安全重试；POST 新建可能重复，需业务侧去重（如用 `client_uid` 或自然键）。
- 遇到 429 / 503 / 网络错误：指数退避；429 优先遵循 `Retry-After`。
- 401：先刷新 token 再重试一次，仍失败则停。
