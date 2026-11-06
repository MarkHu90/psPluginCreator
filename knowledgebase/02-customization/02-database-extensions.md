# 02 · 数据库扩展（Extended Schema）

PowerSchool 允许在不改核心表的前提下增加自定义表和字段。扩展通过 `dbsetup` 插件包里的
`user_schema_root/*.xml` 安装，文件根元素是 `<psExtension>`。

> 官方详细指南是门户外链的 *PowerSchool Database Extension and Page Customization Developer Guide*
> （support.powerschool.com/article/74828）。本仓库的 `demo/*/dbsetup/user_schema_root/*.xml`
> 是可工作的真实样例，本文以它们为准。

## 1. 三种扩展类型

| 类型 | 结构 | 例子 | 访问方式 |
| --- | --- | --- | --- |
| **1:1** | 给核心表增加一组字段（同一行） | Students 上加 `U_Laptop` | PS-HTML 用 `[Students.U_Laptop]Field`；API 用 `extensions=` |
| **1:N** | 给核心表挂子表，一条父记录多条子记录 | Students → `U_COLLEGEAPP.U_APPLICATIONS` | `tlist_child`、Table API、PowerQuery |
| **standalone** | 完全独立的表 | `U_CollegeApp.U_Institutions` | `tlist_standalone`、Table API、PowerQuery |

扩展表在数据库里仍然是真实表，只是由 PowerSchool 的扩展 schema 机制管理。

## 2. `user_schema_root` XML 结构

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<psExtension xmlns="http://www.powerschool.com"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://www.powerschool.com psextension.xsd">
  <extensionname>U_WCNotification</extensionname>

  <extendedTable type="standalone"
                 dbTableName="U_WC_Notifications"
                 childName="U_WC_Notifications"
                 comment="Sent Wellness Center student notifications">
    <field name="studentsdcid" type="Integer"/>
    <field name="student_name" type="String" length="255"/>
    <field name="grade_level" type="Integer"/>
    <field name="start_day" type="Date"/>
    <field name="additional_notes" type="String" length="4000"/>
  </extendedTable>
</psExtension>
```

### 2.1 `<psExtension>`

| 元素 | 说明 |
| --- | --- |
| `extensionname` | 扩展组名，通常是 `U_...`。一个组可包含多张表。 |
| `extendedTable` | 一张扩展表；可有多个。 |

### 2.2 `<extendedTable>`

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `type` | 是 | `standalone` / `oneToOne` / `oneToMany`（具体取值以现场 xsd 为准；demo 使用 `standalone`） |
| `dbTableName` | 是 | 数据库真实表名，如 `U_WC_Notifications` |
| `childName` | 是 | 子表在扩展模型中的名称，通常与 `dbTableName` 相同 |
| `comment` | 否 | 表说明 |

> 1:1 / 1:N 扩展还需要指定父表/外键。不同 SIS 版本的 xsd 属性名可能略有差异，
> 建议先在测试实例上安装验证，或参考该实例导出的现有扩展 XML。

### 2.3 `<field>`

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 列名 |
| `type` | 是 | `Integer` / `String` / `Date` / `DateTime` / `Decimal` 等 |
| `length` | `String` 必填 | 1–4000 |
| `comment` | 否 | 字段说明 |

字段类型要点：

- `String` 必须带 `length`；其他类型不带。
- `Date` 在页面/JSON 里通常格式化为 `MM/DD/YYYY`（SQL `to_char`）。
- `Boolean` 在 PowerSchool 里常用 `Integer`（0/1）表示。
- `Decimal` / `DateTime` 属实验性，先在测试环境验证。

### 2.4 命名规范

| 对象 | 建议 |
| --- | --- |
| 扩展组名 | `U_<Product>` |
| 表名 | `U_<Product>_<Entity>`，如 `U_WC_Notifications` |
| 字段 | 小写下划线，如 `student_name`、`start_day` |
| 长度 | 传统约定 ≤30 字符；新版 Oracle 支持 128，但为兼容建议 ≤30 |
| 标识符 | `^[A-Za-z][A-Za-z0-9_]*$` |

> 表名/字段名是 Oracle 标识符；不要用保留字、空格、连字符。

## 3. 在页面里引用扩展字段

### 3.1 1:1 扩展

格式：

```
[PrimaryTable.ExtensionGroupName]Field_Name
```

例：Students 上的 `U_Laptop` 组：

```html
<!-- 可编辑输入 -->
<input type="text" name="[Students.U_Laptop]Model_Number" value="">

