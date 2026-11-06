# 08 · PowerQuery DAT（22.9.0.0+）

PowerQuery DAT（PQD）让你把一条 PowerQuery 变成一个 **Data Access Tag**，在 PS-HTML 页面、
报表、Form Letter、导出里用 `~(*powerquery;...)` 调用。

适合：

- 单个字段/单行，如学生邮箱、Global ID。
- 有限的多字段/多行，如“课程 + 缺交作业数”。

不适合：

- 任意复杂报表（用页面/PowerQuery 直接展示）。
- 大量行（DAT 最多 100 行；导出里多行还可能错位）。

---

## 1. 定义 PowerQuery

必须满足：

| 属性 | 值 |
| --- | --- |
| `flattened` | `true` |
| `dat` | `true` |
| `coreTable` | `Students` 或 `SchoolStaff` |

```xml
<query name="com.example.custom.dats.students.student_email"
       flattened="true"
       coreTable="Students"
       dat="true">
  <summary>DAT - Example - Student Email</summary>
  <description>Get the student's primary email.</description>

  <args>
    <arg name="coreTableDcid" column="Students.DCID" required="true"/>
  </args>

  <columns>
    <column column="emailaddress.emailaddress">emailaddress</column>
  </columns>

  <sql><![CDATA[
    select email.emailaddress
      from (select emailaddress.emailaddress
              from emailaddress
              join personemailaddressassoc
                on emailaddress.emailaddressid = personemailaddressassoc.emailaddressid
               and personemailaddressassoc.isprimaryemailaddress = 1
              join person on personemailaddressassoc.personid = person.id
              join students on person.id = students.person_id
             where students.dcid = :coreTableDcid
             order by personemailaddressassoc.emailaddresspriorityorder asc) email
     where rownum = 1
  ]]></sql>
</query>
```

---

## 2. 参数注入

SIS 会自动注入以下参数（**大小写不敏感**），只要查询里定义了同名 arg：

| 参数 | 含义 | 示例 |
| --- | --- | --- |
| `coretabledcid` | 当前 `Students.DCID` / `SchoolStaff.DCID` | `students.dcid = :coretabledcid` |
| `curstudid` | 当前 `Students.ID` | `students.id = :curstudid` |
| `curtchrid` | 当前 `SchoolStaff.ID` | `schoolstaff.id = :curtchrid` |
| `curyearid` | 当前学年 | `cc.termid between (:curyearid*100) and (:curyearid*100)+99` |
| `curtermid` | 当前 term | `cc.termid = :curtermid` |
| `curschoolid` | 当前学校 | `cc.schoolid = :curschoolid` |
| `listaggdelim` | LISTAGG 分隔符 | `LISTAGG(racecd, :listaggdelim)` |

> 推荐用 `coretabledcid` 关联当前记录；`curstudid` / `curtchrid` 是 ID 口径，注意区分。

### 2.1 用户自定义参数（22.11+）

在 DAT 里用 `arg.<name>=value` 传：

```
~(*powerquery;query=com.acme.attendance.date_based; arg.startDate=7/1/2021)
```

要点：

- `arg.` 前缀不能覆盖内置注入参数。
- 日期格式：`MM/DD/YYYY`。
- `type="array"` 的参数，值用逗号分隔：`arg.attendanceCodes=A,T`。
- 可用 `casing="lower"` / `upper`（22.11+）。

---

## 3. 调用语法

### 3.1 基本

```
~(*powerquery;query=com.powerschool.core.dats.students.student_email)
```

注意是 `~(*powerquery;...)`，不是 `~[...]`。

### 3.2 无行提示

```
~(*powerquery;query=com.powerschool.core.dats.students.student_email;no-rows-message=No Email)
```

多字段时可用 `no-value-message=N/A` 替换空值。

### 3.3 多行多列

```
~(*powerquery;query=com.powerschool.core.dats.students.storedgrades;
  fields=course_name,course_number,grade,storecode;
  value-delim=dash;
  row-delim=br)
```

- `fields` 指定返回哪些列及顺序（必须是列别名）。
- 不写 `fields` 返回全部。
- 最多 **100 行**。
- 如果用户对查询中**任意字段**无权限（即使不在 `fields` 里），整个 DAT 只返回 `*****`。

### 3.4 聚合 LISTAGG

