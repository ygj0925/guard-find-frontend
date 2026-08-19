# Design: Chat Tool Call

## Architecture

在现有文件上做增量修改，不新增文件：

```
src/pages/chat/
├── types/
│   └── index.ts                 ← 新增 ToolCall、ToolCallChunk 类型
│                                   扩展 ChatMessage、ChatStreamChunk
├── utils/
│   └── chatStream.ts            ← SSE 解析器识别 tools 字段
├── hooks/
│   ├── useChatStream.ts         ← 新增 onToolUpdate 回调
│   └── useChat.ts               ← 工具状态合并逻辑
└── components/
    └── ChatPanel.tsx            ← contentRender + ThoughtChain 渲染
```

## Data Flow

```
  SSE Event (含 tools)
       │
       ▼
  chatSSE() ── yield ChatStreamChunk { content, tools? }
       │
       ▼
  useChatStream ── onChunk(chunk)
       │              传递完整 chunk（含 tools）
       ▼
  useChat.sendMessage()
       │
       ├─ content 部分 → 追加到 message.content
       │
       └─ tools 部分 → mergeTools(message.tools, chunk.tools)
              │
              │  按 tool.id 合并:
              │    已有 → 更新 status/output/error
              │    新的 → 追加到数组
              ▼
  message: ChatMessage { content, tools? }
       │
       ▼
  ChatPanel → Bubble.List
       │
       │  roles.ai.contentRender(message)
       ▼
  ┌─────────────────────────────────────┐
  │  有 tools?                          │
  │  ├─ 是 → ThoughtChain + 文本内容    │
  │  └─ 否 → 纯文本内容（不变）          │
  └─────────────────────────────────────┘
```

## Type Definitions

```typescript
// 新增类型
type ToolCall = {
  id: string;
  name: string;
  code: string;
  status: 'running' | 'success' | 'error';
  output?: any;
  error?: string;
};

type ToolCallChunk = {
  id: string;
  name: string;
  code: string;
  status: 'pending' | 'running' | 'success' | 'error';
  output?: any;
  error?: string;
};

// 扩展现有类型
type ChatMessage = {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'local' | 'loading' | 'streaming' | 'success' | 'error';
  time?: string;
  tools?: ToolCall[];       // ← 新增
};

type ChatStreamChunk = {
  content: string;
  time: string;
  status: 'success' | 'error';
  role: 'assistant' | 'user';
  tools?: ToolCallChunk[];  // ← 新增
};
```

## Tool Status Merge Strategy

SSE 会推送多次 tools 更新，需要按 `tool.id` 增量合并：

```
SSE chunk 1:  tools: [{ id:"t1", name:"查询会议室", status:"running" }]
SSE chunk 2:  tools: [{ id:"t1", status:"success", output:{rooms:[...]} }]
SSE chunk 3:  tools: [{ id:"t2", name:"查询参会人员", status:"running" }]

合并后 message.tools:
  [
    { id:"t1", name:"查询会议室", status:"success", output:{rooms:[...]} },
    { id:"t2", name:"查询参会人员", status:"running" }
  ]
```

合并规则：
- 相同 `id` → 用新 chunk 的字段覆盖旧值（保留旧值中新 chunk 未提供的字段）
- 新 `id` → 追加到数组末尾
- `pending` 状态映射为 `running`（存储时不保留 pending）

```typescript
function mergeTools(
  existing: ToolCall[] = [],
  incoming: ToolCallChunk[] = [],
): ToolCall[] {
  const merged = [...existing];
  for (const chunk of incoming) {
    const idx = merged.findIndex((t) => t.id === chunk.id);
    const status = chunk.status === 'pending' ? 'running' : chunk.status;
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...chunk, status };
    } else {
      merged.push({ ...chunk, status });
    }
  }
  return merged;
}
```

## UI Rendering Design

### Bubble contentRender

通过 `roles.ai.contentRender` 自定义 AI 消息渲染：

```
┌─────────────────────────────────────────────────────┐
│ 🤖                                                  │
│                                                     │
│  ┊  🔧 查询会议室预约                     ✅ 成功    │
│  ┊  └─ getMeetingRoomBookings("2026-05-19")         │
│  ┊     ▶ 查看结果                                   │
│  ┊                                                  │
│  ┊  🔧 查询参会人员                     ⏳ 执行中    │
│  ┊  └─ getAttendees("room-3")                      │
│                                                     │
│  根据查询结果，3号会议室今天下午2点有一场产品评审会... │
└─────────────────────────────────────────────────────┘
```

### ThoughtChain Item 状态映射

| tool.status | ThoughtChain status | icon               | 附加效果         |
|-------------|--------------------|--------------------|-----------------|
| `running`   | `loading`          | LoadingOutlined    | blink: true     |
| `success`   | `success`          | CheckCircleOutlined| collapsible     |
| `error`     | `error`            | CloseCircleOutlined| 显示 tool.error |

### ThoughtChain Item 内容结构

```
ThoughtChain.Item
  ├── title: tool.name          （如 "查询会议室预约"）
  ├── icon: 状态图标
  ├── status: 映射后的状态
  ├── content:                   （可折叠区域）
  │   ├── CodeHighlighter        （渲染 tool.code）
  │   └── tool.output            （成功时显示结果，JSON 格式化）
  └── collapsible: true          （成功/错误时可折叠）
```

### 渲染逻辑

```
contentRender(content, info):
  message = 从 extraInfo 获取完整 ChatMessage

  if message.tools 存在且非空:
    return (
      <>
        <ThoughtChain
          items={message.tools.map(tool → ThoughtChainItem)}
          line="dashed"
        />
        {message.content && <div>{message.content}</div>}
      </>
    )
  else:
    return message.content  // 原有逻辑不变
```

## Error Handling

| 场景 | 处理方式 |
|------|---------|
| 工具执行失败 (tool.status='error') | ThoughtChain.Item 显示 error 状态 + tool.error 信息 |
| 流中断时工具仍在 running | 保持 running 状态（不自动改为 error） |
| tools 字段 JSON 解析失败 | 忽略该 chunk 的 tools，仅处理 content |
| 整体请求失败 | 复用现有错误处理，message.status='error' |

## Integration Points

- **零新文件**：所有修改在现有文件上进行
- **向后兼容**：无 tools 字段的 SSE 响应保持原有行为
- **ChatFloat 自动获益**：ChatFloat 复用 ChatPanel，无需额外改动
