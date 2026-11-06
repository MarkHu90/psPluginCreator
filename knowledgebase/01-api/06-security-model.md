# 06 · 安全模型：字段白名单、权限映射、排除表与 DRF

PowerSchool 的 API 安全由四层组成，缺一层就会 403 或静默丢数据：

```
1. 认证        OAuth token 或 session cookie
2. 插件声明    <access_request> 字段白名单（外部/插件 API）
3. 页面映射    permission_mappings（内部/会话 API）
4. 运行时      Exclude List + Field Level Security + DRF
```

---

## 1. `<access_request>`：字段级白名单

只要插件声明了 `<oauth>`，就**应该**同时声明 `<access_request>`，列出所有要读/写的表与字段。

```xml
<access_request>
  <field table="STUDENTS" field="DCID" access="ViewOnly"/>
  <field table="STUDENTS" field="SSN" access="ViewOnly"/>
  <field table="STUDENTS" field="LAST_NAME" access="FullAccess"/>
  <field table="STUDENTS" field="FIRST_NAME" access="FullAccess"/>
  <field table="STUDENTCOREFIELDS" field="ACT_DATE" access="FullAccess"/>
  <field table="TEACHERS" field="FIRST_NAME" access="ViewOnly"/>
</access_request>
```

| `access` | 含义 | 限制 |
| --- | --- | --- |
| `ViewOnly` | 只读 | 可用于表和视图 |
| `FullAccess` | 读写/删除 | **只能用于表**；视图只读 |

- `table` / `field` **大小写不敏感**，但必须是真实 schema 名。
- 字段名与界面显示名可能不同，常见映射：

| 门户显示名 | 实际 schema 名 |
| --- | --- |
| comment | commentvalue |
| group | groupvalue |
| access | accessvalue |
| date | datevalue |
| prerequisites | prerequisitesvalue |
| role | rolevalue |
| rows | rowsvalue |
| default | defaultvalue |
| count | countvalue |
| option | optionvalue |
| break | breakvalue |
| current | currentvalue |
| discipline_incidenttypecategory | incidenttypecategory |
| discipline_durationchangesource | durationchangesource |
| sched_validextradaycombinations | validextradaycombinations |
| listoption_insertlinktopageview | listoption_insertlinktopage |
| destination_email_send_as_attac | destination_email_send_attach |

### 1.1 适用范围

> ⚠️ `access_request` **不适用于 `/ws/v1/*` 和 PTG 端点**，但有两个例外：
> `Students.SSN` 和 `Students.lunch_status`。这是为了保持 v1 的向后兼容。
> `/ws/v1` 的访问级别由 `<oauth accessLevelV1Api="...">` 控制。

### 1.2 “三脚凳”模型

```
PowerQuery 定义的列
        ∩
插件 access_request 申请的列
        ∩
运行时授予的列
```

- **Trusted 查询**（核心/州合规）：缺权限列被**静默移除**。
- **Untrusted 查询**（插件定义）：缺权限**直接报错**。
- 插件定义的 PQ 对所有插件可见（便于拆分公共查询插件）。

### 1.3 排除表

`<access_request>` 不能申请 Exclude List 中的表/字段；申请了也无法启用或会 403。

---

## 2. `permission_mappings`：内部 API 的页面级权限

外部 OAuth 调用**不检查**权限映射；浏览器会话（Internal API）调用**必须**有。

### 2.1 位置与命名

```
permissions_root/[name].permission_mappings.xml
```

一个文件可含多条；一个插件可含多个文件。

### 2.2 基本结构

```xml
<permission_mappings>
  <permission name="/admin/student/studentattendance.html">
    <implies allow="post">/ws/schema/query/com.acme.attendance.daily_attendance</implies>
    <implies allow="post">/ws/schema/query/com.acme.attendance.meeting_attendance</implies>
  </permission>
</permission_mappings>
```

含义：能访问 `studentattendance.html` 的用户，可以 POST 这两个 PowerQuery。

### 2.3 `allow` 属性

页面权限与 HTTP 方法的默认映射：

| 页面权限 | 允许的方法 |
| --- | --- |
| No Access | 无 |
| Read Only | GET |
| Read Write | GET, POST, PUT, DELETE |
| Mod Access | GET, POST, PUT, DELETE |

