# 05 · Angular 定制：Start Page、Schoology 考勤、Incidents、Student Contacts

PowerSchool 逐步把页面改成 Angular Web Components。组件异步渲染，HTML 在初始化完成后才存在。
为此 PowerSchool 暴露了全局对象 **`angularCustomizations`**，让插件/页面片段把内容注入组件。

详见各应用：

- Start Page（20.4+）
- Schoology Attendance App（21.4.1+）
- New Incidents UI（较新版本）
- Student Contacts（AngularJS，机制不同）

---

## 1. 通用框架

### 1.1 核心概念

| 概念 | 说明 |
| --- | --- |
| Angular Customization Context | 全局 `window.angularCustomizations` |
| Angular Selector | 组件的 HTML 标签名，如 `pss-studentsearch` |
| Injection Point | 组件模板内允许注入的 DOM 位置（querySelector） |

### 1.2 必须等组件就绪

```js
if (typeof angularCustomizations !== 'undefined') {
  angularCustomizations.addCustomization('pss-studentsearch', {
    append: 'pss-studentsearch .quick-search-links',
    element: '<a href="#">My Link</a>'
  });
}
```

> 门户示例里写的是 `typeof angularCustomizations != undefined`，这在 JS 里恒为 true（把字符串和
> undefined 比较），**不要照抄**；用 `!== 'undefined'`。

### 1.3 通用函数

| 函数 | 作用 |
| --- | --- |
| `getCustomizableAngularSelectors()` | 列出所有可定制 selector |
| `viewAvailableFunctionsBySelector(selector)` | 列出该组件暴露的函数及参数说明（20.4.3+） |
| `addCustomization(selector, config)` | 把定制加入队列 |
| `getFunctionBySelectorAndName(selector, name)` | 取组件暴露的函数（Incidents 等使用） |
| `availableFunctionsBySelector[selector][name].func(...)` | 直接调用组件函数（部分版本） |
| `addExtensions([...])` | 请求扩展数据并映射到模型（考勤/联系人） |

### 1.4 四种注入方式

| 方式 | 配置 | 说明 |
| --- | --- | --- |
| append | `{append: 'css selector', element: '<a ...>'}` | 追加到容器末尾 |
| after | `{after: 'css selector', element: '...'}` | 插到目标之后 |
| before | `{before: 'css selector', element: '...'}` | 插到目标之前 |
| callback | `{callback: function(){}}` | DOM 就绪后自行插入 |

`element` 是 HTML 字符串（模板字符串常用）。Angular 会负责把元素渲染并放到位置。

---

## 2. Start Page（20.4.0.0+）

### 2.1 背景

- 20.4 起 Start Page 用 Angular 8 Web Components。
- 学生、教职工、联系人搜索合并为一个组件。
- 旧搜索/快捷链接的定制方式失效，需要新框架。

### 2.2 常用 selector

| Selector | 区域 |
| --- | --- |
| `pss-studentsearch` | 学生搜索 |
| `pss-staffsearch` | 教职工搜索 |
| `pss-student-advancedsearch` | 学生高级搜索 |
| `pss-staff-advancedsearch` | 教职工高级搜索 |
| `pss-powersearch` | 旧聚合搜索（会警告，尽量不用） |

常用注入点：

```
pss-studentsearch .quick-search-links
pss-staffsearch .quick-search-links
#advancedModeToggleBtnstudents
#advancedModeToggleBtnstaff
```

### 2.3 示例：追加链接

```html
<script>
  var appendStudentTom = `<a class="custom_link" href="#" onclick="AngularCustomizeTest.checkToms('pss-studentsearch','selectStudentByCustomSearchValue')">Toms</a>`;

  var AngularCustomizeTest = {
    init: function () {
      if (typeof angularCustomizations !== 'undefined') {
        angularCustomizations.addCustomization(
          'pss-studentsearch',
          { append: 'pss-studentsearch .quick-search-links', element: appendStudentTom }
        );
      }
    },
    checkToms: function (selector, funcName) {
      angularCustomizations
        .availableFunctionsBySelector[selector][funcName]
        .func('First_Name=Tom@');
    }
  };

  AngularCustomizeTest.init();
</script>
```

### 2.4 示例：before / after

```js
angularCustomizations.addCustomization('pss-studentsearch', {
  before: '#advancedModeToggleBtnstudents',
  element: '<a class="custom_link" href="#">Before</a>'
});

angularCustomizations.addCustomization('pss-staffsearch', {
  after: '#advancedModeToggleBtnstaff',
  element: '<a class="custom_link" href="#">After</a>'
});
```

### 2.5 示例：callback

