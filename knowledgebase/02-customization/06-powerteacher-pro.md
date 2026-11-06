# 06 · PowerTeacher Pro 定制

PowerTeacher Pro（PTP）是独立构建的教师成绩册 SPA，定制方式与传统页面不同：
不是改模板，而是把自己的 HTML 页面放进指定目录并通过 **根元素上的 data-* 属性**注册到菜单。

## 1. 插件目录结构

```
plugin.zip
├── plugin.xml
├── MessageKeys/
│   └── myplugin-message-keys.US_en.properties
└── web_root/
    ├── teachers/powerteacher-pro/
    │   ├── students/      # 学生上下文页面
    │   ├── classes/       # 班级/section 页面
    │   ├── progress/      # Progress 菜单
    │   ├── reports/       # Reports 菜单
    │   ├── settings/      # Settings 菜单
    │   └── apps/          # Apps
    └── scripts/
        └── components/myplugin/
            └── module.js
```

- `web_root/teachers/powerteacher-pro/**` 下的 HTML 会被 PTP 扫描。
- 页面根元素必须是 `<div>`，并带 data-* 配置。

## 2. 根元素配置属性

| 属性 | 适用 | 含义 | 示例 |
| --- | --- | --- | --- |
| `data-title` | 全部 | 菜单标题；推荐 message key | `data-title="psx.htmlc.myplugin.title"` |
| `data-pss-message-prefixes` | 全部 | 预加载的 message 前缀 | `data-pss-message-prefixes="psx.htmlc.myplugin"` |
| `data-linked-from-*` | 全部 | 挂到哪个菜单/子菜单 | `data-linked-from-students="true"` |
| `data-param-*` | PS-HTML | 给页面加 query 参数 | `data-param-frn="studentFrn?"` |
| `data-require-path` | AngularJS | require.js 加载的 JS | `data-require-path="/scripts/components/myplugin/module.js"` |
| `data-ng-controller` | AngularJS | 控制器（推荐 controller as） | `data-ng-controller="myCtrl as c"` |
| `data-client-rendering` | AngularJS | 纯客户端渲染，不往返服务器 | `data-client-rendering="true"` |

### 2.1 `data-linked-from-*` 菜单扩展点

| 属性 | 目录 | 菜单 | 子菜单 |
| --- | --- | --- | --- |
| `data-linked-from-progress-progress` | `progress` | Progress | Progress |
| `data-linked-from-progress-setup` | `progress` | Progress | Setup |
| `data-linked-from-progress-XYZ` | `progress` | Progress | 自定义 |
| `data-linked-from-students` | `students` | Students | Student View |
| `data-linked-from-reports-reports` | `reports` | Reports | Reports |
| `data-linked-from-reports-XYZ` | `reports` | Reports | 自定义 |
| `data-linked-from-class-XYZ` | `classes` | Class | 自定义 |
| `data-linked-from-settings-classes` | `settings` | Settings | Classes |
| `data-linked-from-settings-XYZ` | `settings` | Settings | 自定义 |
| `data-linked-from-apps` | `apps` | Apps | — |

注意：

- `Class` 菜单只有在有自定义页面时才会出现。
- 目前**不支持**挂到 Grading 菜单。
- `XYZ` 子菜单名要短、全小写。
- 自定义子菜单的 message key 格式：

```
psx.xte.html.shared.navigation.sidebar_charms.XYZ
```

### 2.2 `data-param-*` 可选值

| 值 | 含义 |
| --- | --- |
| `studentFrn` | 当前学生 FRN（`001` + DCID） |
| `sectionFrn` | 当前 section FRN（`003` + DCID） |
| `sectionId` | 当前 section ID（不是 DCID） |

末尾加 `?` 表示“如果 URL 已有该参数则不覆盖”，如 `studentFrn?`。
注意：如果 PTP 里选中的是 section group 而不是单个 section，`sectionFrn` / `sectionId` 不会传。

