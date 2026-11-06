# PowerSchool 插件工作台 — 设计文档

- 日期：2026-11-06
- 状态：已确认，待实现
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
  web_root/
    admin/... | teachers/... | guardian/... | students/...
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
  };
  tables: TableSpec[];
  pages: PageSpec[];
  navigation: NavFileSpec[];
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
  path: string;                       // web_root 相对路径，如 admin/students/foo_list.html
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
  contextType: "main" | "student" | "district";
  districtLevelContext?: 0 | 1 | 2;
  entries: NavEntrySpec[];
};

type NavEntrySpec = {
  htmlID: string;
  title: LocalizedText;
  sortOrder: number;
  pageId?: string;                    // 引用 pages[].id
  pageURL?: string | null;            // 或直接给 URL / PS 条件表达式
  schoolIds?: number[];               // 生成 curschoolid 条件包裹
  contextType?: "main" | "student" | "district";
  requiredContext?: string;
  districtLevelContext?: 0 | 1 | 2;
  parentHTMLID?: string;
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
  <publisher name="...">
    <contact email="..."/>
  </publisher>
</plugin>
```

- `api/plugin.xml` 使用 `plugin.name` / `plugin.description` / `plugin.version`。
- `dbsetup/plugin.xml` 使用 `plugin.dbName` / `plugin.dbDescription` / `plugin.dbVersion`。
- XML 转义 `& < > " '`。

### 6.2 `dbsetup/user_schema_root/*.xml`

按 `extensionName` 分组：

- 每个 extension 生成一个 `<psExtension>` 文件，文件名取 `schemaFile`，默认 `${extensionName}.xml`。
- 同一 extension 下的每个 `TableSpec` 生成一个 `<extendedTable type="standalone">`，字段按 `FieldSpec` 输出。
- 多个 extension 的文件名不得重复。
- `String` 必须带 `length`；其他类型不带 `length`。
- 输出 `comment`（如有）。
- `childName` 默认等于 `tableName`。
- 不在 schema 中输出未经 demo 验证的属性（如字段默认值）；默认值属于表单配置。

### 6.3 `api/pagecataloging/*.json`

- 每个 `NavFileSpec` 生成一个 JSON 文件。
- `title` 使用英文；如存在中文，按 `中文 English` 拼接（与页面标题同一规则）。
- `version` 使用 `plugin.navVersion`。
- `pageURL` 优先级：`pageURL` 显式值 > `pageId` 对应页面路径（自动加学校条件）> `null`。
- `pageId` 自动生成的 URL：
  - student 上下文：`PATH?frn=~(studentfrn)`。
  - admin 页面：`PATH`；若配置了 `schoolIds`，包裹 `~[if#school.~(curschoolid)=ID1,ID2]...[/if#school]`。
- 子节点如未填写 `parentHTMLID`，生成时自动使用父节点的 `htmlID`。
- 条目未填写 `contextType` 时继承文件级 `contextType`。
- `extra` 字段原样展开，保证导入回放。

### 6.4 CRUD 页面

统一使用原生 JS + PowerSchool jQuery，脚本放在 `api/web_root/scripts/<key>/`。

**列表页（`kind: list`）**

- 页面骨架：`~[wc:commonscripts]`、`screen.css`/`print.css`，以及按上下文选择页头/页脚（可由 `chrome` 覆盖）：
  - `admin`：`~[wc:admin_header_css]` + `~[wc:admin_navigation_css]` + `~[wc:admin_footer_css]`。
  - `adminStudent`：`~[wc:admin_header_frame_css]` + `~[wc:admin_navigation_frame_css]` + `~[wc:admin_footer_frame_css]`（与 diagnosis 一致）。
  - `teacher` / `teacherStudent`：`~[wc:teachers_header_fr_css]` + `~[wc:teachers_footer_fr_css]`（与 epraise 教师页一致）。
  - `guardian`：`~[wc:guardian_header_yui]` + `~[wc:guardian_footer]`；按 demo 生成 `guardian_header_yui_limited` 的回退条件。
  - `student`：demo 未提供学生门户样板，默认只输出 `~[wc:commonscripts]` 并产生一条警告，要求通过 `chrome` 提供实际页头/页脚标签。
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

- `api.zip`：`build/api/` 的内容位于 zip 根（`plugin.xml`、`pagecataloging/`、`MessageKeys/`、`web_root/`）。
- `dbsetup.zip`：`build/dbsetup/` 的内容位于 zip 根（`plugin.xml`、`user_schema_root/`）。
- `combined.zip`：API 内容位于根，DB setup 位于 `dbsetup/` 子目录。这是默认产物；若现场要求 API/DB 分开安装，使用前两个 zip。
- 三个 zip 均由同一次生成产出，内容一致。

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

生成前：

- spec 通过 Zod schema。
- `key` 安全（`^[a-z0-9][a-z0-9-]*$`），工程不重复。
- 表名/字段名符合 Oracle 标识符（`^[A-Za-z][A-Za-z0-9_]*$`）；超过 128 字符为错误，超过 30 字符为警告（PowerSchool 传统约定）；表名建议 `U_` 前缀（警告）。
- `extensionName` 可重复（用于同组多表），但同一 extension 的 `schemaFile` 必须一致；不同 extension 的 `schemaFile` 不得重复。
- 同一 schema 内表名唯一；表内字段名唯一。
- MessageKeys 文件名唯一；同一文件内键唯一。
- `String.length` 必填且 1..4000。
- 页面 `id` 唯一；页面路径唯一、合法，且位于上下文对应根目录：
  - admin / adminStudent → `admin/`
  - teacher / teacherStudent → `teachers/`
  - guardian → `guardian/`
  - student → `students/`
- list/edit/settings 必须绑定存在的表；list 至少一列；edit 至少一字段；字段引用存在的列。
- 导航 `htmlID` 全局唯一；`pageId` 必须存在；父子引用闭环；wildcard 文件名安全。
- `kind: "raw"` 的页面路径必须出现在 `rawFiles[]` 中。
- generated 与 raw 路径不得冲突。
- raw 引用文件必须存在；`schemaFile` / MessageKeys 文件名不得包含路径分隔符。

生成后：

- 重新解析生成的 `plugin.xml`、schema XML 与 `pagecataloging` JSON；不解析含 `tlist_sql` 的 `.json` 端点。
- 对 generated 页面检查 `~[if#...]` 与 `[/if#...]`、`~[tlist_sql;...]` 与 `[/tlist_sql]` 配对；raw 页面不做此检查，避免误报。
- 检查 zip 可读、文件数一致、无绝对路径或 `..`。

错误格式：

```ts
type ValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;          // spec 路径或产出文件路径
  target?: { type: "table" | "page" | "navigation" | "wildcard" | "messageKey"; id?: string };
};
```

## 9. 本地服务 API

- Fastify，只监听 `127.0.0.1`，默认端口 `5174`。
- 所有路径限制在 `workspaces/` 内；拒绝 `..`、绝对路径与符号链接逃逸。
- JSON 请求体上限 2MB；导入单文件上限 10MB、总量 50MB。

端点：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
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

命令名 `psplugin`：

```bash
psplugin init <key> [--name <name>] [--dir workspaces]
psplugin import <plugin-dir> [--key <key>] [--dir workspaces]
psplugin list [--dir workspaces]
psplugin validate <key> [--dir workspaces]
psplugin generate <key> [--dir workspaces] [--out <dir>] [--zip]
psplugin serve [--port 5174] [--dir workspaces]
```

- 成功退出码 0；校验/生成失败退出码 1，错误写 stderr。
- `--json` 可选，用于脚本消费。
- CLI 与 Web UI 调用同一 `core`，不复制逻辑。

## 11. Web UI

中文界面，路由：

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
    spec/schema.ts
    spec/defaults.ts
    generate/plan.ts
    generate/pluginXml.ts
    generate/dbSchema.ts
    generate/navigation.ts
    generate/messageKeys.ts
    generate/pages/list.ts
    generate/pages/edit.ts
    generate/pages/settings.ts
    generate/pages/dashboard.ts
    generate/pages/custom.ts
    generate/pages/jsonEndpoints.ts
    generate/wildcards.ts
    generate/raw.ts
    generate/zip.ts
    validate/index.ts
    validate/rules/*.ts
    import/index.ts
    templates/*.ts
    fs/workspace.ts
    fs/safePath.ts
  server/
    index.ts
    routes/projects.ts
    routes/rawFiles.ts
    store/projectStore.ts
  cli/
    index.ts
  web/
    main.tsx
    App.tsx
    api/client.ts
    stores/projectStore.ts
    sections/*.tsx
    components/*.tsx
  shared/
    types.ts
  test/
    fixtures/            # 测试夹具（demo 解析结果、示例 spec）
    helpers.ts
```

测试文件与被测代码同目录（`*.test.ts` / `*.test.tsx`），保证应用代码、测试与夹具都位于 `src/` 下。

根目录放置必要配置：`package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`、`vitest.config.ts`、`README.md`。应用代码全部位于 `src/`。

## 13. 技术栈与脚本

依赖：

- 运行时：React、React DOM、Fastify、Zod、fast-xml-parser、fflate、Zustand、Commander。
- 开发：TypeScript、Vite、@vitejs/plugin-react、Vitest、jsdom、@testing-library/react、@testing-library/jest-dom、tsx、tsup、concurrently。

脚本：

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

- 单元测试：每个 emitter 的快照测试 + 关键断言（DirectTable、`tlist_sql`、JSON 哨兵、条件包装）。
- 校验测试：非法标识符、重复路径、缺失引用、raw 冲突、长度越界。
- 导入集成测试：对三个 demo 分别导入，断言表/导航/MessageKeys 解析结果；重新生成后 raw 文件逐字节一致。
- 生成集成测试：构造包含 list/edit/settings/dashboard/custom/raw 与全部六种上下文的 spec，生成完整插件并通过输出校验。
- 服务端测试：Fastify `inject` + 临时工作区，覆盖 CRUD、预览、生成、路径逃逸。
- UI 冒烟测试：关键编辑器渲染与保存调用（Testing Library）。
- `demo/` 当前被 `.gitignore` 忽略，因此测试夹具使用 `src/test/fixtures` 下的最小副本；本地存在 `demo/` 时额外跑三个 demo 的全量导入测试，缺失则跳过。
- 不引入 Playwright；真实 PowerSchool 安装验证不在 v1 范围内。

## 15. 安全与可靠性

- 服务只绑定 `127.0.0.1`；不执行 shell；不存储凭证。
- 所有文件操作经 `safePath` 归一化并限制根目录；不跟随符号链接。
- 导入只读取已知插件结构；忽略未知超大文件并报告。
- 生成原子化：临时目录 → 校验 → 替换；失败清理。
- zip 不包含绝对路径、`..` 或空目录条目。

## 16. 交付物

- `src/` 下完整的 core / server / cli / web 实现。
- 根目录配置与脚本。
- 中文 README：安装、启动、建插件、导入、校验、生成、命令行用法。
- 至少一个由 fixture spec 生成的示例插件，覆盖管理员列表/编辑、管理员学生上下文、教师页、家长只读页；学生门户以 `chrome` 配置展示实验性支持。
- `npm test`、`npm run typecheck`、`npm run build` 全部通过。

## 17. 验收标准

1. `npm run dev` 启动工作台，可新建工程并编辑 spec。
2. 新建一个含 1 张表、列表页、编辑页、导航的插件，生成目录与 zip，文件结构符合本文约定。
3. 导入三个 demo 插件成功，raw 文件字节级回放一致。
4. 修改 spec 后重新生成，不丢失 raw 文件。
5. 校验能捕获非法表名、重复页面路径、缺失导航引用、raw 冲突。
6. CLI `init / import / validate / generate` 可用，与 UI 产物一致。
7. 单元、集成、服务端测试全部通过。
