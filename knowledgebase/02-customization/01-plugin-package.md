# 01 · 插件包与 `plugin.xml`

PowerSchool 插件就是一个 ZIP。ZIP 根目录必须有 `plugin.xml`，其余目录可选。

## 1. ZIP 目录结构

```
plugin.zip
├── plugin.xml
├── MessageKeys/
│   └── example-plugin-message-keys.US_en.properties
├── pagecataloging/
│   └── example-plugin-pagecataloging.json
├── permissions_root/
│   └── partner.module1.permission_mappings.xml
├── queries_root/
│   └── partner.module1.named_queries.xml
├── data_change_configuration_root/
│   └── partner.module1.change_listener_config.xml
├── user_schema_root/
│   └── u_extension_group_name.xml
└── web_root/
    ├── admin/
    │   ├── home.partner.content.footer.txt
    │   └── ...
    ├── teachers/
    ├── guardian/          # 家长和学生门户共用（本项目没有 students/）
    ├── scripts/
    ├── images/
    └── wildcards/
```

> **本项目现场约定**：没有 `web_root/students/`。学生门户与家长门户都使用 `/guardian/`，
> 学生页也放在 `web_root/guardian/`。官方文档在部分版本/部署中会出现 `/students/`，以现场为准。

| 目录 | 作用 | 何时需要 |
| --- | --- | --- |
| 根 | 只放 `plugin.xml`，文件名必须精确 | 总是 |
| `MessageKeys/` | i18n properties | 有自定义文案时 |
| `pagecataloging/` | 23.5+ 左侧导航 JSON | 需要导航（23.5+） |
| `permissions_root/` | 内部 API 权限映射 | 内部页面调用 PQ/Table API |
| `queries_root/` | PowerQuery 定义 | 有自定义查询 |
| `data_change_configuration_root/` | Data Version 订阅 | 需要增量拉取 |
| `user_schema_root/` | 数据库扩展表 | 需要新表/字段 |
| `web_root/` | 页面/脚本/图片/wildcards | 有自定义页面 |

> 官方也支持把所有这些放在一个 ZIP。本仓库工作台采用 `api/` + `dbsetup/` 双包：
> API 包放页面/导航/查询/权限，DB 包放 `plugin.xml` + `user_schema_root`。
> 现场可以分别安装，也可以打 `combined.zip`（API 在根，DB 在 `dbsetup/` 子目录）。

## 2. `plugin.xml` 元素层级

```
<plugin>
├── <registration>
│   └── <callback-data>
├── <oauth>                    (属性 accessLevelV1Api; 三腿/OIDC 还有 base-url 等)
│   ├── <allow-persona>        (OIDC)
│   └── <allow-scope>          (OIDC)
├── <access_request>
│   ├── <field>
│   └── <cdn_request>
│       └── <cdn>
├── <links>
│   └── <link>
│       └── <ui_contexts>
│           └── <ui_context>
├── <openid>
│   └── <links>
│       └── <link>
│           └── <ui_contexts>
│               └── <ui_context>
├── <saml>
│   ├── <links> / <link> / <ui_contexts> / <ui_context>
│   ├── <attributes>
│   │   └── <user>
│   │       └── <attribute>
│   └── <permissions>
│       └── <permission>
└── <publisher>
    └── <contact>
```

## 3. 根元素 `<plugin>`

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `xmlns` | 是 | `http://plugin.powerschool.pearson.com` |
| `xmlns:xsi` | 否 | `http://www.w3.org/2001/XMLSchema-instance` |
| `xsi:schemaLocation` | 否 | `http://plugin.powerschool.pearson.com plugin.xsd` |
| `name` | 是 | 插件名，唯一，≤40 字符 |
| `version` | 否 | ≤20 字符 |
| `description` | 否 | ≤256 字符 |

**必填子元素**：`<publisher>`。
**可选子元素**：`<registration>`、`<oauth>`、`<access_request>`、`<links>`、`<openid>`、`<saml>`。

最小可用：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plugin xmlns="http://plugin.powerschool.pearson.com"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://plugin.powerschool.pearson.com plugin.xsd"
        name="Demo Plugin"
        version="1.0.0"
        description="Demo">
  <publisher name="Example Publisher">
    <contact email="publisher@example.com"/>
  </publisher>
</plugin>
```

## 4. 各元素详解

### 4.1 `<registration>`

让 PowerSchool 在启用插件时向你的 webhook 注册。

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `url` | 是 | `https://`，≤1000 字符 |

子元素 `<callback-data>`：任意文本，注册请求里原样带回。

```xml
<registration url="https://partner.example.com/registerme">
  <callback-data>License Key</callback-data>
</registration>
<oauth/>
```

详见 [../01-api/01-authentication.md](../01-api/01-authentication.md)。

### 4.2 `<oauth>`