## 3. PS-HTML 学生页面示例

`web_root/teachers/powerteacher-pro/students/myplugin-example-student-custom-page.html`：

```html
<div data-title="psx.htmlc.myplugin.student_photo"
     data-param-frn="studentFrn?"
     data-linked-from-students="true">

  <div data-pss-student-navigation="psx.htmlc.myplugin.student_photo"></div>

  <p>~(studentname) ~(grade_level) ~(student_number) ~(track) ~(studschoolabbr) ~[enrollmentstatus]</p>
  <div>~(studentphoto)</div>

</div>
```

要点：

- `data-param-frn="studentFrn?"`：大多数 PS-HTML 标签需要 `frn`。
- `data-linked-from-students`：挂到 Students 菜单。
- `data-pss-student-navigation`：渲染学生导航头；值应与 `data-title` 一致，便于高亮。

## 4. PS-HTML 班级页面 + 表单 AJAX

```html
<div data-title="psx.htmlc.myplugin.submit_lunch_counts"
     data-param-frn="sectionFrn"
     data-param-sectionid="sectionId"
     data-linked-from-class-misc="true">

  <h1>~[text]psx.htmlc.myplugin.submit_lunch_counts[/text]</h1>

  <form action="/teachers/home.html" method="POST"
        data-pss-ajaxify-form
        data-form-failure-selector="#errorMessage">

    ~[x:loadLunchCounts]
    <table class="table gridTable">
      ...
    </table>

    <div class="button-row">
      <input type="hidden" name="ac" value="storelunchcounts">
      <input type="hidden" name="sectionid" value="~[gpv:sectionid]">
      <button type="submit" class="btn btn-primary">~[text]psx.htmlc.myplugin.submit[/text]</button>
    </div>
  </form>
</div>
```

表单相关属性：

| 属性 | 作用 |
| --- | --- |
| `data-pss-ajaxify-form` | 表单改为 AJAX 提交，不离开 SPA |
| `data-form-failure-selector` | 响应里出现该选择器 → 判定失败 |
| `data-form-success-selector` | 出现 → 成功 |
| `data-form-failure-regex` | 正则判定失败 |
| `data-form-success-regex` | 正则判定成功 |

提交失败时显示错误，成功时显示 PTP 标准成功横幅。

## 5. Angular 页面

### 5.1 模板

```html
<div data-title="psx.htmlc.myplugin.example-angular-page.title"
     data-linked-from-settings-classes="true"
     data-require-path="/scripts/components/myplugin/module.js"
     data-ng-controller="myPluginExampleClassController as ecc"
     data-client-rendering="true"
     data-pss-message-prefixes="psx.htmlc.myplugin.example-angular-page">

  <h1>{{'psx.htmlc.myplugin.example-angular-page.title'|translate}}</h1>

  <table class="table table-bordered">
    <tr data-ng-repeat="class in ecc.allClasses">
      <td>{{class.name}}</td>
      <td>{{class.sectionnumber}}</td>
    </tr>
  </table>
</div>
```

### 5.2 模块

`web_root/scripts/components/myplugin/module.js`：

```js
'use strict';

define(function (require) {
  var angular = require('angular');

  // 所有自定义 Angular 代码都挂到这个模块
  var customizationModule = angular.module('customizationModule');

  customizationModule.controller('myPluginExampleClassController', [
    'currentContext',
    function (currentContext) {
      // controller as 语法：保存到 this
      this.allClasses = currentContext.allSectionsGroup.getSections();
    }
  ]);
});
```

要点：

- 用 RequireJS + CommonJS 包装。
- `customizationModule` 是 PowerSchool 提供的特殊模块，允许 Angular 启动后继续注册。
- `currentContext` 是 PTP 的上下文服务，包含当前 section/学生等信息；建议用调试器探索。
- 控制器名要足够独特，避免冲突。
- 需要数据时可注入 `$http` 调 PowerQuery。

## 6. 国际化

