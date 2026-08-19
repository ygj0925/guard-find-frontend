## ADDED Requirements

### Requirement: Login Log Display
系统 SHALL 提供登录日志列表页面，支持分页查询和时间范围筛选。

#### Scenario: Login log list with pagination
- **WHEN** 用户访问登录日志页面
- **THEN** 系统显示登录日志列表，包含追踪ID、用户名、事件类型、登录IP、浏览器、操作系统、操作信息、状态等字段

#### Scenario: Login log event type display
- **WHEN** 日志包含事件类型字段
- **THEN** 系统使用 DictTag 组件展示事件类型

#### Scenario: Login log time range filter
- **WHEN** 用户选择时间范围并点击查询
- **THEN** 系统根据时间范围过滤日志列表
