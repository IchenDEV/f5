## Context

当前项目是 Electron + React + Vite + TypeScript 桌面应用。第一版目标是一个 AI native workspace 的对话层：用户可以创建多个对话，每个对话绑定一个 agent，并在界面里看到消息、运行状态和计划进度。

ACP 官方文档说明：ACP 用 JSON-RPC 2.0 作为通信模型，常见本地方式是 stdio；client 通过 `initialize`、`session/new`、`session/prompt` 与 agent 对话；agent 通过 `session/update` 发送消息、工具调用和计划进度；会话列表和恢复依赖 agent 是否声明相应 capability。

用户提到的 “photo map” 按 frontmatter 处理：Markdown 文件顶部用 YAML frontmatter 记录 id、title、agent、时间、状态等元信息。

## Goals / Non-Goals

**Goals:**

- 支持多个 conversation 并行存在，每个 conversation 可以绑定不同 agent。
- 使用 Markdown 文件保存 conversation 和 message，普通编辑器也能直接阅读。
- 支持用户连续输入；agent 忙时消息进入本地队列。
- 支持 ACP agent 的基本生命周期：初始化、建会话、发送 prompt、展示 update、取消当前 turn。
- 展示 agent 当前计划、工具活动和运行状态。
- 先做一版现代桌面软件风格 UI，不做营销页。

**Non-Goals:**

- 不做复杂任务编排、权限系统、团队协作、云同步和多设备同步。
- 不实现自研 agent 协议。
- 不把 Markdown 文件当成数据库替代品处理高并发写入。
- 不承诺所有 agent 都能列出历史会话；这取决于 agent 的 ACP capability。
- 不在第一版做完整插件市场、计费、账号体系或远程 agent 托管。

## Decisions

### 0. 一夜执行版优先级

一夜执行版只以“本地可用 MVP”为目标。必须完成：

- 真实 Electron 窗口打开就是 workspace UI。
- 使用 mock ACP agent 完成创建对话、发送 prompt、流式回复、排队和取消。
- 对话和消息写入 Markdown 文件，重启后可以读取。
- UI 覆盖设计稿元素对照表里的核心入口：新建对话、对话列表、对话区域、composer、右侧 agent 面板、个人 Profile、Agent Profile。
- `pnpm check`、`pnpm build`、产品 smoke test、Computer Use 验证全部通过。

可以延期但要有可见占位状态：

- 真实 Claude Code 或 Codex ACP adapter。
- raw logs 完整查看器。
- 高级导出、归档列表、复杂设置页。
- 远程 ACP transport。

一夜执行版不能因为真实 adapter 不存在而停止。真实 adapter 不可用时，mock ACP agent 必须保持可用。

### 1. Conversation 使用目录结构，message 使用独立 Markdown 文件

本地 workspace 目录结构：

```text
workspace/
  conversations/
    <conversationId>/
      conversation.md
      messages/
        000001-user-msg_01jz9r8v8j.md
        000002-assistant-msg_01jz9r8w2p.md
      attachments/
      state.json
  agents/
    agents.json
  index.json
  profile.json
```

- `conversation.md` 是对话入口，frontmatter 保存对话级元信息，正文可以放简短摘要和消息目录。
- `messages/*.md` 保存单条 message，frontmatter 保存 message id、role、agentId、turnId、parentId、createdAt、status 等字段。
- `state.json` 保存运行时状态，例如 ACP sessionId、队列、当前 plan、tool calls。它可以重建，核心对话内容仍以 Markdown 为准。
- `index.json` 是加速列表展示的派生索引，启动时可以由 Markdown 重建。

备选方案是把所有消息写进一个 `conversation.md`。它更简单，但后续追加、局部更新、单条消息状态变更都会更难处理。第一版用独立 message 文件，阅读和程序处理都更稳。

默认 workspace 数据目录使用 Electron `app.getPath('userData')/workspace`。一夜执行版不做目录选择器，只在个人 Profile 页展示路径，并提供 reveal action。

Conversation frontmatter v1：

```yaml
---
schema: f5.conversation.v1
id: conv_01jz9r8v8j0a4q0w7xq3c1h2m9
title: Q2 Market Research Synthesis
agentId: mock-market-analyst
status: active
starred: false
createdAt: '2026-04-30T02:30:00.000Z'
updatedAt: '2026-04-30T02:36:00.000Z'
lastMessageAt: '2026-04-30T02:36:00.000Z'
messageCount: 2
---
```

Conversation status enum: `active`, `archived`, `needs_repair`.

Message frontmatter v1：

