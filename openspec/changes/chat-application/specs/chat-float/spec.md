# Chat Float

## Overview

全局悬浮聊天入口，FloatButton + Popover 形式，嵌入 ChatPanel 紧凑模式。

## Behavior

```
FloatButton (右下角，聊天图标)
     │
     ▼ click
Popover (width: 400px, height: 600px)
  ├── Header: 会话标题 + 「打开完整页面」链接 + 关闭
  └── Body: ChatPanel compact={true}
```

- 默认使用最近一个会话
- 不展示会话列表（紧凑模式）
- 「打开完整页面」链接跳转 /chat 并传递当前 sessionId
- 点击 Popover 外部关闭

## Integration

在 `src/layouts/BaseLayouts.tsx` 中引入 `ChatFloat`，登录状态下全局显示。

## Acceptance Criteria

- [ ] FloatButton 固定在右下角
- [ ] 点击弹出 Popover，包含完整聊天功能
- [ ] 紧凑模式下隐藏会话列表
- [ ] 可跳转到 /chat 完整页面
- [ ] 登录页面不显示
