## ADDED Requirements

### Requirement: Role List Display
系统 SHALL 提供角色列表页面，支持分页查询和条件筛选。

#### Scenario: Role list with pagination
- **WHEN** 用户访问角色管理页面
- **THEN** 系统显示角色列表，包含角色名称、角色标识、角色类型、备注、创建时间等字段

#### Scenario: Role list filtering
- **WHEN** 用户输入筛选条件（角色名称、角色标识）并点击查询
- **THEN** 系统根据条件过滤角色列表

### Requirement: Role Creation
系统 SHALL 提供创建角色功能，角色标识必须以 `ROLE_` 开头。

#### Scenario: Create role successfully
- **WHEN** 用户填写角色名称、角色标识、角色类型、备注并提交
- **THEN** 系统创建角色并刷新列表

#### Scenario: Role code validation
- **WHEN** 用户输入的角色标识不以 `ROLE_` 开头
- **THEN** 系统显示验证错误，阻止提交

### Requirement: Role Editing
系统 SHALL 提供编辑角色功能。

#### Scenario: Edit role form
- **WHEN** 用户点击编辑按钮
- **THEN** 系统弹出编辑表单，预填角色信息

#### Scenario: Update role successfully
- **WHEN** 用户修改信息并提交
- **THEN** 系统更新角色并刷新列表

### Requirement: Role Deletion
系统 SHALL 提供删除角色功能，需二次确认。

#### Scenario: Delete role confirmation
- **WHEN** 用户点击删除按钮
- **THEN** 系统显示确认对话框

#### Scenario: Delete role successfully
- **WHEN** 用户确认删除
- **THEN** 系统删除角色并刷新列表

### Requirement: Menu Permission Grant
系统 SHALL 提供角色菜单权限授权功能，使用抽屉形式展示菜单树。

#### Scenario: Open menu grant drawer
- **WHEN** 用户点击菜单授权按钮
- **THEN** 系统打开抽屉，显示菜单树，勾选已授权菜单

#### Scenario: Cascade selection
- **WHEN** 用户勾选父节点菜单
- **THEN** 系统自动勾选所有子节点

#### Scenario: Update menu permissions
- **WHEN** 用户点击保存
- **THEN** 系统更新角色菜单权限并显示成功提示

### Requirement: User Binding Management
系统 SHALL 提供角色用户绑定管理功能。

#### Scenario: Open user bind modal
- **WHEN** 用户点击用户绑定按钮
- **THEN** 系统弹出模态框，显示已绑定用户列表

#### Scenario: Filter bound users
- **WHEN** 用户按组织筛选已绑定用户
- **THEN** 系统过滤显示符合条件的用户

#### Scenario: Unbind user
- **WHEN** 用户点击解绑按钮
- **THEN** 系统解除用户与角色的绑定并刷新列表
