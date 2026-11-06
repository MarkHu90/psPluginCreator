# 03 · 页面定制与 PS-HTML

“PS-HTML”是 PowerSchool 传统页面的写法：普通 HTML + 服务端标签。标签有两种形式：

- `~(tag)`：圆括号，返回值（DAT / gpv / 系统变量）
- `~[tag]`：方括号，执行逻辑（if / list / include / DirectTable）

> 经验法则：**能返回值的用圆括号**。方括号形式在 gpv 等场景功能不全。

---

## 1. 页面骨架

### 1.1 管理员页面（非学生上下文）

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
  ~[wc:commonscripts]
  <link href="/images/css/screen.css" rel="stylesheet" media="screen">
  <link href="/images/css/print.css" rel="stylesheet" media="print">
  <script src="/scripts/myplugin/my.js"></script>
</head>
<body>
  ~[wc:admin_header_css]
  <a href="/admin/home.html" target="_top">Start Page</a> &gt; My Page
  ~[wc:admin_navigation_css]

  <h1>My Page</h1>

  <div class="box-round">
    ...
  </div>

  ~[wc:admin_footer_css]
</body>
</html>
```

### 1.2 管理员页面（学生上下文）

```html
<body>
  ~[wc:admin_header_frame_css]
  <a href="/admin/home.html" target="_top">Start Page</a> &gt;
  <a href="/admin/students/...">...</a>
  ~[wc:admin_navigation_frame_css]

  ~[wc:title_student_begin_css]My Student Page~[wc:title_student_end_css]

  <div class="box-round">...</div>

  ~[wc:admin_footer_frame_css]
</body>
```

- URL 带 `?frn=~(studentfrn)`。
- 页面可通过 `~(curstudid)`、`~(studentname)` 等取当前学生。

### 1.3 教师页面

```html
<body>
  ~[wc:teachers_header_fr_css]
  ...
  ~[wc:teachers_footer_fr_css]
</body>
```

### 1.4 家长 / 学生页面

本项目现场**没有独立的 `web_root/students/` 目录**：学生门户与家长门户都走 `/guardian/`。
学生页同样放在 `web_root/guardian/...`，用 guardian 的页头/页脚标签。

```html
<body>
  ~[wc:guardian_header_yui]
  ...
  ~[wc:guardian_footer]
</body>
```

> 不同版本可能使用 `guardian_header_yui_limited` 等变体；以现场样板为准。
> 页面内仍可用 `~(curstudid)` 等学生上下文标签；区别只在 URL 前缀与页头/页脚。

### 1.5 常用 `~[wc:*]` 标签

| 标签 | 作用 |
| --- | --- |
| `~[wc:commonscripts]` | 加载公共 JS/CSS（jQuery、Angular 等） |
| `~[wc:UI_js_includes]` | UI 组件脚本（部分页面需要） |
| `~[wc:admin_header_css]` | 管理员页头（含导航） |
| `~[wc:admin_navigation_css]` | 管理员二级导航 |
| `~[wc:admin_footer_css]` | 管理员页脚 |
| `~[wc:admin_header_frame_css]` | 管理员 frame 版页头 |
| `~[wc:admin_navigation_frame_css]` | frame 版导航 |
| `~[wc:admin_footer_frame_css]` | frame 版页脚 |
| `~[wc:title_student_begin_css]` / `...end_css` | 学生标题栏 |
| `~[wc:teachers_header_fr_css]` / `~[wc:teachers_footer_fr_css]` | 教师页头/页脚 |
| `~[wc:guardian_header_yui]` / `~[wc:guardian_footer]` | 家长页头/页脚 |

---

## 2. 系统变量与 DAT

### 2.1 系统标签

| 标签 | 可用门户 | 说明 |
| --- | --- | --- |
| `~(curstudid)` | Admin/Teacher/Guardian/Student | 当前学生 `STUDENTS.ID` |
| `~(curtchrid)` | Admin/Teacher | 当前教师 ID |
| `~(curschoolid)` | 全部 | 当前学校号；0=学区，999999=Graduated Students |
| `~(curtermid)` | 全部 | 当前 term id |
| `~(curyearid)` | 全部 | 当前学年 id |
| `~[x:userid]` | 全部 | 当前登录用户 ID（家长返回学生 ID） |
| `~[x:userid;guardianid]` | Guardian | 9.0+ 家长 `GUARDIAN.GUARDIANID` |
| `~[x:users_dcid]` | Admin/Teacher | 当前用户 `USERS.DCID` |
| `~[x:usersroles]` | Admin/Teacher | 用户角色组号（逗号分隔） |
| `~[x:username]` | 全部 | 当前用户名；可加 `;firstlast` |
| `~[eaodate]` / `~[date]` / `~[time]` | 全部 | 当前日期/时间 |
| `~[x:version]` / `;short` / `;long` / `;full` | 全部 | 版本号 |
| `~[x:getbase_termid]` / `;schoolid` | 全部 | 19.11+ 基础 term |
| `~[x:getbase_termname]` / `;schoolid` | 全部 | 19.11+ 基础 term 名称 |
| `~[displaypref:{name};{default}]` | 全部 | 读 preference |
| `~[displayprefschool:{name}]` | 全部 | 读学校 preference |
| `~[displayprefyearschool:{name}]` | 全部 | 按 school+year 读 preference |
| `~[displayprefschoolid:{name}]` | 全部 | 按 school 读 preference |
| `~[displayprefyear:{name}]` | 全部 | 按 year 读 preference |

### 2.2 字段 DAT

| 形式 | 类型 | 示例 |
| --- | --- | --- |
| `~([{Table}]{Field})` | 核心/旧自定义字段 | `~([Students]lastfirst)` → `Jones, Tom` |
| `~([{Table}.{Extension}]{Field})` | 数据库扩展 | `~([Students.StudentCoreFields]guardian)` |

### 2.3 学生/教师上下文

```html
~(studentname)
~(grade_level)
~(student_number)
~(track)
~(studschoolabbr)
~[enrollmentstatus]
~(studentphoto)
```

这些是页面上下文提供的快捷 DAT，具体可用项随页面/版本变化；不确定时用 `~([Students]field)`。

---

## 3. IF 语句

基本形式：

```
~[if.CONDITION]
  true
