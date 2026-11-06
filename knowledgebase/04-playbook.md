# 04 · 实施手册：从零到可安装插件

本文把前面的规则串成一条可执行路径，并给出排错清单。

> 本项目的环境约定：**没有独立的 `students/` 页面目录**；学生门户与家长门户都走
> `/guardian/`（`web_root/guardian/`）。生成器/模板不要把学生页放到 `web_root/students/`。

---

## 1. 需求拆解（先画四张表）

在写任何代码前，先明确：

1. **数据表**：需要哪些核心表/扩展表？字段？
2. **读写路径**：标准 API / PowerQuery / Table API / DirectTable？
3. **页面**：哪些门户？列表/编辑/设置/仪表盘？
4. **导航**：23.5+ pagecataloging；旧门户/家长/学生 wildcards？

推荐模板：

| 需求 | 方案 | 依赖 |
| --- | --- | --- |
| 新增“医务通知”记录 | `U_WC_Notifications` 表 | dbsetup |
| 学生页查看通知列表 | PS-HTML 列表 + JSON 端点 | api/web_root |
| 新增/编辑 | DirectTable 页面 | api/web_root |
| 左侧导航 | pagecataloging JSON | api |
| 外部系统同步 | PowerQuery + OAuth | api/queries_root |
| 内部页面调查询 | permission mapping | api/permissions_root |
| 双语文案 | MessageKeys | api |

---

## 2. 建包骨架

```
build/
├── api/
│   ├── plugin.xml
│   ├── MessageKeys/
│   │   └── demo.US_en.properties
│   ├── pagecataloging/
│   │   └── demo_schoolNav.json
│   ├── permissions_root/
│   │   └── demo.permission_mappings.xml
│   ├── queries_root/
│   │   └── demo.named_queries.xml
│   └── web_root/
│       ├── admin/...
│       ├── guardian/...
│       └── scripts/...
└── dbsetup/
    ├── plugin.xml
    └── user_schema_root/
        └── U_Demo.xml
```

- `api/plugin.xml`：页面/导航/查询/权限/PQ。
- `dbsetup/plugin.xml`：表结构。
- 两个包可以分开装，也可以合并。

### 2.1 `api/plugin.xml` 模板

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plugin xmlns="http://plugin.powerschool.pearson.com"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://plugin.powerschool.pearson.com plugin.xsd"
        name="Demo Plugin"
        version="1.0.0"
        description="Demo plugin">
  <oauth accessLevelV1Api="READ"/>
  <access_request>
    <field table="STUDENTS" field="DCID" access="ViewOnly"/>
  </access_request>
  <publisher name="Example Publisher">
    <contact email="publisher@example.com"/>
  </publisher>
</plugin>
```

### 2.2 `dbsetup/plugin.xml` 模板

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plugin xmlns="http://plugin.powerschool.pearson.com"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://plugin.powerschool.pearson.com plugin.xsd"
        name="Demo Plugin DB"
        version="1.0.0"
        description="Demo plugin DB">
  <publisher name="Example Publisher">
    <contact email="publisher@example.com"/>
  </publisher>
</plugin>
```

---

## 3. 建表

1. 设计表名/字段名（`U_` 前缀，≤30 字符，Oracle 标识符）。
2. 写 `user_schema_root/U_Demo.xml`。
3. 先在**测试实例**安装 dbsetup 包。
4. 启用后确认表存在：

```http
GET /ws/schema/table/u_demo
GET /ws/schema/table/u_demo/metadata
```

5. 如失败：
   - XML 命名空间/根元素对不对？
   - `String` 是否带 `length`？
   - 表/字段是否命中 exclude list？
   - 是否与已有对象重名？
   - 插件版本是否递增？

---

## 4. 建查询

1. 写 `queries_root/*.named_queries.xml`。
2. 用 SQL Developer 先验证 SQL（参数用 `:name`）。
3. 确认：
   - 列名唯一、有别名
   - `order by`
   - `CDATA`
   - 所有字段都在 `access_request`
   - 不访问 exclude list
