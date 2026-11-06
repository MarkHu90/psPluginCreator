# 04 · Enhanced Navigation（23.5.0.0+）

PowerSchool 23.5 引入了新的左侧导航框架。导航数据存在数据库的 **Navigation** 和
**PageCatalog** 两张表里；插件通过 `pagecataloging/*.json` 声明，启用时被解析并写入表中。

> 适用版本：**23.5.0.0 及以上**。旧版本安装带 pagecataloging 的插件会失败。
> 旧门户仍需用 wildcards（见 [03-pages-and-ps-html.md](03-pages-and-ps-html.md)）。

---

## 1. 两种导航

| 类型 | 说明 | 深度 | 根级图标 |
| --- | --- | --- | --- |
| **App Nav** | 主左侧导航，飞出菜单；根分类有图标 | 最多 4 层 | 有 |
| **Detail Nav** | 学生/教职工详情页内的导航 | 最多 3 层 | 无 |

- App Nav 的根分类通常是 Applications、Students、Staff、School、District、System 等。
- Detail Nav 对应 `contextType: "student"` / `"staff"`。

### 最佳实践（官方）

- **不要在根菜单新增分类**；放到 Applications 或已有的相关分类下。
- 链接按字母/业务顺序插入。
- 分类与链接的 `sortOrder` 通常以 100 为步长，给后续插入留空间。

---

## 2. JSON 结构

```json
{
  "pages": [
    {
      "htmlID": "customExample",
      "title": "Custom Example",
      "iconName": "tools",
      "sortOrder": 401,
      "pageURL": null,
      "districtLevelContext": 0,
      "contextType": "main",
      "version": "23.5.0.0",
      "children": [
        {
          "htmlID": "customExampleChild1",
          "title": "Custom Example Child 1",
          "sortOrder": 0,
          "pageURL": "/admin/example/child1.html",
          "districtLevelContext": 0,
          "contextType": "main",
          "version": "23.5.0.0"
        }
      ]
    }
  ]
}
```

- 根元素 `pages` 是数组。
- 分类用 `children` 嵌套，或用 `parentHTMLID` 挂到已有分类。
- 记录会写入 `PageCatalog`（页面元数据）和 `Navigation`（树结构）。

---

## 3. 属性

| 属性 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pages` | array | 是 | 根元素 |
| `htmlID` | string | 是 | HTML 元素 id；**全库唯一**；目前不支持修改已有记录的 htmlID |
| `title` | string | 是 | 显示文字；可以是 message key 或纯文本 |
| `iconName` | string | 否 | PDS 图标名（仅 App Nav 根分类） |
| `sortOrder` | integer | 是 | 排序；核心链接从 100 开始、步长 100 |
| `pageURL` | string | 否 | 页面 URL；分类可为 null；支持部分 PS-HTML 标签；**必须以 `/admin` 开头** |
| `originalParentUrl` | string | 否 | 旧 UI 中原本包含该链接的页面，用于权限判断；见下 |
| `districtLevelContext` | integer | 否 | 0=学校+学区，1=仅学校，2=仅学区；默认 0 |
| `contextType` | string | 否 | `main` / `student` / `staff`；不写=仅 PageCatalog |
| `requiredContext` | string | 否 | 需要先选择学生/教职工才能访问；目前支持 `student` / `staff` |
| `version` | string | 是 | 记录版本；**任何变更都要递增**，否则 SIS 不更新 |
| `children` | array | 否 | 子分类/子链接 |
| `parentHTMLID` | string | 否 | 挂到已存在的分类；在 `children` 里则不需要 |
| `isNewTab` | boolean | 否 | 新标签页打开 |
| `isLandingPage` | boolean | 否 | 该页是链接集合页（如报表列表），子页可放 children |
| `checkParams` | boolean | 否 | 活动链接判断时是否比较 query 参数（同 URL 不同参数时用） |

### `originalParentUrl` 语法

- 单个 URL：用户必须能访问该页面，链接才显示。
- `url1>url2`：`>` 表示旧 UI 中的祖父子关系；两级都必须可访问。
- `url1,url2`：`,` 表示该页同时出现在两个旧页面；任一可访问即可。

---

## 4. 放置位置与版本

### 4.1 新插件（23.5+）

```
plugin.zip
├── plugin.xml
└── pagecataloging/
    ├── myplugin_schoolNav.json
    └── myplugin_studentNav.json
