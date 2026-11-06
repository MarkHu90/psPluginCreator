# 04 · Schema API：Table CRUD 与 PowerQuery

`/ws/schema/*` 是插件开发最灵活的一层：

| 能力 | 端点 | 说明 |
| --- | --- | --- |
| 直接读写表 | `/ws/schema/table/{table}` | 扩展表、独立表、部分核心表 |
| 表元数据 | `/ws/schema/table/{table}/metadata` | 列名、类型、主键 |
| 表面积 | `/ws/schema/table` | 所有表 |
| 功能区域 | `/ws/schema/area` | 表所属业务域 |
| 自定义查询 | `/ws/schema/query/{name}` | PowerQuery，只读 SQL |

---

# 第一部分：Table API

## 1. 取单条

```http
GET /ws/schema/table/{table_name}/{id}?projection=col1,col2
```

- `id` 是该表主键（`DCID` 或 `ID`）。
- `projection` 用逗号分隔；`*` 表示全部（不推荐）。
- 表可以是 1:1、1:N、standalone 扩展表，也可以是支持的核心表。

```http
GET /ws/schema/table/studentcorefields/442?projection=guardian_ln,guardian_fn,guardiandayphone
```

```json
{
  "id": 6140,
  "name": "StudentCoreFields",
  "tables": {
    "StudentCoreFields": {
      "guardian_ln": "Holzer",
      "guardiandayphone": "123 456 7890",
      "guardian_fn": "Timmy"
    }
  }
}
```

## 2. 取多条

```http
GET /ws/schema/table/{table_name}?q={expr}&page={n}&pagesize={size}&projection=col1,col2&sort=col1,col2&sortdescending=false
```

- `q` 的语法与搜索类似，但**不支持 OR 和括号**。
- 通配 `*` 可放字符串开头或结尾。
- 日期 `yyyy-mm-dd`。
- `sort` 逗号分隔；`sortdescending=true`。

```http
GET /ws/schema/table/studentcorefields/?q=guardian_fn==betsy;guardian_ln==elkins&projection=guardian_ln,guardian_fn,guardiandayphone
```

## 3. 计数

```http
GET /ws/schema/table/{table_name}/count?q={expr}
```

```json
{"count": 3}
```

## 4. 新建

```http
POST /ws/schema/table/{table_name}
```

1:1 / 1:N 扩展表必须提供外键（如 `studentsdcid`）。

```json
{
  "tables": {
    "STUDENTCOREFIELDS": {
      "studentsdcid": "3325",
      "guardian_ln": "McTavish",
      "guardiandayphone": "999-999-9999",
      "guardian_fn": "Chauncey"
    }
  }
}
```

响应：

```json
{
  "insert_count": 1,
  "update_count": 0,
  "delete_count": 0,
  "result": [{
    "status": "SUCCESS",
    "action": "INSERT",
    "success_message": {
      "id": 3325,
      "ref": "https://{school}/ws/schema/table/studentcorefields/3325"
    }
  }]
}
```

## 5. 更新

```http
PUT /ws/schema/table/{table_name}/{id}
```

```json
{
  "id": 6140,
  "name": "STUDENTCOREFIELDS",
  "tables": {
    "STUDENTCOREFIELDS": {
      "guardiandayphone": "123 456 7890",
      "guardian_fn": "Timmy"
    }
  }
}
```

## 6. 删除

```http
DELETE /ws/schema/table/{table_name}/{id}
```

| 状态 | 含义 |
| --- | --- |
| 204 | 删除成功 |
| 404 | 记录不存在 |
| 403 | 缺少表内**所有列**的 `FullAccess` 权限 |

```json
{
  "message": "At least one column lacks sufficient permission",
  "errors": [
    {"resource": "StudentCoreFields", "field": "act_composite", "code": "ViewOnly"}
  ]
}
```

## 7. 表元数据与功能区域

```http
GET /ws/schema/table                              # 所有表 + 主键
GET /ws/schema/table/{table}/metadata             # 列、SQL 类型、主键、schemaType
GET /ws/schema/area                               # 功能区域
GET /ws/schema/area/{areaname}/table              # 某区域下的表
GET /ws/v1/metadata                               # 分页上限、版本
```

