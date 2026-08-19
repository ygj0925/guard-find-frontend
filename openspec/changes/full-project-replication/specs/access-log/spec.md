## ADDED Requirements

### Requirement: Access Log Display
系统 SHALL 提供访问日志列表页面，支持分页查询和时间范围筛选。

#### Scenario: Access log list with pagination
- **WHEN** 用户访问访问日志页面
- **THEN** 系统显示访问日志列表，包含追踪ID、用户名、请求IP、URI、方法、耗时、状态码、错误消息等字段

#### Scenario: Access log expand details
- **WHEN** 用户点击展开某条日志
- **THEN** 系统显示请求参数(reqParams)、请求体(reqBody)、响应结果(result)、UserAgent等详细信息

#### Scenario: Access log time range filter
- **WHEN** 用户选择时间范围并点击查询
- **THEN** 系统根据时间范围过滤日志列表

### Requirement: Access Log i18n
访问日志页面 SHALL 支持国际化。

#### Scenario: Switch language
- **WHEN** 用户切换语言为英文
- **THEN** 页面标题、列名、按钮等文本切换为英文