```yaml
---
schema: f5.message.v1
id: msg_01jz9r8w2p6b6n9b8p2m5d3x4a
conversationId: conv_01jz9r8v8j0a4q0w7xq3c1h2m9
sequence: 2
role: assistant
agentId: mock-market-analyst
turnId: turn_01jz9r8w0c4d2p7k8s6m1n5v3r
parentId: msg_01jz9r8v8j9b8n7m6p5q4r3s2t
status: completed
createdAt: '2026-04-30T02:31:00.000Z'
updatedAt: '2026-04-30T02:32:00.000Z'
errorCode:
errorMessage:
---
```

Message role enum: `user`, `assistant`, `system`, `tool`.

Message status enum: `queued`, `active`, `streaming`, `completed`, `failed`, `cancelled`, `interrupted`.

Message file naming:

```text
<sequence padded to 6>-<role>-<messageId>.md
```

IDs use `crypto.randomUUID()` converted to local ids with prefixes: `conv_`, `msg_`, `turn_`, `tool_`, `plan_`. Timestamps use UTC ISO strings. Writes use temp file plus rename so interrupted writes do not corrupt existing Markdown.

`state.json` v1:

```json
{
  "schema": "f5.state.v1",
  "conversationId": "conv_01jz9r8v8j0a4q0w7xq3c1h2m9",
  "acpSessionId": "mock-session-01jz9r8",
  "activeTurnId": "turn_01jz9r8w0c4d2p7k8s6m1n5v3r",
  "queue": [
    {
      "messageId": "msg_01jz9r8z9k",
      "turnId": "turn_01jz9r8z1x",
      "status": "queued",
      "createdAt": "2026-04-30T02:33:00.000Z"
    }
  ],
  "plan": [
    { "id": "plan_1", "title": "Search recent reports", "status": "completed" },
    { "id": "plan_2", "title": "Analyze trends", "status": "active" }
  ],
  "tools": [
    {
      "id": "tool_1",
      "name": "web_search",
      "status": "running",
      "startedAt": "2026-04-30T02:31:20.000Z"
    }
  ]
}
```

`state.json`, `index.json`, and `profile.json` are app-owned JSON. Markdown files are the user-readable conversation record.

### 2. Electron main 负责文件和 ACP，renderer 只做界面

- renderer 发起 `conversation.create`、`message.send`、`agent.cancel` 等调用。
- preload 暴露最小 API。
- main 负责文件读写、索引维护、ACP 子进程、队列执行和事件广播。

这样可以把文件系统和子进程能力限制在 main 侧，renderer 不直接碰 Node API。

### 3. ACP 作为第一版 agent 连接主路径

一夜执行版默认使用 mock ACP agent。真实 adapter 可配置，但不能阻塞 MVP。

默认 agent 配置：

```json
{
  "schema": "f5.agents.v1",
  "defaultAgentId": "mock-market-analyst",
  "agents": [
    {
      "id": "mock-market-analyst",
      "name": "Market Analyst",
      "kind": "mock-acp",
      "command": "node",
      "args": ["scripts/mock-acp-agent.mjs"],
      "cwd": ".",
      "enabled": true
    },
    {
      "id": "codex-acp-real",
      "name": "Codex",
      "kind": "acp-stdio",
      "command": "codex-acp",
      "args": [],
      "cwd": ".",
      "enabled": false,
      "verification": "preferred-if-discovered"
    },
    {
      "id": "claude-code",
      "name": "Claude Code",
      "kind": "acp-stdio",
      "command": "claude-code-acp",
      "args": [],
      "cwd": ".",
      "enabled": false
    }
  ]
}
```

`scripts/mock-acp-agent.mjs` 必须实现足够的 JSON-RPC stdio 行为：

- `initialize` 返回协议版本和 capability 摘要。
- `session/new` 返回 mock session id。
- `session/prompt` 先发 plan update、tool update、文本 chunk，再返回完成状态。
- `session/cancel` 将当前 turn 标记为 cancelled。
- 支持 slow mode，用于验证 queued prompt UI。

真实 agent 配置示例：

```json
{
  "id": "claude-code",
  "name": "Claude Code",
  "command": "claude-code-acp",
  "args": [],
  "cwd": "/Users/chenli/projects/f5"
}
```

连接流程：

1. 启动 agent 子进程，使用 stdio 传输 JSON-RPC。
2. 发送 `initialize`，读取 agent capability。
3. 创建或恢复 ACP session。
4. 用户消息进入当前 conversation 队列。
5. 空闲时取队首，调用 `session/prompt`。
6. 将 `session/update` 转成 UI 事件，同时写入 message Markdown 或 `state.json`。
7. turn 完成后处理下一条队列消息。