<!-- 只读显示 -->
~([Students.U_Laptop]Barcode)

<!-- 只读输入框 -->
<input type="text" name="[Students.U_Laptop]Barcode" value="" readonly="readonly">

<!-- 单选 -->
<input type="radio" name="[Students.U_Laptop]OS" value="Windows">Windows
<input type="radio" name="[Students.U_Laptop]OS" value="Mac">Mac

<!-- 复选 -->
<input type="checkbox" name="[Students.U_Laptop]IsLost" value="1">

<!-- 下拉 -->
<select name="[Students.U_Laptop]Manufacturer">
  <option value="">Select a Company</option>
  <option value="Apple">Apple</option>
</select>

<!-- 多行文本 -->
<textarea name="[Students.U_Laptop]Damages_Comments" cols="50" rows="5"></textarea>
```

### 3.2 通过 API 读写 1:1 扩展

```http
GET /ws/v1/student/2?extensions=studentcorefields,u_laptop
```

```json
{
  "student": {
    "@extensions": "studentcorefields,u_laptop",
    "_extension_data": {
      "_table_extension": {
        "name": "u_laptop",
        "_field": [
          {"name": "model_number", "type": "String", "value": "MacBook Pro"}
        ]
      }
    },
    "id": 2
  }
}
```

- `@extensions` 是可用扩展列表。
- 扩展无数据时不返回对应标签。
- 可写资源（Student）的自定义扩展也可写。

## 4. 1:N 扩展：`tlist_child`

```html
~[tlist_child:<CoreTable>.<ExtensionGroup>.<ExtensionTable>;
  displaycols:<字段列表>;
  fieldNames:<表头列表>;
  type:html]
```

示例：

```html
~[tlist_child:STUDENTS.U_COLLEGEAPP.U_APPLICATIONS;
  displaycols:Institution,Request_Date,Request_Status,Scholarship,Completion_Date,Outcome,Notes;
  fieldNames:Institution,Request Date,Status,Scholarship?,Completion Date,Outcome,Notes;
  type:html]
```

| 参数 | 说明 |
| --- | --- |
| `CoreTable.ExtensionGroup.ExtensionTable` | 定位子表，如 `STUDENTS.U_COLLEGEAPP.U_APPLICATIONS` |
| `displaycols` | 要显示的列，逗号分隔；可含特殊 ID 列 `ID`、`<CoreTable>DCID` |
| `fieldNames` | 表头文字，逗号分隔，可含空格 |
| `type` | `html` / `json` |

- `html`：自动生成可增删行的表格（含 Add/Delete）。
- `json`：返回 `Results` 数组，第一列始终是 ID；不需要 `fieldNames`。

## 5. Standalone 扩展：`tlist_standalone`

```html
~[tlist_standalone:<ExtensionGroup>.<ExtensionTable>;
  displaycols:<字段列表>;
  fieldNames:<表头列表>;
  type:html]
```

示例：

```html
~[tlist_standalone:U_CollegeApp.U_Institutions;
  displaycols:IPEDS_ID,Institution_Name,Institution_Type,Phone,URL;
  fieldNames:IPEDS ID,Institution Name,Institution Type,Phone Number,Web Address;
  type:html]
