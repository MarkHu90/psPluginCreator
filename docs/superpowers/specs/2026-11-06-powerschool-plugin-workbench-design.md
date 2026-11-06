# PowerSchool 插件工作台 — 设计文档

- 日期：2026-11-06
- 状态：已实现核心切片（校验 + 生成 + 输出校验 + CLI + Web UI 校验结果）；导入与工程工作区待实现
- 参考：`demo/diagnosis-plugin`、`demo/epraise-plugin`、`demo/interviewnotes-plugin`

> 说明：仓库中不存在名为 `template-plugin` 的目录。三个 demo 插件共同构成了模板约定；`diagnosis-plugin` 作为默认页面写法基线，`epraise-plugin` 作为能力上限参考，`interviewnotes-plugin` 作为传统写法参考。

## 1. 目标

构建一个通用的 PowerSchool customization plugin 工作台：

- 用一份可读、可保存、可导入的 spec（`plugin.json`）描述插件。
- 从 spec 生成可直接安装的 PowerSchool 插件文件树与 zip。
- 支持完整的 CRUD 页面、数据表、导航、wildcards、MessageKeys 与 raw 资源。
- 提供本地 Web UI 与 CLI，两者共用同一套生成核心。
- 能导入现有插件，解析结构并原样保留页面，继续编辑和重新生成。

## 2. 非目标（v1 不做）

- 不连接真实 PowerSchool 服务器，不执行安装/升级。
- 不做数据库内省，不读取线上 schema。
- 不做深度逆向 CRUD（不从 DirectTable 表单和 SQL 还原字段级结构）。
- 不做拖拽式页面搭建器。
- 不做多用户、权限、协作、云端存储。
- 不做完整多语言 properties 体系；v1 使用中英双语字段，按需生成 MessageKeys。
- 不引入前端模板引擎；页面模板使用纯 TypeScript 函数。

## 3. 领域模型

PowerSchool 插件由两个可独立安装的部分组成：

```
api/
  plugin.xml
  pagecataloging/*.json
  MessageKeys/*.properties
  queries_root/*.named_queries.xml      # PowerQuery
  permissions_root/*.permission_mappings.xml
  data_change_configuration_root/*.change_listener_config.xml
  web_root/
    admin/... | teachers/... | guardian/...   # 学生门户也走 guardian/，无 students/
    scripts/...
    images/...
    wildcards/*.txt
dbsetup/
  plugin.xml
  user_schema_root/U_*.xml
```

工作区镜像该结构：

```
workspaces/<key>/
  plugin.json      # spec，唯一事实来源
  files/           # raw 文件，路径相对于插件包根
  build/
    api/...
    dbsetup/...
    api.zip / dbsetup.zip / combined.zip
```

`files/` 中的路径示例：`api/web_root/scripts/demo/app.js`、`api/web_root/images/icon.png`。

## 4. 生成架构

核心是纯函数管线：

```
load spec
  -> validate(spec)            结构化校验
  -> plan(spec): GeneratedFile[]
  -> writePlan(plan, tempDir)  原子写入
  -> validateOutput(outputDir) 重新解析 XML/JSON、标签配对
  -> zip(outputDir)            按需
  -> 替换 build/
```

`GeneratedFile`：

```ts
type GeneratedFile = {
  path: string;                       // 相对插件包根
  content: string | Uint8Array;
  source: "generated" | "raw";
  encoding?: "utf8" | "binary";
};
```

约束：

- 纯函数、确定性输出；除 zip 元数据外不写时间戳。
- generated 文本：UTF-8 无 BOM，LF 换行，JSON 2 空格缩进，以换行结尾。
- raw 文件：按原字节复制，不转换编码、不改换行、不补结尾换行。
- 同一路径只能有一个来源；generated 与 raw 冲突视为校验错误。
- 生成先写临时目录，成功后整体替换 `build/`，失败不留半成品。

## 5. Spec 结构

