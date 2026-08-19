# Chat Core

## Overview

聊天系统的核心层：类型定义、SSE 流式请求工具、状态管理 hooks。

## Types (`types/index.ts`)

- `ChatMessage` — 消息对象，包含 key/role/content/status/time
- `Session` — 会话对象，包含 id/label/createdAt
- `ChatStreamChunk` — SSE 单个 event 的数据结构
- `ChatRequest` — 请求体 { query, sessionId? }

## SSE Utility (`utils/chatStream.ts`)

- `chatSSE(url, body, signal)` — async generator
- 使用 fetch POST + ReadableStream 读取 SSE
- 逐行解析 `data: {...}` 格式
- 遇到 `[DONE]` 结束迭代
- signal 支持 AbortController 取消

## Hooks

### `useChatStream`

- 封装 chatSSE 为 React hook
- 暴露 `streaming`、`send()`、`cancel()`
- 内部管理 AbortController 生命周期
- 组件卸载时自动 cancel

### `useChat`

- 多会话状态管理
- `sessions[]` — 从后端 API 加载
- `messagesMap{}` — 按 sessionId 索引的消息列表
- `activeSessionId` — 当前激活会话
- `sendMessage()` — 发送消息 + 触发流式响应 + 逐 token 更新
- `createSession()` / `deleteSession()` / `switchSession()` — 会话 CRUD
- `loadHistory()` — 加载指定会话的历史消息

## Acceptance Criteria

- [ ] chatSSE 能正确解析 SSE 流并逐 token yield
- [ ] useChatStream 支持取消正在进行的请求
- [ ] useChat 多会话切换时保持各自消息独立
- [ ] 网络异常、流中断、业务错误均有明确的错误状态