PowerQuery **始终用 POST**。如果只给只读用户映射，默认只有 GET，会导致 403；
所以 PowerQuery 映射通常写 `allow="post"`。

### 2.4 按门户选择映射页面

| 用户类型 | 映射页面 |
| --- | --- |
| ADMIN | `/admin/**/*.html`（写真实页面名，不要用 `*`；不要映射到“人人可访问”的页面） |
| PARENT | `/guardian/home.html` |
| STUDENT | `/student/home.html` |
| TEACHER | `/teachers/home.html` |

### 2.5 Table Query 的映射

```xml
<permission_mappings>
  <permission name="/admin/students/activities.html">
    <implies allow="get">/ws/schema/table/activities</implies>
    <implies allow="get">/ws/schema/table/activities/#</implies>
    <implies allow="get">/ws/schema/table/activities/count</implies>
    <implies allow="post">/ws/schema/table/activities</implies>
    <implies allow="post">/ws/schema/table/activities/massupdatebycriteria</implies>
    <implies allow="put">/ws/schema/table/activities/#</implies>
    <implies allow="delete">/ws/schema/table/activities/#</implies>
  </permission>
</permission_mappings>
```

- `#` 表示数字 ID；插件代码里用真实 ID。
- 每个“路径 + 方法”组合都是一条独立授权。

### 2.6 缺少映射

```json
{
  "message": "You do not have POST permission on the resource /ws/schema/query/...",
  "errors": [0]
}
```

→ **403 Forbidden**。

---

## 3. Exclude List（受限表/字段）

以下表/字段**任何 API 都不能读或写**（清单会随版本变化，以门户为准）：

| 表 | 字段 | 说明 |
| --- | --- | --- |
| `AU_*` | 全部 | 审计表 |
| `AUD_*` | 全部 | 审计表 |
| `BLOBS` | 全部 | |
| `CACHE_MESSAGE` | 全部 | |
| `CUSTOM*` | 全部 | |
| `DALX_*` | 全部 | |
| `DATACOLLEVENT` | 全部 | |
| `EMAILQUEUE` / `EMAILRECIPIENT` | 全部 | |
| `FIELDLEVELSECURITY` / `FIELDSTABLE` | 全部 | |
| `FIELDTYPECHANGEREQUEST` | 全部 | |
| `HLE_*` | 全部 | |
| `IDP*` | 全部 | |
| `KEYSTORE` | 全部 | |
| `LG_*` | 全部 | |
| `METAPHONE` | 全部 | |
| `OAUTHACCESSTOKEN` | 全部 | |
| `OIDSERVERASSOCIATIONSTORE` | 全部 | |
| `PAGES` | 全部 | |
| `PCAS_*` | 大部分 | 例外：`PCAS_ACCOUNT.USERNAME`、`PCAS_EMAILCONTACT.EMAILADDRESS` |
| `PISA_SESSION` | 全部 | |
| `PLUGIN*` | 全部 | |
| `PSM_GRANTEDPERMISSION` | 全部 | |
| `QUEUE` | 全部 | |
| `QRTZ_*` | 全部 | |
| `ROLE*` | 全部 | 各类角色/权限表 |
| `SCHED_DEBUG` | 全部 | |
| `SERVER_CONFIG` / `SERVER_INSTANCE` | 全部 | |
| `SEQNO` | 全部 | |
| `SIF*` | 全部 | |
| `SRPTMP*` | 全部 | |
| `SYB_AUTO_DB_EXTEND_CONTROL` | 全部 | |
| `SYS_SEQUENCE` | 全部 | |
| `TABLENUMBERMAP` | 全部 | |
| `TEACHEREMAILQUEUE` | 全部 | |
| `TMPDALX*` | 全部 | |
| `UCOLS` / `UTABLE` | 全部 | |
| `VIRTUAL*` | 全部 | |

9.1+ 另外限制：

- `PS_MEMBERSHIP_DEFAULTS`
- `PT_ENROLLMENT_ALL`
- `PT_MEMBERSHIP_DEFAULTS`

> 25.5.1.0 起，`WHENCREATED` / `WHENMODIFIED` / `WHOCREATED` / `WHOMODIFIED` 从排除列表移除。
> 旧版本中这些字段不可访问。

行为差异：

