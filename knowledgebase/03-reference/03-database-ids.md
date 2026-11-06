# 03 · 数据库 ID、主键与表关系

PowerSchool 数据库有大量历史遗留的 ID 体系。写错 ID 口径是集成中最常见的 bug。本文汇总官方
*All About PowerSchool Database IDs* 与资源文档中的规则。

## 1. 主键

大多数表都有数值主键，来自数据库序列（通常叫 `<table>_<column>_SQ`）。主键列名有多种：

| 主键名 | 典型表 |
| --- | --- |
| `DCID` | 最老的 DALX 表：`SCHOOLS`、`STUDENTS`、`CC`、`SECTIONS`、`COURSES`、`USERS`、`SCHOOLSTAFF` |
| `ID` | 扩展 schema 的 1:N 子表、standalone 表；`PSM_*` 表 |
| `<table>_ID` | 较老的表 |
| `<table>ID` | 较新的表 |

判断规则：

1. 有 `DCID` → 主键是 `DCID`。
2. 否则有 `ID` → 主键是 `ID`。
3. 否则找 `<table>_ID` / `<table>ID`。

> 1:1 扩展表比较特殊：它通常用 `ID` 作为自己的主键，同时用 `StudentsDCID` 等外键关联核心表。

## 2. 伪键（Pseudo-Keys）

有些列看起来像主键，但**没有唯一约束**，可能有重复：

- `COURSE_NUMBER`、`SCHOOL_NUMBER`、`STUDENT_NUMBER` 等自然键：通常有唯一约束，但不要假设。
- `STUDENTS.ID`、`GUARDIAN` / `USERS` 的某些 `ID`：是“伪键”，可能有重复。
- `STATE_STUDENTNUMBER`（学生）、`STATE_GUARDIANNUMBER`（家长）、`SIF_STATEPRID`（用户）：
  州/纵向 ID，用于对接州系统。
- `PSGUID`：有时是全局唯一 ID，但经常为空，不可依赖。

## 3. 外键

### 3.1 真实外键

新表（扩展表、PowerTeacher Pro 的 `ASSIGNMENT` 等）通常有真实 FK：

- 列名 = 远端表名 + 远端列名，如 `STUDENTSDCID`、`SECTIONS_DCID`。
- 有数据库约束。

### 3.2 逻辑外键

老表之间常是“逻辑外键”，没有约束，列名也容易误导：

| 从 | 到 | 类型 |
| --- | --- | --- |
| `CC.STUDENTID` | `STUDENTS.ID` | 逻辑 |
| `CC.SECTIONID` | `SECTIONS.ID` | 逻辑 |
| `STUDENTS.SCHOOLID` | `SCHOOLS.SCHOOL_NUMBER` | 逻辑 |
| `SCHOOLFEE.SCHOOLID` | `SCHOOLS.SCHOOL_NUMBER` | 逻辑 |
| `SECTIONS.COURSE_NUMBER` | `COURSES.COURSE_NUMBER` | 逻辑 |
| `STOREDGRADES.COURSE_NUMBER` | `COURSES.COURSE_NUMBER` | 逻辑 |
| `STUDENTCOREFIELDS.STUDENTSDCID` | `STUDENTS.DCID` | 真实 |

> 注意 `STUDENTS.SCHOOLID` 指向的是 `SCHOOL_NUMBER`，不是 `SCHOOLS.DCID`。

## 4. Teachers / Users / SchoolStaff

PowerSchool 7.9 起，教师被拆成两张表 + 一个视图：

| 对象 | 类型 | 含义 |
| --- | --- | --- |
| `USERS` | 表（204） | 一个真实的人（教师/管理员） |
| `SCHOOLSTAFF` | 表（203） | 某人在某校的任职 |
| `TEACHERS` | **视图** | SchoolStaff + Users 的兼容视图 |

标识列对应：

| Teachers（视图） | Users / SchoolStaff |
| --- | --- |
| `Teachers.DCID` | `SchoolStaff.DCID` |
| `Teachers.ID` | `SchoolStaff.ID` |
| `Teachers.Users_DCID` | `Users.DCID` |
| `SchoolStaff.Users_DCID` | `Users.DCID` |

实践影响：

- 扩展挂在 `Users` 上时，页面 FRN 要用 `204~([teachers]USERS_DCID)`，不能用 `~(frn)`。
- `tlist_child` 的父表要写 `Users`，否则关联错。
- 统一教师记录（Unified Teacher Record）允许多校任职；`SCHOOLSTAFF` 是一人一校一行。

## 5. FRN

**FRN = 3 位表号 + DCID**。

| 表 | 表号 | FRN 示例 |
| --- | --- | --- |
| `STUDENTS` | 001 | `00111758` |
| `SECTIONS` | 003 | `00329786` |
| `TEACHERS`（历史） | 005 | `005134` |
| `SCHOOLSTAFF` | 203 | `203...` |
| `USERS` | 204 | `204...` |