ACP 文档目前把 stdio 作为稳定本地传输，Streamable HTTP 仍是草案，因此第一版只做 stdio。后续可以在 agent 配置中增加 remote transport。

真实 adapter 探测策略：

- 启动时不自动运行真实 adapter。
- 用户测试连接时才启动真实 adapter。
- 命令不存在、初始化失败、协议版本不支持时，将 agent 标记为 unavailable。
- unavailable agent 仍可出现在 Agent Profile 页，但不能作为新对话默认 agent。

真实 Codex ACP 验证策略：

- 优先使用用户显式配置的 Codex ACP command。
- 没有显式配置时，按顺序探测：
  1. `codex-acp` shell command。
  2. 已安装 `codex` CLI 是否暴露 ACP-compatible mode。
  3. 编辑器 registry hint，例如 Zed settings 中的 `codex-acp` registry entry。
- registry hint 只能证明用户环境可能支持 Codex ACP，不能直接当作 runnable command。
- 本机当前检查结果：存在 `/Users/chenli/n/bin/codex`，`codex --help` 未显示 ACP 子命令；`/Users/chenli/.config/zed/settings.json` 有 `codex-acp` registry entry；shell 中未发现 `codex-acp` command。
- 如果发现 runnable Codex ACP command，最终验证必须执行真实 handshake 和最小 prompt turn，并在 verification note 里记录 command、protocol version、capabilities、session id、prompt 结果。
- 如果没有发现 runnable command，verification note 记录检查过的候选和失败原因，mock ACP 仍是 MVP 必须通过的基线。

Codex ACP 验证产物固定写到 `openspec/changes/ai-workspace-chat-v1/verification/codex-acp.md`。该文件必须包含：

- 检查时间、当前 workspace、运行平台。
- 候选来源：user config、`codex-acp` command、`codex` CLI、Zed registry hint。
- 每个候选的检查结果：found、missing、unsupported、handshake_failed、prompt_failed、passed、skipped。
- 成功时的 command、args、cwd、protocol version、capabilities、session id、最小 prompt 内容和 agent reply 摘要。
- 失败或跳过时的错误摘要和下一步动作。

实现需要提供 `pnpm smoke:codex-acp`。该命令必须完成候选检查和证据文件写入；没有可运行 adapter 时以 skipped 结果结束，不影响 `pnpm smoke:product` 的通过状态。发现可运行 adapter 时，它必须完成真实 `initialize`、`session/new`、`session/prompt`，并验证 Markdown 消息已保存。

### 3.1 固定依赖选择

一夜执行版固定依赖：

