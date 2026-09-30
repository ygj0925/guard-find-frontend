## ADDED Requirements

### Requirement: 后端未实现能力的下线策略

对后端从未提供接口的能力（多语言 `i18n/*`、访问日志 `system/access-log/page`、新版公告 `notify/announcement/*` 与 `system/announcement/*`、用户数据权限 `system/user/scope`、部门层级校正 `system/dept/revised`、角色下拉 `system/role/select`、菜单授权列表 `system/menu/grant-list`、字典失效哈希 `system/dict/invalid-hash`），前端 SHALL 移除其调用点或标注为已弃用，并 SHALL 通过路由过滤器隐藏其菜单入口，使其不产生 4xx 请求。

#### Scenario: 已种入数据库的失效菜单

- **WHEN** `sys_menu` 中存在 `/i18n`、`/monitor/log/access` 等无后端实现的菜单行
- **THEN** 侧边栏 SHALL NOT 展示该入口，且直接访问该路径 SHALL 落到 404/403 处理而非发出失败请求

#### Scenario: 后端补齐后恢复

- **WHEN** 后端提供了对应接口
- **THEN** 仅需从过滤器常量中移除该路径即可恢复入口，无需改动页面代码

### Requirement: 失效服务代码的可追溯标注

保留在后端的暂不可用页面文件 SHALL 在服务函数上标注 `@deprecated` 并注明所属变更与原因，SHALL NOT 静默删除已投入使用的页面。

#### Scenario: 查看某页为何不可用

- **WHEN** 开发者打开 `services/web/system/i18n/index.ts`
- **THEN** 文件头 SHALL 说明后端未实现、指向 `align-backend-contract` 变更与待办登记位置
