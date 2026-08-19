# Tasks: Multi-Tab Page Navigation

## Phase 1: Dependencies & Setup

- [x] **1.1** Update dependencies
  - npm install keepalive-for-react@^5.0.11 keepalive-for-react-router@^5.0.7
  - npm uninstall react-activation
  - npm update react react-dom (升级到 19.2.x)
  - 确认 npm run tsc 通过

## Phase 2: Core

- [x] **2.1** Create multiTab Model (`src/models/multiTab.ts`)
  - TabItem type: { key, title, closable }
  - 状态: tabs[], activeKey
  - 监听 location.pathname 自动 addTab
  - 从 RouteUtils.getMenuDict() 获取 title
  - 方法: removeTab, removeLeft, removeRight, removeOthers, clear

- [x] **2.2** Create KeepAliveOutlet component (`src/components/KeepAliveOutlet/index.tsx`)
  - 包装 KeepAliveRouteOutlet
  - 接收 aliveRef prop
  - exclude 登录页和 404
  - max={20}

- [x] **2.3** Create MultiTab component (`src/components/MultiTab/index.tsx`)
  - Tabs (editable-card, hideAdd)
  - 从 multiTab model 读取 tabs/activeKey
  - onChange → history.push
  - onEdit remove → removeTab + aliveRef.destroy
  - 右键 Dropdown 菜单 (刷新/关闭当前/左/右/其他)
  - tabBarExtraContent 操作按钮
  - 接收 aliveRef prop

- [x] **2.4** Create MultiTab styles (`src/components/MultiTab/index.css`)
  - default 风格: 40px 高度, 底部阴影, 选中高亮
  - card 风格: 卡片式, 圆角, 间距
  - fixed 定位 (top: 48px, 减去 sider 宽度)

## Phase 3: Integration

- [x] **3.1** Integrate into BaseLayouts.tsx
  - 创建 aliveRef (useKeepAliveRef)
  - multiTab 开启时: 渲染 MultiTab + KeepAliveOutlet
  - multiTab 关闭时: 渲染原始 Outlet
  - 内容区 marginTop 适配 Tab 栏高度
  - 从 initialState.settings 读取 multiTab/multiTabStyle

- [x] **3.2** Handle login/logout cache cleanup
  - 登出时调用 aliveRef.destroyAll() 清除所有缓存
  - 确保登录页不被缓存

## Dependencies

- 1.1 → blocks 2.1, 2.2, 2.3, 2.4
- 2.1 → blocks 2.3, 3.1
- 2.2 → blocks 3.1
- 2.3 → blocks 3.1
- 2.4 → blocks 2.3
- 3.1 → blocks 3.2