| 属性 | 说明 |
| --- | --- |
| `accessLevelV1Api` | 25.2+；`NONE`（默认/不写）/ `READ` / `FULL`；控制 `/ws/v1` |
| `base-url` | 三腿/OIDC：应用根 URL |
| `redirect-uri` | 三腿/OIDC：回调路径（相对 base-url） |
| `allow-client-credential` | 默认 true；是否允许两腿 API access |
| `allow-auth-code` | 默认 false；是否允许三腿/OIDC |
| `require-pkce` | 默认 false；强制 S256 PKCE |
| `refresh-tokens` | 默认 false |
| `access-token-ttl` | 默认 300 秒 |

```xml
<!-- 只做 API 数据访问 -->
<oauth accessLevelV1Api="READ"/>

<!-- 只做 OIDC SSO，不开放 API -->
<oauth base-url="https://example.com"
       redirect-uri="/oidc/redirecturi"
       allow-client-credential="false"
       allow-auth-code="true"/>
```

> ⚠️ 只写 `<oauth/>` 时，`accessLevelV1Api` 默认不授予 `/ws/v1` 访问。需要 v1 就显式写 `READ`/`FULL`。

### 4.3 `<access_request>`

```xml
<access_request>
  <field table="STUDENTS" field="DCID" access="ViewOnly"/>
  <field table="STUDENTS" field="LAST_NAME" access="FullAccess"/>
  <cdn_request>
    <cdn name="https://code.jquery.com"/>
  </cdn_request>
</access_request>
```

`<field>`：

| 属性 | 必填 | 值 |
| --- | --- | --- |
| `table` | 是 | 真实表名，≤30 字符 |
| `field` | 是 | 真实字段名，≤30 字符 |
| `access` | 是 | `ViewOnly` / `FullAccess` |

`<cdn_request>` / `<cdn>`（21.11+）：

- 把外部域名加入 CSP 白名单，允许页面加载其 JS/图片等。
- CSP 从 22.7.0.0+ 默认启用。
- **注意：CSP 是全局的**，不是只对插件文件生效。
- `cdn@name` 最长 50（23.1+ 放宽到 300）。

详见 [../01-api/06-security-model.md](../01-api/06-security-model.md)。

### 4.4 `<links>` / `<link>` / `<ui_context>`

给 PowerSchool 增加导航链接（普通链接，不涉及 SSO）。

| `link` 属性 | 必填 | 说明 |
| --- | --- | --- |
| `display-text` | 是 | 显示文字，≤100 |
| `path` | 是 | 目标 URI，≤1000 |
| `title` | 否 | tooltip，≤256 |

```xml
<links>
  <link display-text="MyApp" path="https://app.example.com" title="Open MyApp">
    <ui_contexts>
      <ui_context id="admin.left_nav"/>
      <ui_context id="admin.header"/>
    </ui_contexts>
  </link>
</links>
```

可用 `ui_context id`：

| id | 位置 |
| --- | --- |
| `admin.left_nav` | 管理员左侧导航 Applications |
| `admin.header` | 管理员头部 Applications 弹窗 |
| `teacher.header` | 教师门户头部 |
| `teacher.pro.apps` | PowerTeacher Pro 侧边 Apps |
| `guardian.header` | 家长门户头部（也会出现在 Unified Classroom Quick Links） |
| `student.header` | 学生门户头部（同上） |

重复的 `ui_context` 安装时能通过校验，但会被忽略。

### 4.5 `<openid>`

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `host` | 是 | 依赖方主机名，不带 scheme，≤256 |
| `port` | 否 | 默认 443 |

子元素 `<links>/<link>`：`display-text`、`path`、`title`、`ui_contexts`。

### 4.6 `<saml>`

**PowerSchool 作为 IdP**：

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | SP 名称，唯一，≤256 |
| `entity-id` | 是 | SP Entity ID，必须精确匹配 |
| `base-url` | 是 | SP 根 URL |
| `metadata-url` | 否 | SP metadata 地址 |

**PowerSchool 作为 SP**：

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 本地 SP 短名 |
| `idp-name` | 是 | 外部 IdP 名称，唯一，≤40 |
| `idp-entity-id` | 是 | IdP Entity ID，精确匹配 |
| `idp-metadata-url` | 是 | IdP metadata 地址 |

子元素：

- `<links>/<link>`
- `<attributes>/<user type="admin|teacher|student|guardian">/<attribute>`
- `<permissions>/<permission>`

`<attribute>`：

| 属性 | 说明 |
| --- | --- |
| `name` | PowerSchool 中的属性名 |
| `attribute-name` | 返回给 SP 的别名 |
| `attribute-value` | 常量值，或用于取动态值的自定义参数 |

`<permission>`：`name`、`description`、`value`。

### 4.7 `<publisher>` / `<contact>`

```xml
<publisher name="Example Publisher">
  <contact email="publisher@example.com" phone="555-0100"/>
</publisher>
```