```

- 特殊列 `ID` 是自动生成的主键。
- `type=json` 同样返回 `Results`。

## 6. tlist 表格的特殊格式化

默认：

- 所有列是约 20 字符宽的 input。
- `Date` 列带日历控件。
- `Boolean` 列显示为 checkbox。

用 `/scripts/tlistCustomization.js` 改造：

```html
<script src="/scripts/tlistCustomization.js"></script>
```

| 目标 | 函数 | 示例 |
| --- | --- | --- |
| 下拉（值=显示） | `tlistText2DropDown(field, obj)` | `tlistText2DropDown('Institution', InstValues)` |
| 下拉（值/名分离） | `tlistText2DropDownValNamePair(field, arr)` | `tlistText2DropDownValNamePair('Outcome', [['C','Considering']])` |
| 单选 | `tlistText2RadioButton(field, obj)` | `tlistText2RadioButton('Scholarship', rbValues)` |
| 单选（值/名分离） | `tlistText2RadioButtonValNamePair(field, arr)` | `[['Y','Yes'],['N','No']]` |
| 多行文本 | `tlistText2TextArea(field, rows, cols)` | `tlistText2TextArea('Notes', 4, 50)` |
| 静态文本 | `tlistText2StaticText(field)` | `tlistText2StaticText('Institution')` |
| 新建时可填、之后只读 | `tlistText2StaticTextAllowNew(field)` | `tlistText2StaticTextAllowNew('Institution')` |

> ⚠️ 函数里的字段名必须与 `displaycols` **完全一致**（大小写敏感）。
> 例：`displaycols` 写 `Institution`，就不要传 `INSTITUTION`。

### CSS 控制列宽

自动生成的表格：

- 每列外层 `<col class="col-<FieldName>">`
- 每个 `<input class="<FieldName>">`

```css
.col-Institution { width: 235px; }
.Institution     { width: 215px; }
```

## 7. FRN 与 Teachers / Users / SchoolStaff

### 7.1 FRN 是什么

FRN = **3 位表号 + DCID**。例如 Table 005 的 DCID 134 → `005134`。
页面链接常用 `?frn=~(frn)` 传当前记录。

### 7.2 为什么 staff 页面会踩坑

PowerSchool 7.9 起，教师被拆成：

- `USERS`（人，表 204）
- `SCHOOLSTAFF`（人在学校的任职，表 203）
- `TEACHERS` 是视图（SchoolStaff + Users join）

如果扩展挂在 `Users` 上，页面链接不能再用 `~(frn)`（它可能指向 Teachers/SchoolStaff），
而要用 Users 的 DCID：

```html
<a href="credentials.html?frn=204~([teachers]USERS_DCID)">Credentials</a>
```

这样 `tlist_child` 才会用 Users 的 DCID 关联子表。

| Teachers 列 | 对应 |
| --- | --- |
| Teachers.DCID | SchoolStaff.DCID |
| Teachers.ID | SchoolStaff.ID |
| Teachers.Users_DCID | Users.DCID |

## 8. 部署与迁移

1. 把 XML 放进 `dbsetup/user_schema_root/`。
2. `dbsetup/plugin.xml` 用 DB 插件名/版本。
3. 在测试实例安装、启用。
4. 启用时 PowerSchool 会创建/迁移表结构。
5. 修改已有扩展表（加字段/改类型）时：
   - 递增 DB 插件版本
   - 重新安装/启用
   - 先在测试环境验证迁移
6. `studentcorefields` 这类核心扩展需要先运行扩展 schema migration。

## 9. 通过 API 访问扩展表

| 方式 | 示例 |
| --- | --- |
| 1:1 扩展读取 | `GET /ws/v1/student/2?extensions=u_laptop` |
| Table API | `GET/POST/PUT/DELETE /ws/schema/table/u_wc_notifications` |
| PowerQuery | `select ... from U_WC_Notifications` |
| PS-HTML | `tlist_child` / `tlist_standalone` / `[Students.U_X]Field` |

Table API / PowerQuery 访问时同样受 `access_request` 与 exclude list 限制。

## 10. 设计建议

1. **能加字段就不要建表**：1:1 扩展最省事。
2. **1:N 表要有清晰外键**：如 `studentsdcid`、`sectionsdcid`。
3. **standalone 表用于字典/配置**，不要硬编码选项。
4. 表名/字段名带产品前缀，避免与其他插件冲突。
5. 给表和字段写 `comment`，方便 DDA/维护。
6. 不要把核心表当扩展表改；只加 `U_` 扩展。
7. 生产迁移前备份；扩展 schema 变更不可轻易回滚。
8. 页面删除扩展记录时注意权限：Table API 删除需要**所有列** `FullAccess`。
