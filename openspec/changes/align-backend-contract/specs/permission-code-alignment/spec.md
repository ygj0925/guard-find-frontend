## ADDED Requirements

### Requirement: 权限码以后端派生规则为唯一来源

界面使用的权限码 SHALL 与后端一致：CRUD 派生码为 `<prefix>:list|get|create|update|delete|export`，其余以 `@SaCheckPermission` 显式声明为准。页面 SHALL 声明按钮所需的权限码，用户实际拥有的权限 SHALL 以 `/auth/user/info` 返回的 `permissions` 为准，前端 SHALL NOT 维护或生成完整权限码清单。

#### Scenario: 获取用户权限

- **WHEN** 用户登录或应用初始化获取用户信息
- **THEN** 前端 SHALL 使用后端返回的 `permissions` 更新用户状态和本地缓存，按钮权限 SHALL 通过统一判定逻辑读取用户状态

#### Scenario: 新增按钮的权限码

- **WHEN** 用户管理页渲染"新增"按钮
- **THEN** 其权限码 SHALL 为 `system:user:create`，SHALL NOT 使用 `system:user:add`

#### Scenario: 模块命名空间迁移

- **WHEN** 部门、公告、短信日志、系统配置页引用权限码
- **THEN** 前缀 SHALL 分别为 `system:dept:*`、`system:notice:*`、`system:sms:log:*`、`system:option:*`

#### Scenario: 越界权限码检测

- **WHEN** 页面引用了后端源码扫描结果中不存在的权限码
- **THEN** 契约检查 SHALL 失败并列出该 code

### Requirement: 权限判定的单一实现

`src/access.ts` 与 `src/hooks/useAccess.ts` SHALL 收敛为同一份判定逻辑，并统一支持超级权限 `*:*:*`。

#### Scenario: 超级权限放行

- **WHEN** 当前用户 `permissions` 含 `*:*:*`
- **THEN** 所有 `AccessControl` 包裹的操作 SHALL 可见且不被隐藏

#### Scenario: 无权限降级可见

- **WHEN** 用户缺少某操作权限且该操作配置为 `mode="disable"`
- **THEN** 界面 SHALL 渲染禁用态按钮并给出原因，而不是让按钮凭空消失