```ts
type PluginSpec = {
  schemaVersion: 1;
  key: string;                        // 工作区目录名，仅本地使用
  plugin: {
    name: string;
    description: string;
    version: string;                  // semver，如 1.0.0；用于 api/plugin.xml
    dbName: string;                   // 默认 `${name} DB`
    dbDescription: string;            // 默认 `${description} (DB)`
    dbVersion: string;                // 默认与 version 相同；用于 dbsetup/plugin.xml
    navVersion: string;               // 默认 `${version}.0`；用于 pagecataloging
    publisher: { name: string; email: string };
    oauth?: {
      enabled: boolean;               // 生成 <oauth>
      accessLevelV1Api?: "NONE" | "READ" | "FULL"; // 25.2+；默认 NONE
    };
  };
  tables: TableSpec[];
  pages: PageSpec[];
  navigation: NavFileSpec[];
  powerQueries: PowerQueryFileSpec[]; // 生成 queries_root/*.xml
  accessRequest: AccessFieldSpec[];   // 生成 <access_request>
  permissionMappings: PermissionMappingFileSpec[]; // 生成 permissions_root/*.xml
  wildcards: WildcardSpec[];
  messageKeys: MessageKeyFileSpec[];
  rawFiles: RawFileRef[];
};

type LocalizedText = { en: string; zh?: string };
// 输出规则：zh 存在且非空时生成 `${zh} ${en}`，否则只用 en。

type TableSpec = {
  extensionName: string;              // 如 U_WCNotification
  schemaFile?: string;                // 默认 `${extensionName}.xml`；导入时保留原文件名
  tableName: string;                  // 如 U_WC_Notifications
  childName: string;                  // 默认与 tableName 相同
  comment: string;
  type?: "standalone" | "oneToOne" | "oneToMany"; // 默认 standalone
  primaryKey?: string;                // 默认 id；核心表通常 dcid
  fields: FieldSpec[];
};

type FieldSpec = {
  name: string;                       // 列名
  // v1 稳定支持 demo 已验证的 Integer/String/Date；
  // Decimal/DateTime 作为实验类型，Boolean 用 Integer 表示。
  type: "Integer" | "String" | "Date" | "DateTime" | "Decimal";
  length?: number;                    // String 必填；<= 4000
  comment?: string;
};

type PageContext =
  | "admin"
  | "adminStudent"
  | "teacher"
  | "teacherStudent"
  | "guardian"
  | "student";

type PageSpec = {
  id: string;                         // 稳定 UI id
  kind: "list" | "edit" | "settings" | "dashboard" | "custom" | "raw";
  context: PageContext;
  path: string;                       // web_root 相对路径，如 admin/demo/foo_list.html
                                      // student 上下文必须用 guardian/
  title: LocalizedText;
  table?: string;                     // list/edit/settings 必填
  studentScope?: "curstudid" | "gpv.studentid" | "none";
  recordIdParam?: string;             // 默认 "id"
  columns?: ListColumnSpec[];
  fields?: FormFieldSpec[];
  filters?: FilterSpec[];
  joins?: JoinSpec[];
  orderBy?: string;
  csvExport?: boolean;
  customBody?: string;                // kind=custom 的 HTML 片段
  chrome?: { header?: string; footer?: string }; // 覆盖默认 ~[wc:*] 页头/页脚标签
  apiResources?: string[];            // 页面调用的 PowerQuery/Table API，用于 permission 覆盖校验
};

type ListColumnSpec = {
  column: string;
  label: LocalizedText;
  type?: "string" | "number" | "date" | "datetime";
  sortable?: boolean;
  width?: string;
};

type FormFieldSpec = {
  column: string;
  label: LocalizedText;
  widget:
    | "text" | "textarea" | "integer" | "decimal" | "date"
    | "checkbox" | "select" | "hidden" | "readonly";
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  maxLength?: number;
  defaultValue?: string;              // 原样写入 value，支持 ~(curschoolid) 等
  options?: { value: string; label: LocalizedText }[];
  sqlOptions?: { sql: string; valueColumn: string; labelColumn: string };
};

type JoinSpec = {
  table: string;                      // 如 students s
  on: string;                         // 如 s.dcid = n.studentsdcid
  type?: "left" | "inner";            // 默认 left
};

type FilterSpec = {
  param: string;                      // gpv 参数名
  column: string;
  operator: "=" | ">=" | "<=" | ">";
  widget: "select" | "text" | "date";
  label: LocalizedText;
  options?: { value: string; label: LocalizedText }[]; // value 必须是数字或受控枚举
  optionsSql?: string;                // 渲染 select 选项的 SQL
  clientSide?: boolean;               // text/date 默认 true
};

type NavFileSpec = {
  filename: string;                   // 如 foo_schoolNav.json
  contextType: "main" | "student" | "staff"; // 官方仅支持 main/student/staff
  districtLevelContext?: 0 | 1 | 2;
  entries: NavEntrySpec[];
};

type NavEntrySpec = {
  htmlID: string;
  title: LocalizedText;
  sortOrder: number;
  version: string;                    // 必填；内容变化时必须递增
  pageId?: string;                    // 引用 pages[].id
  pageURL?: string | null;            // 或直接给 URL / PS 条件表达式
  schoolIds?: number[];               // 生成 curschoolid 条件包裹
  contextType?: "main" | "student" | "staff";
  requiredContext?: "student" | "staff";
  districtLevelContext?: 0 | 1 | 2;
  parentHTMLID?: string;
  isNewTab?: boolean;
  isLandingPage?: boolean;
  checkParams?: boolean;
  children?: NavEntrySpec[];
  extra?: Record<string, unknown>;    // 导入时保留未知字段
};

type WildcardSpec = {
  filename: string;                   // 如 guardian_header.demo.leftnav.footer.txt
  kind: "adminLink" | "teacherNavLink" | "teacherStudentPageOption" | "guardianLink" | "raw";
  condition?: {
    schoolIds?: number[];
    guardianOnly?: boolean;
    raw?: string;                     // 自定义 ~[if#...] 条件
  };
  link?: { label: LocalizedText; href: string; htmlID?: string };
  content?: string;                   // kind=raw 或附加片段
};

type MessageKeyFileSpec = {
  locale: string;                     // 如 US_en
  filename?: string;                  // 默认 `message-keysep.<locale>.properties`；导入时保留原名
  entries: { key: string; value: string }[];
};

type RawFileRef = {
  path: string;                       // 相对插件包根
  note?: string;
};

type AccessFieldSpec = {
  table: string;                      // 真实 schema 表名
  field: string;                      // 真实 schema 字段名
  access: "ViewOnly" | "FullAccess";  // FullAccess 仅用于表
};

type PowerQueryFileSpec = {
  filename: string;                   // queries_root 下的文件名，如 com.acme.named_queries.xml
  queries: PowerQuerySpec[];
};

type PowerQuerySpec = {
  name: string;                       // com.organization.product.area.name
  coreTable?: string;                 // 允许 extensions 时使用
  flattened?: boolean;
  dat?: boolean;                      // PowerQuery DAT（22.9+）
  tags?: string;
  summary?: string;                   // <= 50 字符
  description?: string;
  args?: PowerQueryArgSpec[];
  columns: PowerQueryColumnSpec[];    // 顺序必须与 SQL 返回列一致
  sql: string;                        // 建议 CDATA；参数用 :name
};

type PowerQueryArgSpec = {
  name: string;
  column?: string;                    // TABLE.COLUMN；DEM/casing 需要
  type?: "primitive" | "array";
  required?: boolean;
  default?: string;
  casing?: "upper" | "lower" | "none";
  description?: string;
};

type PowerQueryColumnSpec = {
  column: string;                     // 物理 TABLE.COLUMN
  alias?: string;                     // 返回别名；一段别名需 coreTable
  description?: string;
};

type PermissionMappingFileSpec = {
  filename: string;                   // permissions_root 下的 .xml
  mappings: PermissionMappingSpec[];
};

type PermissionMappingSpec = {
  page: string;                       // 如 /admin/demo/list.html
  resources: PermissionResourceSpec[];
};

type PermissionResourceSpec = {
  path: string;                       // /ws/schema/query/... 或 /ws/schema/table/...
  allow?: "get" | "post" | "put" | "delete"; // PowerQuery 必须 post
};
```

补充规则：

- `kind: "raw"` 的页面只是元数据，指向 `rawFiles[]` 中同路径的文件；生成器不会为它额外输出内容。`page.path` 必须存在于 `rawFiles[]`，否则校验报错。
- `studentScope` 默认值按上下文推断：`adminStudent` / `guardian` / `student` → `curstudid`；`teacherStudent` → `gpv.studentid`；其余 → `none`。
- SQL 侧筛选仅允许数值列 + `~(gpv.x;num)`；字符串与日期筛选默认在客户端过滤，避免把用户输入直接拼进 SQL。需要复杂 SQL 时使用 `custom` 页或 raw 文件，并在 UI 中明确标记为高级。
- 导航只有 `navigation[]` 一个来源，页面不反向生成导航；UI 提供「添加到导航」动作来修改 `navigation[]`。

## 6. 文件生成规则

### 6.1 `api/plugin.xml` 与 `dbsetup/plugin.xml`

按 demo 的命名空间与结构生成：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plugin xmlns="http://plugin.powerschool.pearson.com"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        description="..." name="..." version="..."
        xsi:schemaLocation="http://plugin.powerschool.pearson.com plugin.xsd">
  <oauth accessLevelV1Api="READ"/>
  <access_request>
    <field table="STUDENTS" field="DCID" access="ViewOnly"/>
  </access_request>
  <publisher name="...">
    <contact email="..."/>
  </publisher>
