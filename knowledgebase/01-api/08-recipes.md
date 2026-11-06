# 08 · 常用调用配方

> 所有示例中的 `{school}`、`{client_id}`、`{client_secret}`、`{token}` 都是占位符。
> 不要提交真实凭据。

## 1. 获取 access token

```bash
BASE='https://{school}'
CID='{client_id}'
SECRET='{client_secret}'
BASIC=$(printf '%s:%s' "$CID" "$SECRET" | base64)

curl -sS -X POST "$BASE/oauth/access_token/" \
  -H "Authorization: Basic $BASIC" \
  -H 'Content-Type: application/x-www-form-urlencoded;charset=UTF-8' \
  --data 'grant_type=client_credentials'
```

响应：

```json
{"access_token":"...","token_type":"Bearer","expires_in":"43200"}
```

## 2. 取学校学生（分页 + 展开）

```bash
curl -sS "$BASE/ws/v1/school/25/student?page=1&pagesize=100&expansions=demographics,school_enrollment" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json'
```

先数总数：

```bash
curl -sS "$BASE/ws/v1/school/25/student/count" \
  -H "Authorization: Bearer $TOKEN"
# {"resource":{"count":616}}
```

只取在册学生并按姓氏前缀过滤：

```bash
curl -sS -G "$BASE/ws/v1/school/25/student" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode 'q=school_enrollment.enroll_status==A;name.last_name==Ada*'
```

## 3. 取单个学生

```bash
curl -sS "$BASE/ws/v1/student/11758?expansions=demographics,phones,addresses,school_enrollment" \
  -H "Authorization: Bearer $TOKEN"
```

注意 `11758` 是 `STUDENTS.DCID`。

## 4. 更新学生

```bash
curl -sS -X POST "$BASE/ws/v1/student" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "students": {
      "student": [{
        "client_uid": "req-1",
        "action": "UPDATE",
        "id": "442",
        "name": {"first_name": "Aaronia", "last_name": "Stephaniia"}
      }]
    }
  }'
```

逐条检查 `results.result[].status`。

## 5. 注册学生（含学校注册）

```json
{
  "students": {
    "student": [{
      "client_uid": "new-1",
      "action": "INSERT",
      "name": {"first_name": "New", "last_name": "Student"},
      "school_enrollment": {
        "school_number": "3101055",
        "enroll_status": "A",
        "entry_date": "2026-09-01"
      }
    }]
  }
}
```

> 注册日期必须落在该校已定义的 term 内；有些环境还要求存在 current term。

## 6. 扩展表 CRUD

### 6.1 新建

```bash
curl -sS -X POST "$BASE/ws/schema/table/u_wc_notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "tables": {
      "U_WC_NOTIFICATIONS": {
        "studentsdcid": "3325",
        "student_name": "Chauncey McTavish",
        "grade_level": "8",
        "diagnosis": "Flu",
        "start_day": "2026-11-06"
      }
    }
  }'
```

### 6.2 查询

```bash
curl -sS -G "$BASE/ws/schema/table/u_wc_notifications" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode 'q=studentsdcid==3325' \
  --data-urlencode 'projection=id,diagnosis,start_day' \
  --data-urlencode 'sort=start_day' \
  --data-urlencode 'sortdescending=true'
```

### 6.3 更新 / 删除

```bash
curl -sS -X PUT "$BASE/ws/schema/table/u_wc_notifications/123" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"tables":{"U_WC_NOTIFICATIONS":{"diagnosis":"Recovered"}}}'

curl -sS -X DELETE "$BASE/ws/schema/table/u_wc_notifications/123" \
  -H "Authorization: Bearer $TOKEN"
```

## 7. 调用 PowerQuery

```bash
curl -sS -X POST "$BASE/ws/schema/query/com.acme.attendance.daily.daily_detail" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"schoolid": 25, "studentdcids": [221, 253]}'
```

带分页/排序/计数：

```bash
curl -sS -X POST "$BASE/ws/schema/query/com.acme.attendance.daily.daily_detail?page=2&pagesize=50&count=true&order=students.last_name,students.first_name" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"schoolid": 25}'
```

带 `$q` 行过滤和列裁剪：

```bash
curl -sS -X POST "$BASE/ws/schema/query/com.acme.students.roster" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "$q": "students.grade_level=ge=8;students.enroll_status==0",
    "projection": "students.lastfirst;students.grade_level;cc.course_number"
  }'
```

流式全量：

```bash
curl -sS -N -X POST "$BASE/ws/schema/query/com.acme.bigquery?pagesize=0" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}'
```