用途：

- 页面 URL：`?frn=001{studentDcid}`、`?frn=003{sectionDcid}`。
- PS-HTML `~(frn)` / `~(studentfrn)` 会生成当前上下文的 FRN。
- PowerTeacher Pro 的 `data-param-frn="studentFrn|sectionFrn"`。

## 6. DCID vs ID 速查

| 场景 | 用 |
| --- | --- |
| `/ws/v1/student/{id}` | `STUDENTS.DCID` |
| `/ws/v1/section/{id}`、`/section_enrollment/{id}` | 对应表的 `DCID` |
| `/ws/v1/staff/{id}` | `SCHOOLSTAFF.DCID` |
| Table API `/ws/schema/table/{table}/{id}` | 该表主键（DCID 或 ID） |
| PowerQuery 参数 `:curstudid` | `STUDENTS.ID` |
| PS-HTML `~(curstudid)` | `STUDENTS.ID` |
| PowerQuery DAT `coretabledcid` | `STUDENTS.DCID` / `SchoolStaff.DCID` |
| PowerQuery DAT `curstudid` | `STUDENTS.ID` |
| `CC.STUDENTID` | `STUDENTS.ID` |
| `CC.SECTIONID` | `SECTIONS.ID` |
| 学生 FRN | `001` + `STUDENTS.DCID` |
| section FRN | `003` + `SECTIONS.DCID` |

### 6.1 转换

```http
POST /ws/schema/query/com.pearson.core.student.student_dcid_id_map
{"students_dcid": [221, 253]}
```

返回 `id`（`STUDENTS.ID`）与 `dcid`（`STUDENTS.DCID`）。每次最多 1000 个。

## 7. 核心表关系（简化）

```
DISTRICT
  └── SCHOOLS (DCID)
        ├── TERMS (DCID, SCHOOLID, YEARID)
        │     └── SECTIONS (DCID, TERMID, COURSE_NUMBER, SCHOOLID)
        │           ├── CC (DCID, SECTIONID, STUDENTID, ...)
        │           └── SECTIONTEACHER / TEACHERS
        ├── COURSES (DCID, SCHOOLID, COURSE_NUMBER)
        ├── STUDENTS (DCID, SCHOOLID, ID, STUDENT_NUMBER, ...)
        │     ├── STUDENTCOREFIELDS (ID, STUDENTSDCID)   [1:1 扩展]
        │     ├── STOREDGRADES (DCID/ID, STUDENTID)
        │     ├── ATTENDANCE (DCID, STUDENTID, SCHOOLID)
        │     └── U_* (1:N 扩展, 通常 studentsdcid)
        └── SCHOOLSTAFF (DCID, SCHOOLID, USERS_DCID)
              └── USERS (DCID)
```

> 视图 `TEACHERS` 把 `SCHOOLSTAFF` 与 `USERS` 合在一起；写 SQL 时优先用真实表，除非需要兼容旧代码。

## 8. 常见字段语义

| 字段 | 含义 |
| --- | --- |
| `SCHOOLID` | 学校号（注意：指向 `SCHOOLS.SCHOOL_NUMBER`，不是 DCID） |
| `YEARID` | 学年 ID，通常 `学年起始年 - 1990`；也可用 `TERMS.YEARID` |
| `TERMID` | 学期 ID，通常 `YEARID * 100 + 序号` |
| `STUDENTID` | 通常是 `STUDENTS.ID`（伪键），不是 DCID |
| `STUDENTSDCID` | 真实 FK 到 `STUDENTS.DCID` |
| `ENROLL_STATUS` | 0=Active, -1=Pre-Registered, 2=Transferred-Out, 3=Graduated, 4=Historical |
| `GRADE_LEVEL` | 年级，常用 `-1`=Pre-K, `0`=K |
| `TRACK` | 跟踪/分组 |
| `DCID` | 代理主键（多数核心表） |
| `ID` | 另一套标识；在核心表里往往不是唯一主键 |

## 9. 写 SQL / 集成时的检查清单

1. 我要的 id 是 DCID 还是 ID？接口文档怎么写的？
2. 学生相关：`STUDENTS.ID` 与 `STUDENTS.DCID` 是否混用？
3. `SCHOOLID` 是学校号还是 DCID？
4. 教师：用 `TEACHERS` 视图还是 `SCHOOLSTAFF` + `USERS`？
5. 扩展表：1:1 用 `StudentsDCID`；1:N 用子表外键；standalone 用 `ID`。
6. 跨表 join 前先确认是真实 FK 还是逻辑 FK。
7. 不要依赖 `STUDENTS.ID` 唯一；需要唯一时用 `DCID`。
8. 需要 FRN 时：表号 + DCID，注意 `Users` 用 204。
