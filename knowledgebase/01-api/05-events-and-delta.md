# 05 · 变更捕获：Event Subscriptions 与 Data Version (Delta Pull)

PowerSchool 提供两套“数据变了怎么知道”的机制：

| 机制 | 触发层 | 推荐度 | 适用 |
| --- | --- | --- | --- |
| **Events API（v1）** | 应用层（通过 PowerSchool / REST API 的变更） | 一般 | 实时 webhook、业务动作通知 |
| **Data Version（Delta Pull）** | 数据库层 | PowerSchool 推荐的“go forward”方案 | 增量同步、批量 ETL |

> 门户原文明确建议：优先考虑 **Data Version**，因为它按数据库层追踪，覆盖面更完整。
> Events **不会**捕获直接对数据库做的更新（DBA/SQL 直改）。

---

# 第一部分：Events API

## 1. 能订阅什么

### 1.1 资源路径与事件类型

| 资源 | 路径 | 事件类型 |
| --- | --- | --- |
| Course | `/ws/v1/course/*` | INSERT / UPDATE / DELETE |
| Section | `/ws/v1/section/*` | INSERT / UPDATE / DELETE |
| Section Enrollment | `/ws/v1/section_enrollment/*` | INSERT / UPDATE / DELETE |
| Staff | `/ws/v1/staff/*` | INSERT / UPDATE / DELETE |
| Student | `/ws/v1/student/*` | INSERT / UPDATE / DELETE / SCHOOL_ENROLLMENT |
| Test Subscription | `/ws/v1/test_subscription` | INSERT / UPDATE / DELETE |

事件类型分两类：

- **Data Change**：`INSERT` / `UPDATE` / `DELETE` / `RESYNC`
- **Business**：`SCHOOL_ENROLLMENT`（学生被注册到学校；是学校级注册，不是 section 注册）

### 1.2 被监控的表/字段

门户维护了一份明确的“表 + 字段”清单（例如 `CC.DATEENROLLED`、`SECTIONS.TEACHER`、
`STUDENTS.ENROLL_STATUS`、`USERS.LOGINID` 等）。**只有清单内的字段变化才触发事件**。
完整清单见门户 Events 页面；插件设计时不要把事件当作“任意字段变更”的通用审计。

## 2. 订阅

### 2.1 创建/替换订阅

```http
PUT /ws/v1/event_subscription
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "event_subscriptions": {
    "key": "some-secret",
    "callback_url": "https://partner.example.com/webhook",
    "event_subscription": [
      {"resource": "/ws/v1/student/*", "event_type": "INSERT"},
      {"resource": "/ws/v1/student/*", "event_type": "DELETE"},
      {"resource": "/ws/v1/student/*", "event_type": "SCHOOL_ENROLLMENT"}
    ],
    "include_self_notification": true
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `callback_url` | 必须 `https://`，最长 500；这是你的 webhook |
| `key` | 共享密钥，最长 1000，用于校验回调来源 |
| `include_self_notification` | 默认 `false`：你自己的 REST 调用触发的事件不回推。设为 `true` 才会 |
| `event_subscription[]` | 资源路径 + 事件类型 |

> ⚠️ `PUT` 是**整体替换**：任何一次更新都会覆盖所有已有订阅。

### 2.2 查看 / 删除

```http
GET    /ws/v1/event_subscription
DELETE /ws/v1/event_subscription
```

`DELETE` 删除全部订阅；不存在返回 404。

### 2.3 错误码

| 错误码 | 方法 | 含义 |
| --- | --- | --- |
| `KEY_TOO_LONG` | PUT | key > 1000 |
| `CALLBACK_URL_REQUIRED` | PUT | 缺 callback_url |
| `CALLBACK_URL_TOO_LONG` | PUT | > 500 |
| `CALLBACK_URL_NOT_HTTPS` | PUT | 不是 https |
| `RESOURCE_REQUIRED` | PUT | 缺 resource |
| `RESOURCE_TOO_LONG` | PUT | > 1000 |
| `RESOURCE_NOT_VALID` | PUT | 资源路径不支持 |
| `EVENT_TYPE_REQUIRED` | PUT | 缺 event_type |
| `EVENTTYPE_TOO_LONG` | PUT | > 100 |
| `INVALID_EVENT_TYPE` | PUT | 事件类型不支持 |

## 3. 回调消息

PowerSchool 向 `callback_url` POST：

```json
{
  "events": [
    {
      "ref": "https://partner11.powerschool.com/ws/v1/student/33",
      "event_type": "UPDATE",
      "id": "33",
      "entity": "STUDENTS",
      "timestamp": "2015-12-22T19:17:11.079Z"
    }
  ]
}
```