[else]
  false
[/if]
```

嵌套必须加标签名：

```
~[if#cond1.CONDITION1]
  ~[if#cond2.CONDITION2]
    both true
  [else#cond2]
    cond2 false
  [/if#cond2]
[else#cond1]
  cond1 false
[/if#cond1]
```

条件**不能**用 AND/OR 组合；需要组合时用嵌套。

### 3.1 常用条件

| 条件 | 说明 |
| --- | --- |
| `{value}={test}` | 相等；运算符 `= # > >= < <= $ !$`（`$`=包含） |
| `"{v}" in ("a","b")` | 22.12+ 多值 |
| `gpv.{name}={value}` | 表单/URL 参数 |
| `pref.{name}={value}` | preference |
| `prefschool.{name}={value}` | 学校 preference |
| `security.inrole={组号}` | 用户属于任一角色组 |
| `security.pageviewormod={path}` | 24.5+ 有查看或修改权限 |
| `security.pagemod={path}` | 有修改权限 |
| `security.pageview={path}` | 有查看权限 |
| `security.pagenone={path}` | 无权限 |
| `security.canmodifyfield={Table.Field}` | 可修改字段 |
| `security.canviewfield={Table.Field}` | 可查看字段 |
| `security.noaccessfield={Table.Field}` | 无字段权限 |
| `security.fieldLevel={Table.Field}{op}{level}` | 字段权限级别比较（NoAccess/ViewOnly/FullAccess） |
| `is_prod` | 19.11+ 是否生产服务器 |

示例：

```html
~[if#saved.~(gpv.recordSaved)=1]
  <div class="feedback-confirm">Saved.</div>
[/if#saved]

~[if.security.inrole=1,2,3]
  <p>You are an admin.</p>
[/if]
```

---

## 4. GPV（Get Posted Value）

```html
~(gpv.my_value)
~(gpv.my_value;encodehtml)
~(gpv.my_value;urlencode)
~(gpv.my_value;encodejsstring)
~(gpv.my_value;encodejsonstring)
~(gpv.my_value;num)
~(gpv.my_value;sqlText)
~(gpv.my_value;if.blank.then=-1)
~(gpv.my_value;onlynumeric)      <!-- 21.4.2+ -->
~(gpv.my_value;onlyalpha)
~(gpv.my_value;onlyalphanumeric)
~(gpv.my_value;onlydatecharacters)
```

| 修饰符 | 用途 |
| --- | --- |
| `;encodehtml` | 输出到 HTML |
| `;urlencode` | 拼进 URL |
| `;encodejsstring` | 放进 JS 字符串 |
| `;encodejsonstring` | 放进 JSON |
| `;num` | 强制数字（非数字→0） |
| `;sqlText` | 放进 SQL 字符串（转义单引号） |
| `;if.blank.then=X` | 空值默认 |
| `;onlynumeric` 等 | 白名单过滤字符 |

> ⚠️ 永远不要直接把 gpv 拼进 SQL。优先用 `;sqlText`，更优先用参数化/白名单。

---

## 5. `tlist_sql`（强弃用，但要知道）

```html
~[tlist_sql;
  select lastfirst, grade_level
    from students
   where id = ~(curstudid)
]~(lastfirst) - ~(grade_level)[/tlist_sql]
```

> 门户明确标注 **STRONGLY DEPRECATED**。原因：
> 1. 默认不应用 FLS；
> 2. 不应用 DRF；
> 3. gpv/DAT 转义不当时有 SQL 注入风险。
>
> 新开发优先用 **PowerQuery** 或 **PowerQuery DAT**。

### 5.1 输出修饰符

| 修饰符 | 用途 |
| --- | --- |
| `;d` | 日期按用户 locale 格式化 |
| `;l;format=time` | 秒数 → HH:MM |
| `;url` | URL 转义 |
| `;js` | JS 字符串转义（8.3+ 真转义） |
| `;json` | JSON 转义（9.0+） |
| `;html` | HTML 转义（9.0+） |
| `;xml10` / `;xml11` | XML 转义 |
| `;ReplaceCRLFWithBR` | 换行→`<br/>`（20.11.0.1+） |

```html
~[tlist_sql;select 'hello world' myLink from dual]
  <a href="/admin/test.html?x=~(myLink;url)">Link</a>
[/tlist_sql]
```

### 5.2 多行

```html
<table class="grid">
  ~[tlist_sql;
    select lastfirst, grade_level
      from students
     where schoolid = ~(curschoolid)
     order by lastfirst
  ]
  <tr><td>~(lastfirst;html)</td><td>~(grade_level)</td></tr>
  [/tlist_sql]
</table>
```

---

## 6. DirectTable：最快的内置 CRUD

`DirectTable` 是 PowerSchool 提供的表维护机制，配合 `ac=prim` 和 `[表]字段` 命名。

### 6.1 编辑/新建页面

```html
<form action="point_management.html?epsave=1" method="post" id="epPointForm">
  ~[DirectTable.Select:U_EP_Point;ID:~(gpv.uid;num)]
  <input type="hidden" name="ac" value="prim">
  <input type="hidden" name="[U_EP_Point]schoolid" value="~(curschoolid)">

  <table class="linkDescList">
    <tr>
      <td class="bold">Points</td>
      <td><input type="number" name="[U_EP_Point]points" required></td>
    </tr>
    <tr>
      <td class="bold">Status</td>
      <td><label><input type="checkbox" name="[U_EP_Point]is_active" value="1"> Active</label></td>
    </tr>
  </table>

  <div class="button-row">
    <a class="button" href="point_management.html">Cancel</a>
    <button class="button" type="submit">Save</button>
  </div>
</form>
```

要点：

- `~[DirectTable.Select:{Table};ID:{id}]`：按主键加载已有记录（`-1` 表示新建）。
- `<input type="hidden" name="ac" value="prim">`：提交后由 PowerSchool 处理。
- 字段名必须是 `[{Table}]{Column}`。
- 表单 `action` 指向保存后要跳回的页面。

### 6.2 删除

```html
<form action="point_management.html?epdelete=1" method="post">
  <input type="hidden" name="ac" value="prim">
  <input type="hidden" name="DD-U_EP_Point.ID:~(gpv.uid;num)" value="1">
</form>
```

`DD-{Table}.ID:{id}` 是 DirectTable 的删除约定。

### 6.3 学生上下文

编辑页需要带学生外键时：

```html
<input type="hidden" name="[U_WC_Notifications]studentsdcid"
       value="~[tlist_sql;select dcid from students where id = ~(curstudid);]~(dcid)[/tlist_sql]">
```

或者保存时在服务端补。

---

## 7. JSON 端点：给前端页面喂数据

典型做法：页面同目录放一个同名 `.json` 文件，用 `tlist_sql` 生成 JSON，末尾加 `{}` 哨兵。

`wellness_notification_list.json`：

```text
[
~[tlist_sql;
select n.id,
       to_char(n.sent_date, 'MM/DD/YYYY') sent_day,
       n.sent_time,
       n.diagnosis,
       n.suggestions,
       to_char(n.start_day, 'MM/DD/YYYY') start_day,
       to_char(n.end_day, 'MM/DD/YYYY') end_day,
       n.additional_notes,
       n.created_by
  from U_WC_Notifications n
  join students s on s.dcid = n.studentsdcid
 where s.id = ~(curstudid)
 order by n.sent_date desc, n.id desc;
]{"id":~(id),"sentDay":"~(sent_day;json)",...},
[/tlist_sql]
{}]
```

要点：

- 字符串一律 `;json`；数字直接 `~(col)`。
- 最后一行 `{}` 用来消除尾逗号，前端过滤掉空对象。
- 页面通过 `$http.get('xxx.json')` 加载。
- 日期在 SQL 里 `to_char`，避免时区/格式问题。

### 7.1 CSV

```text
~[tlist_sql;
select lastfirst, grade_level from students where schoolid = ~(curschoolid)
]"~(lastfirst;json)","~(grade_level)"
[/tlist_sql]
```

注意：

- 双引号转义。
- CSV 需要正确的 `Content-Type`（由 `.csv` 扩展名或页面设置决定）。
- 复杂导出优先用 PowerQuery + DEM。

---

## 8. 自定义内容注入（Custom Pages / Insertion Point）

PowerSchool 支持在不改原页面的情况下注入内容，常见于 Contacts、Start Page 等。

### 8.1 插入点标签

```html
~[cust.insertion_point:{name}.{slot}]
```

### 8.2 页面替换 vs 自动注入

- **页面替换**：直接改页面内容，或在页面里放插入点标签。
- **自动注入**：把自定义文件放到约定目录，文件名匹配即可。

Contacts 页面示例：

```
edit.<identifier>.<insertion.point>.txt
```

例如 `edit.foo.content.footer.txt`。可加同名 `.xml` 元数据控制注入位置：

```xml
<insertionMetadata xmlns="http://www.powerschool.com">
  <inject location="h1" how="before"/>
</insertionMetadata>
```

`how`：`before` / `after` / `append` / `prepend`（jQuery 语义）。

详见 [05-angular-customization.md](05-angular-customization.md)。

---

## 9. Wildcards（传统导航注入）

`web_root/wildcards/*.txt` 会被 PowerSchool 根据文件名注入到对应位置。

常见命名：

```
admin_leftnav.foo.txt
teacher_header.foo.txt
guardian_header.foo.leftnav.footer.txt
```

内容示例（管理员左侧导航）：

```html
~[if#school.~(curschoolid)=2206]
<li>
  <a href="/admin/epraise/home.html" target="_top">House Points</a>
</li>
[/if#school]
```

| 场景 | 建议 |
| --- | --- |
| 23.5+ 管理员导航 | 优先 `pagecataloging` |
| 教师/家长/学生门户 | wildcards 仍常用 |
| 需要条件显示 | `~[if#...]` 包裹 |
| 旧版本兼容 | wildcards |

> 文件名决定挂载位置；不同版本可能变化。先用浏览器检查 DOM，确认注入点。

---

## 10. 国际化

### 10.1 文案

```html
<h1>~[text:psx.htmlc.myplugin.title]</h1>
```

properties 文件：

```properties
psx.htmlc.myplugin.title=My Plugin
```

### 10.2 数据格式化

- 日期/数字尽量用 SQL `to_char` 或 Angular filter。
- 课程名等可用 codemap：

```html
~[text:psx.html.admin_courses.availability.course_availability_2,
  param:~([Courses]course_name;codemap=CourseName;id=~(gpv.cn;tagtext)),
  param:~(gpv.cn;encodehtml)]
```

支持 codemap 的常见项：`AttCode`、`AttCategory`、`AttDescription`、`CourseName`、
`StandardsName`、`StandardsDescription`、`GradeScaleItem`、`GradeLevelLocalizationPlugin` 等。

---

## 11. 安全与性能清单

1. **不要新写 `tlist_sql`**，优先 PowerQuery；必须用时：
   - 所有输出加 `;html` / `;json` / `;js`。
   - 所有 gpv 用 `;sqlText` 或 `;num`。
   - 记住它不过 FLS/DRF。
2. 表单字段名必须精确匹配 `[Table]column`，否则 DirectTable 不会保存。
3. 列表页分页/排序尽量在 SQL/JSON 层做，避免一次拉全量。
4. JSON 端点末尾 `{}` 哨兵；前端过滤。
5. 日期统一 `MM/DD/YYYY` 展示、`YYYY-MM-DD` 存储/API。
6. 页面标题/面包屑/无数据提示都要有。
7. 学生上下文页面必须带 `frn=~(studentfrn)`。
8. 删除操作要有二次确认；权限不足时不要显示按钮。
9. 大数据量用 PowerQuery 流式或分页。
10. 先在测试实例验证 PS-HTML 标签可用性（版本差异大）。
