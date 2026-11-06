# 03 · 标准 REST 资源（`/ws/v1`）

本文覆盖插件开发最常用的版本化资源。完整的 409 个核心 API 操作（含扩展业务接口）见
[03-reference/01-endpoint-catalog.md](../03-reference/01-endpoint-catalog.md)。

> 25.2.0.0+：本文 `/ws/v1` 接口（除 `/ws/v1/time` 这类无需认证的端点外）受插件
> `accessLevelV1Api` 控制；不声明则**禁止访问**。

## 1. 端点总表

| 资源 | 端点 | 方法 | 说明 |
| --- | --- | --- | --- |
| 时间 | `/ws/v1/time` | GET | 服务器时间；**无需认证** |
| 元数据 | `/ws/v1/metadata` | GET | 各资源最大页大小、版本、时区 |
| 学区 | `/ws/v1/district` | GET | 当前学区 |
| 学区学校 | `/ws/v1/district/school` | GET | 学区内学校列表 |
| 学区学校数 | `/ws/v1/district/school/count` | GET | 计数 |
| 学区学生 | `/ws/v1/district/student` | GET | 学区学生列表 |
| 学区学生数 | `/ws/v1/district/student/count` | GET | 计数 |
| 学校 | `/ws/v1/school/{id}` | GET | 单校 |
| 学校课程 | `/ws/v1/school/{school_id}/course` | GET | 课程列表 |
| 学校课程数 | `.../course/count` | GET | 计数 |
| 学校课程段 | `/ws/v1/school/{school_id}/section` | GET | section 列表 |
| 学校课程段数 | `.../section/count` | GET | 计数 |
| 学校教职工 | `/ws/v1/school/{school_id}/staff` | GET | 列表（仅 active） |
| 学校教职工数 | `.../staff/count` | GET | 计数 |
| 学校学生 | `/ws/v1/school/{school_id}/student` | GET | 列表 |
| 学校学生数 | `.../student/count` | GET | 计数 |
| 学校学期 | `/ws/v1/school/{school_id}/term` | GET | 列表 |
| 学校学期数 | `.../term/count` | GET | 计数 |
| 学生 | `/ws/v1/student/{id}` | GET | 单学生；**id = STUDENTS.DCID** |
| 学生 GPA | `/ws/v1/student/{id}/gpa` | GET | Quick Lookup + Cumulative GPA |
| 学生批量写入 | `/ws/v1/student` | POST | 更新/注册学生（1.1.0+） |
| 学生测试 | `/ws/v1/student/{student_id}/test` | GET | 测试成绩 |
| 学生测试写入 | `/ws/v1/student/test` | POST | 插入/更新测试 |
| 学生-监护人 | `POST /ws/schema/query/com.pearson.core.guardian.student_guardian_detail` | POST | PowerQuery |
| DCID→ID 映射 | `POST /ws/schema/query/com.pearson.core.student.student_dcid_id_map` | POST | 转换学生 ID |
| 课程 | `/ws/v1/course/{id}` | GET | 单课程 |
| 课程段 | `/ws/v1/section/{id}` | GET | 单 section |
| 课程段选课 | `/ws/v1/section/{id}/section_enrollment` | GET | 某 section 的选课 |
| 选课 | `/ws/v1/section_enrollment/{id}` | GET | 单选课 |
| 教职工 | `/ws/v1/staff/{id}` | GET | 单教职工 |
| 学期 | `/ws/v1/term/{id}` | GET | 单学期 |
| 费用交易 | `/ws/v1/fee/transaction` | POST | 缴费/退款/作废（7.8.0+） |
| 事件订阅 | `/ws/v1/event_subscription` | GET/PUT/DELETE | Webhook 订阅 |
| 测试订阅 | `/ws/v1/test_subscription` | — | 用于事件测试 |

## 2. District

```http
GET /ws/v1/district?expansions=entry_codes,exit_codes
```

可用 expansions：

`district_race_codes, districts_of_residence, entry_codes, ethnicity_race_decline_to_specify, exit_codes, federal_race_categories, fees_payment_methods, scheduling_reporting_ethnicities, test_setup`

学校列表 `GET /ws/v1/district/school`：

- 不含 “Graduated Students” 学校。
- 按名称排序。
- 支持 `full_time_equivalencies, school_boundary, school_fees_setup`。

学生列表 `GET /ws/v1/district/student`：

- **没有默认 enrollment 过滤**（与 school 端点不同）。
- 可搜索字段：`name.last_name`、`name.first_name`、`name.middle_name`、
  `school_enrollment.enroll_status(_code)`、`school_enrollment.entry_date`、
  `student_username`、`local_id`、`state_province_id`。

## 3. School

`GET /ws/v1/school/{id}` expansions：

- `full_time_equivalencies`
- `school_boundary`
- `school_fees_setup`

