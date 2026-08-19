# Proposal: Multi-Tab Page Navigation

## Problem

当前项目每次导航到新页面时，旧页面会完全卸载。用户在表单中填写的数据、列表滚动位置、筛选条件等状态全部丢失。对于企业级管理应用，用户经常需要在多个页面间频繁切换，缺少标签页功能严重影响使用体验。

参考项目 ballcat-ui-react 已实现了完整的多标签页功能（基于 react-activation），但该方案与当前项目的技术栈不兼容（Mako 打包器 + React 19）。

## Solution

使用 `keepalive-for-react` v5 + `keepalive-for-react-router` v5 实现页面缓存，配合自定义 Tab 栏 UI 和 UMI Model 状态管理，提供浏览器式多标签页导航体验。

### 核心能力

- 标签页自动随路由导航创建
- 页面切走后状态完整保留（表单值、滚动位置、组件状态）
- 关闭标签页时释放缓存
- 右键菜单：刷新当前、关闭当前、关闭左侧、关闭右侧、关闭其他
- 两种视觉风格：default（平铺）/ card（卡片）
- 可通过 SettingDrawer 开关

### 技术选型

| 方案 | 选择 | 原因 |
|------|------|------|
| 缓存库 | keepalive-for-react v5 | 无需 Babel 插件，支持 React 19.2+，提供 aliveRef API |
| React 版本 | 升级到 ^19.2.0 | keepalive-for-react v5 的 enableActivity 需要 19.2+ |
| Tab 状态 | UMI Model (multiTab) | 与项目现有模式一致，比依赖缓存库内部状态更可控 |
| Tab UI | Ant Design Tabs (editable-card) | 与 ballcat 一致，成熟的交互体验 |

## Scope

### In Scope

- Tab 栏组件 (MultiTab)
- 页面缓存 (KeepAliveOutlet 替换 Outlet)
- Tab 状态管理 Model
- 右键菜单操作
- default / card 两种风格
- 登录/登出时清理缓存
- Layout 集成

### Out of Scope

- Tab 拖拽排序（ballcat 也未实现）
- Tab 持久化到 localStorage（刷新后重建，与 ballcat 一致）
- 内容全屏模式（可后续添加）
