# Tasks: Chat Tool Call

## Phase 1: Type & Transport Layer

- [x] **1.1** Extend type definitions (`src/pages/chat/types/index.ts`)
  - Add ToolCall, ToolCallChunk types
  - Add optional `tools` field to ChatMessage and ChatStreamChunk

- [x] **1.2** Extend SSE parser (`src/pages/chat/utils/chatStream.ts`)
  - Parse `tools` field from SSE event JSON
  - Include tools in yielded ChatStreamChunk

- [x] **1.3** Implement mergeTools utility (`src/pages/chat/utils/mergeTools.ts`)
  - By-id merge: existing → update, new → append
  - Map `pending` status to `running`

## Phase 2: State Layer

- [x] **2.1** Extend useChatStream hook (`src/pages/chat/hooks/useChatStream.ts`)
  - Pass full chunk (including tools) through onChunk callback

- [x] **2.2** Extend useChat hook (`src/pages/chat/hooks/useChat.ts`)
  - In sendMessage's onChunk: call mergeTools to update message.tools
  - Ensure tools state triggers re-render

## Phase 3: UI Layer

- [x] **3.1** Implement tool call rendering in ChatPanel (`src/pages/chat/components/ChatPanel.tsx`)
  - Add contentRender to ai role config
  - Map tools to ThoughtChain items with status/icon/code
  - Use CodeHighlighter for tool.code
  - Collapsible output/error display
  - Pass ChatMessage via extraInfo for contentRender access

## Dependencies

- 1.1 → blocks 1.2, 1.3, 2.1, 2.2, 3.1
- 1.2 → blocks 2.1
- 1.3 → blocks 2.2
- 2.1 → blocks 2.2
- 2.2 → blocks 3.1