</plugin>
```

- `plugin.oauth.enabled` 为真时生成 `<oauth>`；`accessLevelV1Api` 取
  `plugin.oauth.accessLevelV1Api`（默认 `READ`，可显式 `NONE`/`FULL`）。
- `accessRequest` 非空时生成 `<access_request>`，字段顺序与 spec 一致。
- **规则区分**：`/ws/v1` 由 `accessLevelV1Api` 控制；`/ws/schema` 与 PowerQuery 由
  `access_request` 控制。不要用 `access_request` 去“授权” v1（除 SSN/lunch 两个特例）。

- `api/plugin.xml` 使用 `plugin.name` / `plugin.description` / `plugin.version`。
- `dbsetup/plugin.xml` 使用 `plugin.dbName` / `plugin.dbDescription` / `plugin.dbVersion`。
- XML 转义 `& < > " '`。

### 6.2 `dbsetup/user_schema_root/*.xml`

按 `extensionName` 分组：

- 每个 extension 生成一个 `<psExtension>` 文件，文件名取 `schemaFile`，默认 `${extensionName}.xml`。
- 同一 extension 下的每个 `TableSpec` 生成一个 `<extendedTable type="...">`，字段按 `FieldSpec` 输出。
  - `type` 默认 `standalone`；demo 已验证该值。
  - `oneToOne` / `oneToMany` 取值需按目标实例的 `psextension.xsd` 验证，生成器原样输出。
- 多个 extension 的文件名不得重复。
- `String` 必须带 `length`；其他类型不带 `length`。
- 输出 `comment`（如有）。
- `childName` 默认等于 `tableName`。
- 不在 schema 中输出未经 demo 验证的属性（如字段默认值）；默认值属于表单配置。

### 6.3 `api/pagecataloging/*.json`

- 每个 `NavFileSpec` 生成一个 JSON 文件。
- `title` 使用英文；如存在中文，按 `中文 English` 拼接（与页面标题同一规则）。
- `version` 使用**每个条目自己的 `entry.version`**（必填）；`plugin.navVersion` 只作为新条目的默认值。
- **版本递增规则**：同一条目（按 `htmlID`）的标题/URL/排序/父级/上下文等发生变化时，
  新 `version` 必须大于上一次生成的 version；内容未变可以保持不变。校验需要上一版导航
  记录（`previousNavigation`）才能证明递增，缺失时只能校验“必填 + 格式”。
- `pageURL` 优先级：`pageURL` 显式值 > `pageId` 对应页面路径（自动加学校条件）> `null`。
- `pageURL` 必须以 `/admin` 开头；允许 `~[if#...]/admin/...[/if#...]` 条件包裹。
- `pageId` 自动生成的 URL：
  - student 上下文：`PATH?frn=~(studentfrn)`；`student` 页面路径同样位于 `guardian/`。
  - admin 页面：`PATH`；若配置了 `schoolIds`，包裹 `~[if#school.~(curschoolid)=ID1,ID2]...[/if#school]`。
- 子节点如未填写 `parentHTMLID`，生成时自动使用父节点的 `htmlID`。
- 条目未填写 `contextType` 时继承文件级 `contextType`；合法值为 `main` / `student` / `staff`。
- `districtLevelContext` 只接受 `0` / `1` / `2`；`requiredContext` 只接受 `student` / `staff`。
- `htmlID` 全插件唯一。
- `extra` 字段原样展开，保证导入回放。

### 6.4 CRUD 页面

统一使用原生 JS + PowerSchool jQuery，脚本放在 `api/web_root/scripts/<key>/`。

**上下文路径映射（硬规则）：**

| context | 输出根目录 | 页头/页脚 |
| --- | --- | --- |
| `admin` / `adminStudent` | `web_root/admin/` | `admin_header*` |
| `teacher` / `teacherStudent` | `web_root/teachers/` | `teachers_*` |
| `guardian` / `student` | `web_root/guardian/` | `guardian_*` |

- **本实例没有 `web_root/students/`**；`student` 上下文必须输出到 `guardian/`。
- `adminStudent` 页面仍在 `admin/` 下（管理员的学生上下文），不要与 `student` 混淆。
- 生成器 v1 只对 `spec.tables[]` 中的扩展表生成 list/edit/settings CRUD 页面；
  绑定核心表（`STUDENTS`、`SECTIONS` 等）时校验给 `PAGE_TABLE_CORE_UNSUPPORTED` 警告，
  生成会抛 `MissingTableSpecError`。核心表页面请用 `custom`/`raw` 页面。

**列表页（`kind: list`）**

- 页面骨架：`~[wc:commonscripts]`、`screen.css`/`print.css`，以及按上下文选择页头/页脚（可由 `chrome` 覆盖）：
  - `admin`：`~[wc:admin_header_css]` + `~[wc:admin_navigation_css]` + `~[wc:admin_footer_css]`。
  - `adminStudent`：`~[wc:admin_header_frame_css]` + `~[wc:admin_navigation_frame_css]` + `~[wc:admin_footer_frame_css]`（与 diagnosis 一致）。
  - `teacher` / `teacherStudent`：`~[wc:teachers_header_fr_css]` + `~[wc:teachers_footer_fr_css]`（与 epraise 教师页一致）。
  - `guardian` / `student`：`~[wc:guardian_header_yui]` + `~[wc:guardian_footer]`；按 demo 生成 `guardian_header_yui_limited` 的回退条件。
  - 现场没有独立的 `students/` 目录：学生门户与家长门户共用 `/guardian/`，`student` 上下文页面也输出到 `web_root/guardian/`。
- 面包屑、双语标题、`feedback` 区域。
- 工具栏：Add 按钮、可选 CSV 导出、筛选控件。
- 表格：由 `<page>.json` 异步加载，原生 JS 渲染 `<table class="grid">`；客户端排序、分页与文本筛选由生成的脚本实现，不依赖 AngularJS。
- Add/Edit 链接指向编辑页，携带 `id` 与学生上下文参数。
- 学生上下文页面自动加入 `frn=~(studentfrn)`。
- 列表页识别 `saved=1` / `deleted=1` 并显示提示。

**编辑页（`kind: edit`）**

- `~[DirectTable.Select:<table>;ID:~(gpv.<recordIdParam>;num)]`。
- 隐藏 `ac=prim`。
- 字段名使用 `[<table>]<column>`。
- 编辑时通过 `<page>.json` 载入现有值；新增时使用默认值。`<recordIdParam>=-1` 表示新增。
- 保存：POST 回列表页并带 `saved=1`。
- 删除：仅编辑模式显示；使用 `DD-<table>.ID:<id>` + `ac=prim` 的 DirectTable 删除表单，POST 回列表页并带 `deleted=1`。
- 学生上下文自动包含 `studentsdcid` 隐藏字段（值来自 `~[tlist_sql;select dcid from students where id = ~(curstudid);]`），并写入 `[<table>]studentsdcid`。

