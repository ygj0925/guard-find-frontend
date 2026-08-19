## ADDED Requirements

### Requirement: System i18n Support
系统 SHALL 支持中文和英文两种语言。

#### Scenario: Language switching
- **WHEN** 用户切换语言
- **THEN** 系统所有界面文本切换为对应语言

#### Scenario: Login page i18n
- **WHEN** 用户访问登录页面
- **THEN** 登录页面显示当前语言的文本

#### Scenario: System management i18n
- **WHEN** 用户访问系统管理页面
- **THEN** 页面标题、列名、按钮、提示信息等显示当前语言的文本

#### Scenario: Common operations i18n
- **WHEN** 系统显示操作结果提示
- **THEN** 提示信息使用当前语言（如"操作成功"/"Operation successful"）

### Requirement: Menu i18n
菜单 SHALL 支持国际化显示。

#### Scenario: Menu title i18n
- **WHEN** 后端菜单数据包含i18nTitle字段
- **THEN** 系统优先显示i18nTitle对应的翻译文本

#### Scenario: Menu title fallback
- **WHEN** 菜单没有i18nTitle或翻译不存在
- **THEN** 系统显示菜单的title字段

### Requirement: Dict i18n
字典组件 SHALL 支持国际化。

#### Scenario: DictTag i18n
- **WHEN** 字典项配置了多语言文本
- **THEN** DictTag根据当前语言显示对应文本

#### Scenario: DictSelect i18n
- **WHEN** 字典下拉选择组件显示选项
- **THEN** 选项文本根据当前语言显示