```

启用插件时 JSON 被读取、校验、写入 DB。刷新页面后导航出现。

### 4.2 需要兼容 23.5 以前

官方建议：

- 做一个单独的“导航插件”，只包含 pagecataloging JSON。
- 把“功能插件”和“导航插件”一起打包，或分别分发。
- 明确告诉客户：**升级到 23.5 后再安装导航插件**。

### 4.3 版本号

- 每次修改 JSON，**必须递增 `version`**。
- 同时递增 `plugin.xml@version`，重新打包、禁用/启用。
- 只改文件不改版本，SIS 不会更新记录。

---

## 5. 示例

### 5.1 新增分类 + 子链接（App Nav）

```json
{
  "pages": [{
    "htmlID": "navAcmeAttendance",
    "title": "Attendance Tools",
    "iconName": "calendar",
    "sortOrder": 401,
    "pageURL": null,
    "contextType": "main",
    "districtLevelContext": 1,
    "version": "1.0.0.0",
    "children": [
      {
        "htmlID": "navAcmeDailyAttendance",
        "title": "Daily Attendance",
        "sortOrder": 100,
        "pageURL": "/admin/acme/attendance/daily.html",
        "contextType": "main",
        "districtLevelContext": 1,
        "version": "1.0.0.0"
      }
    ]
  }]
}
```

### 5.2 挂到已有分类

```json
{
  "pages": [{
    "htmlID": "navAcmeDailyAttendance",
    "title": "Daily Attendance",
    "pageURL": "/admin/acme/attendance/daily.html",
    "version": "1.0.0.0",
    "contextType": "main",
    "districtLevelContext": 1,
    "sortOrder": 50,
    "parentHTMLID": "navSchoolEnrollmentSection"
  }]
}
```

> `parentHTMLID` 必须是现场真实存在的分类 id。不同 SIS 实例可能不同；
> 用浏览器 Inspect 查看 `data-custom-info` 属性。

### 5.3 学生上下文（Detail Nav）

```json
{
  "pages": [{
    "htmlID": "navAcmeStudentHealth",
    "title": "Health Notes",
    "version": "1.0.0.0",
    "contextType": "student",
    "requiredContext": "student",
    "sortOrder": 425,
    "parentHTMLID": "navStudentHealthSection",
    "pageURL": "/admin/acme/health.html?frn=~(studentfrn)"
  }]
}
```

- `requiredContext: "student"`：用户必须先选中学生。
- 页面 URL 带 `frn=~(studentfrn)`。
- `districtLevelContext` 通常不用（detail nav 跟随上下文）。

### 5.4 多级分类

```json
{
  "pages": [{
    "htmlID": "navAcmeRoot",
    "title": "Acme",
    "version": "1.0.0.0",
    "contextType": "main",
    "sortOrder": 500,
    "children": [{
      "htmlID": "navAcmeReports",
      "title": "Reports",
      "version": "1.0.0.0",
      "contextType": "main",
      "sortOrder": 0,
      "children": [{
        "htmlID": "navAcmeReport1",
        "title": "Report 1",
        "version": "1.0.0.0",
        "contextType": "main",
        "sortOrder": 0,
        "pageURL": "/admin/acme/report1.html"
      }]
    }]
  }]
}
```

### 5.5 重排/移动

修改 `parentHTMLID` 与 `sortOrder`，并**递增 version**：

```json
{
  "pages": [{
    "htmlID": "navAcmeDailyAttendance",
    "title": "Daily Attendance",
    "pageURL": "/admin/acme/attendance/daily.html",
    "version": "1.0.0.1",
    "contextType": "main",
    "sortOrder": 50,
    "parentHTMLID": "navSystemManagementData"
  }]
}
```

---

## 6. `pageURL` 支持的 PS-HTML 标签

只允许特定标签（官方列表）：

```
~(ATT_SetDefaultScreenUriIncludeParams)
~(curschoolid)
~(curschooldcid)
~(curstudid)
~(curtchrid)
~(curyearid)
~(frn)
~(gpv.
~(rn)
~(schedule.yearidcurrent)
~(schedule.yearidfuture)
~(studentfrn)
~(studentrn)
~(studentscreenaccess;
~(teacherfrn)
~(teacherrn)
~[cnfg_thisserverfrn]
~[displayprefyearschool:
~[gpv:
~[if.
~[x:ATT_SetAttBatchChangeLinkSelect]
~[x:configitem;
~[x:fmly_more2url]
~[x:userid]
~(*decode...
~[prefschool
~[displayprefschool
~(userfrn)
~[displaypref
~[displayprefschoolid
~[displayprefyearschool
~[displayprefyear
~[x:users_dcid
~(*compliance;
~(curtermid)
~([ (ex. ~([01]id) )
~(attendance.enabled.for.daily)
~(attendance.enabled.for.intervalOnly)
~(attendance.enabled.for.meeting)
~(attendance.enabled.for.meetingInterval)
~(attendance.enabled.for.meetingOnly)
~(attendance.enabled.for.time)
```

### 学校条件示例

```json
{
  "pageURL": "~[if#school.~(curschoolid)=1800]/admin/acme/page.html?frn=~(studentfrn)[/if#school]"
}
```

> 注意 `pageURL` 必须以 `/admin` 开头；上面的条件标签是例外写法（条件里再放 `/admin...`）。

---

## 7. 限制与注意事项

1. **只能改自己插件的链接**，不能修改核心或 Compliance SIS 的链接。
2. **目前不支持删除**（没有 delete 机制）。
3. `htmlID` 全库唯一，且不支持后续修改。
4. `pageURL` 必须以 `/admin` 开头。
5. 只支持上面列出的 PS-HTML 标签。
6. JSON 结构必须严格符合；否则插件启用失败。
7. `version` 不递增 → 不更新。
8. 分类不要加到根菜单（最佳实践）。

---

## 8. 开发流程

1. 写 JSON，放到 `pagecataloging/`。
2. 递增 JSON `version` 和 `plugin.xml@version`。
3. 重新打包。
4. Plugin Management Console → 更新/删除重装。
5. 启用插件。
6. 刷新页面，检查导航。
7. 若未出现：
   - 检查 `htmlID` 是否重复
   - 检查 `parentHTMLID` 是否存在
   - 检查 `version` 是否递增
   - 检查用户是否有 `originalParentUrl` / 目标页面权限
   - 检查插件是否真的启用
8. 用浏览器 Inspect 看 `data-custom-info`，可读到现有条目的 `parentHTMLID` / `sortOrder`。

---

## 9. 相关 UI 变化

### 9.1 Tabs

- 旧 SIS 的 tab 默认被隐藏。
- 需要保留时，给 `<ul>` 加 `shown_tabs` 类：

```html
<div class="tabs">
  <ul class="shown_tabs">
    <li><a href="#tabOneContent">Tab 1</a></li>
    <li><a href="#tabTwoContent">Tab 2</a></li>
  </ul>
  <div id="tabOneContent">...</div>
  <div id="tabTwoContent">...</div>
</div>
```

```html
<ul class="tabs shown_tabs">
  <li class="selected"><a href="#">Selected</a></li>
  <li><a href="#">Tab 2</a></li>
</ul>
```

- 自定义 tab 页应作为 `isLandingPage` 页面的 children 定义。

### 9.2 学生 Alerts

新版使用 SVG 图标并移到学生详情头部。自定义 alert 要按严格 HTML：

```html
<a class="dialogM" title="{Your Text}" href="{Path to Alert Template}">
  <pds-icon name="{pds-icon name}" style="height:18px;width:18px;"></pds-icon>
</a>
```

或：

```html
<a class="dialogM" title="{Your Text}" href="{Path to Alert Template}">
  <img src="{Path to image}" alt="{Alt Text}">
</a>
```

可用图标名：`/admin/ui_examples/navigation/showPdsIcons.html`。

---

## 10. 与本仓库生成器的对应

- `NavFileSpec.contextType` → JSON 根/条目 `contextType`
- `NavEntrySpec.pageId` → 生成 `pageURL`
- `schoolIds` → 生成 `~[if#school.~(curschoolid)=...]...[/if#school]`
- `parentHTMLID` → 原样输出；未填时用父节点 `htmlID`
- `extra` → 原样展开，保证导入回放
- `navVersion` → 每条记录的 `version`

生成时务必保证：

1. 所有 `htmlID` 全局唯一。
2. 同一文件内父子引用闭环。
3. `pageURL` 以 `/admin` 开头（或使用允许的条件标签）。
4. 每次发布递增 `version`。
