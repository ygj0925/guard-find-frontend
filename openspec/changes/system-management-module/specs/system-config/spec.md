## ADDED Requirements

### Requirement: System Config List Display
系统 SHALL 提供系统配置列表页面，支持分页查询和条件筛选。

#### Scenario: Config list with pagination
- **WHEN** 用户访问系统配置页面
- **THEN** 系统显示配置列表，包含配置名称、配置Key、配置值、分类、备注等字段

#### Scenario: Config list filtering
- **WHEN** 用户输入筛选条件（配置名称、Key、分类）并点击查询
- **THEN** 系统根据条件过滤配置列表

### Requirement: System Config Creation
系统 SHALL 提供创建配置功能。

#### Scenario: Create config successfully
- **WHEN** 用户填写配置名称、Key、Value、分类、备注并提交
- **THEN** 系统创建配置并刷新列表

#### Scenario: Config key validation
- **WHEN** 用户输入的配置Key为空或已存在
- **THEN** 系统显示验证错误，阻止提交

### Requirement: System Config Editing
系统 SHALL 提供编辑配置功能，配置Key不可修改。

#### Scenario: Edit config form
- **WHEN** 用户点击编辑按钮
- **THEN** 系统弹出编辑表单，预填配置信息，配置Key字段禁用

#### Scenario: Update config successfully
- **WHEN** 用户修改信息并提交
- **THEN** 系统更新配置并刷新列表

### Requirement: System Config Deletion
系统 SHALL 提供删除配置功能，需二次确认。

#### Scenario: Delete config confirmation
- **WHEN** 用户点击删除按钮
- **THEN** 系统显示确认对话框

#### Scenario: Delete config successfully
- **WHEN** 用户确认删除
- **THEN** 系统删除配置并刷新列表