**设置页（`kind: settings`）**

- 单记录编辑；新增/首次配置使用 `ID=-1`，已有记录通过列表页或 URL 中的 id 进入编辑。
- 展示模式显示摘要与 Edit 入口；编辑模式使用 DirectTable 表单。
- 适合 `U_*_Settings` 这类单行配置表。

**仪表盘（`kind: dashboard`）**

- 生成 PS 页面骨架 + 标题 + 入口链接列表；链接自动取同一上下文下的非 raw 页面，按 `title` 排序。
- 如填写 `customBody`，追加在链接列表之后。
- v1 不生成图表；复杂仪表盘用 `custom` 或 raw 页面。

**自定义页（`kind: custom`）**

- 生成 PS 页面骨架，正文写入 `customBody`（原样 HTML）。
- 适合 demo 中 interviewnotes 的链接首页等。

**Raw 页（`kind: raw`）**

- 只是元数据，引用 `rawFiles[]` 中同路径的文件；生成时由 raw 管线原样复制，页面本身不重复输出。
- 导入的现有页面默认进入此类型。

**JSON / CSV 接口（`<page>.json`、`<page>.csv`）**

- 文件名与页面同名、同目录，扩展名为 `.json` / `.csv`。
- `list`：`SELECT` 配置列 + join + 学生范围 + SQL 筛选 + `orderBy`，输出 JSON 数组，末行 `{}` 哨兵。
- `edit`：按 `recordIdParam` 与学生范围查询单行。
- `settings`：查询设置记录。
- 字符串统一 `"~(col;json)"`；数字直接 `~(col)`；日期在 SQL 中 `to_char(...,'MM/DD/YYYY')`。
- SQL 筛选只允许数值列 + `~(gpv.x;num)`；文本/日期筛选由客户端完成。
- CSV 仅在 `csvExport: true` 时生成，使用 `tlist_sql` + 双引号转义。
- v1 不提供自由 SQL 编辑器；复杂查询通过 `custom` 页或 raw 文件实现。

### 6.5 Wildcards

生成函数按 `kind` 产出片段：

- `adminLink`：向 `#left_nav_functions` 或指定容器追加链接。
- `teacherNavLink`：向 `#nav-main ul` 追加教师导航。
- `teacherStudentPageOption`：向 `select[name="page"]` 追加学生页选项。
- `guardianLink`：向 `#nav-main ul` 追加家长导航。
- `raw`：原样输出。

条件包装：

- `schoolIds` → `~[if#school.~(curschoolid)=ID]...[/if#school]`。
- `guardianOnly` → `~[if#parent.isguardian]...[/if#parent.isguardian]`。
- `condition.raw` 原样包裹。

文件名完全由用户决定并原样输出（PowerSchool 依据文件名决定挂载位置）；UI 只提供常见模板建议，不自动改写文件名。导入时保留原始文件名。

`kind: "raw"` 的 wildcard 内容原样输出，不 trim、不补结尾换行。

家长/学生门户的导航不进入 `pagecataloging`，统一由 wildcard 负责。

### 6.6 MessageKeys

- 每个 `MessageKeyFileSpec` 生成 `api/MessageKeys/<filename>`；未指定时使用 `message-keysep.<locale>.properties`。
- 键值进行 properties 转义（`= : # !` 与换行）。
- 键名由用户完整填写，生成器不自动加前缀，只做转义与按键排序。

### 6.7 打包布局

- `api.zip`：`build/api/` 的内容位于 zip 根（`plugin.xml`、`pagecataloging/`、`MessageKeys/`、`web_root/`、`queries_root/`、`permissions_root/`）。
- `dbsetup.zip`：`build/dbsetup/` 的内容位于 zip 根（`plugin.xml`、`user_schema_root/`）。
- `combined.zip`：API 内容位于根，DB setup 位于 `dbsetup/` 子目录。这是默认产物；若现场要求 API/DB 分开安装，使用前两个 zip。
- 三个 zip 均由同一次生成产出，内容一致。
- 打包实现：`src/core/generate/zip.ts` 的 `buildZip(files, artifact)`：
  - `api` 去掉 `api/` 前缀；`dbsetup` 去掉 `dbsetup/` 前缀；`combined` 只去掉 `api/`。
  - 拒绝绝对路径、`..`、反斜杠、盘符；重复 entry 报错。
  - 使用 `fflate`，纯内存生成。

### 6.8 `api/queries_root/*.xml`

- 每个 `PowerQueryFileSpec` 生成一个 `queries_root/<filename>`。
- 每个 `PowerQuerySpec` 生成一个 `<query>`：
  - `name` 必须符合 `com.organization.product.area.name` 五段命名，且全局唯一。
  - `coreTable` / `flattened` / `dat` / `tags` 按 spec 输出。
  - `<summary>` / `<description>` 可选；`summary` ≤ 50 字符。
  - `<args>`：每个 `PowerQueryArgSpec` 输出 `<arg name column type required default casing description/>`。
  - `<columns>`：顺序必须与 SQL 返回列一致；`alias` 输出为元素文本，`column` 为属性。
  - `<sql>` 用 `<![CDATA[ ... ]]>` 包裹。
- 生成前必须通过 `access_request` 覆盖校验（见 §8）：查询的 select/join/where/order
  引用到的每个 `TABLE.COLUMN` 都要在 `accessRequest` 中。
- `dat: true` 时额外要求 `flattened: true` 且 `coreTable` 为 `Students` 或 `SchoolStaff`。

### 6.9 `api/permissions_root/*.xml`

- 每个 `PermissionMappingFileSpec` 生成一个 `permissions_root/<filename>`。
- `<permission name="{page}">` 下为每个资源生成：
  - `<implies allow="post">{path}</implies>`（有 allow）
  - `<implies>{path}</implies>`（无 allow，默认 GET）
- PowerQuery 资源（`/ws/schema/query/...`）必须 `allow="post"`；校验会报
  `PERMISSION_METHOD_MISSING`。
- 页面通过 `apiResources` 声明它调用的资源，校验会检查每个资源是否有对应映射
  （`PERMISSION_MAPPING_MISSING`）。
- 若生成内部页面调用 PowerQuery/Table API，缺少映射会在运行时 403。

### 6.10 Data Version 配置

- `data_change_configuration_root/*.change_listener_config.xml` 目前按 raw 文件处理。
- 后续可结构化，但校验至少应保证文件名安全、目录正确。

## 7. 导入现有插件

输入：一个包含 `api/` 与 `dbsetup/` 的插件目录（或 demo 结构）。v1 只支持目录，不支持直接导入 zip。

