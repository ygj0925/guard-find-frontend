## Why

当前项目 umi4-meetingroom 已完成系统管理模块的基础实现，但与参考项目 ballcat-ui-react 相比，还缺少日志管理、通知管理、国际化等重要功能模块。需要将 ballcat-ui-react 的所有页面功能完整复刻到当前项目，使用新的技术架构（UMI 4 + Ant Design 5 + TailwindCSS），并实现完整的国际化支持。

## What Changes

### 新增页面模块
- 日志管理：访问日志、登录日志、操作日志
- 通知管理：公告管理（含富文本编辑器、接收人筛选）
- 国际化管理：国际化数据管理、字典项国际化配置

### 新增公共组件
- Editor 富文本编辑器组件
- Lov 关联选择组件
- MultiTab 多页签组件
- Copy 一键复制组件
- Color 颜色选择器组件
- Table 表格封装组件

### 国际化实现
- 创建 locales 目录结构（zh-CN/en-US）
- 登录页国际化
- 通用操作国际化（成功/失败/确认等）
- 表单操作国际化（查看/编辑/新增/删除/操作列）
- 组件国际化（字典/头像裁剪/多页签等）

### 增强现有功能
- 系统管理页面国际化支持
- 字典组件国际化支持（根据 locale 自动切换文本）

## Capabilities

### New Capabilities
- `access-log`: 访问日志管理，展示请求详情
- `login-log`: 登录日志管理，展示登录事件
- `operation-log`: 操作日志管理，展示操作记录
- `announcement`: 公告管理，支持富文本编辑和接收人筛选
- `i18n-data`: 国际化数据管理，支持多语言配置
- `editor-component`: 富文本编辑器组件
- `lov-component`: 关联选择组件
- `multitab-component`: 多页签组件
- `copy-component`: 一键复制组件
- `color-component`: 颜色选择器组件
- `i18n-system`: 系统国际化支持

### Modified Capabilities
- `user-management`: 增加国际化支持
- `role-management`: 增加国际化支持
- `menu-management`: 增加国际化支持
- `organization-management`: 增加国际化支持
- `dict-management`: 增加国际化支持
- `system-config`: 增加国际化支持
- `dict-components`: 增加国际化文本切换

## Impact

- **新增文件**: `src/pages/log/`、`src/pages/notify/`、`src/locales/` 等目录
- **新增文件**: `src/components/Editor/`、`src/components/Lov/`、`src/components/MultiTab/` 等组件
- **新增依赖**: `wangeditor`、`react-color`、`react-copy-to-clipboard`、`react-activation`
- **API**: 需要后端提供 log/*、notify/*、i18n/* 等接口
- **国际化**: 需要后端菜单支持 i18nTitle 字段
