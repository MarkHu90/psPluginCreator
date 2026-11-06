# PowerSchool 插件平台 · UI 重设计

## 选定方向

**07 暖纸版**：05 的结构、字体与 teal→amber 信号系统 + Direction C 的暖纸表面。

- 交互原型：[`design-demos/07-warm-paper.html`](design-demos/07-warm-paper.html)
- 设计 spec：[`design-spec.md`](design-spec.md)
- 决策记录：[`direction-approved.md`](direction-approved.md)

## 截图

- [Projects](shots/07-warm-projects.png)
- [Overview](shots/07-warm-overview.png)
- [Tables](shots/07-warm-tables.png)
- [Pages](shots/07-warm-pages.png)
- [Navigation](shots/07-warm-navigation.png)
- [Build](shots/07-warm-build.png)
- [1280×800 适配](shots/07-warm-1280.png)

## 使用

双击 `07-warm-paper.html` 即可打开。视图通过 hash 切换：

```
#projects  #overview  #tables  #pages  #navigation  #build  #empty
```

## 已知限制

- 数据为原型 fixture；下载与部分次要动作是 toast 模拟，不产生真实文件。
- 只有 `Student Support Notes` 有完整 manifest 内容；其他工程用于列表上下文。
- 1280×800 下 Overview / Pages / Navigation / Build 会纵向滚动；Tables 不滚。
- 字体从 Google Fonts 加载，已声明系统字体兜底。
- 早期方向稿（01–05 及 07 的旧版）已按用户要求删除，仅保留最终选定版本。
