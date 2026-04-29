## Why

这个项目需要先做出一个可用的 AI native workspace：人可以同时和多个 agent 对话，历史对话以普通 Markdown 文件保存，并且能看到 agent 当前在做什么。

第一版只做对话，可以先把文件存储、会话结构、agent 连接和进度展示定清楚，后续任务和工作流再接上来。

## What Changes

- 新增桌面 workspace UI，支持多个并行对话。
- 用 Markdown 文件保存对话数据，并使用 frontmatter 记录基础信息。
- 新增本地对话索引，支持列出、打开、重命名和恢复对话。
- 新增 ACP agent 连接层，面向 Claude Code、Codex 兼容 adapter 和其他 ACP agent。
- 在对话中展示 agent 流式消息、工具活动和计划/进度。
- 每个对话维护本地 prompt 队列，agent 忙时用户仍可继续输入。
- 先生成一版 UI 概念图供确认，再进入实现。

## Capabilities

### New Capabilities

- `overnight-mvp-scope`: 一夜执行版的必须完成范围、可延期范围、失败降级和完成标准。
- `implementation-dependencies`: 第一版固定依赖、禁止新增的重依赖和测试工具选择。
- `markdown-conversations`: Markdown 对话存储、frontmatter 元信息、索引和消息身份。
- `agent-chat-sessions`: 多会话聊天、用户消息、agent 回复、流式状态和 prompt 队列。
- `acp-agent-connection`: ACP 进程配置、session 生命周期、prompt turn、更新事件、取消和能力处理。
- `codex-acp-verification`: 真实 Codex ACP 探测、握手、最小 prompt 验证和失败证据记录。
- `workspace-shell-ui`: 第一版 workspace 主框架、三栏比例、顶部栏和全局状态。
- `workspace-navigation-ui`: 左侧导航栏、区域入口、active 状态和底部用户头像入口。
- `workspace-topbar-ui`: 顶部搜索、快捷新建、窗口级动作和键盘入口。
- `new-conversation-ui`: 新建对话按钮、下拉菜单、Agent 选择和创建后的默认状态。
- `ui-visual-system`: UI 视觉 token、排版、图标、状态颜色、间距和组件密度。
- `conversation-list-ui`: 左侧会话列表、新建对话、搜索、分组、状态和 agent 标识。
- `conversation-header-actions-ui`: 对话标题菜单、星标、分享/导出、更多菜单和状态展示。
- `chat-timeline-ui`: 中间消息流、流式回复、队列提示、Markdown 内容和空状态。
- `chat-composer-ui`: 底部输入区、发送控制、agent 选择、Markdown 模式和附件入口。
- `agent-progress-panel-ui`: 右侧 agent 卡片、计划步骤、工具活动和 ACP session 明细。
- `profile-pages-ui`: 个人 Profile 页、Agent Profile 页、配置查看和轻量编辑。
- `responsive-workspace-ui`: 窗口变窄时的布局变化、面板切换和核心操作可见性。
- `computer-use-verification`: 通过 Computer Use 对 Electron 窗口进行桌面级截图、点击、输入、滚动和状态验证。
- `product-smoke-test`: 创建对话、发送、排队、重启、读取 Markdown、继续查看的产品级闭环验证。

### Modified Capabilities

- None.

## Impact

- 增加 renderer 侧状态和 UI 组件，用于对话浏览和聊天。
- 增加 Electron main 侧服务，用于本地 Markdown 文件读写和 ACP 子进程管理。
- 增加 preload bridge，让 renderer 安全访问对话和 agent API。
- 在应用控制的 workspace 目录中保存本地数据。
- 增加固定的 Markdown/frontmatter、运行时验证、Markdown 渲染、图标和测试依赖。
