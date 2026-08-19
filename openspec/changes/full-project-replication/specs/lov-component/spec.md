## ADDED Requirements

### Requirement: Lov Component
系统 SHALL 提供关联选择组件（Lov = List of Values）。

#### Scenario: Lov open modal
- **WHEN** 用户点击Lov组件
- **THEN** 系统弹出模态框，显示可选择的列表

#### Scenario: Lov search
- **WHEN** 用户在模态框中输入关键字搜索
- **THEN** 系统根据关键字过滤列表数据

#### Scenario: Lov single select
- **WHEN** Lov配置为单选模式
- **THEN** 用户只能选择一条记录

#### Scenario: Lov multiple select
- **WHEN** Lov配置为多选模式
- **THEN** 用户可以选择多条记录

#### Scenario: Lov confirm selection
- **WHEN** 用户点击确认按钮
- **THEN** Lov组件触发onChange回调，返回选中的值
