# PowerSchool 插件平台 · UI 原型设计 spec（三方向共同输入）

## 项目是什么

一个本地运行的 PowerSchool 定制化插件创建平台。实施顾问/开发人员通过表单配置插件元数据、扩展表、页面、导航，校验后生成可安装的 zip。当前产品是功能可用的表格界面；本设计任务是为下一版产品形态提供重设计方向。

## 目标受众与使用场景

- 主要用户：学区/学校的实施顾问、插件开发者、技术支持。
- 使用场景：桌面浏览器，1440×900；一次连续工作中完成「选工程 → 配表 → 配页面 → 配导航 → 校验 → 生成下载」。
- 用户期待：可信、精确、有教育数据产品的专业感；不是消费级营销页，也不是玩具化的低代码工具。

## 核心信息与内容

设计必须使用同一套真实内容（禁止 Lorem / 占位数字）：

- 工程：`Student Support Notes`（key `support-notes`），发布者 `District Implementation Team`，版本 `1.2.0`，DB 版本 `1.2.0`，导航版本 `1.2.0.3`。
- 扩展表：`U_Support_Notes`，字段：`id` Integer、`studentdcid` Integer、`note_date` Date、`category` String(50)、`note_text` String(2000)、`follow_up_required` Integer。
- 页面：`support-list`（admin，list，`admin/support/list.html`）、`support-edit`（admin，edit）、`support-settings`（admin，settings）。
- 列表列：Student DCID、Date、Category、Follow-up。
- 导航文件：`support_schoolNav.json`，条目 `Student Support`，pageId `support-list`，版本 `1.2.0.3`。
- 构建结果：12 个生成文件，3 个产物 `combined.zip` / `api.zip` / `dbsetup.zip`；校验 0 error、2 warning。
- 工程列表另有两个真实感工程：`Attendance Follow-up`（昨天更新）、`Enrollment Checklist`（3 天前更新）。

## 必须包含的 6 个视图（同一 HTML 内可切换）

1. **Projects**：工程列表 + “新建工程”入口（可打开一个创建弹窗）。
2. **Overview**：插件信息表单 / 摘要（版本、发布者、表/页/导航计数）。
3. **Tables**：表列表 + `U_Support_Notes` 详情 + 字段行编辑。
4. **Pages**：页面列表 + `support-list` 详情（列编辑器、筛选器、上下文提示）。
5. **Navigation**：导航文件 + 条目详情（版本 `1.2.0.3`，pageId，排序）。
6. **Build**：校验摘要（0 error / 2 warning）+ 生成结果 + 三个下载产物。

## 交互要求

- 左侧/顶部导航可在 6 个视图间切换；当前项有明确选中态。
- 新建工程可打开/关闭弹窗。
- Build 页点击「生成」后出现成功状态与下载块（无需真实下载）。
- 至少一个校验 warning 可展开查看。
- 所有按钮有 hover/focus 状态；不要求真实后端。

## 输出格式与尺寸

- 单文件 HTML（内联 CSS/JS），双击可开；1440×900 桌面视口优先，宽度 1280 以上不破版。
- 截图：1440×900，PNG。
- 不允许依赖外部图片；图标用内联 SVG 线条图标（≤20px，stroke 1.5）。字体可用 Google Fonts，但必须有系统字体兜底。
- 不使用 emoji 作为图标；不使用紫渐变/圆角卡片+左侧色条等 AI slop 组合；正文 ≥14px，标签/注释 ≥12px，正文对比度 ≥4.5:1。

## 情感基调

可信、精确、克制、专业；像教育数据团队每天会用的工作台，而不是 demo 页。允许有作者性的排版和细节，但每个元素都要为任务服务。

## 视觉母题假设

插件本质是一份 manifest：**元数据 → 数据表 → 页面 → 导航 → 构建产物**。设计应让这条“manifest 脊线 / 构建流水线”在 6 个视图里持续存在（可以是步骤轨、文档目录、属性栏、或信号流），而不是六个互不相关的表单页。

## 三方向必须结构性不同

- 导航骨架、页头结构、内容区布局至少一项结构性不同；不允许同一骨架只换色/换字体。
- 三版使用完全相同的内容与视图集合，便于横向对比。
