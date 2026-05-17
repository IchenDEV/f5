## Decisions

### Renderer boundaries

- `App.tsx` 只负责 provider 和 shell entry。
- `src/renderer/app/` 管 snapshot loading、view state、全局错误、导航和 surface routing。
- `src/renderer/features/chat/` 管 conversations sidebar、chat header、message timeline、composer、agent inspector 和 chat dialogs。
- `src/renderer/features/tasks/` 与 `src/renderer/features/documents/` 分别拥有 TODO 与 Docs 页面。
- `src/renderer/features/resources/` 放共享 resource layout、删除确认和通用控件。

### API boundary

Renderer 使用 `f5Api` v2 wrapper：

```ts
f5Api.workspace.getSnapshot(activeConversationId?)
f5Api.workspace.subscribe(callback)
f5Api.conversations.create(input)
f5Api.conversations.open(conversationId)
f5Api.conversations.send(input)
f5Api.conversations.cancelQueued(input)
f5Api.conversations.cancelActive(conversationId)
f5Api.tasks.create(input)
f5Api.documents.create(input)
f5Api.profile.update(input)
f5Api.agents.testConnection(agentId)
```

preload 可以临时保留旧方法作为 compatibility aliases，但 renderer 源码不得继续从旧 `lib/api.ts` 入口导入。

### Storage v2

- app userData 下使用 `workspace-v2`。
- Markdown 仍是核心存储形式，frontmatter 继续由 Zod schema 校验。
- main 侧路径校验、atomic write、frontmatter codec、index rebuild 移到 storage primitives。
- Conversation、Task、Document、Profile、Agent 操作拆成独立 store，`WorkspaceStore` 只组合这些服务并保留对外 facade。

### UI consistency

- 全页面统一为 rail + sidebar + content + inspector 模式。
- 卡片圆角以 8px 为默认，保留必要的工具表面，不做页面套页面卡片。
- 减少大面积玻璃装饰，使用清楚的边框、密度和状态色。
- 按桌面、tablet、窄屏三档布局验证，避免文字重叠和核心动作消失。