- 一个请求可含多个事件。
- `entity` 是表名，`id` 通常是该表主键（一般 `DCID`）。
- `event_type` 取值：`INSERT` / `UPDATE` / `DELETE` / `RESYNC` / `SCHOOL_ENROLLMENT`。

处理建议：

1. 先返回 2xx，再异步处理（避免超时导致重推）。
2. 用 `key` 做来源校验（或在网关层校验）。
3. 按 `entity + id` 去重；事件可能重复/乱序。
4. 收到事件后**回查 API**拿最新数据，不要假设消息体包含完整记录。
5. 处理失败要幂等可重试。

---

# 第二部分：Data Version（Delta Pull）

## 1. 原理

对订阅的表启用数据版本后，每次事务都会获得一个递增的 **data version** 号。
你只需要记住上次的版本号，就能拉取“之后新增/修改的记录主键”。

```
初始：GET /ws/dataversion/{app}/0
  → 全量记录 ID + $dataversion = 16323283

下次：GET /ws/dataversion/{app}/16323283
  → 这期间变化的 ID + 新的 $dataversion

之后：每次带上一次返回的 $dataversion
```

## 2. 订阅配置

文件命名：

```
[name].change_listener_config.xml
```

放置目录：

```
data_change_configuration_root/
```

示例：

```xml
<changeListener>
  <application name="StudentChanges"
               description="Subscription to Students and UserCoreFields"/>
  <dataVersionSubscription>
    <table name="STUDENTS">
      <column name="LASTFIRST"/>
      <column name="GRADE_LEVEL"/>
      <column name="SCHOOLID"/>
    </table>
    <table name="STUDENTCOREFIELDS">
      <column name="DOB"/>
      <column name="GENDER"/>
    </table>
  </dataVersionSubscription>
</changeListener>
```

| 元素 | 说明 |
| --- | --- |
| `changeListener` | 根元素 |
| `application` | `name` 必填，≤30 字符；`description` 可选 |
| `dataVersionSubscription` | 必填，表/列订阅的父元素 |
| `table` | `name` 必填；几乎任何表都可以，**排除表不行，视图不行** |
| `column` | `name` 必填；排除列不行 |

- 一个文件只能有一个 `<application>`，但可含多张表。
- 一个插件可以有多个订阅文件。
- 任何 PowerQuery 都可以使用任何订阅（跨插件也可以）。

## 3. 端点

```http
GET /ws/dataversion/{applicationname}/{dataversion}
Authorization: Bearer {token}
```

响应：

```json
{
  "$dataversion": "16323283",
  "tables": {
    "students": [851, 769, 802, 112],
    "studentcorefields": [802]
  }
}
```

- `$dataversion` 是数据库当前最新版本号，**下一次调用要传它**。
- `tables` 里是各表**新增或更新**记录的主键。

典型循环：

```
version = 0
loop:
  resp = GET /ws/dataversion/StudentChanges/{version}
  process(resp.tables)
  version = resp.$dataversion
  sleep(interval)
```

> 只返回主键，不返回字段值。需要字段时再按主键查表/PowerQuery。

## 4. 在 PowerQuery 中使用

payload：

```json
{
  "$dataversion": "16314148",
  "$dataversion_applicationname": "StudentChanges"
}
```

- 两个参数必须同时出现。
- 响应会带最新 `$dataversion`。
- 查询 SQL **必须包含订阅表的主键列**。
- **用 outer join**：inner join 会要求所有相关表都变化才返回；outer join 只要任一表变化就返回。
- 无需修改已有 PowerQuery 的定义即可使用。

## 5. 表/列选择建议

- 只订阅真正需要的表和列，降低版本表开销。
- 业务上需要“删除”感知时注意：Delta Pull 返回的是新增/更新的主键；删除通常需要额外对账
  （定期全量或软删除字段）。
- 与 Events 相比，Delta 更适合定时批量同步；Events 更适合低延迟业务动作。

## 6. 选型对照

| 需求 | Events | Data Version |
| --- | --- | --- |
| 秒级通知 | ✅ | ❌（需轮询） |
| 捕获所有数据库变更 | ❌（仅应用层） | ✅ |
| 全量 + 增量初始化 | ❌ | ✅（从 0 开始） |
| 只关心特定业务动作 | ✅（业务事件） | 需自己判断 |
| 实现复杂度 | webhook + 校验 | 轮询 + 版本号 |
| 删除感知 | ✅ | ⚠️ 需额外方案 |
