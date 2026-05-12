## Overview

TODO 和 Docs 都是 workspace 级资源，和 conversations 平级保存。UI 通过左侧导航进入两个独立页面，顶栏搜索根据当前页面过滤内容。

## Storage

- TODO list 文件保存在 `tasks/lists/<taskListId>.md`，schema 为 `f5.task-list.v1`。
- TODO 文件保存在 `tasks/<taskId>.md`，schema 为 `f5.task.v1`，frontmatter 通过 `listId` 关联所属清单，通过 `agentId` 记录负责的 workspace agent。
- Docs 文件保存在 `documents/<documentId>.md`，schema 为 `f5.document.v1`。
- 文档评论文件保存在 `documents/comments/<commentId>.md`，schema 为 `f5.document-comment.v1`，frontmatter 通过 `documentId` 关联文档，并用 `anchorText`、`anchorStart`、`anchorEnd` 记录选中文本。
- `tasks/index.json`、`tasks/lists/index.json`、`documents/index.json` 和 `documents/comments/index.json` 是派生索引，可以通过扫描 Markdown 重建。
- 文件写入继续使用 temp file + rename。

## UI

- TODO 页面左侧是清单列表，右侧是当前清单标题、新增任务、Agent 选择、状态筛选和可编辑任务列表，布局对齐聊天页面。
- Docs 页面左侧是文档列表，右侧是 Markdown 编辑、渲染预览和文档评论栏。编辑区或预览区选中文本后，新评论会带上引用；已有引用会在预览区高亮，并可从评论卡片定位到编辑区选区。
- Docs 页面提供手动发送到当前 Agent 的动作；文档评论可以 `@ Agent`，发送评论、划词引用和完整文档上下文。
- 删除操作必须经过确认弹窗。
- 文档详情提供 “Show file” 动作，打开本地 Markdown 文件位置。

## Non-Goals

- 不从聊天自动生成 TODO 或 Docs。
- 不自动把 Docs 传给 agent 作为上下文。
- 不做文件夹、标签、优先级、截止时间或同步。
