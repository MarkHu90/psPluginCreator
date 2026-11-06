# 01 · 认证：OAuth、Access Token 与 Session Cookie

PowerSchool SIS 的 API 有两种认证方式，**同一套资源**在两种方式下行为不同：

| 方式 | 谁在用 | 凭据 | 检查顺序 |
| --- | --- | --- | --- |
| OAuth 2.0 Client Credentials | 外部服务器/插件 | Client ID + Client Secret → Bearer token | 先检查 |
| Session Cookie | 浏览器内已登录用户 | `psaid` cookie | token 无效时回落到 cookie |

> ⚠️ PowerSchool 在每次请求时**先看 access token，再看 session cookie**。如果浏览器里同时有有效的
> OAuth token 和 cookie，资源会按 OAuth 规则处理（权限映射不检查、DRF 不生效），这可能与预期不符。
> 调试内部页面时，注意 REST 客户端是否自动带上了 token。

---

## 1. OAuth for API Access（client credentials）

### 1.1 在插件里声明 `<oauth>`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plugin xmlns="http://plugin.powerschool.pearson.com"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://plugin.powerschool.pearson.com plugin.xsd"
        name="Basic Data Access Plugin"
        version="1.0"
        description="Basic Data Access Plugin">
  <oauth accessLevelV1Api="READ"/>
  <publisher name="Basic Data">
    <contact email="publisher@example.com"/>
  </publisher>
</plugin>
```

`accessLevelV1Api`（**25.2.0.0+**，可选）：

| 值 | 含义 |
| --- | --- |
| 不写 / `NONE` | 拒绝访问 `/ws/v1` API（默认） |
| `READ` | 只读 `/ws/v1` |
| `FULL` | 允许更新 Students（Student Fees / Test Scores） |

安装启用后，管理员在 **System → System Settings → Plugin Management Dashboard → {插件}** 可以看到
**OAuth Configuration**，其中包含该插件专属的 **Client ID** 与 **Client Secret**。
启用后管理员还可以在 **Data Provider Configuration** 页面修改 `accessLevelV1Api`。

### 1.2 两种拿凭据的方式

1. **手动注册**：管理员从 Plugin Management Dashboard 抄给你（安全渠道传递）。
2. **自动注册（Automatic Registration）**：插件声明 `<registration url="https://...">`，
   PowerSchool 在启用插件时向你方 webhook POST 凭据。见第 4 节。

### 1.3 换 access token

```http
POST https://{your-school}/oauth/access_token/
Content-Type: application/x-www-form-urlencoded;charset=UTF-8
Authorization: Basic {base64(client_id:client_secret)}

grant_type=client_credentials
```

`base64(client_id:client_secret)` 是对 `{client_id}:{client_secret}` 做 Base64。

成功响应：

```json
{
  "access_token": "119628ce-1734-45c8-9ac1-cf91e51f85e2",
  "token_type": "Bearer",
  "expires_in": "2592000"
}
```

- `expires_in` 是**剩余秒数**。
- **25.3.0.0 起** token 最长 **12 小时**；此前为 **30 天**。
- 最佳实践：**缓存 token，只在收到 401 时重新获取**，不要每个请求都换 token。

### 1.4 三种携带方式

推荐程度从高到低：

```http
# 1) 推荐：Authorization header
Authorization: Bearer {access_token}

# 2) 表单体（仅 POST/PUT）
Content-Type: application/x-www-form-urlencoded
access_token={access_token}

# 3) 仅开发测试：query string（不安全，会进日志）
GET /resource?access_token={access_token}
```

### 1.5 认证错误

获取 token 阶段：

| 状态 | error | 原因 |
| --- | --- | --- |
| 400 | `invalid_request` | 缺参数、重复参数、多种认证机制混用等 |
| 400 | `unsupported_grant_type` | grant type 不支持 |
| 401 | `invalid_client` | Client ID/Secret 错误 |

调用资源阶段：

| 状态 | 说明 |
| --- | --- |
| 400 | 查询格式错误或缺少 access token |
| 401 | token 无效或已过期（`WWW-Authenticate: Bearer error="invalid_token"...`） |
| 429 | 超过速率限制；响应带 `Retry-After: {秒}`，按它等待后重试 |

速率限制在 **System → System Settings → global API/SIF Settings** 配置。

```http
429 Too Many Requests
Retry-After: 17

{"error":"too_many_requests","error_description":"Too many requests. Please use the \"Retry-After\" header ..."}
```

### 1.6 Token 生命周期处理建议

```
token = cache.get()
if token is None:
    token = fetch_token()