```json
{
  "name": "Attendance",
  "primaryKey": "dcid",
  "schemaType": "CORE",
  "columns": [{"name": "dcid", "sqltype": "Number"}],
  "@expansions": "userVisible, attrs, backRels, queries, access, fwdRels, actions"
}
```

## 8. 安全要点

- 插件能访问的表/字段由 `<access_request>` 决定。
- **查询条件和 projection 都算访问**：过滤一个没授权的字段也会失败。
- 访问未授权字段返回：

```json
{
  "message": "At least one column lacks sufficient permission",
  "errors": [{"resource": "Attendance", "field": "STUDENTID", "code": "NoAccess"}]
}
```

- 删除要求表内**每一列**都有 `FullAccess`（因为删除会作用于整行）。

---

# 第二部分：PowerQuery

PowerQuery 是一段**只读 SQL** + 参数 + 列定义，安装后成为一个 API 资源。它有三条使用路径：

1. 外部 API：`POST /ws/schema/query/{name}`（OAuth）
2. 内部页面：同一端点（会话 cookie + permission mapping）
3. Data Export Manager（DEM）：用户在界面上导出

## 1. 文件与命名

- 文件名：`[name].named_queries.xml`，放在插件包 `queries_root/`。
- 一个文件可含多个 `<query>`。
- 文件名与查询名都是**全局扁平命名空间**，必须唯一。
- 查询名格式：`[com].[organization].[product].[area].[name]`（五段）。
  - 例：`com.acme.attendance.daily.daily_detail`
  - **不要**用 `com.powerschool` 作为前两段。
- 建议一个领域一个文件，例如 `com.acme.attendance.named_queries.xml`。

## 2. 完整结构

```xml
<queries>
  <query name="com.acme.attendance.daily.daily_detail"
         coreTable="ATTENDANCE"
         flattened="false"
         tags="attendance,daily">

    <summary>Daily attendance detail</summary>
    <description>Returns one row per student per attendance day.</description>

    <args>
      <arg name="schoolid" column="ATTENDANCE.SCHOOLID" type="primitive"
           required="true" description="School ID"/>
      <arg name="studentdcids" column="STUDENTS.DCID" type="array"
           required="false" description="Student DCIDs"/>
    </args>

    <columns>
      <column column="STUDENTS.DCID">STUDENTS.DCID</column>
      <column column="STUDENTS.LASTFIRST">STUDENTS.LASTFIRST</column>
      <column column="ATTENDANCE.ATT_DATE">ATTENDANCE.ATT_DATE</column>
      <column column="ATTENDANCE.ATT_CODE">ATTENDANCE.ATT_CODE</column>
    </columns>

    <sql><![CDATA[
      select s.dcid,
             s.lastfirst,
             a.att_date,
             a.att_code
        from attendance a
        join students s on s.dcid = a.studentid
       where a.schoolid = :schoolid
         and (:studentdcids is null or s.dcid in (:studentdcids))
       order by s.lastfirst, a.att_date
    ]]></sql>
  </query>
</queries>
```

## 3. `<query>` 属性

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 全局唯一，五段命名 |
| `coreTable` | 否 | 允许通过 `extensions` 返回该表的 1:1 扩展；必须是真实表名 |
| `flattened` | 否 | `true`：所有字段平铺；`false`（默认）：按表分组 |
| `tags` | 否 | 逗号分隔，用于 DEM 分组；查询名第 4 段也会自动成为标签 |

## 4. `<args>`

```xml
<arg name="" column="" required="" description="" type="" default="" casing=""/>
```

| 属性 | 说明 |
| --- | --- |
| `name` | 参数名，Java 标识符；SQL 中用 `:name` 引用 |
| `column` | 关联的真实表.列；**要出现在 DEM 或使用 `casing` 时必须提供** |
| `required` | `true` / `false` |
| `description` | 供人阅读 |
| `type` | `primitive`（单值）/ `array`（JSON 数组） |
| `default` | 缺省值；可用 PS-HTML 标签（如 `~(curschoolid)`），但会导致不出现在 DEM |
| `casing` | `upper` / `lower` / `none`（22.11+，仅字符串） |

