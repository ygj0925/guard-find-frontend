# Tasks: Chat Application

## Phase 1: Core Layer

- [x] **1.1** Create type definitions (`src/pages/chat/types/index.ts`)
  - ChatMessage, Session, ChatStreamChunk, ChatRequest types

- [x] **1.2** Implement SSE stream utility (`src/pages/chat/utils/chatStream.ts`)
  - fetch POST + ReadableStream async generator
  - SSE event parsing, [DONE] detection, error handling

- [x] **1.3** Implement useChatStream hook (`src/pages/chat/hooks/useChatStream.ts`)
  - Wrap chatSSE as React hook
  - streaming state, send(), cancel(), auto-cleanup on unmount

- [x] **1.4** Implement useChat hook (`src/pages/chat/hooks/useChat.ts`)
  - Multi-session state: sessions[], activeSessionId, messagesMap{}
  - sendMessage(): add user msg → add ai msg (loading) → stream → concat tokens → complete/error
  - createSession(), deleteSession(), switchSession()
  - loadSessions(), loadHistory()

## Phase 2: UI Components

- [x] **2.1** Create ChatWelcome component (`src/pages/chat/components/ChatWelcome.tsx`)
  - Welcome + Prompts, click prompt to send message

- [x] **2.2** Create ChatPanel component (`src/pages/chat/components/ChatPanel.tsx`)
  - Bubble.List for messages, Sender for input
  - compact prop for float mode
  - Streaming: Bubble with streaming={true} + typing effect
  - Error: Bubble with status='error' styling

- [x] **2.3** Create ChatSidebar component (`src/pages/chat/components/ChatSidebar.tsx`)
  - Conversations component with backend session data
  - Creation button, delete menu, active switching

## Phase 3: Pages & Integration

- [x] **3.1** Create /chat page (`src/pages/chat/index.tsx`)
  - Sidebar + ChatPanel layout
  - Wire up useChat hook

- [x] **3.2** Create ChatFloat component (`src/components/ChatFloat/index.tsx`)
  - FloatButton + Popover + ChatPanel compact
  - Link to open /chat full page

- [x] **3.3** Integrate ChatFloat into BaseLayouts.tsx
  - Import ChatFloat, render when logged in

## Dependencies

- 1.1 → blocks 1.2, 1.3, 1.4, 2.1, 2.2, 2.3
- 1.2 → blocks 1.3
- 1.3 → blocks 1.4
- 1.4 → blocks 2.2, 2.3, 3.1, 3.2
- 2.1 → blocks 2.2
- 2.2 → blocks 3.1, 3.2
- 2.3 → blocks 3.1
- 3.1, 3.2 → blocks 3.3
