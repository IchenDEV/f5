## Overview

TODO 和 Docs 都是 workspace 级资源，和 conversations 平级保存。UI 通过左侧导航进入两个独立页面，顶栏搜索根据当前页面过滤内容。

## Storage

- TODO list 文件保存在 `tasks/lists/<taskListId>.md`，schema 为 `f5.task-list.v1`。
- TODO 文件保存在 `tasks/<taskId>.md`，schema 为 `f5.task.v1`，frontmatter 通过 `listId` 关联所属清单，通过 `agentId` 记录负责的 workspace agent。
- Docs 文件保存在 `documents/<documentId>.md`，schema 为 `f5.document.v1`。
- `tasks/index.json`、`tasks/lists/index.json` 和 `documents/index.json` 是派生索引，可以通过扫描 Markdown 重建。
- 文件写入继续使用 temp file + rename。

## UI

- TODO 页面左侧是清单列表，右侧是当前清单标题、新增任务、Agent 选择、状态筛选和可编辑任务列表，布局对齐聊天页面。
- Docs 页面左侧是文档列表，右侧是 Markdown 编辑和渲染预览。
- 删除操作必须经过确认弹窗。
- 文档详情提供 “Show file” 动作，打开本地 Markdown 文件位置。

## Non-Goals

- 不从聊天自动生成 TODO 或 Docs。
- 不把 Docs 自动传给 agent 作为上下文。
- 不做文件夹、标签、优先级、截止时间或同步。
