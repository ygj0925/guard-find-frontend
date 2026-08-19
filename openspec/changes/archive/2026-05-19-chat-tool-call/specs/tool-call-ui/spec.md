# Tool Call UI

## Overview

工具调用的 UI 渲染层：基于 ThoughtChain + CodeHighlighter 在聊天气泡内展示工具调用过程。

## ChatPanel contentRender (`components/ChatPanel.tsx`)

- AI 角色使用 `contentRender` 自定义渲染
- 通过 `extraInfo` 获取完整 ChatMessage（含 tools）
- 有 tools 时渲染 ThoughtChain + 文本内容
- 无 tools 时保持原有纯文本渲染

## ThoughtChain 渲染

- 每个 ToolCall 映射为一个 ThoughtChain.Item
- `title` = tool.name
- `status` 映射: running→loading, success→success, error→error
- `icon` 根据 status 选择: LoadingOutlined / CheckCircleOutlined / CloseCircleOutlined
- `blink` = tool.status === 'running'
- `collapsible` = tool.status !== 'running'
- `line` = "dashed"

## ThoughtChain.Item Content

- `code` 字段使用 CodeHighlighter 渲染
- `output` 字段在成功时以 JSON 格式化展示
- `error` 字段在失败时展示错误信息

## Acceptance Criteria

- [ ] 无 tools 的消息渲染不受影响（向后兼容）
- [ ] tools 为空数组时不渲染 ThoughtChain
- [ ] running 状态工具显示 loading 图标和 blink 动画
- [ ] success 状态工具可折叠，展开显示 code + output
- [ ] error 状态工具显示错误图标和 error 信息
- [ ] ThoughtChain 和文本内容在同一气泡内正确排列
- [ ] ChatFloat（紧凑模式）中工具调用同样正常渲染
