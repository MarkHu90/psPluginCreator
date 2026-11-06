# 07 · Validation Dashboard（26.5.0.0+）

Validation Dashboard 是管理员用来检查“学区/学校配置是否完整”的页面。每个校验项：

1. 执行一个 PowerQuery；
2. 根据行数或查询返回的状态计算 `ok / warn / error`；
3. 可选地打开详情抽屉，显示具体行。

对开发者来说，只需要三样东西：

- 一个 flattened PowerQuery
- 一条 permission mapping（允许仪表盘页面调用它）
- 一段 JavaScript 配置（标题、状态逻辑、详情列）

---

## 1. 工作方式

| 模式 | 调用 |
| --- | --- |
| Threshold | `POST /ws/schema/query/{name}/count` |
| Advanced PQ | 调用查询，读取第一行的 `status` 和 `rowcount` 字段 |

- 配置了 `tableFormat` 且有行 → 用户可打开详情抽屉。
- 配置了安全的管理页 URL → 标题变成链接。
- 详情抽屉**最多显示 100 行**。

---

## 2. 第一步：PowerQuery

```xml
<queries>
  <query name="com.example.validation.school.threshold.up_is_good_warn"
         flattened="true"
         tags="validation examples">
    <summary>Validation Dashboard Example: up-is-good (warn threshold)</summary>
    <columns>
      <column column="GEN.NAME">NAME</column>
    </columns>
    <sql><![CDATA[
      SELECT 'single-row' AS NAME FROM GEN WHERE ROWNUM = 1
    ]]></sql>
  </query>

  <query name="com.example.validation.school.advanced.status_logic_ok"
         flattened="true"
         tags="validation examples">
    <summary>Advanced status logic (ok)</summary>
    <columns>
      <column column="GEN.NAME">STATUS</column>
      <column column="GEN.NAME">ROWCOUNT</column>
    </columns>
    <sql><![CDATA[
      SELECT 'okay' AS STATUS, 2 AS ROWCOUNT FROM GEN WHERE ROWNUM = 1
    ]]></sql>
  </query>
</queries>
```

要点：

- **必须 `flattened="true"`**。
- Threshold 模式：查询返回的**行数**就是指标。
- Advanced 模式：查询返回 `status` + `rowcount` 两个字段；`status` 取值 `ok` / `okay` / `warn` / `error`。
- 查询名建议按验证领域命名。

---

## 3. 第二步：Permission Mapping

仪表盘只能调用映射到其页面的查询：

```xml
<permission_mappings>
  <permission name="/admin/validation/school/home.html">
    <implies allow="post">/ws/schema/query/com.example.validation.school.threshold.up_is_good_warn</implies>
    <implies allow="post">/ws/schema/query/com.example.validation.school.advanced.status_logic_ok</implies>
  </permission>
</permission_mappings>
```

> 页面名按实际仪表盘页面填；如果是自定义页面，填你自己的 `/admin/...` 路径。

---

## 4. 第三步：注册校验项

```js
psLightWeightValidation.addCategory('examples', 'Validation Dashboard Examples', 1);

psLightWeightValidation.addValidations([
  {
    powerQueryName: 'com.example.validation.school.threshold.up_is_good_warn',
    postParams: {},
    levelCalc: {
      type: 'threshold',
      thresholds: {
        statusMode: 'up-is-good',
        warnAtOrAbove: 1,
        okAtOrAbove: 2
      }
    },
    statusText: {
      error: 'Not Configured',
      warn: 'Partially Configured',
      ok: 'Configured'
    },
    title: 'Example: Threshold up-is-good',
    description: 'Demonstrates up-is-good with warnAtOrAbove and okAtOrAbove.',
    category: 'examples',
    sortOrder: 10,
    url: '/admin/validation/school/home.html'
  },
  {
    powerQueryName: 'com.example.validation.school.details.all_types',
    postParams: {},
    levelCalc: {
      type: 'advanced-pq',
      advancedPq: {
        powerQueryName: 'com.example.validation.school.advanced.status_logic_ok',
        statusField: 'status',
        rowsField: 'rowcount'
      }
    },
    statusText: { error: 'Error', warn: 'Warn', ok: 'Okay' },
    title: 'Example: Advanced Status With Detail Types',
    description: 'Advanced status + all detail types.',
    category: 'examples',
    sortOrder: 20,
    url: '/admin/validation/school/home.html',
    tableFormat: [
      { header: 'String', columnName: 'string_value', type: 'string' },
      { header: 'Date', columnName: 'wire_date', type: 'date' },
      { header: 'Time', columnName: 'wire_time', type: 'time' },
      { header: 'Time From Seconds', columnName: 'seconds_from_midnight', type: 'time_from_seconds' },
      { header: 'Number', columnName: 'numeric_value', type: 'number' },
      { header: 'URL', columnName: 'admin_url', type: 'url' },
      {
        header: 'Test Type',
        columnName: 'test_type',
        type: 'lookup',
        lookup: { '1': 'National', '2': 'State', '3': 'Local' }
      }
    ]
  }
]);
```