4. 安装/启用后，用 OAuth 调用验证：

```bash
curl -X POST "$BASE/ws/schema/query/com.demo.students.list" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}'
```

5. 常见问题：
   - 403 → access_request 缺字段
   - 500 → SQL 错/表名错/权限
   - 0 行 → 参数/条件
   - 启用失败 → exclude list / 列别名不唯一

---

## 5. 建页面

### 5.1 列表页

1. 骨架：`~[wc:commonscripts]` + 对应页头/页脚。
2. 标题/面包屑/无数据提示。
3. 表格数据来自同目录 `.json` 端点。
4. 添加/编辑链接带 `id` 与学生上下文。
5. 保存/删除后返回并显示提示（`saved=1` / `deleted=1`）。

### 5.2 编辑页

1. `~[DirectTable.Select:{Table};ID:{id}]`
2. `<input type="hidden" name="ac" value="prim">`
3. 字段名 `[Table]column`。
4. 新增时 `ID=-1`。
5. 删除用 `DD-{Table}.ID:{id}`。
6. 学生上下文补 `studentsdcid`。

### 5.3 设置页

- 单记录编辑；`ID=-1` 新建。
- 展示模式 + Edit 入口。

### 5.4 学生/家长页面

> **重要**：本环境学生与家长门户都用 `/guardian/`，没有 `web_root/students/`。
> 页面放 `web_root/guardian/...`，页头/页脚用 guardian 的 `~[wc:*]`。
> 学生上下文仍可用 `~(curstudid)` 等标签，但路径和导航注入按 guardian 处理。

### 5.5 导航

- 23.5+：`pagecataloging/*.json`。
- 旧门户/家长/学生：`web_root/wildcards/*.txt`。
- 学生/家长导航不要放进 pagecataloging 的 `main`；按现场约定走 wildcards 或 guardian 上下文。

---

## 6. 权限

### 6.1 外部 OAuth

- `<oauth accessLevelV1Api="READ|FULL">`
- `<access_request>` 覆盖所有查询/表字段。
- 注意 exclude list。

### 6.2 内部会话

- `permissions_root/*.permission_mappings.xml`
- 页面 → 资源 + `allow` 方法。
- PowerQuery 用 `allow="post"`。
- Table API 每个操作单独映射（含 `#`）。

### 6.3 验证

用低权限账号登录，访问页面，看：

- 403 → 映射缺失/页面权限不足
- 字段缺失 → FLS
- 行缺失 → DRF
- 全部为空 → SQL 条件

---

## 7. 文案与本地化

1. 所有用户可见文字用 message key。
2. `MessageKeys/*.US_en.properties`。
3. 中文环境同样走 properties（`zh_CN` 或现场 locale）。
4. 中英双语可并存，但不要硬编码在 HTML。

---

## 8. 打包与安装

1. 校验：
   - XML 可解析
   - JSON 可解析
   - 标签配对（`~[if#...]`/`[/if#...]`、`~[tlist_sql]`/`[/tlist_sql]`）
   - 路径无 `..`/绝对路径
   - zip 根有 `plugin.xml`
2. 安装：
   - Plugin Management Configuration → Install → 选 zip
   - 勾选 Enable
3. 启用时观察：
   - access_request 审批
   - 扩展表创建
   - 导航写入
   - PowerQuery 加载
4. 安装后：
   - 刷新页面
   - 检查导航
   - 用 OAuth 调查询
   - 用低权限账号看页面

---

## 9. 验收清单

### 功能

- [ ] 列表能加载、分页/排序/筛选正常
- [ ] 新增/编辑/删除成功，提示正确
- [ ] 学生上下文正确（`frn`/`studentsdcid`）
- [ ] 导航链接出现在正确菜单
- [ ] 双语文案显示正确
- [ ] 空数据/错误状态有提示

### 安全

