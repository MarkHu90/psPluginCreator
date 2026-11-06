# 07 · 单点登录（SSO）：OpenID 2.0、OIDC、SAML

PowerSchool 的 SSO 是**单向**的：从 PowerSchool 到第三方应用。当前不支持第三方反向登录 PowerSchool
（除非把 PowerSchool 配成 SAML/OIDC 的 Service Provider，接收外部 IdP）。

| 协议 | PowerSchool 角色 | 推荐度 | 说明 |
| --- | --- | --- | --- |
| OpenID 2.0 | Identity Provider | 旧 | 通过插件 `<openid>` 生成 SSO 链接 |
| OpenID Connect (OIDC) | Identity Provider | **推荐** | OAuth 2.0 三腿流程 + ID Token |
| SAML 2.0 | Identity Provider **或** Service Provider | 企业常见 | `<saml>` 元素配置 |

---

## 1. OpenID 2.0（旧）

### 1.1 插件声明

```xml
<plugin ... name="MyApp" version="1.0">
  <openid host="www.myapp.com">
    <links>
      <link title="MyApp Login" display-text="MyApp" path="/login.aspx">
        <ui_contexts>
          <ui_context id="admin.header"/>
          <ui_context id="admin.left_nav"/>
        </ui_contexts>
      </link>
    </links>
  </openid>
  <publisher name="Example Publisher">
    <contact email="publisher@example.com"/>
  </publisher>
</plugin>
```

- `host`：只写主机名，不带 scheme。
- `port`：默认 443。
- `path`：第三方应用内的路径；可附加自定义 query 参数。

### 1.2 流程

1. 用户点击 PowerSchool 里的链接。
2. PowerSchool 生成重定向：

```
https://{school}/admin/openid/oidredirectaction.action?pluginName=ExamplePlugin&linkId=33
```

3. 认证后跳到第三方：

```
https://partner.com/login.aspx?openid_identifier=https://{school}/oid/admin/{username}
```

`openid_identifier` 格式：`https://{school}/oid/{usertype}/{username}`，usertype ∈
`admin / teacher / guardian / student`。

监护人额外带：

```
&studentid={STUDENTS.DCID}&studentidentifier={STUDENTS.STUDENT_NUMBER}
```

### 1.3 Attribute Exchange

通过 `openid.ns.*` / `openid.ax.*` 请求属性。支持：

`studentids`、`dcid`、`usertype`、`ref`、`email`、`firstName`、`lastName`、
`districtName`、`districtCustomerNumber`、`districtState`、`districtCountry`、
`schoolID`、`usersDCID`、`teacherNumber`、`adminSchools`、`teacherSchools`

> ⚠️ 属性 URI 必须**字面**使用 `http://powerschool.com/entity/...`，不要替换成自己的服务器地址。

---

## 2. OpenID Connect / 三腿 OAuth（推荐）

### 2.1 标准与端点

PowerSchool SIS 20.11.0.0+ 支持：

- OAuth 2.0 Authorization Code Grant + Refresh Token
- OAuth 2.0 Introspection
- OpenID Connect Core 1.0（Authorization Code，支持 PKCE SHA256）
- OpenID Connect Discovery

| 用途 | 端点 |
| --- | --- |
| Discovery | `https://{school}/oauth2/.well-known/openid-configuration` |
| Authorization | `https://{school}/oauth2/authorize` |
| Token | `https://{school}/oauth2/token` |
| UserInfo | `https://{school}/oauth2/userinfo`（以 discovery 为准） |
| Introspection | `https://{school}/oauth2/introspect`（以 discovery 为准） |

> 注意区分：
> - **两腿**（API access）：`/oauth/access_token`，client credentials。
> - **三腿**（代表用户）：`/oauth2/authorize` → `/oauth2/token`，authorization code。

### 2.2 插件配置

```xml
<oauth base-url="https://example.com"
       redirect-uri="/oidc/redirecturi"
       allow-client-credential="false"
       allow-auth-code="true"
       require-pkce="true"
       refresh-tokens="false"
       access-token-ttl="300">
  <allow-persona>staff</allow-persona>
  <allow-persona>teacher</allow-persona>
  <allow-scope>openid</allow-scope>
  <allow-scope>profile</allow-scope>
  <allow-scope>email</allow-scope>
</oauth>
```

| 属性 | 说明 | 默认 |
| --- | --- | --- |
| `base-url` | 你的应用根 URL（用于拼 `redirect-uri`） | — |
| `redirect-uri` | 相对 `base-url` 的回调路径；不能含通配符；不能 http | — |
| `allow-client-credential` | 是否同时允许两腿 API access | `true` |
| `allow-auth-code` | 是否启用三腿/OIDC | `false` |
| `require-pkce` | 是否强制 PKCE（S256） | `false` |
| `refresh-tokens` | 是否发 refresh token | `false` |
| `access-token-ttl` | access token 秒数 | `300` |

子元素：

- `<allow-persona>`：`staff` / `teacher` / `parent` / `student`；可多个；不写=全部。
- `<allow-scope>`：`openid` / `email` / `profile` / `pssis` / `oid2`；可多个；不写=全部。

> 最小权限：不需要 API 就 `allow-client-credential="false"`；不需要刷新就不要 refresh token。

### 2.3 Scope 与 Claim

