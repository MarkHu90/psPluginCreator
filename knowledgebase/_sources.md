# 资料来源与抓取说明

## 1. 来源

- **PowerSchool Developer Portal**
  - 入口：`https://support.powerschool.com/developer/`
  - 登录后是 Angular 单页应用；页面内容通过以下接口返回：
    - `GET /webservices/developer/menu/main`（整站菜单 + 首页内容）
    - `GET /webservices/developer/page/get/slug/{slug}`（单页）
  - 另抓取门户内嵌的 Swagger 2.0 规范：
    - `/webservices/developer/media/file/177` → Core Resources（409 个操作）
    - `/webservices/developer/media/file/176` → PowerQuery Resources（438 个内置查询）
    - `/webservices/developer/media/file/19` → 另一份 PowerQuery 规范（98 个，内容与 176 有重叠）
- **抓取日期**：2026-11-06
- **凭据**：仅用于登录抓取，未写入本知识库、未写入仓库文件。
- **范围**：Developer Portal 的 *PS SIS API*、*PS SIS Customization* 两个栏目及其全部子页；
  Community 下的博客/视频只作背景，未逐篇总结。

> 本知识库是**归纳与重组**，不是官方文档的逐字复制。参数、响应码、版本门槛以官方页面为准；
> 实施前应在目标 SIS 版本上验证。

## 2. PS SIS API 页面

| Slug | 标题 |
| --- | --- |
| `security` | Security（安全总览） |
| `oauth` | OAuth for API Access |
| `all-about-access-tokens` | All About Access Tokens |
| `session-cookie` | Session Cookie |
| `automatic-registration` | Automatic Registration |
| `access-request---field-access` | Access Request - Field Access |
| `permission-mapping` | Permission Mapping |
| `exclude-list` | Exclude List |
| `security-processing` | Security Processing |
| `data-restriction-framework` | Data Restriction Framework |
| `data-access` | Data Access（总览） |
| `general-usage` | General Usage |
| `http-response-codes` | HTTP Response Codes |
| `searching` | Searching |
| `pagination` | Pagination |
| `expansions` | Expansions |
| `extensions` | Extensions |
| `validation` | Validation |
| `resources` | Resources（资源索引） |
| `core-resources` | Core Resources（Swagger） |
| `powerquery-resources` | PowerQuery Resources（Swagger） |
| `district-resources` | District Resources |
| `school-resources` | School Resources |
| `student-resources` | Student Resources |
| `staff-resource` | Staff Resource |
| `course-resources` | Course Resources |
| `section-resources` | Section Resources |
| `section-enrollment-resource` | Section Enrollment Resource |
| `term-resource` | Term Resource |
| `time-resource` | Time Resource |
| `table-resources` | Table Resources |
| `global-resources` | Global Resources |
| `fee` | Fee |
| `translate-resource` | Translate Resource |
| `assignment-resources` | Assignment Resources（PTG，历史） |
| `powerteacher-gradebook--powerteacher-pro` | PowerTeacher Gradebook & PowerTeacher Pro |
| `events` | Events |
| `event-subscription-resources` | Event Subscription Resources |
| `test-subscription-resource` | Test Subscription Resource |
| `data-version-delta-pull` | Data Version (Delta Pull) |
| `powerqueries` | PowerQueries |
| `powerquery-example` | PowerQuery Example |
| `powerquery-featureversion-matrix-added` | PowerQuery Feature/Version Matrix Added |
| `powerquery-issues-in-920` | PowerQuery issues in 9.2.0 |
| `all-about-powerschool-database-ids` | All About PowerSchool Database IDs |
| `single-sign-on-2` | Single Sign On（总览） |
| `powerschool-as-openid-identity-provider` | PowerSchool as OpenID Identity Provider |
| `powerschool-as-saml-identity-provider` | PowerSchool as SAML Identity Provider |
| `powerschool-as-samlws-trust-service-provider` | PowerSchool as SAML/WS-Trust Service Provider |
| `three-legged-oauth` | PowerSchool as Three-Legged OAuth / OpenID Connect Provider |
| `single-sign-on-and-user-access-roles` | Single Sign-On and User Access Roles |
| `examples` | Examples |
| `rest-api-authentication-example` | REST API Authentication Example |
| `data-access-example` | Data Access Example |
| `enroll-students-example` | Enroll Students Example |
| `registration-example` | Registration Example |
| `openid-single-sign-on-example` | OpenID SSO Example |
| `openid-single-sign-on-with-data-access-example` | OpenID SSO + Data Access |
| `event-listener-example` | Event Listener Example |
| `sample-code-and-environment-setup` | Sample Code and Environment Setup |
| `openid-single-sign-on-example-in-net` | OpenID SSO Example in .NET |
| `saml-service-provider-single-sign-on-example-in-net` | SAML SP SSO Example in .NET |
| `java-code-example-for-generating-oauth-signature` | Java OAuth signature example |
| `nodejs-code-example-for-generating-oauth-signature` | NodeJS OAuth signature example |
| `vendor-plugin-example` | Vendor Plugin Example |

