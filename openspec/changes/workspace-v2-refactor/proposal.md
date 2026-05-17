## Why

F5 已经能跑通本地 AI workspace，但代码集中在几个大文件里：renderer 主入口同时管理状态、导航、聊天、profile 和弹窗，资源页把 TODO 与 Docs 混在一起，main 侧 store 同时处理路径、frontmatter、索引和业务操作。继续叠功能会让测试、回归和 UI 调整变慢。

这次 v2 重构把应用拆成稳定边界：app shell、chat、workspace resources、typed API 和 main storage services。允许使用新的 preload API 和 workspace-v2 数据目录，旧 workspace 不自动迁移。

## What Changes

- 新增 v2 preload API 命名空间：`workspace`、`conversations`、`tasks`、`documents`、`profile`、`agents`。
- renderer 通过 `src/renderer/lib/f5-api.ts` 访问 API，不直接调用 `window.f5`。
- renderer 主入口拆成 app shell、chat feature、tasks feature、documents feature 和共享 workbench primitives。
- main 侧拆出 storage primitives 与领域 store，`ConversationEngine` 专注 agent turn、queue 和 stream update。
- 开发版 workspace 路径改为 `workspace-v2`，旧 `workspace` 原样保留。
- UI 统一成更密集的桌面工作台布局，Chat、Board、TODO、Docs、Profile、Agents 共享导航、搜索、空状态、错误和删除确认模式。

## Impact

- 旧 preload API 和 v1 workspace 文件格式不作为兼容目标。
- 现有产品能力保留：聊天、队列、Codex CLI、Board、TODO、Docs、评论、Profile、Agents、导出和 reveal。
- 测试覆盖从 store/resource 页扩展到 app shell 和 chat focused components。