## 8. 事件订阅

```bash
curl -sS -X PUT "$BASE/ws/v1/event_subscription" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "event_subscriptions": {
      "key": "change-me",
      "callback_url": "https://partner.example.com/webhook",
      "event_subscription": [
        {"resource": "/ws/v1/student/*", "event_type": "INSERT"},
        {"resource": "/ws/v1/student/*", "event_type": "UPDATE"},
        {"resource": "/ws/v1/student/*", "event_type": "DELETE"}
      ],
      "include_self_notification": false
    }
  }'
```

```bash
curl -sS "$BASE/ws/v1/event_subscription" -H "Authorization: Bearer $TOKEN"
curl -sS -X DELETE "$BASE/ws/v1/event_subscription" -H "Authorization: Bearer $TOKEN"
```

## 9. Data Version 增量

```bash
# 第一次：从 0 开始
curl -sS "$BASE/ws/dataversion/StudentChanges/0" -H "Authorization: Bearer $TOKEN"

# 后续：用上一次返回的 $dataversion
curl -sS "$BASE/ws/dataversion/StudentChanges/16323283" -H "Authorization: Bearer $TOKEN"
```

在 PowerQuery 里用：

```bash
curl -sS -X POST "$BASE/ws/schema/query/com.acme.students.changed" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"$dataversion":"16323283","$dataversion_applicationname":"StudentChanges"}'
```

## 10. 元数据与时钟

```bash
curl -sS "$BASE/ws/v1/time"                       # 无需 token
curl -sS "$BASE/ws/v1/metadata" -H "Authorization: Bearer $TOKEN"
curl -sS "$BASE/ws/schema/table" -H "Authorization: Bearer $TOKEN"
curl -sS "$BASE/ws/schema/table/students/metadata" -H "Authorization: Bearer $TOKEN"
```

## 11. Node / TypeScript：带缓存的 token 客户端

```ts
type Token = { value: string; expiresAt: number };

export class PSClient {
  private token: Token | null = null;

  constructor(
    private baseUrl: string,
    private clientId: string,
    private clientSecret: string,
  ) {}

  private async fetchToken(): Promise<Token> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/oauth/access_token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const ttl = Number(json.expires_in) || 3600;
    return { value: json.access_token, expiresAt: Date.now() + (ttl - 60) * 1000 };
  }

  private async authHeader(): Promise<string> {
    if (!this.token || this.token.expiresAt <= Date.now()) {
      this.token = await this.fetchToken();
    }
    return `Bearer ${this.token.value}`;
  }

  async get<T>(path: string): Promise<T> {
    let res = await fetch(this.baseUrl + path, { headers: { Authorization: await this.authHeader(), Accept: 'application/json' } });
    if (res.status === 401) {
      this.token = null;
      res = await fetch(this.baseUrl + path, { headers: { Authorization: await this.authHeader(), Accept: 'application/json' } });
    }
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: {
        Authorization: await this.authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }
}
```

## 12. 批量处理建议

```ts
async function* pagedStudents(client: PSClient, schoolId: number, pageSize = 100) {
  const { resource } = await client.get<{ resource: { count: number } }>(
    `/ws/v1/school/${schoolId}/student/count`,
  );
  const total = resource.count;
  let fetched = 0;
  let page = 1;
  while (fetched < total) {
    const data = await client.get<{ students: { student: any[] } }>(
      `/ws/v1/school/${schoolId}/student?page=${page}&pagesize=${pageSize}`,
    );
    const rows = data.students?.student ?? [];
    if (rows.length === 0) break;
    fetched += rows.length;
    yield rows;
    page += 1;
  }
}
```

## 13. 常见错误速查

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 401 invalid_token | token 过期/错误 | 重新换 token；检查 Basic 编码 |
| 403 + `lacks sufficient permission` | access_request 缺字段 | 加 `<field>`，重新安装/启用插件并由管理员批准 |
| 403 + `do not have POST permission` | 内部会话缺 permission mapping | 加 `permissions_root/*.xml` |
| 400 + `Invalid expression` | `q=` 语法错误 | 检查运算符/`q=`/字段名 |
| 404 | id 不存在或 URI 错 | 确认 DCID vs ID |
| 500 | PowerQuery SQL/配置错误 | 先在 SQL Developer 验证 SQL |
| 429 | 限流 | 按 `Retry-After` 退避 |
| 导航不显示 | htmlID/version/parentHTMLID/权限 | 见 [04-playbook.md](../04-playbook.md) |
