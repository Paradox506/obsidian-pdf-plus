# Obsidian PDF++ 项目阅读笔记（完整概览）

## 1. 项目定位

`obsidian-pdf-plus` 是一个 Obsidian 社区插件，核心目标是增强原生 PDF 阅读与标注体验，而不是替代原生 PDF 视图。

- 通过把 Markdown 中指向 PDF 文本选区的链接反向映射为高亮，实现“用链接做标注”。
- 支持将部分标注直接写回 PDF 文件（存在限制）。
- 覆盖 PDF 查看、链接复制、右键菜单、反链可视化、提纲/缩略图交互等大量体验增强。

## 2. 技术栈与工程形态

- 语言与构建：TypeScript + esbuild。
- 运行环境：Obsidian 插件 API。
- 静态检查：TypeScript 类型检查（`tsc -noEmit -skipLibCheck`）与 ESLint。
- 关键依赖：`pdfjs-dist`、`@cantoo/pdf-lib`、`monkey-around` 等。

## 3. 代码结构（按职责）

- `src/main.ts`：插件生命周期入口，负责 onload 阶段的初始化编排（加载设置、补丁注入、命令注册、事件注册、协议处理等）。
- `src/settings.ts`：定义完整配置模型（`PDFPlusSettings`）和默认设置项，覆盖复制模板、颜色、自动复制/自动粘贴、PDF 编辑、上下文菜单、提纲/缩略图行为等。
- `src/lib/`：核心能力层。
  - `PDFPlusLib` 聚合 `commands`、`copyLink`、`highlight`、`workspace`、`composer`、`speech` 等子模块。
  - 提供对 PDF.js 事件（如 `pagerendered` / `textlayerrendered`）的统一注册封装。
  - 提供更新检查、文件写入、页面渲染相关工具方法。
- `src/patchers/`：通过 monkey patch 扩展 Obsidian 私有行为，包括 PDF View、Embed、Workspace、Page Preview、菜单、剪贴板管理等。
- `src/modals/`：插件内各类模态框（标注编辑、合并 PDF、大纲/页码管理、安装版本提示等）。
- `src/post-process/`：Markdown 渲染后处理，用于增强 PDF 内/外链、提纲项、缩略图项等链接行为。
- `src/vim/`：Vim 风格导航与交互能力（模式、搜索、提示、滚动、可视模式等）。

## 4. 运行机制要点

1. 插件加载后会先做版本兼容判断，再加载 PDF.js、用户设置和 DOM 管理器。
2. 在 `patchObsidian()` 阶段注入对原生行为的补丁，失败时通过 `patchStatus` 跟踪。
3. 通过命令与工具栏动作把“复制链接—高亮回显—自动粘贴—反链可视化”串成闭环工作流。
4. 通过 `registerObsidianProtocolHandler('pdf-plus', ...)` 支持协议级跳转能力。
5. 卸载时执行资源清理（如临时目录）。

## 5. 项目当前特征与风险

- 特征：功能面非常广，覆盖阅读、标注、导航、链接、UI 交互、自动化工作流等多个层次；同时支持较细粒度的开关配置。
- 风险：项目显式依赖 Obsidian 私有 API，随 Obsidian 升级存在破坏风险；因此版本兼容判断和补丁策略是维护重点。

## 6. 本地开发命令（从 package.json 提炼）

- 开发构建：`pnpm dev`
- 生产构建：`pnpm build`
- 代码检查：`pnpm lint`
- 自动修复：`pnpm lint:fix`

## 7. 阅读结论（简述）

这是一个“以 Obsidian 原生体验为中心”的 PDF 增强插件：
- 架构上采用“入口编排 + 核心能力库 + patchers + UI 模块”的分层；
- 功能上以“链接即标注”为主轴；
- 工程上强调兼容性处理与可配置性；
- 维护上需要持续跟踪 Obsidian 私有 API 变动。
