## ADDED Requirements

### Requirement: Operation Log Display
系统 SHALL 提供操作日志列表页面，支持分页查询和时间范围筛选。

#### Scenario: Operation log list with pagination
- **WHEN** 用户访问操作日志页面
- **THEN** 系统显示操作日志列表，包含追踪ID、日志消息、类型、请求IP、URI、方法、耗时、操作人、状态等字段

#### Scenario: Operation log expand details
- **WHEN** 用户点击展开某条日志
- **THEN** 系统显示请求参数(params)和UserAgent等详细信息

#### Scenario: Operation log type display
- **WHEN** 日志包含类型字段
- **THEN** 系统使用 DictTag 组件展示日志类型

#### Scenario: Operation log time range filter
- **WHEN** 用户选择时间范围并点击查询
- **THEN** 系统根据时间范围过滤日志列表
