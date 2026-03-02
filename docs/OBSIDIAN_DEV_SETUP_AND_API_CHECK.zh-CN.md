# Obsidian 插件开发环境与 API 调研记录

## 1. 目标

本记录回答三个问题：
1. 有没有现成的 Obsidian 插件开发 skill 可直接安装。
2. 有没有适合 Obsidian 插件开发测试的框架。
3. 当前环境下可确认到的 Obsidian API 版本情况。

---

## 2. Skill 调研结果

### 2.1 当前会话内可用 skill
当前容器仅显示以下内置 skill：
- `skill-creator`
- `skill-installer`

未发现现成的 Obsidian 专用 skill（至少在当前可访问范围内）。

### 2.2 curated skills 联网查询结果
已通过 `skill-installer` 的官方脚本尝试拉取 curated 列表，但网络代理返回 `403 Forbidden`，导致无法在线枚举远端 skill。

结论：
- **本地可见范围内没有 Obsidian 专用 skill**。
- 远端 curated 列表在当前环境无法访问，需要后续在可联网环境再查一次。

---

## 3. 开发环境搭建（已落地）

为避免每次手动复制插件到 vault，我增加了一个本地脚本，自动把仓库软链接到目标 vault 的社区插件目录：

- 脚本：`scripts/setup-obsidian-dev-vault.sh`
- 作用：创建 `vault/.obsidian/plugins/pdf-plus -> <repo>` 软链接

新增 npm script：
- `pnpm run dev:vault-setup -- /absolute/path/to/vault`
- `pnpm run typecheck`

### 3.1 推荐日常开发流程
1. 安装依赖：`pnpm install`
2. 关联 vault：`pnpm run dev:vault-setup -- /path/to/vault`
3. 启动监听构建：`pnpm dev`
4. 在 Obsidian 中重载插件进行验证。

---

## 4. Obsidian 插件测试框架建议

> 说明：由于当前网络受限，本节基于社区常见实践与本项目约束给出“可执行推荐”。

### 4.1 单元测试层
推荐：`Vitest + happy-dom/jsdom + Obsidian API mock`

理由：
- 启动快，和 TS/esbuild 项目契合。
- 适合测试纯逻辑模块（如路径解析、subpath 解析、状态机、队列）。

### 4.2 集成验证层
推荐：基于“开发 vault + 真 Obsidian app”的脚本化 smoke 流程

理由：
- Obsidian 插件大量依赖宿主私有行为，纯 mock 无法覆盖。
- 真实环境验证更能发现 PDF viewer 相关边界问题。

### 4.3 E2E 自动化层（可选）
可选：Playwright/Electron 驱动（若团队可投入维护成本）

注意：
- 维护成本较高；更适合把关键回归场景固化后再上。

---

## 5. API 版本检查（当前环境可验证）

虽然无法联网拉“官网最新”，但可以确认本仓库当前安装到的 Obsidian npm 类型包版本：

- `node_modules/obsidian/package.json` 显示版本：`1.8.7`
- `pnpm-lock.yaml` 也锁定到 `obsidian@1.8.7`

这意味着当前项目编译/类型检查时使用的 API 基线是 **Obsidian 1.8.7 的 typings**。

---

## 6. 下一步建议

1. 在可联网环境补做两件事：
   - 重新执行 curated skill 列表查询，确认是否已有 Obsidian 专项 skill。
   - 对比 Obsidian 官方最新 API 变更日志，评估本项目私有 API patch 风险。
2. 按“单元 + 集成”两层先把测试基建补齐，再逐步引入 E2E。
3. 在“标注无闪烁”改造前，先落地最关键的回归清单（高亮/下划线/链接/注释）。
