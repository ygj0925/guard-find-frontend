## ADDED Requirements

### Requirement: 按 ContiNew CRUD 约定绑定接口

服务层 SHALL 通过统一的 CRUD 工厂绑定后端 `@CrudRequestMapping` 派生的端点：分页 `GET <base>`、列表 `GET <base>/list`、树 `GET <base>/tree`、详情 `GET <base>/{id}`、新增 `POST <base>`、修改 `PUT <base>/{id}`、删除 `DELETE <base>` + body `{"ids":[...]}`、导出 `GET <base>/export`、字典 `GET <base>/dict`。

#### Scenario: 修改操作携带路径 ID

- **WHEN** 用户在用户管理页提交编辑
- **THEN** 前端 SHALL 发起 `PUT /system/user/{id}`，请求体不再包含用于定位的 id 依赖

#### Scenario: 单条与批量删除统一形态

- **WHEN** 用户删除一条或多条字典数据
- **THEN** 前端 SHALL 发起 `DELETE /system/dict` 且 body 为 `{"ids":[...]}`，SHALL NOT 使用 `DELETE /system/dict/{id}`

#### Scenario: 新增消费返回 ID

- **WHEN** 新增公告成功
- **THEN** 前端 SHALL 从 `data.id` 读取新记录 ID，用于后续跳转或关联提交

### Requirement: 分页与排序参数形态

分页请求 SHALL 使用 `page` / `size`；排序 SHALL 以重复的 `sort=<field>,<dir>` 形式序列化（非 `sort[]=`），以匹配后端 `String[] sort` 绑定。

#### Scenario: 带排序的分页查询

- **WHEN** 日志页按创建时间倒序查询
- **THEN** 请求 URL SHALL 形如 `/system/log?page=1&size=10&sort=createTime,desc`

### Requirement: 树形与非分页列表

对仅提供 `tree` / `list`（不分页）的模块，界面 SHALL 关闭分页控件，SHALL NOT 以数组长度伪造 `total`。

#### Scenario: 部门树展示

- **WHEN** 打开部门管理页
- **THEN** 前端 SHALL 调用 `GET /system/dept/tree` 并以 `pagination={false}` 渲染
