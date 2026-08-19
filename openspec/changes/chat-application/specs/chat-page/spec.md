# Chat Page

## Overview

`/chat` 全功能聊天页面，左侧会话列表 + 右侧聊天面板。

## Layout

```
┌────────────┬──────────────────────────────┐
│            │                              │
│ ChatSidebar│       ChatPanel              │
│ (240px)    │                              │
│            │  Welcome / Bubble.List       │
│ 会话列表    │                              │
│ + 新建按钮  │                              │
│            │  Sender                      │
│            │                              │
└────────────┴──────────────────────────────┘
```

## Components

### ChatSidebar

- 基于 `Conversations` 组件
- items 从后端会话列表 API 获取
- creation 按钮新建会话
- menu 右键菜单：删除会话
- activeKey 绑定当前会话

### ChatPanel

- 核心聊天交互面板，与 ChatFloat 共用
- compact prop 控制紧凑模式
- 空消息时显示 ChatWelcome (Welcome + Prompts)
- 有消息时显示 Bubble.List
- 底部 Sender 输入框

### ChatWelcome

- 基于 Welcome 组件 + Prompts
- 显示欢迎语和快捷提问建议
- 点击 Prompt 直接发送消息

## Route

后端菜单配置 `uri: "chat/index"`，由动态路由系统自动加载。

## Acceptance Criteria

- [ ] 页面左右两栏布局，响应式
- [ ] 会话列表加载、新建、删除、切换正常
- [ ] 发送消息后 AI 回复逐字显示（streaming + typing 效果）
- [ ] 流式响应期间 Sender 显示取消按钮
- [ ] 错误状态下消息气泡显示错误提示
- [ ] 空会话显示欢迎页和快捷提问