```js
angularCustomizations.addCustomization('pss-studentsearch', {
  callback: function () {
    var links = document.querySelectorAll('pss-studentsearch .quick-search-links');
    var template = document.createElement('template');
    template.innerHTML = '<a class="custom_link" href="#">Callback</a>';
    if (links.length) links[0].appendChild(template.content.firstChild);
  }
});
```

### 2.6 兼容 Classic Experience

20.4–20.11 用户可以关闭 New Experience。用 `angularCustomizations` 是否存在来判断：

```js
if (typeof angularCustomizations !== 'undefined') {
  // New Experience 定制
} else {
  // Classic 页面逻辑
}
```

---

## 3. Schoology Attendance App（21.4.1.0+）

### 3.1 选择器

```
pss-integrations-attendance
```

### 3.2 Customization 配置接口

```ts
interface Customization {
  type: string;                 // 必填：anywhere | alert | tableColumn | controls | preSave | postSave
  injectionType?: string;       // anywhere: before | append | after
  querySelector?: string;       // anywhere: 目标元素
  template?: string;            // HTML 字符串
  templateURL?: string;         // HTML 片段 URL
  title?: string;               // alert 标题 / tableColumn 表头
  dataModelName?: string;       // 模板绑定的模型名
  dataModelId?: string | number;// alert 针对的学生/记录
  iconURL?: string;             // alert 图标
  func?: any;                   // preSave / postSave 回调
  params?: any[];               // 回调参数
}
```

### 3.3 类型

#### anywhere

```js
angularCustomizations.addCustomization('pss-integrations-attendance', {
  injectionType: 'append',
  querySelector: `#alerts-${dcid} div.student-alerts`,
  template: `<a href="/teachers/alerts/custom_alert_2.html?frn=001${dcid}"
                class="dialogAlert" title="Custom Alert 2">
               <img src="/images/custom_alerts/icon.svg" width="18" height="18">
             </a>`
});
```

`injectionType`：`before` / `append` / `after`。

#### alert

```js
angularCustomizations.addCustomization('pss-integrations-attendance', {
  type: 'alert',
  dataModelId: dcid,
  iconURL: '/images/custom_alerts/icon.svg',
  templateURL: `/teachers/alerts/custom_alert_2.html?frn=001${dcid}`,
  title: 'Custom Alert 2'
});
```

也可以直接用 `template` 绑定扩展值：

```js
angularCustomizations.addCustomization('pss-integrations-attendance', {
  type: 'alert',
  dataModelId: dcid,
  dataModelName: 'student',
  iconURL: '/images/custom_alerts/icon.svg',
  template: 'Extension: {{student.extensions.extensionModel["student.u_custom_alert.custom_alert_2"]}}',
  title: 'Extension Value'
});
```

#### tableColumn

```js
angularCustomizations.addCustomization('pss-integrations-attendance', {
  type: 'tableColumn',
  dataModelName: 'student',
  template: '{{student.extensions.extensionModel["student.u_custom_alert.custom_alert_2"]}}',
  title: 'Custom Value'
});
```

#### controls（控制栏）

```js
angularCustomizations.addCustomization('pss-integrations-attendance', {
  type: 'controls',
  template: `<label class="pds-checkbox-widget">
               <input type="checkbox" id="field_All_Present">
               <div class="pds-label-text">All students are present</div>
             </label>`
});
```

#### preSave（提交前校验）

```js
function validateElements() {
  var errors = 0;
  jQuery('input').each(function () {
    if (!jQuery(this).val()) errors++;
  });
  if (errors) alert(errors + ' empty attendance records');
  return true;
}

angularCustomizations.addCustomization('pss-integrations-attendance', {
  type: 'preSave',
  func: validateElements
});
```

#### postSave

```js
function postSaveFunction() {
  // 额外保存逻辑
}

angularCustomizations.addCustomization('pss-integrations-attendance', {
  type: 'postSave',
  func: postSaveFunction,
  templateURL: '/integrations/attendance/success.html'
});
```

### 3.4 请求扩展数据

```js
angularCustomizations.addExtensions([{
  url: '/ws/attendance/section_attendance',
  extensions: 'u_custom_alert',
  extensionMap: { '_extension_data': 'student' }
}]);
```

- `url`：请求哪个接口时附带扩展。
- `extensions`：扩展表名。
- `extensionMap`：`_extension_data` 映射到哪个核心表（模板里通过 `student.extensions.extensionModel[...]` 访问）。

---

## 4. New Incidents UI

### 4.1 选择器与函数

| Selector | 区域 | 函数 |
| --- | --- | --- |
| `pss-incident-detail` | 外层/步骤/保存 | `navigateToStep`、`getCurrentIncidentId`、`triggerSave`、`registerAfterSave` |
| `pss-incidentdetail-incidentdetails` | Incident Details 步骤 | `registerCustomValidator`、`registerIncidentExtensionFields` |
| `pss-incidentdetail-participants` | Participants 步骤 | `injectPerParticipant`、`registerParticipantRoleExtensionFields`、`registerBehaviorExtensionFields` |
| `pss-incidentdetail-review` | Review 步骤 | `registerBehaviorExtensionFields` |
| `pss-participant-template-detail` | 参与者模板 | `registerParticipantRoleExtensionFields`、`registerBehaviorExtensionFields` |

### 4.2 等待函数可用

```js
const selector = 'pss-incident-detail';