步骤：

1. 读取 `api/plugin.xml`、`dbsetup/plugin.xml`，提取名称、描述、版本、publisher；缺少 `dbsetup` 时 `tables=[]` 并给出警告。
2. 解析 `dbsetup/user_schema_root/*.xml` → `tables[]`。
3. 解析 `api/pagecataloging/*.json` → `navigation[]`；未知字段进入 `extra`。
4. 解析 `api/MessageKeys/*.properties` → `messageKeys[]`。
5. 解析 `api/web_root/wildcards/*.txt` → `wildcards[]`，默认 `kind: "raw"`，内容原样保存。
6. 其余 `api/web_root/**` 文件复制到 `files/`，登记为 `rawFiles[]`；已结构化的文件（`plugin.xml`、`pagecataloging/`、`MessageKeys/`、`wildcards/`）不进入 raw 集合。
7. HTML 页面额外登记为 `kind: "raw"` 页面，标题从 `<title>` 推断；无法推断时用文件名。raw 页面不参与生成输出，只引用同路径的 raw 文件。
8. 默认 `key` 由插件名 slug 化；冲突时追加 `-2`、`-3`。
9. 写入 `plugin.json`，生成一次 `build/` 验证可回放。

回放要求：

- 所有 raw 文件逐字节一致。
- 结构化文件允许格式规范化，但语义必须一致。
- 导入失败时清理临时工作区，不留半成品。

## 8. 校验规则

### 8.1 入口与选项

```ts
validateSpec(spec: unknown, options?: {
  previousNavigation?: NavEntrySpec[];  // 上一版导航，用于证明 version 递增
}): ValidationIssue[];
```

- 先过 **Zod schema**（`src/core/spec/schema.ts`）；结构不合法返回 `SPEC_INVALID`。
- 再跑规则引擎（`src/core/validate/index.ts`），返回 `ValidationIssue[]`。
- `previousNavigation` 缺失时，只能校验导航 `version` 的“必填 + 格式”，无法证明递增。

### 8.2 已实现规则

**Spec / 插件元数据**

| code | 级别 | 规则 |
| --- | --- | --- |
| `SPEC_INVALID` | error | Zod 结构校验失败 |
| `KEY_INVALID` | error | `key` 不符合 `^[a-z0-9][a-z0-9-]*$` |
| `PLUGIN_NAME_REQUIRED` / `PLUGIN_NAME_TOO_LONG` | error | 插件名必填 / ≤40 |
| `PUBLISHER_INVALID` | error | publisher 的 name 与 email 必填 |

**页面**

| code | 级别 | 规则 |
| --- | --- | --- |
| `PAGE_ID_REQUIRED` / `PAGE_DUPLICATE_ID` | error | 页面 id 必填 / 唯一 |
| `PAGE_PATH_REQUIRED` / `PAGE_PATH_UNSAFE` | error | 路径必填 / 相对路径且不含 `..` |
| `PAGE_DUPLICATE_PATH` | error | 页面路径唯一 |
| `PAGE_CONTEXT_INVALID` | error | context 必须是六种之一 |
| `PAGE_KIND_INVALID` | error | kind 必须是 list/edit/settings/dashboard/custom/raw |
| `PAGE_CONTEXT_PATH` | error | 页面必须位于上下文根目录 |
| `PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN` | error | `student` 页面不得放在 `students/`，必须放 `guardian/` |
| `PAGE_LIST_NO_COLUMNS` | error | list 至少一列 |
| `PAGE_EDIT_NO_FIELDS` / `PAGE_SETTINGS_NO_FIELDS` | error | edit/settings 至少一字段 |
| `PAGE_TABLE_REQUIRED` / `PAGE_TABLE_UNKNOWN` | error | list/edit/settings 必须绑定已知表 |
| `PAGE_TABLE_CORE_UNSUPPORTED` | warning | 绑定核心表（如 STUDENTS）；v1 生成器只对 `tables[]` 扩展表生成 CRUD 页，核心表请用 custom/raw |
| `PAGE_FIELD_UNKNOWN` | error | 列/字段必须存在于绑定的扩展表 |

上下文根目录：

```
admin / adminStudent   -> admin/
teacher / teacherStudent -> teachers/
guardian / student     -> guardian/   // 现场没有 students/
```

**导航**

| code | 级别 | 规则 |
| --- | --- | --- |
| `NAV_VERSION_REQUIRED` | error | `plugin.navVersion` 与每个 entry 的 `version` 必填 |
| `NAV_VERSION_INVALID` | error | `version` 必须是 1–4 段数字，如 `1.0.0.1` |
| `NAV_VERSION_NOT_INCREMENTED` | error | 内容变化时新 version 必须大于上一版 |
| `NAV_HTMLID_DUPLICATE` | error | htmlID 全插件唯一 |
| `NAV_PAGEID_UNKNOWN` | error | `pageId` 必须存在 |
| `NAV_PAGEURL_INVALID` | error | `pageURL` 以 `/admin` 开头，或为支持的条件包裹 |
| `NAV_CONTEXT_INVALID` | error | contextType ∈ `main/student/staff` |
| `NAV_REQUIRED_CONTEXT_INVALID` | error | requiredContext ∈ `student/staff` |
| `NAV_DISTRICT_LEVEL_INVALID` | error | districtLevelContext ∈ `0/1/2` |
| `NAV_FILENAME_INVALID` | error | 文件名安全、无路径分隔符、`.json` |
| `NAV_PARENT_UNKNOWN` | warning | parentHTMLID 不在 spec 中（可能是核心分类） |
| `NAV_TARGET_REQUIRED` | warning | entry 没有 pageId/pageURL/children |

**PowerQuery 与 access_request**

| code | 级别 | 规则 |
| --- | --- | --- |
| `PQ_FIELD_NOT_IN_ACCESS_REQUEST` | error | 查询引用的每个 `TABLE.COLUMN` 必须在 `accessRequest` 中 |
| `PQ_EXCLUDED_FIELD` | error | 查询引用 PowerSchool Exclude List 中的表/字段 |
| `ACCESS_FIELD_INVALID` | error | 表/字段标识符合法，access ∈ `ViewOnly/FullAccess` |
| `ACCESS_FIELD_DUPLICATE` | error/warning | 同一字段重复；访问级别冲突为 error，完全重复为 warning |
| `ACCESS_EXCLUDED_FIELD` | error | access_request 申请了排除表/字段 |

字段提取范围：

- `<columns column="...">` 的物理列
- `<args column="...">` 的物理列
- SQL 中的 `table.column` / `alias.column`，先解析 `FROM/JOIN` 别名，跳过 CTE 前缀
- 大小写不敏感

**Permission Mappings**

