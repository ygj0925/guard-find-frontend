## ADDED Requirements

### Requirement: Announcement List Display
系统 SHALL 提供公告列表页面，支持分页查询。

#### Scenario: Announcement list with pagination
- **WHEN** 用户访问公告管理页面
- **THEN** 系统显示公告列表，包含标题、状态、发布时间等字段

### Requirement: Announcement CRUD
系统 SHALL 提供公告的新增、编辑、删除功能。

#### Scenario: Create announcement
- **WHEN** 用户点击新增按钮
- **THEN** 系统显示全屏表单，包含标题、内容（富文本编辑器）、接收人筛选、接收方式、有效期等字段

#### Scenario: Edit announcement
- **WHEN** 用户点击编辑按钮
- **THEN** 系统显示全屏表单，预填公告信息

#### Scenario: Delete announcement
- **WHEN** 用户点击删除按钮并确认
- **THEN** 系统删除公告并刷新列表

### Requirement: Announcement Publish
系统 SHALL 提供公告发布和关闭功能。

#### Scenario: Publish announcement
- **WHEN** 用户点击发布按钮
- **THEN** 系统发布公告，状态变为已发布

#### Scenario: Close announcement
- **WHEN** 用户点击关闭按钮
- **THEN** 系统关闭公告，状态变为已关闭

### Requirement: Announcement Preview
系统 SHALL 提供公告预览功能。

#### Scenario: Preview announcement
- **WHEN** 用户点击预览按钮
- **THEN** 系统弹出模态框显示公告内容预览

### Requirement: Announcement Recipient Filter
系统 SHALL 支持按接收人筛选公告。

#### Scenario: Filter by role
- **WHEN** 用户选择按角色筛选
- **THEN** 系统显示角色选择器

#### Scenario: Filter by organization
- **WHEN** 用户选择按组织筛选
- **THEN** 系统显示组织选择器（TreeSelect）

#### Scenario: Filter by user
- **WHEN** 用户选择按用户筛选
- **THEN** 系统显示用户选择器
