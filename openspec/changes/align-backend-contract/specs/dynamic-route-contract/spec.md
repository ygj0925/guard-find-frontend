## MODIFIED Requirements

### Requirement: 动态菜单字段语义

`GET /auth/user/route` 返回的 `RouteResp` 树 SHALL 按后端语义解析：`type` 为 1 目录 / 2 菜单 / 3 按钮；字段 `isExternal`、`isCache`、`isHidden`、`sort`、`permission` 因 `@JsonInclude(NON_EMPTY)` 在取值为 `false`/`0`/空时 SHALL 整体缺失，前端 MUST 按缺省值处理而非依赖字段存在。

#### Scenario: 缺失隐藏标记视为不隐藏

- **WHEN** 菜单项 JSON 中不存在 `isHidden`
- **THEN** 该菜单 SHALL 在侧边栏正常显示

#### Scenario: 按钮类型不进入菜单

- **WHEN** 菜单项 `type === 3`
- **THEN** 动态路由 SHALL 将其排除在导航之外

### Requirement: 菜单组件与页面文件一致性

菜单 `component`（形如 `monitor/log/login/index`）SHALL 能在 `src/pages` 约定式路由中命中真实文件，构建前 SHALL 提供一致性校验。

#### Scenario: 菜单指向缺失页面

- **WHEN** 存在菜单行 `component = 'i18n/index'` 但 `src/pages/i18n/index.tsx` 不存在（或已被下线）
- **THEN** 契约检查 SHALL 失败，且该菜单入口 SHALL NOT 出现在导航中

## REMOVED Requirements

### Requirement: targetType / uri / keepAlive / status 路由字段

**Reason**: 后端 `RouteResp` 不提供这些字段（ballcat 遗留）。
**Migration**: 外链判定改用 `isExternal`；缓存与页签行为由布局设置统一管理。