| code | 级别 | 规则 |
| --- | --- | --- |
| `PERMISSION_FILE_INVALID` / `PERMISSION_FILE_DUPLICATE` | error | 文件名安全、`.xml`、唯一 |
| `PERMISSION_PAGE_INVALID` | error | page 以 `/admin/`、`/teachers/`、`/guardian/` 或 `/student/` 开头 |
| `PERMISSION_PAGE_UNKNOWN` | warning | page 不在 spec 页面中，也不是已知门户首页 |
| `PERMISSION_RESOURCE_INVALID` | error | resource 以 `/ws/` 开头；allow ∈ get/post/put/delete |
| `PERMISSION_METHOD_MISSING` | error | PowerQuery 映射必须 `allow="post"`；页面的 PowerQuery 资源同样要求 |
| `PERMISSION_MAPPING_MISSING` | error | 页面 `apiResources` 中的每个资源都必须有对应 mapping |

**扩展表**

| code | 级别 | 规则 |
| --- | --- | --- |
| `TABLE_EXTENSION_INVALID` | error | extensionName 合法 |
| `TABLE_IDENTIFIER_INVALID` | error | 表名是合法 Oracle 标识符 |
| `TABLE_NAME_TOO_LONG` / `TABLE_NAME_LONG` | error/warning | >128 error；>30 warning |
| `TABLE_DUPLICATE_TABLE` | error | 表名唯一 |
| `TABLE_SCHEMA_FILE_INVALID` / `TABLE_SCHEMA_FILE_DUPLICATE` | error | schemaFile 安全、`.xml`、不同 extension 不共用 |
| `TABLE_FIELD_IDENTIFIER_INVALID` | error | 字段名合法 |
| `TABLE_FIELD_NAME_TOO_LONG` / `TABLE_FIELD_NAME_LONG` | error/warning | >128 error；>30 warning |
| `TABLE_DUPLICATE_FIELD` | error | 表内字段唯一 |
| `TABLE_STRING_LENGTH_REQUIRED` / `TABLE_STRING_LENGTH_INVALID` | error | String 的 length 必填且 1..4000 |

**MessageKeys / Wildcards / Raw**

| code | 级别 | 规则 |
| --- | --- | --- |
| `MESSAGE_KEY_FILENAME_INVALID` / `MESSAGE_KEY_DUPLICATE_FILE` | error | 文件名安全、`.properties`、唯一 |
| `MESSAGE_KEY_INVALID` / `MESSAGE_KEY_DUPLICATE_KEY` | error | key 必填、文件内唯一 |
| `WILDCARD_FILENAME_INVALID` | error | 文件名安全、无路径分隔符、`.txt` |
| `RAW_PATH_UNSAFE` / `RAW_PATH_DUPLICATE` | error | raw 路径相对、无 `..`、唯一 |
| `RAW_PATH_CONFLICT` | error | raw 不得与 generated 路径冲突 |
| `RAW_PAGE_MISSING_FILE` | error | `kind: raw` 页面必须在 `rawFiles[]` 中 |

### 8.3 关键实现说明

1. **导航版本递增**：用 `htmlID` 关联上一版；对 entry 的 `title/pageURL/sortOrder/
   parentHTMLID/districtLevelContext/contextType/requiredContext/isNewTab/isLandingPage/
   checkParams` 做稳定指纹（不含 `version` 与 `children`）。指纹变化且新 version 不大于旧
   version → `NAV_VERSION_NOT_INCREMENTED`。
2. **PowerQuery 字段提取**：SQL 解析是启发式的，不做完整 SQL 语法树。未知前缀（CTE/子查询别名）
   会被跳过，避免误报；已知 `FROM/JOIN` 表与 `table.column` 会被检查。实现见
   `src/core/validate/powerQueryParser.ts`。
3. **排除表**：内置 Exclude List 的精确表与前缀规则（`AU_*`、`AUD_*`、`BLOBS`、`PLUGIN*`、
   `ROLE*`、`QRTZ_*` 等）。`PCAS_ACCOUNT.USERNAME` 与 `PCAS_EMAILCONTACT.EMAILADDRESS` 例外。
4. **已知核心表**：页面可以绑定 `STUDENTS`、`SECTIONS`、`PSM_*` 等核心表；这些表不在
   `tables[]` 中，用硬编码 allowlist 放行，跳过字段存在性检查。

### 8.4 生成后校验（已实现）

`validateOutput(files, { zip? })`（`src/core/validate/output.ts`）：

| code | 级别 | 规则 |
| --- | --- | --- |
| `OUTPUT_XML_INVALID` | error | 生成的 XML 无法通过 XMLValidator |
| `OUTPUT_PLUGIN_XML_MISSING` | error | `plugin.xml` 不含 `<plugin>` 根 |
| `OUTPUT_JSON_INVALID` | error | 非 PS-HTML 的 JSON 无法解析 |
| `OUTPUT_PAGECATALOG_INVALID` | error | pagecataloging JSON 没有 `pages` 数组 |
| `OUTPUT_TAG_UNBALANCED` | error | `~[if#...]`/`[/if#...]`、`~[if]`/`[/if]`、`~[tlist_sql;]`/`[/tlist_sql]` 不配对 |
| `OUTPUT_ZIP_INVALID` | error | zip 无法解压 |
| `OUTPUT_ZIP_UNSAFE_PATH` | error | zip entry 是绝对路径或含 `..` |

- PS-HTML 页面 JSON 端点（含 `~[tlist_sql`/`~[if`/`~(`）跳过 JSON.parse，避免误报。
- 只检查 generated `.html` 的标签配对；raw 页面不检查。

### 8.5 尚未实现（后续）

- SQL 侧筛选仅允许数值列 + `~(gpv.x;num)` 的生成器检查。
- 插件 `version` 的 semver 格式校验。
- zip 内容与 spec 文件数/哈希的一致性核对。
- 导入 `src/core/import/*`。

### 8.6 错误格式

```ts
type ValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;          // spec 路径或产出文件路径
  target?: {
    type: "spec" | "plugin" | "table" | "page" | "navigation"
        | "powerQuery" | "accessRequest" | "permissionMapping"
        | "wildcard" | "messageKey" | "raw" | "generatedFile" | "zip";
    id?: string;
  };
};
```

## 9. 本地服务 API

- Fastify，只监听 `127.0.0.1`，默认端口 `5174`。
- 所有路径限制在 `workspaces/` 内；拒绝 `..`、绝对路径与符号链接逃逸。
- JSON 请求体上限 2MB；导入单文件上限 10MB、总量 50MB。