- `gray-matter`：解析和写入 Markdown frontmatter。
- `zod`：验证 IPC 输入、frontmatter、agent config、state JSON。
- `react-markdown` + `remark-gfm` + `rehype-sanitize`：安全渲染 Markdown。
- `tailwindcss` + `@tailwindcss/vite`：renderer 样式主路径，使用 Tailwind CSS v4。
- `shadcn` + `radix-ui` + `class-variance-authority` + `clsx` + `tailwind-merge` + `tw-animate-css`：shadcn/ui source components、variant 和 class 合并。
- `lucide-react`：图标按钮。
- `vitest` + `jsdom` + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`：单元和组件测试。

第一版不加数据库、ORM、状态管理框架、代码高亮大包。UI 基座使用 Tailwind CSS v4 和 shadcn/ui 源码组件；组件源码归项目维护，复杂布局仍按本项目组件拆分。id 使用 `node:crypto`，文件写入使用 `node:fs/promises`。

### 4. 队列由本地 app 管理，ACP 负责单个 prompt turn

ACP 定义了 prompt turn 生命周期和 cancel，但没有把“用户连续输入的本地排队策略”作为核心队列能力。第一版在 app 侧维护每个 conversation 的 FIFO 队列：

- agent 忙时，新用户消息标记为 `queued`。
- 当前 turn 完成后自动发送下一条。
- 用户可以取消当前 turn；队列中还没开始的消息可以移除。
- 每条消息都有 `turnId`，方便把 agent update 归到对应 turn。

### 5. UI 使用三栏工作区

第一版主界面：

- 左栏：conversation 列表、agent 过滤、新建对话。
- 中栏：当前对话消息流、composer、队列提示。
- 右栏：agent 卡片、当前 plan、工具活动、session 信息。

视觉上参考现代 agent workspace：低干扰、信息密度适中、状态清楚。避免做成 landing page。

参考设计图：

- `openspec/changes/ai-workspace-chat-v1/assets/ui-concept-v3-light-reference.png`：默认浅色 UI 风格基准。它参考 Superconductor 白色截图里的 macOS 窗口、浅灰 app chrome、白色主面板、大圆角、柔和阴影、浅色边框、低干扰图标和蓝紫 active 状态。
- `openspec/changes/ai-workspace-chat-v1/assets/ui-concept-v2-dark-reference.png`：dark mode 风格基准。它参考 Superconductor 暗色截图里的 macOS 窗口、graphite 表面、大圆角主面板、细边框、低对比文字、紧凑工具图标和蓝紫 active 状态。
- `openspec/changes/ai-workspace-chat-v1/assets/ui-concept-v1.png`：早期元素覆盖图。实现时仍用它核对新建对话、对话列表、聊天流、composer、Agent 面板、Profile 入口等功能元素有没有遗漏。

UI 需要按可独立维护的模块拆分：

```text
src/renderer/
  app/
    WorkspaceApp.tsx
  components/
    ui/
      button.tsx
      card.tsx
      ...
    workspace/
      NavigationRail.tsx
      WorkspaceShell.tsx
      TopBar.tsx
      WorkspaceSearch.tsx
      QuickComposeButton.tsx
      PanelDivider.tsx
    conversations/
      ConversationList.tsx
      ConversationRow.tsx
      ConversationSearch.tsx
      NewConversationButton.tsx
      NewConversationFlow.tsx
    chat/
      ChatHeader.tsx
      ConversationTitleMenu.tsx
      ConversationHeaderActions.tsx
      MessageTimeline.tsx
      MessageBubble.tsx
      StreamingAgentMessage.tsx
      QueuedPromptCard.tsx
      ChatComposer.tsx
    agents/
      AgentProgressPanel.tsx
      AgentIdentityCard.tsx
      PlanStepList.tsx
      ToolActivityList.tsx
      AcpSessionDetails.tsx
    profile/
      UserProfilePage.tsx
      AgentProfilePage.tsx
      AgentConnectionTest.tsx
  lib/
    utils.ts
  styles/
    styles.css