| 元素 | 属性 | 必填 |
| --- | --- | --- |
| publisher | `name`（≤100） | 是 |
| contact | `email`（≤40） | 是 |
| contact | `phone`（≤20） | 否 |

## 5. MessageKeys

- 目录：`MessageKeys/`
- 文件：`*.{locale}.properties`，如 `example-plugin-message-keys.US_en.properties`
- 内容：标准 Java properties

```properties
psx.htmlc.myplugin.title=My Plugin
psx.htmlc.myplugin.submit=Submit
```

使用：

```html
<h1>~[text:psx.htmlc.myplugin.title]</h1>
```

> 生成器要注意 properties 转义：`= : # !` 和换行。键名建议带产品前缀，避免冲突。

## 6. `pagecataloging/`

23.5+ 的导航 JSON，文件名任意（建议 `*_schoolNav.json` / `*_studentNav.json`）。

- 插件启用时读取、校验并写入 `Navigation` / `PageCatalog` 表。
- JSON 里的 `version` 变化才会触发更新。
- 仅支持 23.5.0.0+；旧版本安装会失败。

详见 [04-enhanced-navigation.md](04-enhanced-navigation.md)。

## 7. `web_root/` 与 wildcards

`web_root/` 下的路径直接映射到门户 URL。例如：

```
web_root/admin/students/wellness_notification_list.html
→ /admin/students/wellness_notification_list.html
```

### 7.1 页面文件

- `.html`：PS-HTML 页面。
- `.json` / `.csv`：常被页面 JS 调用，内部用 `tlist_sql` 生成。
- `.js` / `.css` / 图片：静态资源。

### 7.2 wildcards

老门户常用 `wildcards/*.txt` 注入导航/链接。文件名决定注入位置，例如：

```
guardian_header.demo.leftnav.footer.txt
```

常见用途：

- 管理员左侧导航追加链接
- 教师导航追加链接
- 教师“学生页”下拉追加选项
- 家长导航追加链接

内容通常是 PS-HTML 片段 + `~[if#...]` 条件。

> 23.5+ 的新导航优先用 `pagecataloging`；wildcards 仍用于家长/学生门户或旧版本兼容。

## 8. 安装与启用

1. **System → System Settings → Plugin Management Configuration**。
2. **Install** → 选择 ZIP（`plugin.xml` 必须在根）。
3. 安装后勾选 **Enable**。
4. 启用时会校验：
   - XML/schema
   - 扩展表定义
   - PowerQuery 的表/字段是否在排除列表
   - access_request 字段
5. 启用后：
   - 生成 OAuth Client ID/Secret（如有 `<oauth>`）
   - 写入导航记录（如有 pagecataloging）
   - 创建扩展表（DB 包）
   - 加载 PowerQuery

更新插件时通常要**先禁用再启用**；导航/扩展字段变更依赖版本号递增。

## 9. 版本与命名建议

- `plugin.xml@version`：语义化版本，每次发布递增。
- 导航 JSON `version`：每次改导航都递增，否则 SIS 不会更新记录。
- PowerQuery 名/文件名：全局唯一，用反向域名。
- 扩展表/字段：`U_` 前缀（约定，不是强制）。
- 插件名唯一；发布者信息真实。

## 10. ⚠️ 关于“是否必须开启 Customization”

门户两处表述不完全一致：

- **Plugin ZIP** 页面：必须开启 Customization，PowerQuery 定义才会被加载；关闭时查询会安装但不可访问。
- **PowerQueries** 页面：PowerQuery 不像 Custom Pages 那样依赖 Customization，即使关闭也可访问。

实践建议：

1. 安装前在 **System → System Settings → Customization** 确认已开启。
2. 如果 PQ 不生效，先检查这个开关。
3. 页面/自定义内容（Custom Pages）明确依赖 Customization。

## 11. 一个完整的 `plugin.xml` 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plugin xmlns="http://plugin.powerschool.pearson.com"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://plugin.powerschool.pearson.com plugin.xsd"
        name="Attendance Helper"
        version="1.2.0"
        description="Daily attendance helper plugin">

  <registration url="https://partner.example.com/register">
    <callback-data>tenant-123</callback-data>
  </registration>

  <oauth accessLevelV1Api="READ"/>

  <access_request>
    <field table="STUDENTS" field="DCID" access="ViewOnly"/>
    <field table="STUDENTS" field="LASTFIRST" access="ViewOnly"/>
    <field table="ATTENDANCE" field="ATT_DATE" access="ViewOnly"/>
    <field table="ATTENDANCE" field="ATT_CODE" access="ViewOnly"/>
  </access_request>

  <links>
    <link display-text="Attendance Helper"
          path="/admin/attendance/helper.html"
          title="Open Attendance Helper">
      <ui_contexts>
        <ui_context id="admin.left_nav"/>
      </ui_contexts>
    </link>
  </links>

  <publisher name="Example Publisher">
    <contact email="publisher@example.com"/>
  </publisher>
</plugin>
```