数组参数示例：

```json
{"schoolid": 123, "studentdcids": [1, 2, 3]}
```

## 5. `<columns>`

- 每个 SQL 返回列都要声明，**顺序必须与 SQL 返回列一致**。
- 别名写法：`<column column="STUDENTS.LASTFIRST">STUDENTS.FULLNAME</column>`
- 别名可带一段或两段；只有一段时**必须**有 `coreTable`。
- 别名只允许 `A-Z a-z 0-9 _`；不要用空格。
- 9.0+ 要求 **SQL 列名唯一**，否则动态排序/`$q` 会出问题。

```sql
-- 错误：两个 first_name，且第二列无别名
select students.first_name,
       students.last_name||'ski',
       users.first_name
from ...

-- 正确
select students.first_name,
       students.last_name||'ski' as last_name,
       users.first_name as users_first_name
from ...
```

## 6. `<sql>` 规则

1. 用 `<![CDATA[ ... ]]>` 包裹，避免编码问题。
2. 建议始终带 `order by`；否则分页不稳定。也可用请求参数 `order` 覆盖。
3. 参数用 `:name`，PowerQuery 以 **prepared statement** 执行，无需手动转义。
4. 支持 `UNION`、CTE / `WITH`。
5. 禁止使用被排除的表/字段；插件启用时校验，命中则无法启用。
6. PS-HTML 标签**不能**出现在 SQL 中（作为 `arg` 默认值可以）。
7. 需要扩展支持时，SQL 必须包含 `coreTable` 的主键列。
8. 视图可用（9.2+），但访问视图字段时 `access_request` 必须用 `ViewOnly`；视图不能作为 `coreTable`。

支持的主要视图（9.2+）：

```
PS_ADAADM_DAILY_CTOD / _TTOD
PS_ADAADM_DEFAULTS_ALL
PS_ADAADM_INTERVAL_TTOD
PS_ADAADM_MEETING_PTOD / PTOP / PTOP_CURYEAR / PTOP_PREVYR
PS_ADAADM_MEETING_TTOD / TTOP / TTOP_CURYEAR / TTOP_PREVYR
PS_ADAADM_TIMEINTER_TTOD / TIME_TTOD
PS_ATTENDANCE_DAILY / INTERVAL / MEETING / MEETINTER / TIME / TIMEINTER
PS_CALENDAR_DAY
PS_ENROLLMENT / _ALL / _PROG / _REG / _SIF
PS_MEMBERSHIP_DEFAULT / _PROG / _REG
PS_SCHOOLENROLLMENT
PT_ENROLLMENT_ALL
PT_MEMBERSHIP_DEFAULTS
```

## 7. 学生/教职工选择（`<@restricted_table>`）

内部 API 可以把结果限制为“当前选中的学生/教职工集合”，对 Partner API 是 no-op。

```xml
<sql><![CDATA[
  with selectedstudents as (
    select dcid, id, lastfirst, schoolid
      from students
     where <@restricted_table table="students" selector="selectedstudents"/>
  )
  select * from selectedstudents
]]></sql>
```

调用时加：

```
dofor=selection:selectedstudents
```

- 标签内关键字必须**全小写**。
- `table="students"` 或 `table="SchoolStaff"`。
- 选择存在时展开为 `dcid in (:current_student_selection)`；不存在时为 `1=1`。
- 只在 Internal API 生效；Partner API 无效果。
- 没有选择时，若 selector 匹配，则返回 0 行。

## 8. 调用

```http
POST https://{school}/ws/schema/query/{query_name}
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json

{"studentnumber": 1012973}
```

### 8.1 查询参数

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `pagesize` | 100 | 行数；`0` = 流式返回全部（无上限） |
| `page` | 1 | 第几页；`pagesize=0` 时忽略 |
| `order` | — | 覆盖 SQL 排序，格式 `table.col[;asc\|desc],...` |
| `count` | false | 同时返回未分页总行数 |
| `dofor` | — | `selection:selector1,selector2` |

`order` 示例：

```
order=students.last_name,students.first_name,students.entrydate;desc
```