### 6.1 文案

- PS-HTML：`~[text:psx.common.monthnames_jan]`
- Angular：`{{'psx.htmlc.myplugin.title'|translate}}`
- `data-title` 可直接写 message key；没有对应文案时显示原字符串。

### 6.2 数据

| 类型 | 写法 |
| --- | --- |
| 日期 | `{{sfg.lastupdated \| date}}` |
| 数字 | `{{grades.color5.numericRange[0] \| number}}` |

### 6.3 代码本地化（codemap）

PS-HTML 可用：

```html
~[text:psx.html.admin_courses.availability.course_availability_2,
  param:~([Courses]course_name;codemap=CourseName;id=~(gpv.cn;tagtext)),
  param:~(gpv.cn;encodehtml)]
```

常见 codemap：

| codemap | 表.列 |
| --- | --- |
| `AttCode` | `Attendance_Code.Att_Code` |
| `AttCategory` | `Code_Entity.External_Name` |
| `AttCodeDescription` | — |
| `AttDescription` | `Attendance_Code.Description` |
| `EvalLevel` | `EvaluationLevels.Name` |
| `CourseName` | `Courses.Course_Name` |
| `StandardsName` | `Standard.Name` |
| `StandardsDescription` | `Standard.Name` |
| `ReportQueueStatus` | — |
| `GradeScaleItem` | `GradeScaleItem.Name/Description` |
| `FieldListLocalizationPlugin` | 仅 Students/Teachers |
| `GradeLevelLocalizationPlugin` | `Students.Grade_Level` |

> 原生 Angular 暂不支持 codemap；需要时用 PS-HTML 或服务端返回已本地化的值。

## 7. 样式适配

PTP 有统一的 PDS 样式。旧 PS-HTML 标签生成的 HTML 可能显得格格不入。

| 指令 | 作用 |
| --- | --- |
| `data-pss-restyle` | 去掉子元素上旧的 PowerSchool 内联样式，适配 PTP |
| `data-pss-relink` | 把子元素里的 `<a>` 改写成 SPA 路由（`#/...`） |
| `data-modal-id="xxx"` | 把旧式 `.dialogC` 弹窗换成 PTP 的 modal 模板 |

示例：

```html
<div data-pss-restyle data-pss-relink data-modal-id="qlModal">
  ...
  <div class="modal fade" id="qlModal" ...>...</div>
</div>
```

## 8. 页面间跳转

PTP 是 SPA。页面之间用相对链接 + `data-pss-relink`：

```html
<div data-title="psx.htmlc.myplugin.nav_example_1.title"
     data-linked-from-students="true">
  <div data-pss-relink>
    <h2>{{'psx.htmlc.myplugin.nav_example_1.title'|translate}}</h2>
    <div><a href="myplugin-nav-example-2.html?foo=bar">Page 2</a></div>
    <div><a href="myplugin-nav-example-3.html?foo=bar">Page 3</a></div>
  </div>
</div>
```

会被改写成：

```html
<a data-ng-href="#/students/myplugin-nav-example-2.html?studentDcid=12345&sectionId=67890&foo=bar">
```

如果 `data-pss-relink` 不适用，可手写 `data-ng-href="#/..."`。

## 9. 限制与排错

1. 目前没有 Grading 菜单扩展点。
2. section group 选中时 `sectionFrn` / `sectionId` 不传；页面要能处理缺失。
3. `data-title` 最好用 message key；否则无法翻译。
4. 纯 Angular 页面记得 `data-client-rendering="true"`，避免每次往返服务器。
5. PS-HTML 页面需要 `data-param-frn`，否则大多标签拿不到上下文。
6. 自定义子菜单要提供 `psx.xte.html.shared.navigation.sidebar_charms.XYZ` 文案。
7. `customizationModule` 只在 PTP 内可用；不要在其他页面复用。
8. 页面根元素必须是单个 `<div>`，data-* 放这个 div 上。
