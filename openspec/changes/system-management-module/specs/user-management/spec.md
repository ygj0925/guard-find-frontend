## ADDED Requirements

### Requirement: User List Display
系统 SHALL 提供用户列表页面，支持分页查询、条件筛选和批量操作。

#### Scenario: User list with pagination
- **WHEN** 用户访问用户管理页面
- **THEN** 系统显示用户列表，包含用户名、昵称、头像、性别、电话、邮箱、组织、状态、创建时间等字段，支持分页

#### Scenario: User list filtering
- **WHEN** 用户输入筛选条件（用户名、昵称、电话、状态）并点击查询
- **THEN** 系统根据条件过滤用户列表并刷新显示

#### Scenario: Batch operations
- **WHEN** 用户选择多个用户并点击批量操作按钮（启用/锁定）
- **THEN** 系统批量更新选中用户的状态

### Requirement: User Creation
系统 SHALL 提供创建用户功能，包含必填字段验证。

#### Scenario: Create user successfully
- **WHEN** 用户填写用户名、密码、昵称、性别、电话、邮箱、组织、角色等信息并提交
- **THEN** 系统创建用户并刷新列表，显示成功提示

#### Scenario: Create user validation
- **WHEN** 用户提交表单时缺少必填字段
- **THEN** 系统显示字段验证错误，阻止提交

### Requirement: User Editing
系统 SHALL 提供编辑用户功能，编辑时不可修改密码。

#### Scenario: Edit user form
- **WHEN** 用户点击编辑按钮
- **THEN** 系统弹出编辑表单，预填用户信息，密码字段不可编辑

#### Scenario: Update user successfully
- **WHEN** 用户修改信息并提交
- **THEN** 系统更新用户信息并刷新列表

### Requirement: User Deletion
系统 SHALL 提供删除用户功能，需二次确认。

#### Scenario: Delete user confirmation
- **WHEN** 用户点击删除按钮
- **THEN** 系统显示确认对话框

#### Scenario: Delete user successfully
- **WHEN** 用户确认删除
- **THEN** 系统删除用户并刷新列表

### Requirement: User Authorization
系统 SHALL 提供用户授权功能，为用户分配角色。

#### Scenario: Open grant modal
- **WHEN** 用户点击授权按钮
- **THEN** 系统弹出授权弹窗，显示角色选择器，预填已分配角色

#### Scenario: Update user roles
- **WHEN** 用户选择角色并提交
- **THEN** 系统更新用户角色并显示成功提示

### Requirement: Password Management
系统 SHALL 提供修改密码功能，包含密码强度验证。

#### Scenario: Open password modal
- **WHEN** 用户点击修改密码按钮
- **THEN** 系统弹出密码修改弹窗

#### Scenario: Password validation
- **WHEN** 用户输入密码不符合规则（6-12位数字+字母组合）
- **THEN** 系统显示密码格式错误

#### Scenario: Password confirmation
- **WHEN** 用户输入的两次密码不一致
- **THEN** 系统显示密码不匹配错误

#### Scenario: Change password successfully
- **WHEN** 用户输入有效密码并提交
- **THEN** 系统修改密码并显示成功提示

### Requirement: User Status Toggle
系统 SHALL 提供用户状态切换功能。

#### Scenario: Toggle user status
- **WHEN** 用户点击状态开关
- **THEN** 系统切换用户状态（启用/锁定）并显示成功提示

### Requirement: Avatar Upload
系统 SHALL 提供用户头像裁剪上传功能。

#### Scenario: Open avatar cropper
- **WHEN** 用户点击头像或上传头像按钮
- **THEN** 系统弹出头像裁剪模态框

#### Scenario: Select image file
- **WHEN** 用户选择图片文件
- **THEN** 系统预览图片，显示裁剪区域

#### Scenario: Crop and preview
- **WHEN** 用户调整裁剪区域
- **THEN** 系统实时预览裁剪效果

#### Scenario: Upload cropped avatar
- **WHEN** 用户点击确认上传
- **THEN** 系统裁剪图片并上传，更新用户头像显示

#### Scenario: Avatar format validation
- **WHEN** 用户选择非图片文件或超过大小限制的文件
- **THEN** 系统显示文件格式或大小错误提示
