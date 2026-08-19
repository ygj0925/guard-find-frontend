# Design: Chat Application

## Architecture

```
src/pages/chat/                      ← /chat 路由页面
├── index.tsx                        ← 页面入口 (Sidebar + ChatPanel)
├── components/
│   ├── ChatPanel.tsx                ← 核心聊天面板 (页面/悬浮窗共用)
│   ├── ChatSidebar.tsx              ← 会话列表 (基于 Conversations)
│   └── ChatWelcome.tsx              ← 空状态欢迎页 (基于 Welcome + Prompts)
├── hooks/
│   ├── useChat.ts                   ← 多会话消息状态管理
│   └── useChatStream.ts            ← SSE 流式请求 hook
├── types/
│   └── index.ts                     ← 所有类型定义
└── utils/
    └── chatStream.ts                ← fetch SSE 底层封装

src/components/ChatFloat/
└── index.tsx                        ← 全局悬浮窗 (FloatButton + Popover + ChatPanel)
```

## Data Flow

```
                    ┌─────────────────────────────┐
                    │     useChat (状态中心)        │
                    │                             │
                    │  sessions[]     ◀── 后端 API │
                    │  activeSessionId             │
                    │  messagesMap{}               │
                    │                             │
                    │  sendMessage()               │
                    │  createSession()             │
                    │  deleteSession()             │
                    │  switchSession()             │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ChatSidebar      ChatPanel        ChatFloat
        (Conversations)  (Bubble.List     (Popover
                          + Sender)        compact)
```

## Component Design

### ChatPanel (核心，页面和悬浮窗共用)

Props:
- `compact?: boolean` — 悬浮窗模式，UI 更紧凑
- `sessionId: string` — 当前会话 ID
- `messages: ChatMessage[]` — 当前会话消息列表
- `loading: boolean` — 是否正在流式响应
- `onSend: (query: string) => void` — 发送消息
- `onCancel: () => void` — 取消当前流

内部结构:
```
┌──────────────────────────────┐
│  ChatWelcome (messages为空时) │
│  ──── 或 ────                │
│  Bubble.List                 │
│    items = messages.map(m => │
│      role: m.role === 'user' │
│            ? 'user' : 'ai'   │
│      content: m.content      │
│      placement: user→end     │
│                ai→start      │
│      streaming: m.status === │
│               'streaming'    │
│      typing: { effect:       │
│        'typing' }            │
│    )                         │
├──────────────────────────────┤
│  Sender                      │
│    loading={streaming}       │
│    onSubmit={onSend}         │
│    onCancel={onCancel}       │
└──────────────────────────────┘
```

### ChatSidebar (仅 /chat 页面)

基于 `Conversations` 组件:
- `items` 从后端会话列表 API 获取
- `activeKey` 绑定 `activeSessionId`
- `onActiveChange` 切换会话
- `creation` 配置新建会话按钮
- `menu` 提供右键删除/重命名

### ChatFloat (全局悬浮窗)

```
FloatButton (右下角图标)
  │
  ▼ click
Popover
  ├── 宽度 ~400px，高度 ~600px
  ├── 顶部: 会话标题 + 关闭按钮
  └── 内容: ChatPanel compact={true}
```

- 使用独立的 useChat 实例（或共享全局状态）
- 默认使用最近一个会话，不展示会话列表
- 点击「在新窗口打开」跳转到 /chat 页面

## SSE Streaming Design

### chatStream.ts (底层工具)

```typescript
async function* chatSSE(url, body, signal):
  AsyncGenerator<ChatStreamChunk>

  1. fetch(url, { method: 'POST', body, signal, headers })
  2. reader = response.body.getReader()
  3. 循环读取 + 解码 UTF-8
  4. 按 \n\n 分割 SSE events
  5. 解析 data: JSON → yield ChatStreamChunk
  6. 遇到 [DONE] 或 status:'error' → return
```

### useChatStream.ts (React Hook)

```typescript
useChatStream() → {
  streaming: boolean,
  send(url, body, callbacks: {
    onChunk(token: string): void,
    onComplete(): void,
    onError(err: Error): void,
  }): void,
  cancel(): void,
}

内部:
- 维护 AbortController 用于取消
- streaming 状态标记
- cancel() 调用 abort + 清理
```

### useChat.ts (状态管理)

```typescript
useChat() → {
  sessions: Session[],
  activeSessionId: string,
  messages: ChatMessage[],  // 当前会话的消息
  streaming: boolean,

  sendMessage(query: string): void,
  createSession(): void,
  deleteSession(id: string): void,
  switchSession(id: string): void,
  cancelStream(): void,
  loadSessions(): void,
  loadHistory(sessionId: string): void,
}

sendMessage 流程:
  1. push userMsg { role:'user', content:query, status:'success' }
  2. push aiMsg   { role:'ai', content:'', status:'loading' }
  3. 调用 useChatStream.send()
  4. onChunk → aiMsg.content += token, status='streaming'
  5. onComplete → aiMsg.status = 'success'
  6. onError → aiMsg.status = 'error', aiMsg.content = 错误提示
```

## Type Definitions

```typescript
type ChatMessage = {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'local' | 'loading' | 'streaming' | 'success' | 'error';
  time?: string;
}

type Session = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt?: string;
}

type ChatStreamChunk = {
  content: string;
  time: string;
  status: 'success' | 'error';
  role: 'assistant' | 'user';
}

type ChatRequest = {
  query: string;
  sessionId?: string;
}
```

## Error Handling

| 场景 | 处理方式 |
|------|---------|
| 网络断连 | aiMsg.status='error', content 显示 "网络连接异常，请检查网络后重试" |
| 流中断 (AbortError) | aiMsg.status='error', 保留已接收内容 + 追加 "[已中断]" |
| 后端返回 status:'error' | aiMsg.status='error', 显示后端错误信息 |
| HTTP 非 200 | aiMsg.status='error', 根据状态码显示中文提示 |
| 会话 API 失败 | antd message.error 全局提示 |

## Integration Points

- **路由**: 后端菜单配 uri=`chat/index`，path=`/chat`，动态路由自动加载
- **全局悬浮窗**: 在 `src/layouts/BaseLayouts.tsx` 中引入 `ChatFloat`
- **请求层**: SSE 请求独立实现，不走 UMI request 插件（因为需要 ReadableStream）
- **Token**: 从 `Token.get()` 获取 Bearer token，附加到 SSE 请求 header
