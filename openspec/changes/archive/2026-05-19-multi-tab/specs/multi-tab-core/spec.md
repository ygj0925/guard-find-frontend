# Multi-Tab Core

## Overview

多标签页核心功能：Tab 状态管理、Tab 栏 UI、页面缓存、Layout 集成。

## Tab State Model

- UMI Model: `src/models/multiTab.ts`
- 监听 `location.pathname` 自动管理 Tab 列表
- Tab title 从 `RouteUtils.getMenuDict()` 解析
- 提供 addTab / removeTab / removeLeft / removeRight / removeOthers / clear

## Tab Bar UI

- 基于 `<Tabs type="editable-card" hideAdd />`
- 右键 Dropdown 菜单：刷新、关闭当前、关闭左侧、关闭右侧、关闭其他
- tabBarExtraContent 放操作下拉按钮
- 两种风格 (default / card) 通过 CSS class 切换
- 固定在 Header 下方 (position: fixed)

## KeepAlive Integration

- `keepalive-for-react-router` 的 `KeepAliveRouteOutlet` 替换 `<Outlet />`
- `aliveRef` 用于程序化销毁缓存（关闭标签时）
- `exclude` 排除 /user/login 和 /404
- `max={20}` 限制最大缓存数

## Acceptance Criteria

- [ ] 导航到新页面自动创建标签
- [ ] 点击标签切换页面
- [ ] 关闭标签销毁缓存
- [ ] 切走后再切回，页面状态保留（表单值、滚动位置）
- [ ] 右键菜单：刷新/关闭当前/关闭左侧/关闭右侧/关闭其他 功能正常
- [ ] 最后一个标签不允许关闭
- [ ] default / card 两种风格可切换
- [ ] multiTab 设置关闭时回退到普通 Outlet
- [ ] 登出时清除所有缓存
- [ ] 登录页、404 页面不缓存