**当前已实现：**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/validate` | body `{ spec, previousNavigation? }`，返回 `{ issues, errors, warnings }` |
| GET | `/` | 若存在 `dist/web`，由 `@fastify/static` 提供 Web UI |

**规划中的工程 API（待实现）：**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/projects` | 工程列表 |
| POST | `/api/projects` | 新建 `{ key, name }` |
| POST | `/api/projects/import` | 导入 `{ sourcePath, key? }` |
| GET | `/api/projects/:key` | 读取 spec |
| PUT | `/api/projects/:key` | 保存 spec（只做 schema 校验，允许草稿；业务校验单独返回） |
| DELETE | `/api/projects/:key` | 删除工程（UI 二次确认） |
| POST | `/api/projects/:key/validate` | 静态校验 |
| POST | `/api/projects/:key/preview` | 返回文件树与文本内容 |
| POST | `/api/projects/:key/generate` | 生成 `{ zip: boolean }` |
| GET | `/api/projects/:key/download/:artifact` | `api` / `dbsetup` / `combined` |
| GET | `/api/projects/:key/raw/*` | 读取 raw 文件 |
| PUT | `/api/projects/:key/raw/*` | 写入 raw 文件 |

错误统一：

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [] } }
```

## 10. CLI

**当前已实现**（`src/cli/index.ts`，通过 `npm run cli -- ...` 调用）：

```bash
npm run cli -- validate <spec.json> [--previous previous-nav.json] [--json]
npm run cli -- generate <spec.json> [--out build] [--zip]
```

- `validate`：读取 spec，跑 `validateSpec`；有 error 退出码 1。
- `generate`：先跑 spec 校验与 `validateOutput`，无 error 才写文件；`--zip` 生成
  `api.zip` / `dbsetup.zip` / `combined.zip`。
- raw 文件按 spec 路径相对 spec 文件所在目录读取。
- 输出路径限制在 `--out` 内，拒绝 `..`/绝对路径逃逸。

**规划中的命令（待工程工作区实现）：**

```bash
psplugin init <key> [--name <name>] [--dir workspaces]
psplugin import <plugin-dir> [--key <key>] [--dir workspaces]
psplugin list [--dir workspaces]
psplugin serve [--port 5174] [--dir workspaces]
```

- 成功退出码 0；校验/生成失败退出码 1，错误写 stderr。
- `--json` 用于脚本消费。
- CLI 与 Web UI 调用同一 `core`，不复制逻辑。

## 11. Web UI

**当前已实现（校验结果展示）：**

- 单页应用（React 19 + Vite 6），路由只有 `/`。
- 功能：
  - 粘贴或打开 `plugin.json`；
  - 点击「运行校验」调用 `POST /api/validate`；
  - 展示 errors/warnings 汇总、按 code/message/path 过滤、逐条 severity/code/path。
- 开发：`npm run dev:server`（5174）+ `npm run dev:web`（5173，代理 `/api`）。
- 生产：`npm run build:web` 后 `npm start`，由 Fastify 托管 `dist/web`。
- 组件测试：`src/web/App.test.tsx`（jsdom + Testing Library，mock fetch）。

**规划中的路由（待工程工作区实现）：**

- `/`：工程列表、新建、导入。
- `/projects/:key/overview`：插件信息、发布者、版本。
- `/projects/:key/tables`：表与字段编辑器。
- `/projects/:key/pages`：页面列表与编辑器。
- `/projects/:key/navigation`：导航文件与树。
- `/projects/:key/wildcards`：wildcard 编辑器。
- `/projects/:key/message-keys`：MessageKeys。
- `/projects/:key/files`：raw 文件树与编辑器（文本 + 图片预览）。
- `/projects/:key/validate`：校验结果。
- `/projects/:key/build`：生成、文件树预览、下载。

交互约定：

- spec 修改后 800ms 防抖自动保存；顶部显示保存状态。
- 页面编辑器分「配置 / 代码预览」两栏；预览与生成共用核心。
- 表单字段、列表列、筛选器使用可增删的表格编辑器。
- 中英文标签并排编辑。
- 校验错误可点击跳转到对应表/页面/字段。
- 导入对话框：输入路径 → 扫描摘要（名称/版本/表数/页面数）→ 确认。

状态管理：Zustand；表单直接用受控组件 + Zod 校验，不引入重量级表单库。

## 12. 代码结构

```
src/
  core/
    index.ts               # 对外导出
    test-helpers.ts        # 测试 spec 构造
    spec/
      schema.ts            # Zod spec schema
      types.ts             # PluginSpec 等类型
      defaults.ts          # 待实现
    validate/
      index.ts             # validateSpec + 规则
      powerQueryParser.ts  # PowerQuery 字段提取
      output.ts            # 生成后校验
      *.test.ts            # 校验与输出测试
      rules/               # 后续按领域拆分
    generate/
      plan.ts              # GeneratedFile[] 计划
      pluginXml.ts         # api/dbsetup plugin.xml
      dbSchema.ts          # user_schema_root/*.xml
      navigation.ts        # pagecataloging/*.json
      powerQueries.ts      # queries_root/*.xml
      permissions.ts       # permissions_root/*.xml
      messageKeys.ts       # MessageKeys/*.properties
      pages.ts             # 页面 + JSON 端点 + JS
      wildcards.ts         # wildcards/*.txt
      zip.ts               # api/dbsetup/combined
    import/                # 待实现
    templates/
    fs/
  server/
    index.ts               # Fastify /api/validate + 静态 UI
    server.test.ts
  cli/
    index.ts               # psplugin validate / generate
    validate.ts
    validate.test.ts
  web/
    main.tsx
    App.tsx
    sample.ts
    styles.css
    App.test.tsx
  shared/
    types.ts
  test/
    fixtures/
    helpers.ts
