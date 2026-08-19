# Tool Call Core

## Overview

工具调用的核心层：类型扩展、SSE 解析扩展、工具状态合并工具函数、Hook 扩展。

## Types (`types/index.ts`)

- `ToolCall` — 存储在消息中的工具调用对象，status 为 `running | success | error`
- `ToolCallChunk` — SSE 传输中的工具调用对象，status 含 `pending`
- `ChatMessage.tools?` — 可选 ToolCall 数组
- `ChatStreamChunk.tools?` — 可选 ToolCallChunk 数组

## SSE Parser (`utils/chatStream.ts`)

- 解析 SSE event JSON 时提取 `tools` 字段
- yield 的 ChatStreamChunk 包含 tools（如果存在）
- 无 tools 字段时行为不变（向后兼容）

## Merge Utility (`utils/mergeTools.ts`)

- `mergeTools(existing, incoming)` — 按 tool.id 合并工具状态
- 相同 id → 字段覆盖（保留旧值中新 chunk 未提供的字段）
- 新 id → 追加到数组末尾
- `pending` 映射为 `running`

## Hooks

### `useChatStream`

- onChunk 回调传递完整 ChatStreamChunk（含 tools 字段）
- 不做 tools 相关状态管理（职责在 useChat）

### `useChat`

- sendMessage 的 onChunk 中调用 mergeTools 更新 message.tools
- content 和 tools 更新在同一次 setState 中完成（避免闪烁）

## Acceptance Criteria

- [ ] SSE 中含 tools 字段时，chatSSE 正确 yield 包含 tools 的 chunk
- [ ] SSE 中无 tools 字段时，行为与扩展前完全一致
- [ ] mergeTools 按 id 正确合并：更新已有、追加新增、pending→running
- [ ] useChat 中多次 tools 更新后，message.tools 状态正确累积
- [ ] 流中断时，已收到的 tools 状态保持不丢失