function whenAvailable(name, cb, attempt = 0) {
  if (typeof angularCustomizations === 'undefined') return;
  const fn = angularCustomizations.getFunctionBySelectorAndName(selector, name);
  if (fn) return cb(fn);
  if (attempt < 50) setTimeout(() => whenAvailable(name, cb, attempt + 1), 100);
}

whenAvailable('getCurrentIncidentId', fn => console.log(fn()));
```

### 4.3 常用函数

```js
// 跳到 Participants
angularCustomizations
  .getFunctionBySelectorAndName('pss-incident-detail', 'navigateToStep')('step-2');

// 当前 incident id
const id = angularCustomizations
  .getFunctionBySelectorAndName('pss-incident-detail', 'getCurrentIncidentId')();

// 触发保存（不关闭页面）
angularCustomizations
  .getFunctionBySelectorAndName('pss-incident-detail', 'triggerSave')();

// 保存后回调
angularCustomizations
  .getFunctionBySelectorAndName('pss-incident-detail', 'registerAfterSave')(async (incidentId) => {
    await fetch('/ws/custom/incident/reference', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({incidentId})
    });
  });
```

### 4.4 自定义校验

```js
angularCustomizations
  .getFunctionBySelectorAndName('pss-incidentdetail-incidentdetails', 'registerCustomValidator')
  (function (incident) {
    if (incident.title === 'Do not use') {
      return [{
        step: 'details',
        message: 'This title is not allowed.',
        blocking: true,
        source: 'custom-title-validator',
        field: 'title'
      }];
    }
    return [];
  });
```

### 4.5 注册扩展字段

```js
var fields = [
  {
    extensionName: 'S_CA_INCIDENT_FIELDS',
    fieldName: 'StateIncidentId',
    required: true,
    placement: 'after-title',
    order: 10
  },
  {
    extensionName: 'S_CA_INCIDENT_FIELDS',
    fieldName: 'ReviewDate',
    placement: 'after-attributes',
    order: 20
  }
];

angularCustomizations.addCustomization('pss-incidentdetail-incidentdetails', {
  callback: function () {
    angularCustomizations
      .getFunctionBySelectorAndName('pss-incidentdetail-incidentdetails', 'registerIncidentExtensionFields')
      (fields);
  }
});
```

可用 placement：

```
after-title, after-date-time, after-school, after-description,
after-time-frame, after-location, after-prepared-by,
after-financial-impact, after-objects, after-attributes,
before-change-reason
```

默认 `after-attributes`；`order` 小的先渲染。

### 4.6 参与者卡片注入

```js
angularCustomizations
  .getFunctionBySelectorAndName('pss-incidentdetail-participants', 'injectPerParticipant')
  ('<div class="custom-participant-field"><label>Note <input type="text" class="ps-input"></label></div>',
   '.participant-card-body');