- [ ] 外部调用只拿到授权字段
- [ ] 内部页面缺映射时 403
- [ ] 低权限账号看不到不该看的数据
- [ ] 没有把 gpv 直接拼 SQL
- [ ] 没有硬编码凭据
- [ ] 删除有二次确认

### 兼容

- [ ] 在目标 SIS 版本安装成功
- [ ] 目标版本支持所用特性（pagecataloging 23.5+、PQ DAT 22.9+、Validation 26.5+）
- [ ] 升级插件时版本号递增
- [ ] 导航 version 递增

---

## 10. 排错树

### 10.1 安装/启用失败

```
启用失败
├─ plugin.xml 命名空间/根元素错？
├─ user_schema_root XML 错？（字段类型/length/重名）
├─ 命中 exclude list？
├─ PowerQuery 列别名重复/缺别名？
├─ pagecataloging JSON 结构错/htmlID 重复？
└─ 目标版本不支持该特性？
```

### 10.2 导航不显示

```
导航不显示
├─ 插件是否启用？
├─ SIS >= 23.5？
├─ JSON version 是否递增？
├─ htmlID 是否重复？
├─ parentHTMLID 是否存在？
├─ pageURL 是否 /admin 开头？
├─ 用户是否有页面权限 / originalParentUrl 权限？
└─ 是否被核心导航覆盖/隐藏？
```

### 10.3 403

```
403
├─ 外部 OAuth
│  ├─ accessLevelV1Api 是否声明？
│  ├─ access_request 是否覆盖所有字段（select/join/where/order）？
│  ├─ 是否命中 exclude list？
│  └─ token 是否有效？
└─ 内部会话
   ├─ permission mapping 是否存在？
   ├─ allow 方法是否匹配？
   ├─ 用户是否有映射页面权限？
   └─ 是否 FLS/DRF 导致字段/行被裁剪（通常不是 403）
```

### 10.4 500

```
500
├─ PowerQuery SQL 在 SQL Developer 能跑吗？
├─ 表/字段名拼写？
├─ 列别名唯一？
├─ 视图/表是否被允许？
├─ 参数类型/日期格式？
└─ 是否触发了 PowerSchool 内部错误（论坛反馈）
```

### 10.5 页面数据不对

```
数据不对
├─ DCID vs ID 混用？
├─ SCHOOLID 是学校号还是 DCID？
├─ 日期格式/时区？
├─ `;json` 转义？
├─ JSON 末尾 `{}` 哨兵？
├─ DRF/FLS 裁剪？
└─ SQL join 类型（inner vs outer）？
```

---

## 11. 测试矩阵

| 维度 | 要测 |
| --- | --- |
| 门户 | Admin、Teacher、Guardian（学生同 guardian） |
| 角色 | 管理员、低权限、教师、家长/学生 |
| 数据 | 有数据、无数据、超长、特殊字符、跨校 |
| 网络 | 401 后重试、429 退避、超时 |
| 版本 | 目标版本 + 一个相邻版本 |
| 安装 | 全新安装、升级、禁用/启用 |
| 卸载 | 数据保留/表处理（注意：导航不支持删除） |

---

## 12. 上线后维护

1. 记录插件版本、导航 version、DB 版本。
2. 升级 SIS 前检查：
   - Exclude List 变化
   - token 生命周期
   - 新版本是否废弃所用 API
3. 监控：
   - 401/403/429 比例
   - 事件回调失败
   - Delta 版本滞后
4. 备份扩展表；schema 变更前先在测试环境迁移。
5. 保留 `plugin.xml` 与生成源（本工作台的 `plugin.json`）。

---

## 13. 快速自检命令

```bash
# 版本/分页上限
curl -s "$BASE/ws/v1/metadata" -H "Authorization: Bearer $TOKEN" | jq

# 表是否存在
curl -s "$BASE/ws/schema/table/u_demo" -H "Authorization: Bearer $TOKEN" | jq

# 查询是否可调用
curl -s -X POST "$BASE/ws/schema/query/com.demo.students.list" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' | jq

# 时钟
curl -s "$BASE/ws/v1/time"
```
