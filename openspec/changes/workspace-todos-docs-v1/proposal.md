## Why

F5 现在已经能把 agent 对话保存成 Markdown，但 workspace 里还缺少最基础的任务和文档入口。用户需要在同一个本地工作区里记录 TODO，并写普通 Markdown 文档。

## What Changes

- 新增 workspace 级 TODO 页面，支持多个 TODO list，以及任务新增、编辑、完成、删除、筛选和搜索。
- 新增 workspace 级 Docs 页面，支持新增、打开、编辑、预览、自动保存、删除和显示文件位置。
- 用本地 Markdown 文件保存 TODO 和文档，frontmatter 保存元数据，正文保存用户内容。
- 扩展 Electron IPC、preload API 和 renderer API，让 UI 通过同一条本地数据路径读写。

## Capabilities

### New Capabilities

- `workspace-todos-docs`: workspace 级 TODO 与 Markdown Docs 的存储、界面和验证。

### Modified Capabilities

- `workspace-navigation-ui`: 左侧导航栏增加 TODO 和 Docs 入口。
- `workspace-shell-ui`: Workspace Overview 展示 TODO 与 Docs 数量。

## Impact

- 增加 workspace 目录下的 `tasks/`、`tasks/lists/`、`documents/`、各自索引文件和 Markdown 数据文件。
- 增加共享类型、Zod schema、Electron main/preload API 和 React workspace 页面。
- 第一版不接聊天上下文，不做标签、文件夹、截止时间或同步。