```

当前已实现：**spec schema + 校验 + 生成 + 输出校验 + CLI + Web UI 校验结果展示**。
`import/`、工程工作区、表单编辑器、生成预览仍待实现。
校验规则暂时集中在 `validate/index.ts`，后续再按 `rules/pages.ts`、`rules/navigation.ts`、
`rules/powerQueries.ts`、`rules/permissions.ts` 拆分，行为保持不变。

测试文件与被测代码同目录（`*.test.ts` / `*.test.tsx`），保证应用代码、测试与夹具都位于 `src/` 下。

根目录放置必要配置：`package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`、`vitest.config.ts`、`README.md`。应用代码全部位于 `src/`。

## 13. 技术栈与脚本

依赖：

- 运行时：React、React DOM、Fastify、@fastify/static、Zod、fast-xml-parser、fflate、Commander。
- 开发：TypeScript、Vite、@vitejs/plugin-react、Vitest、jsdom、@testing-library/react、
  @testing-library/jest-dom、tsx。
- **当前已安装**：`react`、`react-dom`、`fastify`、`@fastify/static`、`zod`、
  `fast-xml-parser`、`fflate`、`commander`、`typescript`、`vite`、`@vitejs/plugin-react`、
  `vitest`、`jsdom`、`@testing-library/react`、`@testing-library/jest-dom`、`tsx`。
  `Zustand`、`tsup`、`concurrently` 尚未安装（工程工作区/打包脚本后续补）。

脚本（当前 `package.json` 已有 `test` / `test:watch` / `typecheck` / `cli` /
`dev:server` / `dev:web` / `build:web` / `start`；以下为完整目标）：

```json
{
  "dev": "concurrently -k \"tsx watch src/server/index.ts\" \"vite\"",
  "build": "vite build && tsup",
  "start": "node dist/server.js",
  "cli": "tsx src/cli/index.ts",
  "test": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

- `tsup.config.ts` 使用具名 entry：`{ server: "src/server/index.ts", cli: "src/cli/index.ts" }`，输出 `dist/server.js` 与 `dist/cli.js`，避免同名 `index.ts` 冲突。
- Vite `build.outDir` 设为 `dist/web`，避免与服务端产物混在一起；服务端生产模式静态托管 `dist/web`。
- `cli.js` 加 shebang，`package.json` 配置 `"type": "module"` 与 `"bin": { "psplugin": "./dist/cli.js" }`。
- 开发时 Vite 端口 `5173`，服务端 `5174`，`/api` 由 Vite 代理到 `http://127.0.0.1:5174`。

## 14. 测试策略

**已实现（110 个测试，23 个测试文件）：**

校验层（64）：

- `validate.test.ts`：`student` 上下文路径规则（禁止 `students/`，允许 `guardian/`）。
- `navigation.test.ts`：导航 version 必填/格式/递增（含 `previousNavigation`）。
- `navigation-structure.test.ts`：htmlID 唯一、pageId、pageURL、contextType、requiredContext、
  districtLevelContext、parentHTMLID、文件名安全。
- `pages.test.ts`：id/路径唯一、上下文根目录、list 列、edit 字段、表/字段存在性、路径安全、
  非法 context/kind。
- `powerqueries.test.ts`：PowerQuery 字段覆盖 `access_request`、SQL 别名解析、arg 列、大小写、
  exclude list、access 级别与重复。
- `permissions.test.ts`：permission mapping 文件名/页面/资源/方法，以及页面 `apiResources`
  覆盖检查。
- `tables.test.ts`：标识符、String 长度、重复表/字段、schemaFile、30/128 字符限制。
- `package.test.ts`：key、插件名、publisher、MessageKeys、wildcards、raw 路径/冲突/引用。
- `schema.test.ts`：非对象/缺字段 spec → `SPEC_INVALID`。

生成层（35）：

- `pluginXml.test.ts`（3）：API/DB manifest、oauth、access_request、转义。
- `dbSchema.test.ts`（3）：extension 分组、字段/长度、type/comment。
- `navigation.test.ts`（4）：标题、pageId URL、student frn、schoolIds、children。
- `powerQueries.test.ts`（2）：query/args/columns/CDATA、dat。
- `permissions.test.ts`（2）：allow、无 allow。
- `messageKeys.test.ts`（2）：排序/转义、默认文件名。
- `wildcards.test.ts`（3）：链接、条件、raw 原样。
- `pages.test.ts`（5）：list/edit/custom/dashboard/raw。
- `plan.test.ts`（3）：路径布局、raw 字节、确定性排序。
- `zip.test.ts`（4）：api/dbsetup/combined、不安全路径。

输出 / CLI / 服务端 / UI（11）：

- `output.test.ts`（6）：XML/JSON 重解析、标签配对、zip 安全。
- `cli/validate.test.ts`（2）：读取 spec、格式化。
- `server/server.test.ts`（2）：`POST /api/validate`、缺 spec 400。
- `web/App.test.tsx`（1）：渲染校验结果。

运行：

```bash
npm test
npm run typecheck
npm run build:web
```

**后续：**

- 导入集成测试：对三个 demo 分别导入，断言表/导航/MessageKeys 解析结果；重新生成后 raw 文件逐字节一致。
- 生成集成测试：覆盖 list/edit/settings/dashboard/custom/raw 与全部六种上下文的完整插件。
- 工程工作区服务端测试（CRUD、预览、生成、路径逃逸）。
- 真实 PowerSchool 安装验证不在 v1 范围内。

## 15. 安全与可靠性

- 服务只绑定 `127.0.0.1`；不执行 shell；不存储凭证。
- 所有文件操作经 `safePath` 归一化并限制根目录；不跟随符号链接。
- 导入只读取已知插件结构；忽略未知超大文件并报告。
- 生成原子化：临时目录 → 校验 → 替换；失败清理。
- zip 不包含绝对路径、`..` 或空目录条目。

## 16. 交付物

- **已完成**：
  - `src/core/spec/*`：Zod schema + 类型。
  - `src/core/validate/*`：spec 校验（63 个测试）+ 生成后校验。
  - `src/core/generate/*`：plugin.xml、schema XML、pagecataloging、PowerQuery、
    permission mappings、MessageKeys、页面/JSON/JS、wildcards、plan、zip（31 个测试）。
  - `src/cli/*`：`validate` / `generate`。
  - `src/server/*`：Fastify `/api/validate` + 静态 UI。
  - `src/web/*`：React + Vite 校验结果页面（含组件测试）。
- 根目录配置与脚本：`package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`、
  `vitest.config.ts`、`README.md`。
- `npm test`（110）、`npm run typecheck`、`npm run build:web` 全部通过。
- **待实现**：`src/core/import/*`、工程工作区服务端 API、表单编辑器/文件树/生成预览、
  示例 fixture 插件。

## 17. 验收标准

当前状态：

1. ⏳ `npm run dev` 一键启动工作台（当前用 `dev:server` + `dev:web` 两个命令；工程工作区未实现）。
2. ✅ 含表、列表页、编辑页、导航的 spec 可生成目录与 zip；文件结构符合本文约定。
3. ⏳ 导入三个 demo 插件（`import/` 未实现）。
4. ⏳ 修改 spec 后重新生成、保留 raw（plan 已支持 raw 复制；导入未实现）。
5. ✅ 校验能捕获非法表名、重复页面路径、缺失导航引用、raw 冲突。
6. ✅ 校验能捕获 `student` 页面放在 `students/`、导航 version 未递增、PowerQuery 字段未出现在
   `access_request`；`npm test` 覆盖这三类规则。
7. ⏳ CLI `init / import` 未实现；`validate / generate` 已可用，与 UI 共用 `core`。
8. ✅ 单元、服务端、UI 测试全部通过（110 个）。
9. ✅ 生成后校验：XML/JSON 重解析、PS-HTML 标签配对、zip 路径安全。
10. ✅ Web UI 可展示校验结果（汇总、过滤、逐条 severity/code/path/message）。
