## Context

当前项目 umi4-meetingroom 基于 UMI 4 + Ant Design 5 + TailwindCSS，已完成系统管理模块（用户、角色、菜单、组织、字典、配置）。现在需要复刻 ballcat-ui-react 的所有页面功能，并实现国际化支持。

参考项目使用 UMI 3 + DVA + Ant Design 4，而当前项目使用 UMI 4 + React 19 + Ant Design 5，需要适配新的 API。

## Goals / Non-Goals

**Goals:**
- 实现日志管理模块（访问日志、登录日志、操作日志）
- 实现通知管理模块（公告管理，含富文本编辑器）
- 实现国际化数据管理模块
- 实现国际化支持（zh-CN/en-US）
- 创建通用组件（Editor、Lov、MultiTab、Copy、Color）
- 现有系统管理页面增加国际化支持

**Non-Goals:**
- 不实现 WebSocket 实时通信
- 不实现多页签功能（当前项目无此需求）
- 不实现 PWA 支持
- 不实现水印功能
- 不实现 SettingDrawer 主题配置

## Decisions

### 1. 国际化方案

**决策**: 使用 UMI 4 内置的 `@umijs/max` locale 插件

**理由**:
- UMI 4 原生支持国际化，无需额外依赖
- 支持 `useIntl` hook 和 `FormattedMessage` 组件
- 与 Ant Design 5 国际化集成

**实现方式**:
```
src/locales/
  zh-CN.ts        -- 中文入口
  en-US.ts        -- 英文入口
  zh-CN/
    common.ts     -- 通用翻译
    login.ts      -- 登录翻译
    system.ts     -- 系统管理翻译
    log.ts        -- 日志翻译
    notify.ts     -- 通知翻译
  en-US/
    common.ts
    login.ts
    system.ts
    log.ts
    notify.ts
```

### 2. 富文本编辑器方案

**决策**: 使用 `@wangeditor/editor` + `@wangeditor/editor-for-react`

**理由**:
- 与 ballcat-ui-react 保持一致
- 支持图片/视频上传
- 支持只读模式

### 3. 颜色选择器方案

**决策**: 使用 `react-color`

**理由**:
- 与 ballcat-ui-react 保持一致
- 支持多种颜色选择模式

### 4. 复制组件方案

**决策**: 使用 `react-copy-to-clipboard`

**理由**:
- 与 ballcat-ui-react 保持一致
- 轻量级，无额外依赖

### 5. 日志服务层

**决策**: 在 `src/services/web/log/` 目录下创建日志 API

```
src/services/web/log/
  accessLog.ts
  loginLog.ts
  operationLog.ts
  typings.ts
```

### 6. 通知服务层

**决策**: 在 `src/services/web/notify/` 目录下创建通知 API

```
src/services/web/notify/
  announcement.ts
  typings.ts
```

## Risks / Trade-offs

### 风险 1: 编辑器依赖较大
**风险**: wangeditor 包体积较大
**缓解**: 使用动态导入，按需加载

### 风险 2: API 接口差异
**风险**: 日志和通知的 API 接口可能与参考项目不同
**缓解**: 使用现有类型定义，发现差异时调整

### 风险 3: 国际化工作量大
**风险**: 翻译文本较多，工作量大
**缓解**: 优先实现核心功能的国际化，其他逐步补充
