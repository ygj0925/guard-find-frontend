# Chat Application

## Problem

项目需要一个 AI 聊天功能，支持用户与 AI 助手进行多轮流式对话。需要独立的聊天页面和全局悬浮入口两种交互方式。

## Solution

基于 `@ant-design/x` v2 UI 组件（Bubble、Sender、Conversations 等），自建聊天状态管理和 SSE 流式请求层，实现完整的多会话聊天系统。

### 核心能力

- **流式对话**：POST SSE 请求，逐 token 拼接渲染，打字机效果
- **多会话管理**：会话列表（后端 API）、新建/切换/删除会话
- **双入口**：`/chat` 全功能页面 + 全局 FloatButton → Popover 紧凑模式
- **错误处理**：网络异常、流中断、业务错误的用户友好提示

### 不包含

- 文件/图片上传
- 语音输入
- 消息搜索
- AI Agent/工具调用

## API

- `POST /chat` — 发送消息，SSE 流式响应
  - Request: `{ query: string, sessionId?: string }`
  - Response: `text/event-stream`，每个 event: `{ content: string, time: string, status: 'success' | 'error', role: 'assistant' | 'user' }`
  - content 为单个 token，前端逐步拼接
- 后端提供会话列表 API（获取会话列表、创建/删除会话、获取历史消息）

## Tech Stack

- `@ant-design/x` v2 — Bubble.List、Sender、Conversations、Welcome、Prompts
- `fetch` + `ReadableStream` — SSE 流式请求（v2 已移除 XRequest）
- 自建 `useChat` + `useChatStream` hooks — 替代 v2 已移除的 useXChat