| Claim | 所在 scope | 含义 |
| --- | --- | --- |
| `sub` | openid | 稳定唯一用户 ID（同 `ps_uri`） |
| `auth_time` | openid | 认证时间 |
| `aud` | openid | Client ID |
| `email` | email | 用户邮箱（SIS 中通常不严格受保护） |
| `email_verified` | email | 恒为 false |
| `oid2` | oid2 / profile | OpenID 2.0 标识符 |
| `ps_uri` | pssis / profile | 唯一标识 |
| `persona` | pssis / profile | staff / teacher / parent / student |
| `ps_dcid` | pssis / profile | 用户类型对应的内部 ID |
| `family_name` / `given_name` | pssis / profile | 姓/名 |
| `preferred_username` | pssis / profile | 登录名 |
| `ps_account_token` | pssis / profile | 账户 token |
| `account_identifier` | pssis / profile | 全局用户 ID |

### 2.4 流程

```
用户访问你的应用（未登录）
  → 302 到 /oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=openid...
  → 用户在 PowerSchool 登录/同意
  → 302 回 redirect_uri?code=...
  → 你的服务器 POST /oauth2/token (grant_type=authorization_code, code, client_id, client_secret, redirect_uri)
  → 拿到 access_token / id_token / (refresh_token)
  → 校验 id_token（签名、iss、aud、exp）
  → 建立你自己的会话
```

- 客户端认证只支持 **`client_secret_post`**（id/secret 放 POST body）。
- PKCE 只支持 **S256**。
- refresh token 不提供离线访问；用户登出/会话超时后立即失效。

### 2.5 多学区注意

每个学区是独立 SIS 实例，**Issuer 不同**。多租户应用要在链接 `path` 里带上学区标识，
并在运行时按学区使用对应的 discovery/token 端点。

---

## 3. SAML 2.0

### 3.1 PowerSchool 作为 Identity Provider

插件：

```xml
<saml name="MyApp"
      entity-id="https://sp.example.com/saml/metadata"
      base-url="https://sp.example.com"
      metadata-url="https://sp.example.com/saml/metadata.xml">
  <links>
    <link display-text="MyApp" path="/sso/login">
      <ui_contexts><ui_context id="admin.header"/></ui_contexts>
    </link>
  </links>
  <attributes>
    <user type="teacher">
      <attribute name="email"/>
      <attribute name="firstName" attribute-name="givenName"/>
    </user>
  </attributes>
  <permissions>
    <permission name="myapp.admin" description="MyApp Administrator" value="true"/>
  </permissions>
</saml>
```

| 属性 | 说明 |
| --- | --- |
| `name` | SP 名称，全局唯一 |
| `entity-id` | SP 的 Entity ID，必须完全匹配 |
| `base-url` | SP 根 URL |
| `metadata-url` | PowerSchool 拉取 SP metadata 的地址（可选） |

可用属性按用户类型分：admin / teacher / student / guardian，包括姓名、邮箱、staff number、
schoolID、角色、学校权限、学生列表、扩展 schema 等。属性可用 `attribute-name` 改名，
或用 `attribute-value` 传常量/自定义值。

### 3.2 PowerSchool 作为 Service Provider

插件：

```xml
<saml name="ps-local"
      idp-name="ExternalIdP"
      idp-entity-id="https://idp.example.com/metadata"
      idp-metadata-url="https://idp.example.com/metadata.xml">
  ...
</saml>
```

| 属性 | 说明 |
| --- | --- |
| `name` | 本地 SP 短名，会进入 SAML 地址 |
| `idp-name` | 外部 IdP 名称，全局唯一 |
| `idp-entity-id` | IdP Entity ID，必须完全匹配 |
| `idp-metadata-url` | IdP metadata 地址 |

SAML/WS-Trust 模式还涉及：

- 用户记录先创建（`USERS`）
- IdP 侧预置用户 ID
- 证书配置
- 启用门户 SSO 并重启 PowerSchool
- 常见错误：`OTHER_PORTAL_USER`

### 3.3 Name ID 与属性

- 支持 NameID 格式与属性映射；具体取值按用户类型（admin/teacher/student/guardian）。
- 属性可来自核心表、扩展 schema、用户角色/学校权限。
- `permissions` 用于向 SP 返回角色/权限名值对。

---

## 4. User Access Roles（SSO 角色）

SSO 时可以把 PowerSchool 用户映射成第三方系统需要的角色。例如：

- PowerSchool 里只是“单校教师”
- LMS 里需要“全区课程管理员”

做法：在插件里定义 role/permission 映射，SSO 响应中带上角色。角色不必绑定 PowerSchool
安全组；它只是给第三方系统看的标签。

---

## 5. 选型建议

| 场景 | 建议 |
| --- | --- |
| 新做 SSO | **OIDC**（Authorization Code + PKCE） |
| 已有 OpenID 2.0 集成 | 可继续；新项目不要选 |
| 企业统一身份（Azure AD/Okta） | SAML 或 OIDC 作为 PowerSchool 的 SP |
| 只需要 API 数据 | 不需要 SSO；用两腿 OAuth |
| 需要“代表用户”读数据 | 三腿 OAuth（Authorization Code） |

## 6. 安全清单

1. 校验 `id_token` 的签名、`iss`、`aud`、`exp`、`nonce`（如使用）。
2. Client Secret 只放服务器；不要进前端/日志。
3. 强制 HTTPS；回调地址精确匹配，不用通配符。
4. 原生/SPA 用 PKCE（S256）。
5. 只申请需要的 scope 和 persona。
6. refresh token 只在确实需要长会话时开启。
7. 多学区应用必须按 Issuer 隔离配置和密钥。
8. 不要用 `email` 作为唯一身份（门户明确提示可被修改/冒用）。
