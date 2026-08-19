# Design: Multi-Tab Page Navigation

## Architecture

```
src/models/multiTab.ts                    ← Tab 状态管理
src/components/MultiTab/index.tsx         ← Tab 栏 + 右键菜单
src/components/MultiTab/index.css         ← Tab 样式 (default/card)
src/components/KeepAliveOutlet/index.tsx  ← 缓存 Outlet 封装
```

## Data Flow

```
路由变化 (location.pathname)
    │
    ├───→ multiTab Model (useEffect 监听 location)
    │       ├─ 查找 menuDict[pathname] 获取标题
    │       ├─ tabs 中无此 path → push 新 Tab
    │       └─ 更新 activeKey = pathname
    │
    ├───→ KeepAliveOutlet (keepalive-for-react-router)
    │       ├─ activeCacheKey = pathname
    │       ├─ 自动缓存已访问页面
    │       └─ aliveRef 暴露给 MultiTab 用于销毁缓存
    │
    └───→ MultiTab UI
            ├─ 从 multiTab model 读取 tabs + activeKey
            ├─ 点击 tab → history.push(tab.key)
            ├─ 关闭 tab → model.removeTab() + aliveRef.destroy()
            └─ 右键菜单 → closeLeft/Right/Other/Refresh
```

## Component Design

### multiTab Model (`src/models/multiTab.ts`)

```typescript
interface TabItem {
  key: string;       // pathname
  title: string;     // 从 menuDict 获取
  closable: boolean; // 最后一个标签不可关闭
}

// 状态
tabs: TabItem[]
activeKey: string

// 方法
addTab(path, title)       // 路由变化时自动调用
removeTab(key)            // 关闭标签
removeLeft(key)           // 关闭左侧
removeRight(key)          // 关闭右侧
removeOthers(key)         // 关闭其他
setActiveKey(key)         // 切换激活
clear()                   // 清除全部（登出时）
```

路由变化监听：model 内部 useEffect 监听 `location.pathname`，自动添加/激活 Tab。

### MultiTab 组件 (`src/components/MultiTab/index.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│  [首页] [用户管理 ×] [角色管理 ×] [当前页 ×]     ▼ (操作菜单) │
└──────────────────────────────────────────────────────────────┘
       │                                          │
       │ 右键任意位置弹出菜单                       │ 点击 ▼ 弹出菜单
       ▼                                          ▼
   ┌────────────────┐
   │ 刷新当前        │
   │ 关闭当前        │
   │ 关闭左侧        │
   │ 关闭右侧        │
   │ 关闭其他        │
   └────────────────┘
```

- 基于 Ant Design `<Tabs type="editable-card" hideAdd />`
- `activeKey` 绑定当前路由
- `onChange` → `history.push(key)`
- `onEdit` (remove) → 关闭标签 + 销毁缓存
- 右键菜单用 `<Dropdown trigger={['contextMenu']}>`
- 操作按钮用 `tabBarExtraContent`
- 需要 `aliveRef` 访问 → 通过 React Context 或 props 传递

### KeepAliveOutlet (`src/components/KeepAliveOutlet/index.tsx`)

```typescript
import KeepAliveRouteOutlet from 'keepalive-for-react-router';
import { useKeepAliveRef } from 'keepalive-for-react';

// 对外暴露 aliveRef
const KeepAliveOutlet = ({ aliveRef }) => (
  <KeepAliveRouteOutlet
    aliveRef={aliveRef}
    max={20}
    exclude={[/^\/user\//, '/404']}
  />
);
```

- 替换 BaseLayouts 中的 `<Outlet />`
- `exclude` 排除登录页和 404
- `max={20}` 限制最大缓存数
- `aliveRef` 传递给 MultiTab 组件使用

## Layout Integration

```
<ProLayout>
  ┌──────────────────────────────────────┐
  │ {multiTab && <MultiTab              │
  │    aliveRef={aliveRef} />}           │
  ├──────────────────────────────────────┤
  │ <WaterMark>                          │
  │   {multiTab                          │
  │     ? <KeepAliveOutlet               │
  │         aliveRef={aliveRef} />       │
  │     : <Outlet />                     │
  │   }                                  │
  │ </WaterMark>                         │
  └──────────────────────────────────────┘
  <SettingDrawer />
  {isLogin && <ChatFloat />}
</ProLayout>
```

当 `multiTab` 关闭时，回退到普通 `<Outlet />`，不引入缓存。

## Tab Style

### Default 风格
- Tab 栏高度 40px
- 底部阴影分隔
- 选中 Tab 背景色高亮
- 固定定位于 Header 下方

### Card 风格
- Tab 栏背景为 layout body 色
- 每个 Tab 为圆角卡片
- Tab 间距 8px
- 无底部阴影

使用 CSS Module 或普通 CSS 实现，两种风格通过 className 切换。

## Cache Lifecycle

```
登录成功 → window.location.href (全量刷新)
  → render() 获取路由
  → patchClientRoutes() 注入路由
  → 首页加载，创建第一个 Tab + 缓存

导航到新页面
  → multiTab model 添加 Tab
  → KeepAliveOutlet 缓存新页面
  → 旧页面 display:none (状态保留)

关闭标签
  → multiTab model 移除 Tab
  → aliveRef.destroy(key) 销毁缓存
  → 若关闭当前标签，导航到相邻标签

登出
  → aliveRef.destroyAll() 清除所有缓存
  → multiTab model clear()
  → 跳转登录页
```

## Dependencies Change

```diff
+ keepalive-for-react: ^5.0.11
+ keepalive-for-react-router: ^5.0.7
- react-activation: ^0.13.4  (已安装但未使用，移除)

# package.json 中 react/react-dom 已是 ^19.1.0
# npm update 会自动升级到 19.2.x
```

## Error Handling

| 场景 | 处理 |
|------|------|
| 禁止关闭最后一个标签 | 提示 "禁止关闭最后一个标签页!" |
| 无可关闭标签 | 提示 "没有可以被关闭的标签页!" |
| 缓存超出 max | keepalive-for-react 自动 LRU 淘汰最久未访问的 |
| 404 页面进入标签 | 自动排除，不缓存 |