### 4.1 校验项属性

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `powerQueryName` | 是 | 主查询（计数/详情） |
| `levelCalc` | 是 | `threshold` 或 `advanced-pq` |
| `postParams` | 是 | POST body；无参数用 `{}` |
| `usesGlobalParam` | 否 | 合并共享参数名列表 |
| `statusText` | 否 | 覆盖 ok/warn/error 文案 |
| `category` | 否 | 分组；未指定/未知 → `uncategorized` |
| `sortOrder` | 否 | 组内顺序 |
| `title` | 是 | 用户看到的标题 |
| `description` | 是 | 帮助文本 |
| `url` | 否 | 标题链接（安全的管理页 URL） |
| `tableFormat` | 否 | 详情抽屉列定义 |

### 4.2 预置分类

```
attendance
compliance
scheduling
grading
fees
miscellaneous
uncategorized
```

---

## 5. 状态逻辑

### 5.1 Threshold

```js
levelCalc: {
  type: 'threshold',
  thresholds: {
    statusMode: 'up-is-good', // 或 up-is-bad
    warnAtOrAbove: 1,
    okAtOrAbove: 2
  }
}
```

- `up-is-good`：行数越多越健康（如“已配置的项数”）。
- `up-is-bad`：行数越多问题越大（如“缺失的项数”）。

### 5.2 Advanced PQ

```js
levelCalc: {
  type: 'advanced-pq',
  advancedPq: {
    powerQueryName: 'com.example.validation.school.advanced.status_logic_ok',
    statusField: 'status',
    rowsField: 'rowcount'
  }
}
```

- `status` 合法值：`ok` / `okay` / `warn` / `error`。
- `rowsField` 用于详情抽屉的行数展示。

---

## 6. 详情抽屉 `tableFormat`

| 类型 | PQ 返回值 | 显示 | 备注 |
| --- | --- | --- | --- |
| `string` | Alpha | Alpha | 默认 |
| `date` | `2026-04-10` | `04/10/2026` | wire format |
| `time` | `2026-04-10 13:45` | `01:45 PM` | 本地化时间 |
| `time_from_seconds` | `3600` | `01:00 AM` | 秒→时间 |
| `number` | `12345` | `12,345` | 本地化数字 |
| `url` | `/admin/home.html` | `Open Record` | 安全 URL 才可点 |
| `lookup` | `2` | `State` | 按 lookup 映射 |
| lookup 未命中 | `99` | `99` | 原样显示 |

> 详情抽屉只显示前 100 行；超过时给提示。

---

## 7. 把仪表盘加到新页面

### 7.1 页面顺序（非常重要）

1. 创建 `psLightWeightValidation` 全局桥对象。
2. 添加全局参数。
3. 加载校验定义（JS 文件或 insertion point）。
4. **最后**放 `<pss-lightweightvalidation-dashboard>` 指令。

```html
<script>
  var psLightWeightValidation = { _items: [], _globalParams: {}, _category: {} };

  psLightWeightValidation.addCategory = function (name, description, sortOrder) {
    this._category[name] = { description: description, sortOrder: sortOrder };
  };
  psLightWeightValidation.addGlobalParam = function (name, value) {
    this._globalParams[name] = value;
  };
  psLightWeightValidation.addValidations = function (items) {
    this._items = this._items.concat(items);
  };

  psLightWeightValidation.addGlobalParam('yearid', ~(curYearId));
  psLightWeightValidation.addGlobalParam('schoolid', ~(curschoolid));
  psLightWeightValidation.addGlobalParam(
    'current_year_start',
    '~(date.information;type=current_year_start;dateformat=yyyy-MM-dd)'
  );
  psLightWeightValidation.addGlobalParam(
    'current_year_end',
    '~(date.information;type=current_year_end;dateformat=yyyy-MM-dd)'
  );
</script>

<script src="psLightWeightValidationXXXXX.javascript"></script>
<script>
  ~[cust.insertion_point:custom.validations]
</script>

<div class="box-round" data-ngModules="LightWeightValidationModule">
  <pss-lightweightvalidation-dashboard></pss-lightweightvalidation-dashboard>
</div>
```

### 7.2 常见错误

| 错误 | 后果 |
| --- | --- |
| 指令放在脚本之前 | 仪表盘为空/报错 |
| 校验定义先于全局对象加载 | `psLightWeightValidation` 未定义 |
| 忘记 `data-ngModules="LightWeightValidationModule"` | 组件不渲染 |
| 没写 permission mapping | 查询 403 |
| 查询未 `flattened="true"` | 详情/计数异常 |

---

## 8. 设计建议

1. 先做一个校验，确认查询能跑通，再批量加。
2. 先用 threshold 模式，最容易理解/调试。
3. 只有“详情能帮助管理员修复问题”时才加 `tableFormat`。
4. 编码值用 `lookup` 转成人话。
5. 标题/描述面向客户，不写内部实现。
6. 记住 100 行上限；大数据量用“去对应页面查看”链接。
7. `postParams` 里可以带 schoolid/yearid；共享参数用 `addGlobalParam`。