| 认证 | 命中排除表/字段 |
| --- | --- |
| OAuth（外部） | **403** |
| Session Cookie（内部） | 请求成功，但排除字段**不出现在响应** |

---

## 4. Security Processing：OAuth vs Cookie

| 处理 | OAuth | Session Cookie |
| --- | --- | --- |
| Permission Mapping | 不检查 | **检查**；缺失 → 403 |
| Exclude List | 命中 → **403** | 命中 → 字段被剔除 |
| Field Level Security | 无权限 → **403** | 无权限 → 字段被剔除 |
| DRF（PowerQuery 行级） | **不应用** | **应用** |

这就是同一个 PowerQuery 在“浏览器里能查全量、外部 token 查不到/报错”或反之的根因。

---

## 5. Data Restriction Framework（DRF）

DRF 是 PowerSchool 的行级数据限制框架，当前只用于：

- **PowerQuery**
- **Internal API**（已登录用户）
- PowerSchool 对 FERPA 的解释

### 5.1 覆盖表

- 602 张表中的大部分被覆盖；其中约 459 张是 `no-restrictions`。
- 其余表按用户类型限制：`admin,teacher,student,parent` 的任意组合，或 `NO ACCESS`。
- 不在清单中的表**不能被内部 PowerQuery 访问**。
- 扩展表跟随其父表：
  - 父表是 Students → 按学生限制。
  - 父表是 no-restrictions → 扩展表也 no-restrictions。
  - 父表不可用 → 扩展表不可用。

### 5.2 PowerQuery 的 DRF 状态

默认规则：取查询中**所有表/视图**的 DRF 状态做 **AND**。

| 查询包含 | 整体状态 |
| --- | --- |
| STUDENTS | admin,teacher,student,parent |
| STUDENTS, CC | admin,teacher,student,parent |
| STUDENTS, LOG | admin（LOG 仅 admin） |
| STUDENTS, INCIDENTS | NO ACCESS |
| COURSES, SECTIONS | no-restrictions |
| STUDENTS, SECTIONS | admin,teacher,student,parent |

`no-restrictions` 与 `admin,teacher,student,parent` 的区别：

- 前者：**不生成**行级限制谓词。
- 后者：会生成限制谓词（如 `DCID in (...)`）。

执行时 PowerSchool 会把受限表包成 CTE：

```sql
-- 原查询
select * from STUDENTS

-- 实际执行
with STUDENTS$1 as (
  select * from STUDENTS where DCID in (<复杂谓词>)
)
select * from STUDENTS$1
```

只对**有**限制的表加谓词；`no-restrictions` 表原样保留。

### 5.3 对插件的影响

- 内部页面里用 PowerQuery，结果可能**少于**外部 token 调用的结果。
- 如果页面显示“缺数据”，先确认是 DRF/FLS 还是 SQL 条件。
- 需要“全量”数据的后台任务，应使用 OAuth 外部调用（但受 access_request 限制）。

---

## 6. 常见 403 排查顺序

```
403
├─ 是 OAuth 外部调用吗？
│   ├─ token 是否有效？ → 401/403 区分
│   ├─ 字段是否在 access_request？ → 补声明并重新启用插件（管理员批准）
│   ├─ 是否命中 Exclude List？ → 换字段/表
│   └─ 是否 accessLevelV1Api 未声明？ → 25.2+ 加 READ/FULL
└─ 是内部会话调用吗？
    ├─ 是否缺 permission mapping？ → permissions_root
    ├─ 用户是否有该页面权限？ → 映射页面选错
    ├─ 是否命中 Exclude List？ → 字段被剔除（不是 403）
    └─ 是否被 FLS/DRF 限制？ → 正常行为，换高权限账号验证
```

## 7. 最佳实践

1. **最小字段集**：`access_request` 只申请真正需要的列；`ViewOnly` 优先。
2. 外部集成用 OAuth + 字段白名单；不要用管理员 cookie 做自动化。
3. 每个内部页面用到的 PowerQuery/Table API 都写 permission mapping。
4. 不要把 `allow="post"` 无脑套到写操作上；写操作应映射到真正有写权限的页面。
5. 定期核对 Exclude List（版本升级会变）。
6. 测试时用**低权限账号**验证 DRF/FLS，不要只用管理员。
7. 403 日志要记录资源、字段、用户类型，便于定位。