### 8.2 `$q` 行过滤

payload 里的 `$q` 是 FIQL，作用在**查询的别名**（逻辑表/列）上：

```json
{"$q": "students.grade_level=ge=8;students.enroll_status==0;cc.course_number==MUSIC"}
```

- 不支持 OR `,` 和括号。
- 扩展表字段：`[coretable].[extendedtable].[column]`，如
  `students.studentcorefields.allergies==*peanut butter*`。
- 空值用 `\u0000`：`"students.middle_name==\u0000"`。
- 特殊字符只对**比较值**做 URL 编码：`...==*M%26Ms*`。

### 8.3 `projection` 列裁剪

```json
{"projection": "students.grade_level;students.enroll_status;cc.course_number"}
```

- 用 **分号** 分隔。
- `table.*` 表示该表全部。
- 9.2.0 / 9.2.1 有 bug，不要用。

### 8.4 计数

```http
POST /ws/schema/query/{name}/count
```

或 `?count=true` 在返回结果的同时返回总行数。

### 8.5 流式

```http
POST /ws/schema/query/{name}?pagesize=0
```

客户端必须按 chunk 处理，不能假设一次拿到完整 JSON。

## 9. Data Version（增量）

在 payload 中同时提供：

```json
{
  "$dataversion": "16314148",
  "$dataversion_applicationname": "StudentChanges"
}
```

- 两个必须一起用。
- 响应会带最新的 `$dataversion`。
- SQL 建议用 **outer join**，否则只有所有相关表都变化时才返回行。
- 详细见 [05-events-and-delta.md](05-events-and-delta.md)。

## 10. 安全

### 外部（OAuth）

- 请求带 access token。
- 插件 `<access_request>` 必须覆盖查询涉及的**所有**表/字段（select、join、where、order）。
- 未授权字段 / 排除字段 → **403**（并记录日志）。

### 内部（Session Cookie）

- 用户已登录门户。
- 插件必须提供 **permission mapping**，否则 403。
- 结果还会被 **FLS** 和 **DRF** 裁剪：
  - FLS：无权限的列不返回。
  - DRF：无权限的行不返回。

### “三脚凳”模型

```
查询本身定义了返回哪些列
        ∩
插件 access_request 申请了哪些列
        ∩
运行时实际授予了哪些列
```

- **Trusted** 查询（核心/州合规）：缺权限的列被**静默丢弃**。
- **Untrusted** 查询（插件定义）：缺权限直接**报错**。
- 一个插件定义的 PowerQuery，**所有插件都能调用**；反之亦然。这方便拆分公共查询插件。

## 11. 特性/版本矩阵（节选）

| 特性 | 最低版本 |
| --- | --- |
| Partner API 执行 | 8.2.0 |
| `arg type=array` | 8.2.0 |
| `/count` | 8.2.0 |
| `extensions` 参数 | 8.2.0 |
| Swagger 2.0 | 8.3.0 |
| 改名 PowerQuery | 9.0.0 |
| DRF | 9.0.0 |
| 内部 API 执行 | 9.0.0 |
| DEM 导出 | 9.0.0 |
| `$q` / `order` / `projection` | 9.0.0 |
| 流式 | 9.0.0 |
| 唯一列别名要求 | 9.0.0 |
| `count=true` | 9.1.0 |
| 任意表扩展 | 9.2.0 |
| `alterselection` | 9.2.0 |
| 视图 | 9.2.0 |
| Data Version | 10.0 |
| `casing` | 22.11.0.0 |

## 12. PowerQuery vs Table API vs v1

| 场景 | 选择 |
| --- | --- |
| 标准对象、需要 expansion、官方兼容承诺 | `/ws/v1` |
| 跨表关联、聚合、报表、自定义输出形状 | PowerQuery |
| 维护扩展表（增删改查单表） | Table API |
| 在 PS-HTML 页面里展示一行/一列 | PowerQuery DAT 或 `tlist_sql` |
| 大批量导出 | PowerQuery + `pagesize=0` 流式 |

内置 438 个 PowerQuery 的完整清单见
[03-reference/02-powerquery-catalog.md](../03-reference/02-powerquery-catalog.md)。