| 子资源 | 排序 | 默认过滤 | 可搜索字段 |
| --- | --- | --- | --- |
| `course` | course number | 无 | — |
| `section` | section id, course id, term id | 无 | `term.start_year`（`==`） |
| `staff` | ID | 仅 active | — |
| `student` | ID | **仅 active enrollment** | 见下 |
| `term` | portion, start date | 无 | `start_year` |

学校学生可搜索字段：

| 字段 | 值 | 运算符 |
| --- | --- | --- |
| `name.last_name` | 字符串，可 `*` 结尾 | `==` |
| `school_enrollment.enroll_status_code` | 整数：0 Active, -1 Pre-Registered, 2 Transferred-Out, 3 Graduated, 4 Historical, 其他为 Inactive | `== gt ge lt le` |
| `school_enrollment.enroll_status` | A/P/T/G/H/I（大小写不敏感） | 同上，支持 `(A,P)` |
| `school_enrollment.entry_date` | `YYYY-MM-DD` | 同上 |
| `student_username` | 字符串 | `==` |
| `local_id` | 学生号 | `==` |
| `state_province_id` | 州/省编号 | `==` |

> ⚠️ 要包含非 active 学生，必须显式传 `q=school_enrollment.enroll_status==I` 之类条件；
> 否则默认只返回 active。

## 4. Student

### 4.1 读取

```http
GET /ws/v1/student/{id}?expansions=demographics,phones,school_enrollment
```

- **`id` 是 `STUDENTS.DCID`**，不是 `STUDENTS.ID`。
- 可用 expansions：

`addresses, alerts, contact, contact_info, counselors, demographics, ethnicity_race, fees, global_id, initial_enrollment, lunch, phones, schedule_setup, school_enrollment`

返回示例（XML）：

```xml
<student expansions="name, demographics, ...">
  <id>11758</id>
  <local_id>420103155</local_id>
  <state_province_id>420103155</state_province_id>
  <student_username>ugrant1</student_username>
  <name>
    <first_name>Ulysses</first_name>
    <middle_name>S</middle_name>
    <last_name>Grant</last_name>
  </name>
</student>
```

### 4.2 GPA

```http
GET /ws/v1/student/{id}/gpa
```

返回 Quick Lookup GPA、Cumulative Weighted/Simple GPA、各学期 GPA 等。

### 4.3 批量更新/注册

```http
POST /ws/v1/student?extensions={extensions}
```

请求体必须用 `<students>` / `{"students":{...}}` 包装；每条带 `client_uid` + `action`。

```json
{
  "students": {
    "student": [
      {
        "client_uid": "124",
        "action": "UPDATE",
        "id": "442",
        "name": { "first_name": "Aaronia", "last_name": "Stephaniia" }
      }
    ]
  }
}
```

```xml
<students>
  <student>
    <client_uid>124</client_uid>
    <action>UPDATE</action>
    <id>442</id>
    <contact_info>
      <email>abc@email.com</email>
    </contact_info>
  </student>
</students>
```

要点：

- 更新时传**空元素** = 清空字段。
- 注册日期必须落在学校已定义的 term 内；有时还要求学校有 current term。
- 响应是 `results`，逐条看 `status`。
- 常见错误码（节选）：
  - `REQUIRED_ID` / `INVALID_ID`
  - `REQUIRED_FIRST_NAME` / `INVALID_FIRST_NAME`
  - `REQUIRED_SCHOOL_ENROLLMENT` / `INVALID_SCHOOL_ENROLLMENT`
  - `NOT_FOUND_CURRENT_TERM`
  - `INVALID_LOCAL_ID`（必须是不重复的正整数）
  - 地址字段系列 `REQUIRED_PHYSICAL_*` / `REQUIRED_MAILING_*`
  - `REQUIRED_CLIENT_UID` / `REQUIRED_ACTION`
  - `UNKNOWN_ERROR`

完整列表见门户 Student Resources 页面。

### 4.4 学生测试

```http
GET /ws/v1/student/{student_id}/test?page=1&pagesize=100
POST /ws/v1/student/test
```

测试写入同样需要 `client_uid` + `action`，根元素 `<tests>`。

### 4.5 DCID ↔ ID 转换

`/ws/v1` 的学生资源用 **DCID**，但很多表/PowerQuery 用 **STUDENTS.ID**。转换方式：

```http
POST /ws/schema/query/com.pearson.core.student.student_dcid_id_map
Content-Type: application/json

{"students_dcid": [221, 253]}
```

返回：

```json
{
  "record": [
    {"id": "15883", "dcid": "221"},
    {"id": "17830", "dcid": "253"}
  ]
}
```

- `students_dcid` / `students_id` 每次最多 **1000** 个。
- `_id` / `_name` 是扩展处理用的内部字段，可忽略。

## 5. Staff

```http
GET /ws/v1/staff/{id}?expansions=emails,phones,school_affiliations,teacher_global_id,staff_global_id
```

学校级：

```http
GET /ws/v1/school/{school_id}/staff
```

