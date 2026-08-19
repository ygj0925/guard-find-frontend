## ADDED Requirements

### Requirement: Dictionary Tag Component
系统 SHALL 提供字典标签组件，用于展示字典项。

#### Scenario: Render dictionary tag
- **WHEN** 传入字典编码和字典值
- **THEN** 组件从字典数据中查找对应项，使用配置的标签颜色渲染 Tag

#### Scenario: Custom tag color
- **WHEN** 字典项配置了自定义标签颜色
- **THEN** Tag 组件使用配置的颜色渲染

#### Scenario: Dictionary not found
- **WHEN** 字典编码或值不存在
- **THEN** 组件显示原始值或空内容

### Requirement: Dictionary Badge Component
系统 SHALL 提供字典徽章组件，用于展示字典项状态。

#### Scenario: Render dictionary badge
- **WHEN** 传入字典编码和字典值
- **THEN** 组件从字典数据中查找对应项，使用配置的徽章颜色和状态渲染 Badge

#### Scenario: Custom badge style
- **WHEN** 字典项配置了自定义徽章颜色和状态
- **THEN** Badge 组件使用配置的样式渲染

### Requirement: Dictionary Select Component
系统 SHALL 提供字典下拉选择组件。

#### Scenario: Load dictionary options
- **WHEN** 组件挂载时
- **THEN** 组件从字典数据中加载选项列表

#### Scenario: Select dictionary option
- **WHEN** 用户选择一个选项
- **THEN** 组件触发 onChange 回调，传递字典值

#### Scenario: Custom option render
- **WHEN** 需要自定义选项展示
- **THEN** 组件支持自定义渲染函数

### Requirement: Dictionary Radio Component
系统 SHALL 提提供字典单选组件。

#### Scenario: Render dictionary radio
- **WHEN** 传入字典编码
- **THEN** 组件从字典数据中加载选项，渲染 Radio.Group

#### Scenario: Select radio option
- **WHEN** 用户选择一个选项
- **THEN** 组件触发 onChange 回调，传递字典值

### Requirement: Dictionary Data Provider
系统 SHALL 提供字典数据提供者，管理字典数据的加载和缓存。

#### Scenario: Load dictionary data
- **WHEN** 应用初始化时
- **THEN** 系统加载所有字典数据并缓存

#### Scenario: Refresh dictionary data
- **WHEN** 字典数据发生变化时
- **THEN** 系统刷新对应字典的缓存数据

#### Scenario: Dictionary data access
- **WHEN** 组件需要字典数据时
- **THEN** 从缓存中获取，避免重复请求

### Requirement: Dictionary Data Hooks
系统 SHALL 提供字典数据访问 hooks。

#### Scenario: useDict hook
- **WHEN** 组件需要访问字典数据
- **THEN** 使用 useDict hook 获取字典数据和加载状态

#### Scenario: useDictItem hook
- **WHEN** 组件需要访问单个字典项
- **THEN** 使用 useDictItem hook 获取字典项详情