## 3. PS SIS Customization 页面

| Slug | 标题 |
| --- | --- |
| `plugins` | Plugins（总览） |
| `plugin-xml` | Plugin XML |
| `plugin-zip` | Plugin ZIP |
| `page-customization-and-database-extensions` | Page Customization and Database Extensions |
| `ps-html-tags` | PS-HTML tags |
| `user-interface-customization` | Enhanced Navigation Customization |
| `new-experience-start-page-customization` | New Experience Start Page Customization |
| `powerschool-sis-attendance-in-schoology-customizations` | PowerSchool SIS Attendance in Schoology Customizations |
| `powerteacher-pro-customization` | PowerTeacher Pro Customization |
| `powerquery-dat` | PowerQuery DAT |
| `student-contacts-customization` | Student Contacts Customization |
| `validation-dashboard` | Validation Dashboard |
| `new-incidents-ui-customization` | New Incidents UI Customization |

## 4. Community（背景资料，未逐篇总结）

| Slug | 标题 |
| --- | --- |
| `blog` | Blog |
| `video-library` | Video Library |
| `blogpost-20150722-1` | Swagger-based API Documentation |
| `blogpost-20150722-2` | Welcome to our new Developer Site |
| `blogpost-20151006-1` | How the heck do I get started with the PowerSchool API? |
| `blogpost-20151118-1` | Happy Thanksgiving from the PowerSchool API team! |
| `blogpost-20160119-1` | New Year, New Ways to Learn About the PowerSchool API |
| `all-about-access-tokens` | All About Access Tokens（已纳入认证文档） |

## 5. 自动生成的参考文件

| 文件 | 来源 |
| --- | --- |
| `03-reference/01-endpoint-catalog.md` | Core Resources Swagger（file 177） |
| `03-reference/02-powerquery-catalog.md` | PowerQuery Resources Swagger（file 176） |

## 6. 外部链接（门户中引用）

- OpenID Connect Core 1.0：`https://openid.net/specs/openid-connect-core-1_0.html`
- OAuth 2.0：`https://tools.ietf.org/html/rfc6749`
- FIQL：`https://tools.ietf.org/html/draft-nottingham-atompub-fiql-00`
- PowerSchool Database Extension and Page Customization Developer Guide：
  `https://support.powerschool.com/article/74828`
- Unified Teacher Record（Knowledgebase 69896，PowerSource）
- PowerSchool Data Dictionary（PowerSource）
- PowerQuery DAT 列表（官方文档）：
  `https://docs.powerschool.com/PSHSA/latest/page-and-data-management/data-access-tags/powerquery-dats`

> 外部链接可能需登录或随版本迁移；如失效，以门户搜索为准。

## 7. 已知差异与待验证点

1. **Customization 开关与 PowerQuery**：`plugin-zip` 与 `powerqueries` 两页表述不完全一致；
   见 [02-customization/01-plugin-package.md](02-customization/01-plugin-package.md) 第 10 节。
2. **学生门户路径**：本知识库按本项目的现场约定，学生与家长都用 `/guardian/`；
   官方门户在部分版本/部署中可能有 `/students/`。以目标实例为准。
3. **扩展表 schema XML**：门户只给外部指南链接；本文的 `<psExtension>` 结构来自本仓库
   `demo/*/dbsetup/user_schema_root/*.xml` 与现场 xsd。1:1 / 1:N 的属性名请以目标版本验证。
4. **PTG API**：门户仍保留文档，但 22.5 起不可用；仅作历史参考。
5. **文档抽取的重复段落**：部分示例页（如 REST auth、PowerQuery example）原文有重复段落，
   知识库已去重归纳，未逐字保留。