```
~(*powerquery;query=com.powerschool.core.dats.students.racecodes;listaggdelim=br)
```

支持的分隔符：

| 值 | 实际 |
| --- | --- |
| `dlf` | 双换行 |
| `lf` | 换行 |
| `p` | `<p>` |
| `br` | `<br>` |
| `comma` | `, ` |
| `barecomma` | `,` |
| `semicolon` | `;` |
| `space` | 空格 |
| `pipe` | `\|` |
| `dash` | ` - ` |

### 3.5 表格输出

```
~(*powerquery;query=com.example.custom.dats.students.storedgrades;
  tableformat;
  fields=course_name,course_number,grade,storecode)
```

- `tableformat` 让 DAT 输出 `<tr>/<td>`。
- 表格的开始/表头/数据/结束**必须在同一行**。
- `value-delim` / `row-delim` 在 `tableformat` 下被忽略。

```html
<table border="1">
  <tr><th>Course</th><th>Number</th><th>Grade</th><th>Term</th></tr>
  ^(*powerquery;query=com.example.custom.dats.students.storedgrades;
    tableformat;fields=course_name,course_number,grade,storecode)
</table>
```

> 注意示例里是 `^(*powerquery...)`（脱字符），这是为了在表格行里输出；常规页面用 `~`。
> 以现场 PowerSchool 文档/模板为准。

### 3.6 参数完整示例

```
~(*powerquery;query=com.acme.attendance.att_code_based;
  arg.attendanceCodes=A,T;
  arg.startDate=7/1/2021;
  no-rows-message=None)
```

---

## 4. 权限映射

PowerQuery DAT 走 PowerQuery 框架，内部页面调用需要 permission mapping：

```xml
<permission_mappings>
  <permission name="/admin/students/emailconfig.html">
    <implies allow="post">/ws/schema/query/com.example.custom.dats.students.student_email</implies>
  </permission>
</permission_mappings>
```

- 选择**用户本来就能访问**的页面。
- 如果映射到“人人可访问”的页面，等于绕过字段权限。
- DAT 本身不替代服务端权限校验；SQL 必须正确限制到当前学生/教师。

---

## 5. 安全（重要）

PQ DAT 依赖 PowerQuery 框架，因此有 FLS 和 DRF，但：

> **DRF 是按“当前用户”限制，不是按“当前 DAT 针对的学生”限制。**

这意味着：

- 用户有权限看 A 学生，不代表 DAT 只返回 A 学生；SQL 必须自己加 `students.dcid = :coretabledcid`。
- 如果 SQL 写错，可能返回其他学生的数据。
- 不是所有字段都能套 FLS；因此要求用户至少对映射页面有 View 权限。
- SQL 要保证性能（DAT 会在页面/报表里频繁执行）。

责任在实现者：**SQL 必须严格限制到当前记录**。

---

## 6. 从插件安装

1. 把查询 XML 放 `queries_root/`。
2. 确保 `flattened="true" dat="true" coreTable="Students|SchoolStaff"`。
3. 在 `permissions_root/` 加映射。
4. 打包、安装、启用。
5. 在页面里用 `~(*powerquery;query=...)`。

---

## 7. 调试清单

| 现象 | 检查 |
| --- | --- |
| 页面显示 `*****` | 用户对查询中某字段无权限（哪怕没在 fields 里） |
| 无输出 | `no-rows-message` 未设；查询确实 0 行 |
| 参数没生效 | arg 名大小写、`arg.` 前缀、数组逗号、日期格式 |
| 多行错位 | 导出/表格里多行多列支持有限；改用 `tableformat` 或减少行 |
| 500 | SQL 错误；先在 SQL Developer 用绑定变量验证 |
| 403 | 缺 permission mapping 或用户无页面权限 |
| 数据串学生 | SQL 没加 `coretabledcid`/`curstudid` 限制 |

## 8. 最佳实践

1. 一个 DAT 只解决一个明确问题（邮箱、Global ID、缺交数）。
2. 永远用 `coretabledcid` 把结果锁到当前记录。
3. 多行输出控制在少量行；超过 100 行会被截断。
4. 用 `fields` 明确列顺序，避免模板错位。
5. 用 `no-rows-message` 提供友好空值。
6. LISTAGG 用 `listaggdelim`，不要硬编码分隔符。
7. 映射到真实有权限的页面，不要图省事映射到首页。