response = call_api(token)
if response.status == 401:
    token = fetch_token(force=True)
    response = call_api(token)
```

不要依赖固定的 12 小时；以 `expires_in` 和 401 为准。

---

## 2. Session Cookie（内部认证）

- 登录任一 PowerSchool 门户后，浏览器会拿到名为 **`psaid`** 的会话 cookie。
- 用浏览器 REST 客户端调试内部 API 时，必须带上该 cookie，否则会被重定向到登录页。
- 内部调用会额外经过 **permission mapping**、**FLS**、**DRF**；见
  [06-security-model.md](06-security-model.md)。
- 某些资源只支持内部 API，某些只支持外部（Partner/Plugin）API。

```http
GET /ws/schema/query/com.example.myquery
Cookie: psaid={session-value}
```

> ⚠️ 用脚本抓 cookie 做自动化要非常谨慎：会话会过期、可能触发安全策略，且不要把 cookie 写进代码库。
> 生产集成应使用 OAuth。

---

## 3. 两腿 vs 三腿 OAuth

| | Client Credentials（两腿） | Authorization Code（三腿） |
| --- | --- | --- |
| 代表谁 | 应用自己 | 某个具体用户 |
| Token 端点 | `/oauth/access_token` | `/oauth2/token` |
| 用途 | 后台数据同步 / API 调用 | OIDC 登录、代表用户访问资源 |
| 插件开关 | `<oauth>`（默认 `allow-client-credential=true`） | `<oauth allow-auth-code="true">` |

三腿 OAuth / OpenID Connect 的完整配置见 [07-sso.md](07-sso.md)。

---

## 4. 自动注册（Automatic Registration）

### 4.1 插件声明

```xml
<plugin ... name="Example Application" version="1.2.3" description="Automatic Registration">
  <registration url="https://partner.example.com/registerme">
    <callback-data>License Key</callback-data>
  </registration>
  <oauth/>
  <publisher name="Partner Publisher">
    <contact email="partner@example.com"/>
  </publisher>
</plugin>
```

- `url` 必须 `https://`，最长 1000 字符。
- `<callback-data>` 是任意文本，会在注册请求里原样带回（常放 license key / 租户标识）。

### 4.2 流程

1. 管理员安装并启用插件。
2. PowerSchool 向 `registration url` 发 **HTTPS POST**（JSON）。
3. 你的 webhook 校验来源、保存凭据、可选地调用 `verify_url` 验证连通性和时钟。
4. 返回 JSON 注册响应。

### 4.3 注册请求（PowerSchool → 你）

```json
{
  "credentials": {
    "client_secret": "3260cf45-41c3-4f16-b8e3-8b120a4afc54",
    "client_id": "66fc77ee-359b-4f15-971e-8bd5d3e83fd7"
  },
  "verify_url": "https://{your-school}/ws/v1/time",
  "callback_data": "LK123456"
}
```

| 字段 | 说明 |
| --- | --- |
| `verify_url` | `/ws/v1/time`，**无需认证**；用于验证连通性与服务器时间偏差 |
| `credentials.client_id/secret` | 该插件的 OAuth 凭据 |
| `callback_data` | 插件里 `<callback-data>` 的内容 |

### 4.4 注册响应（你 → PowerSchool）

```json
{
  "callback_result": "200",
  "message": "SUCCESS",
  "time": "2012-04-20T21:35:39.731Z"
}
```

| 字段 | 说明 |
| --- | --- |
| `callback_result` | `200` 成功；`500` 失败 |
| `message` | 任意文本；用 `INVALID_CERTIFICATE` / `HOST_UNKNOWN` 可让 PowerSchool 识别已知错误 |
| `time` | 你方服务器时间，ISO-8601 |

> ⚠️ PowerSchool 只接受由受信任 CA 签发的证书；自签名证书仅限开发测试。

---

## 5. 安全建议

1. **不要把 Client Secret / token 写进前端代码或仓库**。本仓库的 `.env` 已被 `.gitignore` 忽略；
   生产环境用密钥管理。
2. Client Secret 只在服务器端用于换 token；token 只在服务器内存/加密存储中缓存。
3. 只在收到 401 时重取 token；不要每个请求都换。
4. 用最小权限：`accessLevelV1Api` 能 `READ` 就不要 `FULL`；`access_request` 只申请必要字段。
5. 外部调用一旦缺少字段权限会 **403**（不是静默剔除），这反而是可观测的；内部调用会静默剔除字段。
6. 记录 429 的 `Retry-After` 并退避，不要暴力重试。
7. 事件回调 / 自动注册的 webhook 必须校验来源、使用 HTTPS、防止重放。