```

视觉 token 集中在 `src/renderer/styles.css`：Tailwind v4 import、shadcn theme variables、语义色、半径、状态色和基础层。workspace 组件默认用 Tailwind utility、shadcn 组件、`cn()` 和语义 token；只有固定三栏布局、滚动区域和 Electron 特定窗口细节才补少量局部 CSS。主题需要同时覆盖默认浅色和 dark mode，两套主题使用同一组件结构和同一交互状态，只替换 CSS variables。

shadcn/ui 组件策略：

- 使用 `components.json`，`style` 固定为 `radix-nova`，`iconLibrary` 固定为 `lucide`，`tailwind.css` 指向 `src/renderer/styles.css`。
- shadcn 组件统一安装到 `src/renderer/components/ui`。
- 通用 class 合并工具固定为 `src/renderer/lib/utils.ts` 的 `cn()`。
- 第一批必备 shadcn 组件：`button`、`card`、`dialog`、`sheet`、`dropdown-menu`、`input`、`textarea`、`select`、`tabs`、`badge`、`avatar`、`separator`、`scroll-area`、`tooltip`、`popover`、`progress`、`skeleton`。
- 表单布局优先使用 shadcn `field`、`input-group`、`switch`、`checkbox`、`toggle-group`，不手写一套表单组件。
- 组件实现前先查 shadcn 组件是否已有合适原语；没有合适原语时再写本地业务组件。

实现顺序：

1. 先做静态 shell，还原 `ui-concept-v3-light-reference.png` 的默认浅色 macOS 窗口、左侧 workspace 区、中间浮动主面板和右侧 agent 状态区。
2. 再接入本地 mock 数据，验证状态、队列、计划步骤和工具活动。
3. 加入 dark mode CSS variables，对照 `ui-concept-v2-dark-reference.png` 检查同一页面的暗色效果。
4. 再接入真实 conversation store 和 ACP runtime。
5. 最后用截图对比两张参考图，修正密度、间距、文字层级和状态表达。

UI 细分规格：

- `ui-visual-system`：视觉 token、排版、图标、状态颜色、密度和概念图一致性。
- `workspace-navigation-ui`：左侧导航栏、active 状态、导航动作、底部用户头像。
- `workspace-topbar-ui`：顶部搜索、快捷新建、app identity 和键盘入口。
- `new-conversation-ui`：新建对话主按钮、下拉、agent 选择、首条 prompt。
- `conversation-list-ui`：搜索、新建对话、分组、行状态、active state、归档入口。
- `conversation-header-actions-ui`：标题菜单、重命名、星标、分享/导出、更多菜单。
- `chat-timeline-ui`：消息流、流式回复、计划摘要、队列卡片、Markdown 渲染。
- `chat-composer-ui`：输入区、发送、队列感知、agent 选择、Markdown 模式和附件入口。
- `agent-progress-panel-ui`：agent 身份卡、计划、工具活动、ACP session 和日志入口。
- `profile-pages-ui`：个人 Profile 页、Agent Profile 页、默认 agent 和连接测试。
- `responsive-workspace-ui`：桌面、中等宽度、窄窗口和文本溢出规则。
- `computer-use-verification`：通过真实 Electron 窗口验证截图、控件树、点击、输入、切换、队列和 agent 面板。
- `codex-acp-verification`：真实 Codex ACP adapter 探测、握手、最小 prompt 验证和失败证据记录。

设计稿元素对照表在 `openspec/changes/ai-workspace-chat-v1/ui-element-coverage.md`。实现前先看这份表，避免遗漏图里的入口和控件。

### 6. Computer Use 作为桌面验证步骤

实现完成后，验证不只看构建结果。需要启动 `pnpm dev`，再用 Computer Use 对真实桌面窗口做一轮操作检查：

1. 使用 Computer Use 获取 f5/Electron 窗口状态，确认截图中存在左侧会话列表、中间聊天区、底部 composer 和右侧 agent 面板。
2. 检查 accessibility tree，确认新建对话、会话行、输入框、发送按钮、右侧面板控制都有可操作节点或可访问名称。
3. 点击新建对话，输入一条 prompt，点击发送，确认消息立即出现在时间线。
4. agent 忙时再输入第二条 prompt，确认出现 queued prompt card 和队列状态。
5. 点击另一个 conversation row，确认 active row、chat header、timeline 和 agent panel 同步变化。
6. 操作右侧 agent panel 的关闭和恢复，确认聊天区宽度变化正常，恢复入口可见。
7. 做一次窄窗口或等效宽度验证，确认 composer、发送和面板切换入口仍可用。

Computer Use 验证结果需要写成简短记录，包含检查过的流程、截图路径或窗口状态说明、发现的问题和对应修正。

### 7. 产品级 smoke test

实现需要提供一个产品级 smoke test 命令，建议命名为 `pnpm smoke:product`。该命令使用临时 workspace 和 mock ACP agent，验证：

1. 创建第一个 conversation。
2. 发送第一条 prompt，mock agent 进入 slow response。
3. 在 agent 忙时发送第二条 prompt，第二条进入 queue。
4. mock agent 完成第一条后，queue 自动继续。
5. 写入 `conversation.md`、`messages/*.md`、`state.json` 和 `index.json`。
6. 重建 app 逻辑实例，重新扫描 workspace。
7. conversation list 可以看到刚才的对话。
8. 打开对话后消息顺序、状态、agent 信息仍正确。
9. 直接读取 Markdown 文件，frontmatter 可解析，正文可读。

真实 Codex ACP 的产品验证使用 `pnpm smoke:codex-acp` 单独执行。最终交付前两个命令都要运行：`pnpm smoke:product` 必须通过；`pnpm smoke:codex-acp` 必须输出 passed 或 skipped，并把证据写到 `verification/codex-acp.md`。

## Risks / Trade-offs

- ACP agent capability 差异 → 初始化后记录 capability，UI 根据实际能力启用恢复、列表、图片等功能。
- Markdown 与运行时状态不一致 → `index.json` 和 `state.json` 都视为可重建数据，核心消息以 Markdown 为准。
- agent 流式内容频繁写文件 → 流式阶段先存在内存和 `state.json`，turn 完成后写最终 message Markdown。
- 用户手动编辑 Markdown 破坏 frontmatter → 启动扫描时做宽容解析，把异常文件标成需要修复，并保留原文。
- 多 conversation 并行导致资源占用高 → 第一版每个 agent session 可独立运行，但 UI 显示运行数量，后续再增加全局并发限制。
- ACP adapter 生态仍在变化 → 第一版把 adapter 命令、参数、环境变量做成配置，不把某个 adapter 写死。

## References

- ACP Introduction: https://agentclientprotocol.com/get-started/introduction
- ACP Protocol Overview: https://agentclientprotocol.com/protocol/overview
- ACP Session Setup: https://agentclientprotocol.com/protocol/session-setup
- ACP Prompt Turn: https://agentclientprotocol.com/protocol/prompt-turn
- ACP Agent Plan: https://agentclientprotocol.com/protocol/agent-plan
- ACP Transports: https://agentclientprotocol.com/protocol/transports