```

- 注入的是普通 DOM，**不会**编译 Angular 模板（`{{}}`、`(click)` 无效）。
- 不要用重复的 `id`；用 class / data 属性。
- 用 `data-participant-index` 定位卡片。

### 4.7 模板扩展字段

- Incident Template Builder：把 `window.incidentTemplateExtensionFields` 放到
  `templateBuilderController` 初始化之前。
- 字段键：`extension:<小写扩展名>:<小写字段名>`
- 参与者模板：`role-extension:...` / `behavior-extension:...`
- 字段必须同时在 `incidentDetail.html` 与 `participant-template-detail.html` 注册。

### 4.8 安全

- 不要注入未转义的用户输入。
- 不记录 PII。
- 自定义字段要通过有权限校验的服务端端点保存。
- 客户端校验只改善体验，不能替代服务端校验。

---

## 5. Student Contacts（联系人）

### 5.1 页面与模板

目录：`web_root/admin/contacts/`

| 文件 | 作用 |
| --- | --- |
| `edit.html` | 主页面 |
| `demographicsTemplate.html` | 学生/联系人关系 |
| `addressTemplate.html` | 地址 |
| `emailTemplate.html` | 邮箱 |
| `phoneTemplate.html` | 电话 |

学生联系人页：`/admin/students/contacts.html`，定制文件放 `admin/students/`，
文件名前缀用 `contacts` 而不是 `edit`。

### 5.2 插入点

主页面：

```
~[cust.insertion_point:<filename.reference>]
```

自动注入文件命名：

```
edit.<identifier>.<insertion.point>.txt
```

抽屉模板：

```
~[cust.insertion_point:address.form]
~[cust.insertion_point:address.other]
~[cust.insertion_point:email.form]
~[cust.insertion_point:email.other]
~[cust.insertion_point:phone.form]
~[cust.insertion_point:phone.other]
~[cust.insertion_point:demographics.activeform]
~[cust.insertion_point:demographics.allform]
~[cust.insertion_point:demographics.newform]
~[cust.insertion_point:demographics.other]
```

- `.form`：在 `<form>` 内，自动继承 Angular/表单行为。
- `.other`：在表单外，放 JS。

### 5.3 加载扩展数据（21.4.2+ 推荐）

```js
require(['components/shared/utils/psCustomizationUtils'], function (psCU) {
  psCU.addExtensions([{
    url: '/ws/contacts/contact/{id}',
    extensions: 'u_person_ext,u_personaddressassoc_ext,u_studentcontactassoc_ext,u_studentcontactdetail_ext'
  }]);
});
```

学生联系人页：

```js
psCU.addExtensions([{
  url: '/ws/contacts/student/{id}',
  extensions: 'StudentContactDetailCoreFields'
}]);
```

### 5.4 旧方式（21.4.2 前，不要再用）

- `onNgBeforeDataLoad`
- `_scope.extensionsQueryParam`
- `init-customization` 属性

### 5.5 扩展数据模型

| API | 作用 |
| --- | --- |
| `initExtensionModel(tableName, extensionName, fieldName)` | 初始化存储位置 |
| `getExtensionFieldValue(tableName, extensionName, fieldName)` | 取值，不存在返回 undefined |
| `extensionModel['<table>.<ext>.<field>']` | 双向绑定用 |

示例：

```html
<input type="text"
       ng-init="context.currentContact.initExtensionModel('person.u_person_ext.person_str_e')"
       ng-model="context.currentContact.extensionModel['person.u_person_ext.person_str_e']">
```

表格列：

```html
<td><span ng-bind="address.getExtensionFieldValue('personaddressassoc','u_personaddressassoc_ext','personaddressassoc_str_e')"></span></td>
```

### 5.6 共享数据的坑

邮箱/电话/地址是“具体记录 + 关联记录”：

- 两个联系人可共享同一个具体记录。
- 扩展值存在具体记录上；关联记录也有自己的扩展。
- 只更新扩展字段：共享该记录的**所有**联系人都会看到变化。
- 改核心值（如换电话号码）：可能创建新记录，旧记录及其扩展不变。
- 请求里**没带**的扩展字段不会被修改。

### 5.7 学生联系人页注意事项

- 文件放 `admin/students/`，前缀 `contacts`。
- 扩展 URL 用 `/ws/contacts/student/{id}`。
- 关系抽屉是两页共享的；定制要同时放到两个目录。

---

## 6. 定制策略选择

| 页面类型 | 首选 |
| --- | --- |
| 传统 PS-HTML 页面 | 直接写页面 + DirectTable/JSON |
| Start Page 搜索/快捷链接 | `angularCustomizations` + `pss-studentsearch`/`pss-staffsearch` |
| Schoology 考勤 | `pss-integrations-attendance` 的 type 配置 |
| Incidents | `pss-incident-*` 选择器 + register* 函数 |
| Student Contacts | insertion point + `psCustomizationUtils.addExtensions` |
| PowerTeacher Pro | 独立的 `data-linked-from-*` 页面机制（见下一篇） |

## 7. 调试清单

1. `typeof angularCustomizations` 是否存在？不在 New Experience 就不要注入。
2. selector 名称是否正确？用 `getCustomizableAngularSelectors()`。
3. 函数是否已就绪？用 `viewAvailableFunctionsBySelector` 并轮询。
4. querySelector 是否匹配到元素？在控制台先 `document.querySelector` 验证。
5. 注入的 HTML 是否有重复 id？是否有未转义内容？
6. 扩展数据是否请求了？`addExtensions` 的 url/表名/映射是否正确？
7. 页面刷新后是否还生效？组件重渲染可能需要 callback/去重。
8. 权限：内部调用是否缺 permission mapping？
