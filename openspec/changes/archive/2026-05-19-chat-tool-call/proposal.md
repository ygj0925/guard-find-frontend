# Chat Tool Call

## Problem

当前聊天系统仅支持纯文本流式对话，无法展示 AI 调用工具的过程和结果。用户看不到 AI 正在执行什么操作（如查询会议室、查询参会人员），缺乏透明度和信任感。

## Solution

在现有聊天系统基础上扩展工具调用能力，通过 SSE 流式推送工具执行状态（running → success/error），使用 `@ant-design/x` 的 `ThoughtChain` 组件实时渲染工具调用链，让用户清晰看到 AI 的"思考过程"。

### 核心能力

- **工具状态流式推送**：SSE 中穿插 tools 字段，实时更新工具执行状态
- **工具状态合并**：按 tool.id 增量合并，支持同一工具多次状态更新
- **ThoughtChain 渲染**：每个工具调用渲染为 ThoughtChain.Item，带状态图标、连接线、可折叠代码/结果
- **代码高亮**：工具的 `code` 字段使用 CodeHighlighter 渲染
- **向后兼容**：无 tools 字段的消息保持原有渲染方式

### 不包含

- 工具调用的前端触发/审批（工具由后端 AI Agent 自主决策调用）
- 工具结果的二次交互（如点击结果跳转）
- 自定义工具注册

## API

- `POST /chat` — 发送消息，SSE 流式响应（在现有基础上扩展）
  - Request: `{ query: string, sessionId?: string }`
  - Response: `text/event-stream`，每个 event 扩展为：
    ```json
    {
      "content": "string",
      "time": "string",
      "status": "success | error",
      "role": "assistant | user",
      "tools": [
        {
          "id": "string",
          "name": "string",
          "code": "string",
          "status": "pending | running | success | error",
          "output": "any",
          "error": "string"
        }
      ]
    }
    ```
  - `tools` 字段可选，仅在 AI 调用工具时出现
  - 同一个 tool.id 可能出现在多个 SSE event 中（状态更新）

## Tech Stack

- `@ant-design/x` v2 — ThoughtChain、CodeHighlighter、Bubble.contentRender
- 复用现有 chatSSE + useChatStream + useChat 架构，仅做增量扩展
