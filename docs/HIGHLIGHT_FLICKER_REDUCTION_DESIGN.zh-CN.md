# PDF 标注写入无闪烁优化：详细设计文档

## 1. 背景与目标

当前在 PDF 里执行“写入型标注”（如高亮、下划线、删除线、波浪线、链接标注、文本注释/评论等）时，用户会感知到短暂闪烁。

### 1.1 用户目标
- 任意标注动作后，**视觉上立即出现结果**。
- 连续标注时，页面不频繁抖动/重载。
- 最终仍然把标注持久化到 PDF（可配置）。

### 1.2 工程目标
- 避免把“交互反馈”绑定到“文件落盘成功”。
- 统一所有标注类型的写入链路，避免每种标注各写一套逻辑。
- 将全量 reload 降为可控的局部刷新或后台刷新。
- 保持与现有命令、链接复制、颜色面板行为兼容。

---

## 2. 现状问题分析（根因）

现有路径中，写入标注会执行 PDF 保存（`modifyBinary`），保存后触发 viewer 重载链路，导致视觉闪烁。

- 代码中已有注释明确说明文件修改会导致 PDF viewer reload。
- 现有流程为：用户动作 → 写文件 → viewer 重载 → UI 状态恢复。

这意味着“交互反馈”和“持久化成功”是强耦合关系。

---

## 3. 设计原则

1. **交互优先（UI first）**：先给视觉反馈，再做持久化。
2. **统一抽象**：以“Annotation Intent（标注意图）”统一所有标注类型。
3. **分层解耦**：Display Model（展示层）与 Persistence Model（持久化层）分离。
4. **失败可回滚**：后台保存失败时可提示并恢复一致性。
5. **渐进增强**：先稳态落地，再考虑更激进的局部重绘优化。
6. **可配置策略**：给不同用户工作流（立即写入/批量写入/手动保存）留空间。

---

## 4. 方案候选与取舍

### 方案 A：乐观渲染 + 异步落盘（推荐主线）

**描述**
- 用户触发任意标注后，立即在当前页叠加“临时标注层”（optimistic overlay）。
- 后台异步写入 PDF。
- 落盘成功后将临时标注标记为已持久化（或由真实 annotation 替换）。
- 落盘失败时回滚临时标注并提示。

**优点**
- 体感改善最直接。
- 对现有底层侵入有限，维护风险可控。

**缺点**
- 底层重载仍可能发生，但用户感知会显著降低。

### 方案 B：页级局部重渲染替代整 viewer reload

**描述**
- 写入后仅刷新目标页 annotation layer，不做整组件 unload/load。

**优点**
- 理论体验上限最高。

**缺点**
- 对私有 API 与 PDF.js 内部行为依赖重，兼容风险高。
- 需要较长验证周期。

### 方案 C：事务化批量写入（Debounce/Flush）

**描述**
- 多次标注先进入队列，按时间窗口或 idle 时机统一落盘。

**优点**
- 显著降低重载频率。

**缺点**
- 不是彻底无闪，只是降频。

### 取舍结论
- **主线：A + C 组合。**
- **备线：B 作为后续增强项。**

---

## 5. 目标架构

```
User Action
   ↓
Annotation Intent Controller
   ├─ Display Pipeline (即时)：Optimistic Annotation Store → Page Overlay Renderer
   └─ Persistence Pipeline (异步)：Write Queue → Annotation Writer Adapter → Commit/Revert
```

### 5.1 模块划分

1. **Annotation Intent Controller**
   - 接收“标注意图”（页码、几何信息、标注类型、颜色、文本上下文、附加属性）。
   - 生成 `pendingAnnotationId` 并投递到展示层与持久化层。

2. **Optimistic Annotation Store（新）**
   - 内存存储 `pending` / `committed` / `failed` 状态。
   - 按 `filePath + pageNumber` 索引。

3. **Page Overlay Renderer（新）**
   - 基于页面渲染事件重画 overlay。
   - overlay 使用独立容器，避免与原 annotation DOM 相互污染。

4. **Write Queue（新）**
   - 支持串行或小并发（建议串行，降低冲突）。
   - 支持 debounce 合并写入窗口。

5. **Annotation Writer Adapter（新）**
   - 统一接口派发到具体 writer（text markup/link/text note...）。
   - 底层复用现有 pdf-lib 写入逻辑。
   - 返回真实 annotation id 与失败原因。

---

## 6. 统一标注模型（核心）

```ts
type AnnotationKind =
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'squiggly'
  | 'link'
  | 'text-note'
  | 'comment'
  | 'shape';

interface AnnotationIntent {
  kind: AnnotationKind;
  filePath: string;
  page: number;
  geometry: {
    rects?: [number, number, number, number][]; // 文本类/多矩形
    rect?: [number, number, number, number];    // 单矩形
    quadPoints?: number[];
  };
  style?: {
    colorName?: string;
    opacity?: number;
    border?: boolean;
  };
  payload?: {
    contents?: string;  // 注释文本
    dest?: string | any[]; // 链接目标
    author?: string;
  };
}

interface PendingAnnotation {
  id: string; // 本地临时ID
  intent: AnnotationIntent;
  createdAt: number;
  state: 'pending' | 'writing' | 'committed' | 'failed';
  committedAnnotationId?: string;
  error?: string;
}
```