- 只返回 **active** 教职工。
- 按 ID 排序。

> 教职工身份模型较绕：`TEACHERS` 是视图，底层是 `SCHOOLSTAFF` + `USERS`。
> 详见 [03-reference/03-database-ids.md](../03-reference/03-database-ids.md)。

## 6. Course / Section / Section Enrollment / Term

```http
GET /ws/v1/course/{id}?extensions=...
GET /ws/v1/section/{id}?expansions=term
GET /ws/v1/section/{id}/section_enrollment
GET /ws/v1/section_enrollment/{id}
GET /ws/v1/term/{id}
```

Section 的 expansions：`term`。Section enrollment 字段：

```json
{
  "id": 197,
  "section_id": 135,
  "student_id": 391,
  "entry_date": "2005-01-20",
  "exit_date": "2005-06-02",
  "dropped": false
}
```

> `student_id` 这里是 `STUDENTS.ID`（不是 DCID）；跨资源拼数据时先统一 ID 口径。

## 7. Time 与 Metadata

### 7.1 Time

```http
GET /ws/v1/time
```

**无需认证**。用于连通性、时钟校验。

```xml
<resource>
  <time>2012-04-23T17:32:17.820Z</time>
  <timestamp>65481813238</timestamp>
</resource>
```

### 7.2 Metadata

```http
GET /ws/v1/metadata
```

返回：

- 各资源的 `*_max_page_size`
- `district_uuid`、`district_timezone`
- `powerschool_version`、`powerteacher_version`、`mobile_api_version`
- `plugin_id`、`powerschool_uptime`

用于客户端自适应分页和版本判断。

## 8. Fee Transaction

```http
POST /ws/v1/fee/transaction
```

用于 payment / credit / void。需要在 `<access_request>` 里申请：

```
FEE_TRANSACTION.AMOUNT / DATE_VALUE / TRANSACTION_TYPE / DESCRIPTION / YEARID / PAYMENT_METHOD / PAYMENT_REF_NBR
FEE.DCID
STUDENTS.DCID
```

两种模式：

1. **指定 fee**：`student_id` + `fee_id`。
2. **分布式缴费**：`student_id` + `school_id` + `start_year`，按 PowerSchool 的 fee priority 依次抵扣。

```xml
<fee_transaction>
  <student_id>5998</student_id>
  <fee_id>2265</fee_id>
  <date>2005-01-12</date>
  <transaction_amount>1.00</transaction_amount>
  <transaction_type>Payment</transaction_type>
  <payment_method>Cash</payment_method>
  <description>Making a payment.</description>
</fee_transaction>
```

## 9. Event Subscription（概览）

```http
GET    /ws/v1/event_subscription
PUT    /ws/v1/event_subscription
DELETE /ws/v1/event_subscription
```

详见 [05-events-and-delta.md](05-events-and-delta.md)。

## 10. PowerTeacher Gradebook（PTG）API

`/powerschool-ptg-api/v2/*` 提供 Assignment / Score 的读写：

```http
GET    /powerschool-ptg-api/v2/assignment/{id}
PUT    /powerschool-ptg-api/v2/assignment/{id}
DELETE /powerschool-ptg-api/v2/assignment/{id}
PUT    /powerschool-ptg-api/v2/assignment/{assignment-id}/student/{student-id}/score
PUT    /powerschool-ptg-api/v2/assignment/{assignment-id}/score
DELETE /powerschool-ptg-api/v2/assignment/{assignment-id}/student/{student-id}/score
```

> ⚠️ **PowerTeacher Gradebook 在 PowerSchool SIS 22.5 起已不可用**。新集成应使用
> PowerTeacher Pro 的 PowerQuery / Table API（如 `PSM_ASSIGNMENT`、`PSM_ASSIGNMENT_SCORE`、
> `ASSIGNMENT`、`ASSIGNMENTSCORE`）。门户仍保留这些页面，但只具历史参考价值。

## 11. 选择 ID 口径的速查

| 场景 | 用哪个 ID |
| --- | --- |
| `/ws/v1/student/{id}` | `STUDENTS.DCID` |
| `/ws/v1/section/{id}` | `SECTIONS.DCID`（实际文档标为 section id；以响应为准） |
| `/ws/v1/section_enrollment/{id}` | `CC.DCID` |
| `/ws/v1/staff/{id}` | `SCHOOLSTAFF.DCID`（Teacher/Staff 视图） |
| Table API `/ws/schema/table/{table}/{id}` | 该表的**主键**（通常 `DCID` 或 `ID`） |
| PowerQuery 的 `:curstudid` 注入 | `STUDENTS.ID` |
| PS-HTML `~(curstudid)` | `STUDENTS.ID` |
| FRN | 3 位表号 + DCID，如 `001{DCID}` |

> 口径混用是 PowerSchool 集成最常见的 bug 来源。写代码前先确认“这个接口要 DCID 还是 ID”。