---

## 7. 状态机设计

`pending -> writing -> committed`

失败分支：
`pending/writing -> failed -> (retry) -> writing`

用户可见规则：
- `pending/writing`：展示标注（可带轻微虚线/透明度差异）
- `committed`：转为普通样式
- `failed`：标注变警示样式 + toast 提示

---

## 8. 关键交互流程

### 8.1 单次标注
1. 解析用户动作为 `AnnotationIntent`。
2. 立即写入 `Optimistic Annotation Store`（`pending`）。
3. 页面立即渲染临时标注。
4. 写任务入队。
5. 写成功：状态置 `committed`，记录真实 annotation id。
6. 写失败：状态置 `failed` 并提示。

### 8.2 连续标注
1. 每次操作都即时渲染。
2. 写队列按窗口聚合（例如 500~1500ms）。
3. 后台按顺序提交，减少频繁落盘与重载。

### 8.3 文本注释/评论场景
1. 输入内容后先在 UI 标注“已添加（待保存）”。
2. 持久化成功后更新为普通注释状态。
3. 失败时保留内容并支持一键重试。

---

## 9. 一致性与冲突策略

### 9.1 文件外部变更
- 若检测到文件版本变化（mtime/hash）且本地有未提交任务：
  - 暂停队列，提示“文件已变化，是否继续合并写入”。

### 9.2 页面重绘/滚动
- 依赖页面层渲染事件重新挂载 overlay。
- overlay 渲染必须幂等（同一个 `pendingId` 重入不重复创建）。

### 9.3 失败回滚
- 写入失败时保留失败态 overlay（避免“凭空消失”造成困惑）。
- 支持“重试全部失败项”。

### 9.4 多标注类型并发
- 队列按 `filePath` 维度串行，避免同文件多类型写入冲突。
- 跨文件可并行，提高吞吐。

---

## 10. 配置项设计

新增“标注写入策略”：
1. `immediate`：立即写入（兼容现有行为）
2. `smooth`（默认建议）：即时显示 + 异步批量落盘
3. `manual`：仅显示并缓存，手动执行“保存到 PDF”

辅助项：
- 批量窗口（ms）
- 失败重试次数
- 失败是否保留可视标记
- 启动时是否自动恢复未完成队列

---

## 11. 性能预算

- 目标：标注动作主线程处理 < 16ms（保证一帧内响应）。
- Overlay 节点上限：按页回收，仅保留可见页 + 活跃任务。
- 队列默认串行（同文件），避免写冲突与无效重载。

---

## 12. 可观测性与诊断

新增内部 telemetry（可仅开发模式输出）：
- `annotation.intent.latency`
- `annotation.overlay.render.time`
- `annotation.persist.queue.length`
- `annotation.persist.success/fail.count`
- `annotation.persist.retry.count`
- `annotation.persist.by-kind`（按标注类型聚合）

用于验证“全标注体感无闪”和回归分析。

---

## 13. 兼容性与风险

1. **Obsidian 私有 API 变动风险**
   - 通过适配层封装 `pageView/annotationLayer` 获取，减少散落调用。

2. **PDF.js 内部结构变动风险**
   - Overlay 独立容器，不直接改写 PDF.js annotation 内部 DOM。

3. **多类型标注数据一致性风险**
   - 引入统一任务状态机与 writer 适配层，避免各类型实现分叉。

---

## 14. 迭代计划（统一到“全标注”）

### Phase 1：统一抽象落地
- 引入 `AnnotationIntent` 与 `Annotation Writer Adapter`。
- 高亮/下划线/删除线/波浪线先接入统一链路。

### Phase 2：扩展到链接与文本注释
- link、text-note/comment 接入统一链路。
- UI 层完成“待保存/已保存/失败”统一状态展示。

### Phase 3：平滑策略默认化
- 启用 `smooth` 策略。
- 增加批量窗口与失败重试设置。

### Phase 4：高级优化
- 评估页级局部刷新（方案 B）可行性。
- 若稳定，再替代部分全量重载路径。

---

## 15. 验收标准（DoD）

1. 高亮、下划线、删除线、波浪线、链接、文本注释等主流标注动作，连续操作时不出现明显白闪。
2. 保存失败可见、可重试、无静默丢失。
3. 重启后已落盘标注与 PDF 内容一致。
4. 默认设置下性能与内存无明显回退。

---

## 16. 非目标（本次不做）

- 不重写 PDF 引擎。
- 不引入重量级状态管理框架。
- 不在首期追求 100% 消灭底层重载事件（先实现“全标注体感无闪”）。

---

## 17. 总结

这次设计不再局限“高亮”，而是统一到“**所有标注行为**”：
- 前景快速可视反馈（Display）
- 背景可靠持久化（Persistence）

推荐以 **统一 AnnotationIntent + A（乐观渲染）+ C（批量落盘）** 为主线，先拿到可维护、可扩展、全标注覆盖的无闪体验，再逐步推进 B（页级局部刷新）提升上限。
